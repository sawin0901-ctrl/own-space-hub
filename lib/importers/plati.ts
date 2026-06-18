import type { NormalizedProduct, ProductImporter } from "./types";
import { fetchDigisellerById } from "./digiseller";

// Plati.market — это витрина того же Digiseller. Карточка товара доступна по
// общему публичному эндпоинту:
//   GET https://api.digiseller.ru/api/products/{id}/data?currency=RUB&lang=ru-RU&format=json
// (Старый путь /api/products/{id}/goods.json отдаёт 404 — его больше нет.)
// Список товаров продавца на plati оставляем как было.

const API_BASE = "https://plati.market/api";

export const platiImporter: ProductImporter = {
  source: "PLATI",

  async fetchProducts({ page = 1, pageSize = 50 } = {}) {
    const sellerId = process.env.PLATI_SELLER_ID;
    if (!sellerId) return [];
    const url = new URL(`${API_BASE}/seller/${sellerId}.json`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("rows", String(pageSize));

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Plati ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const items: any[] = data?.items ?? data?.products ?? [];
    return items
      .map((p) => mapPlatiList(p))
      .filter(Boolean) as NormalizedProduct[];
  },

  async fetchProduct(externalId: string) {
    const r = await fetchDigisellerById(Number(externalId));
    if (r.kind !== "ok") return null;
    // Source-маркер должен быть PLATI, всё остальное — как из digiseller.
    return { ...r.product, source: "PLATI" } as NormalizedProduct;
  },
};

function mapPlatiList(p: any): NormalizedProduct | null {
  if (!p) return null;
  const id = String(p.id_goods ?? p.id ?? "");
  if (!id) return null;
  return {
    source: "PLATI",
    externalId: id,
    title: p.name ?? p.name_goods ?? `Товар ${id}`,
    description: p.description ?? p.info_for_sale ?? "",
    price: Number(p.price ?? p.price_rur ?? 0),
    currency: (p.currency ?? "RUB").replace("RUR", "RUB"),
    image: p.image ?? p.img_url,
    gallery: Array.isArray(p.images) ? p.images : [],
    rating: Number(p.rating ?? 0),
    reviewsCount: Number(p.reviews_count ?? 0),
    sellerName: p.seller_name,
    sellerUrl: p.seller_url,
    platform: p.platform,
    publisher: p.publisher,
    region: p.region,
    genres: Array.isArray(p.genres) ? p.genres : [],
    categoryName: p.category_name ?? p.category,
    affiliateUrl: p.url ?? `https://plati.market/itm/${id}`,
  };
}
