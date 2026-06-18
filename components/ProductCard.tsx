import Link from "next/link";
import { useLocale } from "next-intl";
import type { Product } from "@prisma/client";

export function ProductCard({ product }: { product: Pick<Product, "id" | "slug" | "title" | "price" | "currency" | "image" | "rating" | "reviewsCount"> }) {
  const locale = useLocale();
  const prefix = locale === "ru" ? "" : `/${locale}`;
  return (
    <Link href={`${prefix}/product/${product.slug}`} className="card">
      <div className="card-image">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.title} loading="lazy" />
        ) : (
          <div className="card-image-placeholder" />
        )}
      </div>
      <div className="card-body">
        <h3>{product.title}</h3>
        <div className="card-meta">
          <span className="price">{Number(product.price).toLocaleString("ru-RU")} ₽</span>
          {product.rating > 0 && (
            <span className="rating">★ {product.rating.toFixed(1)} ({product.reviewsCount})</span>
          )}
        </div>
      </div>
    </Link>
  );
}
