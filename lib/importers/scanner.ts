// Бесконечный сканер ID для Digiseller.
// Перебирает product ID по возрастанию, сохраняет курсор в БД (ImportState),
// импортирует найденные товары, логирует пропуски/ошибки в ImportLog.
import { prisma } from "../prisma";
import { fetchDigisellerById } from "./digiseller";
import { getSettings, buildAffiliateUrl } from "../settings";
import { enqueueRetry, popDue } from "./retryQueue";
import type { NormalizedProduct } from "./types";
import type { Source } from "@prisma/client";

const SOURCE: Source = "DIGISELLER";


function slugify(input: string, fallback: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  const s = input.toLowerCase()
    .replace(/[а-яё]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || fallback;
}

async function ensureCategory(name?: string) {
  if (!name) return null;
  const slug = slugify(name, "cat");
  return prisma.category.upsert({
    where: { slug }, create: { slug, name }, update: { name },
  });
}

async function upsertProduct(np: NormalizedProduct): Promise<"IMPORTED" | "UPDATED"> {
  const category = await ensureCategory(np.categoryName);
  const settings = await getSettings();
  const affiliateUrl = buildAffiliateUrl(
    np.affiliateUrl,
    settings.affiliateId,
    settings.sources.digiseller.urlTemplate,
  );
  const existing = await prisma.product.findUnique({
    where: { source_externalId: { source: np.source, externalId: np.externalId } },
    select: { id: true },
  });
  const data = {
    title: np.title,
    description: np.description ?? "",
    price: np.price,
    oldPrice: np.oldPrice,
    currency: np.currency,
    image: np.image,
    gallery: np.gallery ?? [],
    rating: np.rating ?? 0,
    reviewsCount: np.reviewsCount ?? 0,
    sellerName: np.sellerName,
    sellerUrl: np.sellerUrl,
    platform: np.platform,
    publisher: np.publisher,
    region: np.region,
    genres: np.genres ?? [],
    categoryId: category?.id,
    affiliateUrl,
    isActive: true,
    lastSyncedAt: new Date(),
  };
  if (existing) {
    await prisma.product.update({ where: { id: existing.id }, data });
    return "UPDATED";
  }
  const baseSlug = slugify(`${np.title}-${np.externalId}`, np.externalId);
  // защита от коллизий слага
  let slug = baseSlug;
  for (let i = 1; i < 5; i++) {
    const clash = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${baseSlug}-${i}`;
  }
  await prisma.product.create({
    data: { source: np.source, externalId: np.externalId, slug, ...data },
  });
  return "IMPORTED";
}

export async function getImportState() {
  return prisma.importState.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE },
    update: {},
  });
}

export async function setImportStatus(status: "IDLE" | "RUNNING" | "PAUSED" | "ERROR", patch: any = {}) {
  return prisma.importState.update({
    where: { source: SOURCE },
    data: { status, ...patch },
  });
}

async function processId(id: number): Promise<{ status: "IMPORTED" | "UPDATED" | "NOT_FOUND" | "SKIPPED" | "ERROR"; message?: string }> {
  try {
    const r = await fetchDigisellerById(id);
    if (r.kind === "not_found") return { status: "NOT_FOUND" };
    if (r.kind === "blocked")   return { status: "SKIPPED", message: "seller blocked" };
    if (r.kind === "error")     return { status: "ERROR", message: r.message };

    // Качество карточки: импортируем только рабочие
    const p = r.product;
    if (!p.hasImage) return { status: "SKIPPED", message: "no image" };
    if (!p.inStock)  return { status: "SKIPPED", message: "out of stock" };
    if (!(p.price > 0)) return { status: "SKIPPED", message: "no price" };
    if (!p.title || /^Товар \d+$/.test(p.title)) return { status: "SKIPPED", message: "no title" };

    const status = await upsertProduct(p);
    return { status };
  } catch (e: any) {
    return { status: "ERROR", message: e?.message ?? String(e) };
  }
}

/** Сколько успешных импортов за последние 24 часа. */
async function importsLast24h(): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000);
  return prisma.importLog.count({
    where: {
      source: SOURCE,
      createdAt: { gte: since },
      status: { in: ["IMPORTED", "UPDATED"] },
    },
  });
}

/** Один проход бесконечного цикла — возвращается, когда status != RUNNING или достигнут maxId. */
export async function runScanner(): Promise<void> {
  let state = await getImportState();
  if (state.status !== "RUNNING") return;
  if (state.cursorId < state.startId - 1) {
    state = await prisma.importState.update({
      where: { source: SOURCE },
      data: { cursorId: state.startId - 1 },
    });
  }

  console.log(`[scanner] start from ID=${state.cursorId + 1} concurrency=${state.concurrency} delay=${state.delayMs}ms`);

  while (true) {
    state = await getImportState();
    if (state.status !== "RUNNING") {
      console.log(`[scanner] stopped, status=${state.status}`);
      return;
    }
    if (state.maxId && state.cursorId >= state.maxId) {
      await setImportStatus("IDLE", { lastError: null });
      console.log(`[scanner] reached maxId=${state.maxId}`);
      return;
    }

    // Лимит импортов в сутки
    if (state.dailyLimit > 0) {
      const done = await importsLast24h();
      if (done >= state.dailyLimit) {
        console.log(`[scanner] daily limit reached: ${done}/${state.dailyLimit}, sleeping 10 min`);
        await new Promise((r) => setTimeout(r, 10 * 60_000));
        continue;
      }
    }

    const batchStart = state.cursorId + 1;
    const ids = Array.from({ length: state.concurrency }, (_, i) => batchStart + i);

    const results = await Promise.all(ids.map((id) => processId(id)));

    let imported = 0, updated = 0, skipped = 0, notFound = 0, errors = 0;
    const logs: { source: Source; externalId: string; status: any; message?: string | null }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const r = results[i];
      logs.push({ source: SOURCE, externalId: String(id), status: r.status, message: r.message ?? null });
      if (r.status === "IMPORTED") imported++;
      else if (r.status === "UPDATED") updated++;
      else if (r.status === "SKIPPED") skipped++;
      else if (r.status === "NOT_FOUND") notFound++;
      else if (r.status === "ERROR") errors++;
    }

    // Ошибки → в Redis retry-очередь (15м → 1ч → failed-журнал)
    for (let i = 0; i < ids.length; i++) {
      const r = results[i];
      if (r.status === "ERROR") {
        await enqueueRetry(ids[i], r.message, 0).catch((e) => console.error("[scanner] enqueueRetry failed", e));
      }
    }

    // Логируем только значимое (импорт/обновление/ошибки), чтобы не раздувать таблицу
    const filtered = logs.filter((l) => l.status === "IMPORTED" || l.status === "UPDATED" || l.status === "ERROR");
    if (filtered.length) await prisma.importLog.createMany({ data: filtered }).catch(() => {});

    await prisma.importState.update({
      where: { source: SOURCE },
      data: {
        cursorId: ids[ids.length - 1],
        totalChecked: { increment: ids.length },
        totalImported: { increment: imported + updated },
        totalSkipped: { increment: skipped + notFound },
        totalErrors: { increment: errors },
        lastRunAt: new Date(),
        lastError: errors > 0 ? (results.find((r) => r.status === "ERROR")?.message ?? null) : null,
      },
    });

    if (state.delayMs > 0) {
      await new Promise((r) => setTimeout(r, state.delayMs));
    }
  }
}

/** Обработать готовые к повтору задачи из Redis-очереди.
 *  Вызывается воркером в idle-цикле и между батчами сканера. */
export async function processRetryQueue(limit = 10): Promise<number> {
  const due = await popDue(limit).catch(() => []);
  if (!due.length) return 0;
  let handled = 0;
  for (const item of due) {
    const r = await processId(item.id);
    handled++;
    await prisma.importLog.create({
      data: {
        source: SOURCE,
        externalId: String(item.id),
        status: r.status === "IMPORTED" || r.status === "UPDATED" || r.status === "ERROR" ? r.status : "SKIPPED",
        message: `retry #${item.attempt + 1}${r.message ? `: ${r.message}` : ""}`,
      },
    }).catch(() => {});
    if (r.status === "ERROR") {
      await enqueueRetry(item.id, r.message, item.attempt).catch(() => {});
    }
  }
  return handled;
}


/** Ре-чек уже импортированных товаров: обновляет цену/наличие/картинки. */
export async function recheckExisting(limit = 200): Promise<number> {
  const state = await getImportState();
  const cutoff = new Date(Date.now() - state.recheckHours * 3600_000);
  const stale = await prisma.product.findMany({
    where: { source: SOURCE, lastSyncedAt: { lt: cutoff } },
    orderBy: { lastSyncedAt: "asc" },
    take: limit,
    select: { externalId: true },
  });
  let n = 0;
  for (const p of stale) {
    const r = await fetchDigisellerById(Number(p.externalId));
    if (r.kind === "ok") { await upsertProduct(r.product); n++; }
    else if (r.kind === "not_found" || r.kind === "blocked") {
      await prisma.product.updateMany({
        where: { source: SOURCE, externalId: p.externalId },
        data: { isActive: false, lastSyncedAt: new Date() },
      });
    }
  }
  return n;
}
