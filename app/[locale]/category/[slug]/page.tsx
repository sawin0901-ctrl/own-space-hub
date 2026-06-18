import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug } });
  if (!c) return {};
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? `Каталог: ${c.name}`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const products = await prisma.product.findMany({
    where: { categoryId: category.id, isActive: true },
    orderBy: { reviewsCount: "desc" },
    take: 60,
  });

  return (
    <div className="container">
      <h1 style={{ margin: "20px 0" }}>{category.name}</h1>
      {category.seoDescription && <p className="muted">{category.seoDescription}</p>}
      {products.length === 0 ? (
        <p className="muted">Пока нет товаров.</p>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
