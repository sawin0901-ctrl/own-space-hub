import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const all = await prisma.category.findMany({
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      parent: { select: { name: true, slug: true } },
    },
  });
  const cats = all.filter((c) => c.kind === "CATEGORY");
  const genres = all.filter((c) => c.kind === "GENRE");

  function render(rows: typeof all, title: string) {
    return (
      <>
        <h2 style={{ marginTop: 32 }}>{title} ({rows.length})</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Иконка</th><th>Название</th><th>Slug</th><th>Родитель</th><th>Порядок</th><th>Featured</th><th>Товаров</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: "1.4rem" }}>{c.icon ?? "—"}</td>
                <td>{c.name}</td>
                <td className="muted">{c.slug}</td>
                <td className="muted">{c.parent?.name ?? "—"}</td>
                <td>{c.sortOrder}</td>
                <td>{c.isFeatured ? "★" : "—"}</td>
                <td>{c._count.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <>
      <h1>Таксономия</h1>
      <p className="muted">
        Категории и жанры заполняются автоматически при первом запуске. Импортированные товары
        автоматически привязываются к категории по названию.
      </p>
      {render(cats, "Категории")}
      {render(genres, "Жанры")}
    </>
  );
}
