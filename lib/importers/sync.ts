import { prisma } from "../prisma";
import { getSettings } from "../settings";
import { digisellerImporter } from "./digiseller";
import { platiImporter } from "./plati";
import type { NormalizedProduct, ProductImporter } from "./types";

function slugify(input: string, fallback: string): string {
  const translit = input
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
        и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
        с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return translit || fallback;
}

async function ensureCategory(name?: string) {
  if (!name) return null;
  const slug = slugify(name, "cat");
  return prisma.category.upsert({
    where: { slug },
    create: { slug, name },
    update: { name },
  });
}

async function upsertProduct(np: NormalizedProduct) {
  const category = await ensureCategory(np.categoryName);
  const baseSlug = slugify(`${np.title}-${np.externalId}`, np.externalId);
  await prisma.product.upsert({
    where: { source_externalId: { source: np.source, externalId: np.externalId } },
    create: {
      source: np.source,
      externalId: np.externalId,
      slug: baseSlug,
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
      affiliateUrl: np.affiliateUrl,
      isActive: true,
      lastSyncedAt: new Date(),
    },
    update: {
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
      affiliateUrl: np.affiliateUrl,
      isActive: true,
      lastSyncedAt: new Date(),
    },
  });
}

export async function runSync(): Promise<{ source: string; count: number; error?: string }[]> {
  const settings = await getSettings();
  const importers: { importer: ProductImporter; enabled: boolean }[] = [
    { importer: digisellerImporter, enabled: settings.sources.digiseller.enabled },
    { importer: platiImporter, enabled: settings.sources.plati.enabled },
  ];

  const results: { source: string; count: number; error?: string }[] = [];
  for (const { importer, enabled } of importers) {
    if (!enabled) continue;
    try {
      let page = 1;
      let total = 0;
      for (;;) {
        const items = await importer.fetchProducts({ page, pageSize: 100 });
        if (items.length === 0) break;
        for (const item of items) await upsertProduct(item);
        total += items.length;
        if (items.length < 100) break;
        page += 1;
        if (page > 50) break; // safety
      }
      results.push({ source: importer.source, count: total });
    } catch (e: any) {
      results.push({ source: importer.source, count: 0, error: e?.message ?? String(e) });
    }
  }
  return results;
}
