import type { NormalizedProduct, ProductImporter } from "./types";

// Документация: https://my.digiseller.com/inside/api_general.asp
// Получение товара по ID (публично, без подписи): GET https://api.digiseller.ru/api/products/{id}/data
// retval=0  — товар существует
// retval=2  — товар удалён / не существует
// retval=3  — продавец заблокирован
// Ответ — JSONP-обёртка `DigiSeller.JSONP.callback({...})`, иногда чистый JSON.

const API_BASE = "https://api.digiseller.ru/api";

export type DigisellerResult =
  | { kind: "ok"; product: NormalizedProduct }
  | { kind: "not_found" }
  | { kind: "blocked" }
  | { kind: "error"; message: string };

function unwrapJsonp(text: string): any {
  const trimmed = text.trim();
  // Иногда возвращается чистый JSON
  if (trimmed.startsWith("{")) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }
  const open = trimmed.indexOf("(");
  const close = trimmed.lastIndexOf(")");
  if (open < 0 || close < 0) throw new Error("digiseller: bad response");
  return JSON.parse(trimmed.slice(open + 1, close));
}

export async function fetchDigisellerById(
  id: number,
  opts: { lang?: string; currency?: string; signal?: AbortSignal } = {},
): Promise<DigisellerResult> {
  const lang = opts.lang ?? "ru-RU";
  const currency = opts.currency ?? "RUB";
  const url = `${API_BASE}/products/${id}/data?currency=${currency}&lang=${lang}&format=json`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GamePlazaBot/1.0" },
      signal: opts.signal,
    });
  } catch (e: any) {
    return { kind: "error", message: e?.message ?? "network error" };
  }
  if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };

  let data: any;
  try {
    data = unwrapJsonp(await res.text());
  } catch (e: any) {
    return { kind: "error", message: e?.message ?? "parse error" };
  }

  const retval = Number(data?.retval ?? 0);
  if (retval === 2) return { kind: "not_found" };
  if (retval === 3) return { kind: "blocked" };
  if (retval !== 0) return { kind: "error", message: data?.retdesc ?? `retval=${retval}` };

  const product = mapDigiseller(data?.product ?? data, String(id));
  if (!product) return { kind: "not_found" };
  return { kind: "ok", product };
}

function mapDigiseller(p: any, fallbackId: string): NormalizedProduct | null {
  if (!p) return null;
  const id = String(p.id ?? p.id_goods ?? p.product_id ?? fallbackId);
  if (!id) return null;

  const images: string[] = [];
  if (Array.isArray(p.images)) for (const im of p.images) {
    if (typeof im === "string") images.push(im);
    else if (im?.url) images.push(im.url);
  }
  if (p.image) images.unshift(p.image);
  const cleanImages = images.filter((u) => typeof u === "string" && /^https?:\/\//.test(u));

  const price = Number(p.price?.RUB ?? p.price?.RUR ?? p.price ?? p.price_rur ?? 0);
  const currency = String(p.currency ?? "RUB").replace("RUR", "RUB");

  // Признак "в наличии". У Digiseller могут быть поля: in_stock, has_in_stock, cnt_goods, num_in_stock.
  // Если поле отсутствует — считаем, что в наличии (цифровой товар).
  const inStockFlag = p.in_stock ?? p.has_in_stock;
  const cntInStock = Number(p.cnt_goods ?? p.num_in_stock ?? p.no_count ?? -1);
  const inStock = inStockFlag === false ? false
    : (Number.isFinite(cntInStock) && cntInStock === 0 ? false : true);

  // Возможные индикаторы блокировки/отключения карточки
  const disabled = p.is_enabled === false || p.enabled === false || p.is_active === false;

  return {
    source: "DIGISELLER",
    externalId: id,
    title: p.name ?? p.name_goods ?? `Товар ${id}`,
    description: p.description ?? p.info ?? p.info_add ?? "",
    price,
    currency,
    image: cleanImages[0],
    gallery: cleanImages,
    rating: Number(p.rating ?? 0),
    reviewsCount: Number(p.cnt_review ?? p.reviews ?? 0),
    sellerName: p.seller?.name ?? p.seller_name,
    sellerUrl: p.seller?.url,
    platform: p.platform,
    publisher: p.publisher,
    region: p.region,
    genres: Array.isArray(p.genres) ? p.genres : [],
    categoryName: p.category_name ?? p.category ?? (Array.isArray(p.categories) ? p.categories[0]?.name : undefined),
    affiliateUrl: p.url ?? p.card_url ?? `https://plati.market/itm/${id}`,
    inStock: inStock && !disabled,
    hasImage: cleanImages.length > 0,
  } as NormalizedProduct;
}

// Совместимость со старым интерфейсом (используется ручной кнопкой "Синхронизировать сейчас")
export const digisellerImporter: ProductImporter = {
  source: "DIGISELLER",
  async fetchProducts() { return []; },
  async fetchProduct(externalId: string) {
    const r = await fetchDigisellerById(Number(externalId));
    return r.kind === "ok" ? r.product : null;
  },
};
