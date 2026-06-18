import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  const t = await getTranslations({ locale });
  const items = q
    ? await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { publisher: { contains: q, mode: "insensitive" } },
            { platform: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 60,
      })
    : [];

  return (
    <div className="container">
      <h1 style={{ margin: "20px 0" }}>{t("search.resultsFor")}: «{q ?? ""}»</h1>
      {items.length === 0 ? (
        <p className="muted">{t("catalog.empty")}</p>
      ) : (
        <div className="grid">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
