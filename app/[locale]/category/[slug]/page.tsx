import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  try {
    const { slug, locale } = await params;
    const c = await prisma.category.findUnique({ where: { slug } });
    if (!c) return {};
    const title = c.seoTitle ?? `${c.name} — GamePlaza.site`;
    const description = c.seoDescription ?? `Каталог: ${c.name}. Цифровые ключи и аккаунты по лучшим ценам.`;
    const url = `${SITE}${locale === "ru" ? "" : `/${locale}`}/category/${c.slug}`;
    return {
      title, description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "website", images: c.image ? [c.image] : undefined },
      twitter: { card: "summary_large_image", title, description, images: c.image ? [c.image] : undefined },
    };
  } catch {
    return {};
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const prefix = locale === "ru" ? "" : `/${locale}`;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { slug: true, name: true } },
      children: { orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, icon: true } },
    },
  });
  if (!category) notFound();

  // Если у категории есть подкатегории — показываем товары из них тоже
  const subIds = category.children.map((c) => c.id);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId: subIds.length > 0 ? { in: [category.id, ...subIds] } : category.id,
    },
    orderBy: [{ reviewsCount: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="breadcrumbs">
        <Link href={`${prefix}/`}>Главная</Link> /{" "}
        <Link href={`${prefix}/categories`}>Категории</Link>
        {category.parent && (
          <> / <Link href={`${prefix}/category/${category.parent.slug}`}>{category.parent.name}</Link></>
        )}
        {" / "}<span>{category.name}</span>
      </nav>

      <h1 className="page-title">
        {category.icon && <span aria-hidden style={{ marginRight: 8 }}>{category.icon}</span>}
        {category.name}
      </h1>
      {category.description && <p className="muted">{category.description}</p>}
      {category.seoDescription && !category.description && <p className="muted">{category.seoDescription}</p>}

      {category.children.length > 0 && (
        <div className="subcat-chips">
          {category.children.map((s) => (
            <Link key={s.id} href={`${prefix}/category/${s.slug}`} className="chip">
              {s.icon} {s.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="muted" style={{ marginTop: 24 }}>В этой категории пока нет товаров.</p>
      ) : (
        <div className="grid" style={{ marginTop: 24 }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
