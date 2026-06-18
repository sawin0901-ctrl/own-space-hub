import { prisma } from "@/lib/prisma";
import { runSync } from "@/lib/importers/sync";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [products, activeProducts, categories, views7, clicks7] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.productView.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400e3) } } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400e3) } } }),
  ]);

  async function syncNow() {
    "use server";
    await runSync();
    revalidatePath("/admin");
  }

  return (
    <>
      <h1>Дашборд</h1>
      <div className="stat-grid">
        <div className="stat-card"><div className="num">{products}</div><div className="lbl">Товаров всего</div></div>
        <div className="stat-card"><div className="num">{activeProducts}</div><div className="lbl">Активных</div></div>
        <div className="stat-card"><div className="num">{categories}</div><div className="lbl">Категорий</div></div>
        <div className="stat-card"><div className="num">{views7}</div><div className="lbl">Просмотров за 7 дней</div></div>
        <div className="stat-card"><div className="num">{clicks7}</div><div className="lbl">Кликов за 7 дней</div></div>
        <div className="stat-card">
          <div className="num">{clicks7 > 0 && views7 > 0 ? ((clicks7 / views7) * 100).toFixed(1) : "0"}%</div>
          <div className="lbl">CTR</div>
        </div>
      </div>

      <form action={syncNow}>
        <button className="btn" type="submit">Синхронизировать товары сейчас</button>
      </form>
    </>
  );
}
