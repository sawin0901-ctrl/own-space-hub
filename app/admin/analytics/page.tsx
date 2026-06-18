import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const since = new Date(Date.now() - 30 * 86400e3);

  const [topViewed, topClicked, byReferer] = await Promise.all([
    prisma.productView.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 20,
    }),
    prisma.affiliateClick.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 20,
    }),
    prisma.affiliateClick.groupBy({
      by: ["referer"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { referer: "desc" } },
      take: 20,
    }),
  ]);

  const productIds = Array.from(new Set([...topViewed.map(x => x.productId), ...topClicked.map(x => x.productId)]));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, slug: true } });
  const byId = Object.fromEntries(products.map(p => [p.id, p]));

  return (
    <>
      <h1>Аналитика (30 дней)</h1>

      <h2>Топ по просмотрам</h2>
      <table className="admin-table">
        <thead><tr><th>Товар</th><th>Просмотры</th></tr></thead>
        <tbody>
          {topViewed.map((r) => (
            <tr key={r.productId}>
              <td>{byId[r.productId]?.title ?? r.productId}</td>
              <td>{r._count._all}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 30 }}>Топ по кликам на партнёрку</h2>
      <table className="admin-table">
        <thead><tr><th>Товар</th><th>Клики</th></tr></thead>
        <tbody>
          {topClicked.map((r) => (
            <tr key={r.productId}>
              <td>{byId[r.productId]?.title ?? r.productId}</td>
              <td>{r._count._all}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 30 }}>Источники трафика (referer кликов)</h2>
      <table className="admin-table">
        <thead><tr><th>Referer</th><th>Клики</th></tr></thead>
        <tbody>
          {byReferer.map((r, i) => (
            <tr key={i}><td>{r.referer ?? "(прямой)"}</td><td>{r._count._all}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
