import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { trackView } from "@/lib/analytics";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return {};
    const desc = (product.description ?? "").replace(/<[^>]+>/g, "").slice(0, 160);
    return {
      title: product.title,
      description: desc || product.title,
      openGraph: {
        title: product.title,
        description: desc,
        images: product.image ? [product.image] : undefined,
        type: "website",
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, reviews: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!product || !product.isActive) notFound();

  const t = await getTranslations({ locale });
  const h = await headers();
  await trackView(product.id, h);
  const prefix = locale === "ru" ? "" : `/${locale}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: (product.description ?? "").replace(/<[^>]+>/g, "").slice(0, 500),
    image: product.image ? [product.image, ...product.gallery] : product.gallery,
    aggregateRating: product.reviewsCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewsCount,
    } : undefined,
    offers: {
      "@type": "Offer",
      price: Number(product.price),
      priceCurrency: product.currency,
      url: `/api/go/${product.id}`,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container product-page">
        <div className="gallery">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} className="main-img" />
          ) : (
            <div className="main-img" />
          )}
          {product.gallery.length > 0 && (
            <div className="thumbs">
              {product.gallery.slice(0, 8).map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g} alt="" />
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <h1>{product.title}</h1>
          {product.category && (
            <p className="muted">
              <Link href={`${prefix}/category/${product.category.slug}`}>{product.category.name}</Link>
            </p>
          )}
          <div className="price-big">{Number(product.price).toLocaleString("ru-RU")} ₽</div>

          <a
            href={`/api/go/${product.id}`}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="btn-buy"
          >
            {t("product.buy")} →
          </a>

          <dl className="product-attrs">
            {product.platform && <div><dt>{t("product.platform")}:</dt> <dd>{product.platform}</dd></div>}
            {product.publisher && <div><dt>{t("product.publisher")}:</dt> <dd>{product.publisher}</dd></div>}
            {product.region && <div><dt>{t("product.region")}:</dt> <dd>{product.region}</dd></div>}
            {product.sellerName && <div><dt>{t("product.seller")}:</dt> <dd>{product.sellerName}</dd></div>}
            {product.rating > 0 && <div><dt>{t("product.rating")}:</dt> <dd>★ {product.rating.toFixed(1)} ({product.reviewsCount})</dd></div>}
          </dl>

          <p className="disclaimer">{t("product.disclaimer")}</p>
        </div>
      </div>

      {product.description && (
        <section className="section">
          <div className="container">
            <h2>{t("product.description")}</h2>
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>{t("product.reviews")}</h2>
          {product.reviews.length === 0 ? (
            <p className="muted">{t("product.noReviews")}</p>
          ) : (
            <ul>
              {product.reviews.map((r) => (
                <li key={r.id}>
                  <strong>{r.author}</strong> ★ {r.rating} — {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
