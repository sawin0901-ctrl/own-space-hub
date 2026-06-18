import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const prefix = locale === "ru" ? "" : `/${locale}`;

  const [popular, fresh, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ reviewsCount: "desc" }, { rating: "desc" }],
      take: 8,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, take: 12 }),
  ]);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{t("home.hero")}</h1>
          <p>{t("home.heroSub")}</p>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>{t("home.browseCategories")}</h2>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {categories.map((c) => (
                <Link key={c.id} href={`${prefix}/category/${c.slug}`} className="card">
                  <div className="card-body"><h3>{c.name}</h3></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>{t("home.popular")}</h2>
            <div className="grid">
              {popular.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>{t("home.fresh")}</h2>
            <div className="grid">
              {fresh.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {popular.length === 0 && fresh.length === 0 && (
        <section className="section">
          <div className="container">
            <p className="muted">
              Каталог пока пуст. Зайдите в админку и запустите синхронизацию с площадкой
              ({" "}<Link href="/admin" style={{ color: "var(--accent)" }}>/admin</Link>{" "}).
            </p>
          </div>
        </section>
      )}
    </>
  );
}
