import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<{
  q?: string;
  category?: string;
  platform?: string;
  publisher?: string;
  region?: string;
  sort?: string;
  page?: string;
}>;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale });

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (sp.q) where.OR = [
    { title: { contains: sp.q, mode: "insensitive" } },
    { description: { contains: sp.q, mode: "insensitive" } },
    { publisher: { contains: sp.q, mode: "insensitive" } },
  ];
  if (sp.category) where.category = { slug: sp.category };
  if (sp.platform) where.platform = sp.platform;
  if (sp.publisher) where.publisher = sp.publisher;
  if (sp.region) where.region = sp.region;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sp.sort === "price_asc" ? { price: "asc" } :
    sp.sort === "price_desc" ? { price: "desc" } :
    sp.sort === "rating" ? { rating: "desc" } :
    sp.sort === "new" ? { createdAt: "desc" } :
    { reviewsCount: "desc" };

  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 24;

  const [items, total, platforms, publishers, regions, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
    prisma.product.findMany({ where: { isActive: true, platform: { not: null } }, select: { platform: true }, distinct: ["platform"], take: 30 }),
    prisma.product.findMany({ where: { isActive: true, publisher: { not: null } }, select: { publisher: true }, distinct: ["publisher"], take: 30 }),
    prisma.product.findMany({ where: { isActive: true, region: { not: null } }, select: { region: true }, distinct: ["region"], take: 30 }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container">
      <h1 style={{ margin: "20px 0" }}>{t("catalog.title")}</h1>
      <div className="catalog">
        <aside className="filters">
          <form method="get">
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <h3>{t("catalog.filters")}</h3>
            <div className="form-row">
              <label>{t("nav.categories")}</label>
              <select name="category" defaultValue={sp.category ?? ""}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>{t("catalog.platform")}</label>
              <select name="platform" defaultValue={sp.platform ?? ""}>
                <option value="">—</option>
                {platforms.map((p) => p.platform && <option key={p.platform} value={p.platform}>{p.platform}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>{t("catalog.publisher")}</label>
              <select name="publisher" defaultValue={sp.publisher ?? ""}>
                <option value="">—</option>
                {publishers.map((p) => p.publisher && <option key={p.publisher} value={p.publisher}>{p.publisher}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>{t("catalog.region")}</label>
              <select name="region" defaultValue={sp.region ?? ""}>
                <option value="">—</option>
                {regions.map((p) => p.region && <option key={p.region} value={p.region}>{p.region}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>{t("catalog.sort")}</label>
              <select name="sort" defaultValue={sp.sort ?? ""}>
                <option value="">{t("catalog.sortPopular")}</option>
                <option value="price_asc">{t("catalog.sortPriceAsc")}</option>
                <option value="price_desc">{t("catalog.sortPriceDesc")}</option>
                <option value="rating">{t("catalog.sortRating")}</option>
                <option value="new">{t("catalog.sortNew")}</option>
              </select>
            </div>
            <button className="btn" type="submit">OK</button>
          </form>
        </aside>
        <div>
          {items.length === 0 ? (
            <p className="muted">{t("catalog.empty")}</p>
          ) : (
            <div className="grid">
              {items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              {Array.from({ length: totalPages }).slice(0, 20).map((_, i) => {
                const n = i + 1;
                const usp = new URLSearchParams();
                Object.entries(sp).forEach(([k, v]) => v && k !== "page" && usp.set(k, String(v)));
                usp.set("page", String(n));
                return (
                  <a key={n} href={`?${usp.toString()}`} className={n === page ? "btn" : "btn btn-secondary"}>{n}</a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
