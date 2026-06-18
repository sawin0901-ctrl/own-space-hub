import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { category: true },
  });

  async function toggle(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const cur = await prisma.product.findUnique({ where: { id } });
    if (!cur) return;
    await prisma.product.update({ where: { id }, data: { isActive: !cur.isActive } });
    revalidatePath("/admin/products");
  }

  return (
    <>
      <h1>Товары ({products.length})</h1>
      <table className="admin-table">
        <thead>
          <tr><th>Источник</th><th>Название</th><th>Категория</th><th>Цена</th><th>Статус</th><th></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.source}</td>
              <td>
                <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer">{p.title}</a>
              </td>
              <td>{p.category?.name ?? "—"}</td>
              <td>{Number(p.price).toLocaleString("ru-RU")} ₽</td>
              <td>{p.isActive ? "✓" : "✗"}</td>
              <td>
                <form action={toggle}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn btn-secondary" type="submit">{p.isActive ? "Скрыть" : "Показать"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
