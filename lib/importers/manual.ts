// Ручной импорт одного товара по URL/ID — Plati или Digiseller.
import { prisma } from "../prisma";
import { fetchDigisellerById } from "./digiseller";
import { platiImporter } from "./plati";
import { getSettings, buildAffiliateUrl } from "../settings";
import type { NormalizedProduct } from "./types";
import type { Source } from "@prisma/client";

function slugify(input: string, fallback: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  const s = input.toLowerCase().replace(/[а-яё]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return s || fallback;
}

/** Распознать источник и externalId по URL или сырому ID. */
export function parseProductRef(input: string): { source: Source; externalId: string } | null {
  const s = input.trim();
  if (!s) return null;

  // plati.market/itm/12345 или plati.com/asp/...?id_d=12345
  const plati = s.match(/plati\.(?:market|com)\/(?:itm|asp\/[^?]*)\/?(\d+)/i)
              ?? s.match(/plati\.[^/]+\/.*?[?&]id(?:_d)?=(\d+)/i);
  if (plati) return { source: "PLATI", externalId: plati[1] };

  // digiseller.ru/asp/...?id_d=12345 или /product/12345
  const digi = s.match(/digiseller\.[^/]+\/.*?[?&]id_d=(\d+)/i)
             ?? s.match(/digiseller\.[^/]+\/(?:product|asp\/[^?]*)\/?(\d+)/i);
  if (digi) return { source: "DIGISELLER", externalId: digi[1] };

  // Просто число → по умолчанию Digiseller
  if (/^\d+$/.test(s)) return { source: "DIGISELLER", externalId: s };

  return null;
}

async function ensureCategory(name?: string) {
  if (!name) return null;
  const slug = slugify(name, "cat");
  return prisma.category.upsert({ where: { slug }, create: { slug, name }, update: { name } });
}

async function upsertOne(np: NormalizedProduct): Promise<{ id: string; slug: string; action: "IMPORTED" | "UPDATED" }> {
  const category = await ensureCategory(np.categoryName);
  const settings = await getSettings();
  const template = np.source === "PLATI"
    ? settings.sources.plati.urlTemplate
    : settings.sources.digiseller.urlTemplate;
  const affiliateUrl = buildAffiliateUrl(np.affiliateUrl, settings.affiliateId, template);
  const existing = await prisma.product.findUnique({
    where: { source_externalId: { source: np.source, externalId: np.externalId } },
    select: { id: true, slug: true },
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
    return { id: existing.id, slug: existing.slug, action: "UPDATED" };
  }
  const baseSlug = slugify(`${np.title}-${np.externalId}`, np.externalId);
  let slug = baseSlug;
  for (let i = 1; i < 5; i++) {
    const clash = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${baseSlug}-${i}`;
  }
  const created = await prisma.product.create({
    data: { source: np.source, externalId: np.externalId, slug, ...data },
    select: { id: true, slug: true },
  });
  return { id: created.id, slug: created.slug, action: "IMPORTED" };
}

export type ManualImportResult =
  | { ok: true; action: "IMPORTED" | "UPDATED"; slug: string; id: string; source: Source; externalId: string }
  | { ok: false; error: string };

/** Импортировать один товар по URL или ID. */
export async function importByUrl(input: string): Promise<ManualImportResult> {
  const ref = parseProductRef(input);
  if (!ref) return { ok: false, error: "Не удалось распознать ссылку. Поддерживается plati.market/itm/ID и digiseller.ru/...id_d=ID." };

  try {
    if (ref.source === "PLATI") {
      const np = await platiImporter.fetchProduct(ref.externalId);
      if (!np) return { ok: false, error: `Plati вернул пусто для ID ${ref.externalId}` };
      if (!(np.price > 0)) return { ok: false, error: "У товара нет цены / нет в наличии" };
      const r = await upsertOne(np);
      return { ok: true, action: r.action, slug: r.slug, id: r.id, source: "PLATI", externalId: ref.externalId };
    }

    // DIGISELLER
    const r = await fetchDigisellerById(Number(ref.externalId));
    if (r.kind === "not_found") return { ok: false, error: `Digiseller: товар ${ref.externalId} не найден` };
    if (r.kind === "blocked")   return { ok: false, error: "Продавец заблокирован" };
    if (r.kind === "error")     return { ok: false, error: `Digiseller ошибка: ${r.message}` };
    const np = r.product;
    if (!np.hasImage) return { ok: false, error: "У товара нет картинки" };
    if (!(np.price > 0)) return { ok: false, error: "У товара нет цены" };
    const up = await upsertOne(np);
    return { ok: true, action: up.action, slug: up.slug, id: up.id, source: "DIGISELLER", externalId: ref.externalId };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
