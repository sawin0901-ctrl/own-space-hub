import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Все категории и жанры — Jetsale",
    description: "Полный каталог категорий цифровых товаров и жанров игр: Steam, PlayStation, Xbox, Nintendo, PC, подписки, подарочные карты, ПО.",
    openGraph: {
      title: "Все категории и жанры — Jetsale",
      description: "Полный каталог категорий и жанров игр.",
    },
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const prefix = locale === "ru" ? "" : `/${locale}`;

  const all = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: { orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, icon: true } } },
  });
  const categories = all.filter((c) => c.kind === "CATEGORY" && !c.parentId);
  const genres = all.filter((c) => c.kind === "GENRE" && !c.parentId);

  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="breadcrumbs">
        <Link href={`${prefix}/`}>Главная</Link> / <span>{t("nav.categories")}</span>
      </nav>

      <h1 className="page-title">Категории</h1>
      <div className="cat-grid">
        {categories.map((c) => (
          <Link key={c.id} href={`${prefix}/category/${c.slug}`} className="cat-card">
            <div className="cat-card-icon" aria-hidden>{c.icon ?? "📦"}</div>
            <h3 className="cat-card-title">{c.name}</h3>
            {c.children.length > 0 && (
              <ul className="cat-card-subs">
                {c.children.slice(0, 6).map((s) => (
                  <li key={s.id}>{s.icon} {s.name}</li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>

      <h2 className="page-title" style={{ marginTop: 48 }}>Жанры игр</h2>
      <div className="cat-grid">
        {genres.map((g) => (
          <Link key={g.id} href={`${prefix}/category/${g.slug}`} className="cat-card cat-card-genre">
            <div className="cat-card-icon" aria-hidden>{g.icon ?? "🎮"}</div>
            <h3 className="cat-card-title">{g.name}</h3>
            {g.children.length > 0 && (
              <ul className="cat-card-subs">
                {g.children.slice(0, 5).map((s) => (
                  <li key={s.id}>{s.icon} {s.name}</li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
