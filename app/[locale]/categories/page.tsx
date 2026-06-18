import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { useLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const prefix = locale === "ru" ? "" : `/${locale}`;
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="container">
      <h1 style={{ margin: "20px 0" }}>{t("nav.categories")}</h1>
      <div className="grid">
        {cats.map((c) => (
          <Link key={c.id} href={`${prefix}/category/${c.slug}`} className="card">
            <div className="card-body"><h3>{c.name}</h3></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
