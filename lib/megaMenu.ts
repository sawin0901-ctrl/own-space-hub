// Серверный компонент: достаёт верхние категории и жанры с подкатегориями.
// Возвращается клиентскому MegaMenu как пропс.
import { prisma } from "@/lib/prisma";

export type MegaItem = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  children: { id: string; slug: string; name: string; icon: string | null }[];
};

export async function getMegaMenu(): Promise<{ categories: MegaItem[]; genres: MegaItem[] }> {
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, slug: true, name: true, icon: true },
        },
      },
    });
    const map = (c: any): MegaItem => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon, children: c.children });
    return {
      categories: roots.filter((r) => r.kind === "CATEGORY").map(map),
      genres: roots.filter((r) => r.kind === "GENRE").map(map),
    };
  } catch {
    return { categories: [], genres: [] };
  }
}
