import type { NormalizedProduct, ProductImporter } from "./types";

// Документация: https://my.digiseller.com/inside/api_general.asp
// Получение списка товаров продавца: GET https://api.digiseller.ru/api/seller-goods
// Получение товара: GET https://api.digiseller.ru/api/products/{id}/data

const API_BASE = "https://api.digiseller.ru/api";

export const digisellerImporter: ProductImporter = {
  source: "DIGISELLER",

  async fetchProducts({ page = 1, pageSize = 50 } = {}) {
    const sellerId = process.env.DIGISELLER_SELLER_ID;
    if (!sellerId) return [];

    const url = new URL(`${API_BASE}/seller-goods`);
    url.searchParams.set("id_seller", sellerId);
    url.searchParams.set("page", String(page));
    url.searchParams.set("rows", String(pageSize));
    url.searchParams.set("currency", "RUR");
    url.searchParams.set("lang", "ru-RU");
    url.searchParams.set("order_col", "name");
    url.searchParams.set("order_dir", "asc");

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Digiseller ${res.status}: ${await res.text()}`);
    const data = await res.json();

    const items: any[] = data?.product ?? data?.products ?? [];
    return items.map(mapDigiseller).filter(Boolean) as NormalizedProduct[];
  },

  async fetchProduct(externalId: string) {
    const res = await fetch(`${API_BASE}/products/${externalId}/data?currency=RUR&lang=ru-RU`);
    if (!res.ok) return null;
    const data = await res.json();
    return mapDigiseller(data?.product ?? data);
  },
};

function mapDigiseller(p: any): NormalizedProduct | null {
  if (!p) return null;
  const id = String(p.id ?? p.id_goods ?? p.product_id ?? "");
  if (!id) return null;
  return {
    source: "DIGISELLER",
    externalId: id,
    title: p.name ?? p.name_goods ?? `Товар ${id}`,
    description: p.description ?? p.info ?? "",
    price: Number(p.price ?? p.price_rur ?? 0),
    currency: (p.currency ?? "RUB").replace("RUR", "RUB"),
    image: p.image ?? p.url_image ?? p.preview,
    gallery: Array.isArray(p.images) ? p.images : [],
    rating: Number(p.rating ?? 0),
    reviewsCount: Number(p.cnt_review ?? p.reviews ?? 0),
    sellerName: p.seller?.name ?? p.seller_name,
    sellerUrl: p.seller?.url,
    platform: p.platform,
    publisher: p.publisher,
    region: p.region,
    genres: Array.isArray(p.genres) ? p.genres : [],
    categoryName: p.category_name ?? p.category,
    affiliateUrl: p.url ?? `https://oplata.info/asp/pay_wm.asp?id_d=${id}`,
  };
}
