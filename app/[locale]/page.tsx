import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const FEATURES = [
  { t: "Мгновенная доставка", d: "Ключ приходит сразу после оплаты — в любое время суток" },
  { t: "Гарантия 24/7", d: "Замена или возврат, если что-то пошло не так" },
  { t: "Официальные ключи", d: "Только лицензия от проверенных поставщиков" },
  { t: "Любая оплата", d: "Карты, СБП, криптовалюта и электронные кошельки" },
];

const CATEGORY_ICONS = ["🎮", "⚡", "💎", "🧩", "🎁", "👤", "🛡️", "🚀", "🎯", "🔥", "💻", "📱"];

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
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, take: 6 }),
  ]);

  const featured = popular[0] ?? fresh[0];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <div className="hero-badge">
              <span className="dot" />
              Доставка ключа за 30 секунд
            </div>
            <h1>
              Цифровые товары <span className="grad">без переплат</span>
            </h1>
            <p>
              Игры, подписки, программы и внутриигровая валюта. Официальные ключи,
              гарантия 24/7 и оплата любым удобным способом.
            </p>
            <div className="hero-cta">
              <Link href={`${prefix}/catalog`} className="btn-primary">
                Перейти в каталог
              </Link>
              <Link href={`${prefix}/categories`} className="btn-ghost">
                Смотреть категории
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="num">50k+</div>
                <div className="lbl">покупок</div>
              </div>
              <div className="stat">
                <div className="num">4.9 ★</div>
                <div className="lbl">рейтинг</div>
              </div>
              <div className="stat">
                <div className="num">24/7</div>
                <div className="lbl">поддержка</div>
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

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.browseCategories")}</h2>
              <Link href={`${prefix}/categories`}>Все категории →</Link>
            </div>
            <div className="cat-grid">
              {categories.map((c, i) => (
                <Link key={c.id} href={`${prefix}/category/${c.slug}`} className="cat-card">
                  <div style={{ fontSize: "2rem", marginBottom: 14 }}>
                    {CATEGORY_ICONS[i % CATEGORY_ICONS.length]}
                  </div>
                  <h3>{c.name}</h3>
                  <div className="sub">Перейти к товарам</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* POPULAR */}
      {popular.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.popular")}</h2>
              <Link href={`${prefix}/catalog?sort=popular`}>Все →</Link>
            </div>
            <div className="grid">
              {popular.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* FRESH */}
      {fresh.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>{t("home.fresh")}</h2>
              <Link href={`${prefix}/catalog?sort=new`}>Все →</Link>
            </div>
            <div className="grid">
              {fresh.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Почему GamePlaza</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.t} className="feature">
                <div className="num">0{i + 1}</div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta">
            <h2>Готов начать?</h2>
            <p>Тысячи цифровых товаров по лучшим ценам. Выбирай и забирай прямо сейчас.</p>
            <Link href={`${prefix}/catalog`} className="btn-primary">
              Открыть каталог
            </Link>
          </div>
        </div>
      </section>

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
