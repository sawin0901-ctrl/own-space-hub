import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS = ["🎮", "⚡", "💎", "🧩", "🎁", "👤", "🛡️", "🚀", "🎯", "🔥", "💻", "📱"];

const PLATFORMS = [
  { name: "Steam", short: "ST", color: "linear-gradient(135deg,#1b2838,#2a475e)" },
  { name: "Xbox", short: "XB", color: "linear-gradient(135deg,#107c10,#1ca31c)" },
  { name: "PlayStation", short: "PS", color: "linear-gradient(135deg,#003791,#0070d1)" },
  { name: "Nintendo", short: "NS", color: "linear-gradient(135deg,#e60012,#ff3a40)" },
  { name: "EA App", short: "EA", color: "linear-gradient(135deg,#ff4747,#c70000)" },
  { name: "Ubisoft", short: "UB", color: "linear-gradient(135deg,#0095ff,#005bbf)" },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const prefix = locale === "ru" ? "" : `/${locale}`;

  const [popular, fresh, deals, categories, genres] = await Promise.all([
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
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      take: 8,
    }),
    prisma.category.findMany({
      where: { kind: "CATEGORY", parentId: null, isFeatured: true },
      orderBy: { sortOrder: "asc" }, take: 9,
    }),
    prisma.category.findMany({
      where: { kind: "GENRE", parentId: null, isFeatured: true },
      orderBy: { sortOrder: "asc" }, take: 6,
    }),
  ]);

  const featured = popular[0] ?? fresh[0];

  return (
    <>
      {/* HERO */}
      <section className="hero reveal">
        <div className="container hero-inner">
          <div>
            <div className="hero-badge">
              <span className="dot" />
              Доставка ключа за 30 секунд
            </div>
            <h1>
              Цифровые товары{" "}
              <span className="grad">без переплат</span>
            </h1>
            <p>{t("home.heroSub")}</p>
            <div className="hero-cta">
              <Link href={`${prefix}/catalog`} className="btn-primary">
                {t("home.heroCta")}
              </Link>
              <Link href={`${prefix}/categories`} className="btn-ghost">
                {t("home.heroCta2")}
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="num">50k+</div>
                <div className="lbl">{t("home.stat1")}</div>
              </div>
              <div className="stat">
                <div className="num">4.9 ★</div>
                <div className="lbl">{t("home.stat2")}</div>
              </div>
              <div className="stat">
                <div className="num">24/7</div>
                <div className="lbl">{t("home.stat3")}</div>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-head">
              <span className="hero-card-tag">Хит недели</span>
              {featured && <span className="hero-card-discount">Топ</span>}
            </div>
            {featured?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.image}
                alt={featured.title}
                className="hero-card-image"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="hero-card-image">🎮</div>
            )}
            <h3>{featured?.title ?? "Cyberpunk 2077"}</h3>
            <div className="sub">Steam · Глобальный ключ</div>
            <div className="hero-card-foot">
              <div>
                <div className="old">2 499 ₽</div>
                <div className="new">
                  {featured ? `${Number(featured.price).toLocaleString("ru-RU")} ₽` : "1 499 ₽"}
                </div>
              </div>
              {featured ? (
                <Link href={`${prefix}/product/${featured.slug}`}>
                  <button>Открыть</button>
                </Link>
              ) : (
                <button>В корзину</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section className="section reveal">
        <div className="container">
          <div className="section-head">
            <h2>{t("home.platforms")}</h2>
          </div>
          <div className="platforms-grid">
            {PLATFORMS.map((p) => (
              <Link
                key={p.name}
                href={`${prefix}/catalog?platform=${encodeURIComponent(p.name)}`}
                className="platform-card"
              >
                <div className="platform-badge" style={{ background: p.color }}>
                  {p.short}
                </div>
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="section reveal">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.browseCategories")}</h2>
              <Link href={`${prefix}/categories`}>{t("home.viewAll")} →</Link>
            </div>
            <div className="cat-grid">
              {categories.map((c) => (
                <Link key={c.id} href={`${prefix}/category/${c.slug}`} className="cat-card">
                  <div className="cat-card-icon">{c.icon ?? "📦"}</div>
                  <h3 className="cat-card-title">{c.name}</h3>
                  <div className="sub muted">Перейти →</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GENRES */}
      {genres.length > 0 && (
        <section className="section reveal">
          <div className="container">
            <div className="section-head">
              <h2>Популярные жанры</h2>
              <Link href={`${prefix}/categories`}>{t("home.viewAll")} →</Link>
            </div>
            <div className="cat-grid">
              {genres.map((g) => (
                <Link key={g.id} href={`${prefix}/category/${g.slug}`} className="cat-card cat-card-genre">
                  <div className="cat-card-icon">{g.icon ?? "🎮"}</div>
                  <h3 className="cat-card-title">{g.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* POPULAR */}
      {popular.length > 0 && (
        <section className="section reveal">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.popular")}</h2>
              <Link href={`${prefix}/catalog?sort=popular`}>{t("home.viewAll")} →</Link>
            </div>
            <div className="grid">
              {popular.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* DEALS */}
      {deals.length > 0 && (
        <section className="section reveal">
          <div className="container">
            <div className="section-head">
              <h2>
                <span className="grad">{t("home.deals")}</span>
              </h2>
              <Link href={`${prefix}/catalog?sort=price_asc`}>{t("home.viewAll")} →</Link>
            </div>
            <div className="grid">
              {deals.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* FRESH */}
      {fresh.length > 0 && (
        <section className="section reveal">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.fresh")}</h2>
              <Link href={`${prefix}/catalog?sort=new`}>{t("home.viewAll")} →</Link>
            </div>
            <div className="grid">
              {fresh.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="section reveal">
        <div className="container">
          <div className="section-head">
            <h2>{t("home.features")}</h2>
          </div>
          <div className="features-grid">
            {[
              { t: t("features.f1Title"), d: t("features.f1Desc"), icon: "🛡️" },
              { t: t("features.f2Title"), d: t("features.f2Desc"), icon: "⚡" },
              { t: t("features.f3Title"), d: t("features.f3Desc"), icon: "📦" },
              { t: t("features.f4Title"), d: t("features.f4Desc"), icon: "💰" },
            ].map((f, i) => (
              <div key={i} className="feature">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section reveal">
        <div className="container">
          <div className="cta">
            <h2>{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaSub")}</p>
            <Link href={`${prefix}/catalog`} className="btn-primary">
              {t("home.ctaBtn")}
            </Link>
          </div>
        </div>
      </section>

      {/* пустой каталог — баннер скрыт */}

    </>
  );
}
