const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({ log: ["error"] });

const categories = [
  { slug: "games", name: "Игры", icon: "🎮", isFeatured: true, children: ["Новинки", "Популярные", "Предзаказы", "Бесплатные игры", "Игры со скидкой"] },
  { slug: "steam", name: "Steam", icon: "♨️", isFeatured: true, children: ["Steam Keys", "Steam Gifts", "Steam Accounts", "DLC", "Season Pass", "Внутриигровая валюта"] },
  { slug: "playstation", name: "PlayStation", icon: "🎯", isFeatured: true, children: ["PS5", "PS4", "DLC", "Подписки", "Игровая валюта"] },
  { slug: "xbox", name: "Xbox", icon: "🟢", isFeatured: true, children: ["Xbox Series X/S", "Xbox One", "DLC", "Game Pass", "Игровая валюта"] },
  { slug: "nintendo", name: "Nintendo", icon: "🍄", isFeatured: true, children: ["Nintendo Switch", "DLC", "Подписки"] },
  { slug: "pc", name: "ПК Игры", icon: "💻", isFeatured: true, children: ["Steam", "EA App", "Ubisoft Connect", "Rockstar Games", "Battle.net", "Epic Games"] },
  { slug: "subscriptions", name: "Подписки", icon: "♻️", isFeatured: true, children: ["Game Pass", "PlayStation Plus", "Nintendo Online", "EA Play", "Ubisoft Plus"] },
  { slug: "gift-cards", name: "Подарочные карты", icon: "💳", isFeatured: true, children: ["Steam Wallet", "Xbox Gift Card", "PlayStation Gift Card", "Nintendo Gift Card", "Другие карты"] },
  { slug: "software", name: "Программное обеспечение", icon: "🧩", children: ["Windows", "Microsoft Office", "Антивирусы", "VPN", "Утилиты", "Графические редакторы"] },
];

const genres = ["Экшен", "Приключения", "RPG", "Стратегии", "Симуляторы", "Гонки", "Спорт", "Выживание", "Онлайн игры", "Инди"];

function slugify(text, fallback) {
  const map = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  return text.toLowerCase().replace(/[а-яё]/g, (c) => map[c] ?? c).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || fallback;
}

async function upsertNode(node, kind, parentId, sortOrder) {
  const now = new Date();
  const row = await prisma.category.upsert({
    where: { slug: node.slug },
    create: { slug: node.slug, name: node.name, kind, icon: node.icon, isFeatured: !!node.isFeatured, parentId, sortOrder, updatedAt: now },
    update: { name: node.name, kind, icon: node.icon, isFeatured: !!node.isFeatured, parentId, sortOrder, updatedAt: now },
  });
  for (const [index, childName] of (node.children ?? []).entries()) {
    await upsertNode({ slug: `${node.slug}-${slugify(childName, String(index))}`, name: childName, icon: node.icon }, kind, row.id, index);
  }
}

async function main() {
  const now = new Date();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role: "ADMIN" },
      update: { passwordHash, role: "ADMIN" },
    });
    console.log(`[bootstrap] admin ready: ${email}`);
  } else {
    console.warn("[bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD not set; admin login will not be created");
  }

  for (const [index, node] of categories.entries()) await upsertNode(node, "CATEGORY", null, index);
  for (const [index, name] of genres.entries()) await upsertNode({ slug: `g-${slugify(name, String(index))}`, name, icon: "🎮", isFeatured: index < 4 }, "GENRE", null, index);

  await prisma.importState.upsert({
    where: { source: "DIGISELLER" },
    create: { source: "DIGISELLER", updatedAt: now },
    update: { updatedAt: now },
  });

  const totalCategories = await prisma.category.count();
  const totalProducts = await prisma.product.count();
  console.log(`[bootstrap] ready: ${totalCategories} categories, ${totalProducts} products`);
}

main().catch((error) => {
  console.error("[bootstrap] failed", error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});