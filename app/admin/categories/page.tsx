import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const cats = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      <h1>Категории ({cats.length})</h1>
      <table className="admin-table">
        <thead><tr><th>Название</th><th>Slug</th><th>Товаров</th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.slug}</td>
              <td>{c._count.products}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 16 }}>
        Категории создаются автоматически при синхронизации с площадок.
      </p>
    </>
  );
}
