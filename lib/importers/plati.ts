import type { NormalizedProduct, ProductImporter } from "./types";

// Документация Plati: https://plati.market/dev/
// Список товаров продавца: https://plati.market/api/seller/{sellerId}.json
// Карточка товара: https://plati.market/api/products/{id}/goods_partner.asp

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
    return items.map(mapPlati).filter(Boolean) as NormalizedProduct[];
  },

  async fetchProduct(externalId: string) {
    const res = await fetch(`${API_BASE}/products/${externalId}/goods.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return mapPlati(data);
  },
};

function mapPlati(p: any): NormalizedProduct | null {
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
