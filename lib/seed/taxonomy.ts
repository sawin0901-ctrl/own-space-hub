// Полная таксономия категорий и жанров GamePlaza.site.
// Идемпотентный сид: можно запускать многократно — добавит только отсутствующее.
import { prisma } from "../prisma";
import type { CategoryKind } from "@prisma/client";

type Node = {
  slug: string;
  name: string;
  icon?: string;
  image?: string;
  description?: string;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  children?: Node[];
};

const CATEGORIES: Node[] = [
  {
    slug: "games", name: "Игры", icon: "🎮", isFeatured: true,
    seoTitle: "Игры — цифровые ключи и аккаунты",
    seoDescription: "Купить лицензионные игры в цифровом виде: новинки, популярные, предзаказы и скидки.",
    children: [
      { slug: "games-new", name: "Новинки", icon: "🆕" },
      { slug: "games-popular", name: "Популярные", icon: "🔥" },
      { slug: "games-preorder", name: "Предзаказы", icon: "📅" },
      { slug: "games-free", name: "Бесплатные игры", icon: "🆓" },
      { slug: "games-sale", name: "Игры со скидкой", icon: "💸" },
    ],
  },
  {
    slug: "steam", name: "Steam", icon: "♨️", isFeatured: true,
    seoTitle: "Steam — ключи, аккаунты, подарки, DLC",
    seoDescription: "Steam Keys, Steam Gifts, Steam Accounts, DLC, Season Pass и внутриигровая валюта.",
    children: [
      { slug: "steam-keys", name: "Steam Keys", icon: "🔑" },
      { slug: "steam-gifts", name: "Steam Gifts", icon: "🎁" },
      { slug: "steam-accounts", name: "Steam Accounts", icon: "👤" },
      { slug: "steam-dlc", name: "DLC", icon: "➕" },
      { slug: "steam-season-pass", name: "Season Pass", icon: "🎟️" },
      { slug: "steam-currency", name: "Внутриигровая валюта", icon: "💰" },
    ],
  },
  {
    slug: "playstation", name: "PlayStation", icon: "🎯", isFeatured: true,
    seoTitle: "PlayStation — игры, подписки, валюта",
    seoDescription: "PS5, PS4, DLC, подписки PlayStation Plus и игровая валюта.",
    children: [
      { slug: "ps5", name: "PS5", icon: "5️⃣" },
      { slug: "ps4", name: "PS4", icon: "4️⃣" },
      { slug: "ps-dlc", name: "DLC", icon: "➕" },
      { slug: "ps-subscriptions", name: "Подписки", icon: "♻️" },
      { slug: "ps-currency", name: "Игровая валюта", icon: "💰" },
    ],
  },
  {
    slug: "xbox", name: "Xbox", icon: "🟢", isFeatured: true,
    seoTitle: "Xbox — игры, Game Pass, валюта",
    seoDescription: "Xbox Series X/S, Xbox One, DLC, Xbox Game Pass и игровая валюта.",
    children: [
      { slug: "xbox-series", name: "Xbox Series X/S", icon: "🟩" },
      { slug: "xbox-one", name: "Xbox One", icon: "🔳" },
      { slug: "xbox-dlc", name: "DLC", icon: "➕" },
      { slug: "xbox-game-pass", name: "Game Pass", icon: "🎫" },
      { slug: "xbox-currency", name: "Игровая валюта", icon: "💰" },
    ],
  },
  {
    slug: "nintendo", name: "Nintendo", icon: "🍄", isFeatured: true,
    seoTitle: "Nintendo Switch — игры, DLC, подписки",
    seoDescription: "Игры для Nintendo Switch, DLC и подписки Nintendo Online.",
    children: [
      { slug: "switch", name: "Nintendo Switch", icon: "🕹️" },
      { slug: "nintendo-dlc", name: "DLC", icon: "➕" },
      { slug: "nintendo-subscriptions", name: "Подписки", icon: "♻️" },
    ],
  },
  {
    slug: "pc", name: "ПК Игры", icon: "💻", isFeatured: true,
    seoTitle: "ПК Игры — Steam, EA, Ubisoft, Epic, Battle.net",
    seoDescription: "Игры для PC во всех магазинах: Steam, EA App, Ubisoft Connect, Rockstar, Battle.net, Epic Games.",
    children: [
      { slug: "pc-steam", name: "Steam", icon: "♨️" },
      { slug: "pc-ea", name: "EA App", icon: "🅴" },
      { slug: "pc-ubisoft", name: "Ubisoft Connect", icon: "🅄" },
      { slug: "pc-rockstar", name: "Rockstar Games", icon: "⭐" },
      { slug: "pc-battlenet", name: "Battle.net", icon: "⚔️" },
      { slug: "pc-epic", name: "Epic Games", icon: "🅴" },
    ],
  },
  {
    slug: "subscriptions", name: "Подписки", icon: "♻️", isFeatured: true,
    seoTitle: "Игровые подписки — Game Pass, PS Plus, EA Play",
    seoDescription: "Подписки на игровые сервисы: Xbox Game Pass, PlayStation Plus, Nintendo Online, EA Play, Ubisoft+.",
    children: [
      { slug: "sub-game-pass", name: "Game Pass", icon: "🎫" },
      { slug: "sub-ps-plus", name: "PlayStation Plus", icon: "➕" },
      { slug: "sub-nintendo-online", name: "Nintendo Online", icon: "🌐" },
      { slug: "sub-ea-play", name: "EA Play", icon: "🅴" },
      { slug: "sub-ubisoft-plus", name: "Ubisoft Plus", icon: "🅄" },
    ],
  },
  {
    slug: "gift-cards", name: "Подарочные карты", icon: "💳", isFeatured: true,
    seoTitle: "Подарочные карты — Steam, Xbox, PlayStation, Nintendo",
    seoDescription: "Цифровые подарочные карты для пополнения игровых кошельков.",
    children: [
      { slug: "gc-steam", name: "Steam Wallet", icon: "♨️" },
      { slug: "gc-xbox", name: "Xbox Gift Card", icon: "🟢" },
      { slug: "gc-ps", name: "PlayStation Gift Card", icon: "🎯" },
      { slug: "gc-nintendo", name: "Nintendo Gift Card", icon: "🍄" },
      { slug: "gc-other", name: "Другие карты", icon: "💳" },
    ],
  },
  {
    slug: "software", name: "Программное обеспечение", icon: "🧩",
    seoTitle: "Программное обеспечение — Windows, Office, антивирусы, VPN",
    seoDescription: "Лицензионное ПО: Windows, Microsoft Office, антивирусы, VPN, утилиты и графика.",
    children: [
      { slug: "sw-windows", name: "Windows", icon: "🪟" },
      { slug: "sw-office", name: "Microsoft Office", icon: "📊" },
      { slug: "sw-antivirus", name: "Антивирусы", icon: "🛡️" },
      { slug: "sw-vpn", name: "VPN", icon: "🌐" },
      { slug: "sw-utilities", name: "Утилиты", icon: "🔧" },
      { slug: "sw-graphics", name: "Графические редакторы", icon: "🎨" },
    ],
  },
];

const GENRES: Node[] = [
  { slug: "g-action", name: "Экшен", icon: "💥", isFeatured: true, children: [
    { slug: "g-shooters", name: "Шутеры", icon: "🔫" },
    { slug: "g-fighting", name: "Файтинги", icon: "🥊" },
    { slug: "g-slashers", name: "Слэшеры", icon: "🗡️" },
    { slug: "g-platformers", name: "Платформеры", icon: "🟦" },
  ]},
  { slug: "g-adventure", name: "Приключения", icon: "🗺️", isFeatured: true, children: [
    { slug: "g-quest", name: "Квесты", icon: "🧭" },
    { slug: "g-exploration", name: "Исследование мира", icon: "🌍" },
    { slug: "g-interactive-movie", name: "Интерактивное кино", icon: "🎬" },
  ]},
  { slug: "g-rpg", name: "RPG", icon: "⚔️", isFeatured: true, children: [
    { slug: "g-action-rpg", name: "Action RPG", icon: "🗡️" },
    { slug: "g-mmorpg", name: "MMORPG", icon: "🌐" },
    { slug: "g-jrpg", name: "JRPG", icon: "🎌" },
    { slug: "g-crpg", name: "CRPG", icon: "📜" },
  ]},
  { slug: "g-strategy", name: "Стратегии", icon: "♟️", isFeatured: true, children: [
    { slug: "g-rts", name: "RTS", icon: "⏱️" },
    { slug: "g-tbs", name: "TBS", icon: "⏳" },
    { slug: "g-grand-strategy", name: "Глобальные стратегии", icon: "🌐" },
    { slug: "g-citybuilder", name: "Градостроительные", icon: "🏙️" },
  ]},
  { slug: "g-simulation", name: "Симуляторы", icon: "🚜", children: [
    { slug: "g-car-sim", name: "Автосимуляторы", icon: "🚗" },
    { slug: "g-flight-sim", name: "Авиасимуляторы", icon: "✈️" },
    { slug: "g-farm", name: "Фермы", icon: "🌾" },
    { slug: "g-business-sim", name: "Бизнес-симуляторы", icon: "💼" },
  ]},
  { slug: "g-racing", name: "Гонки", icon: "🏎️", children: [
    { slug: "g-arcade-racing", name: "Аркадные", icon: "🕹️" },
    { slug: "g-sim-racing", name: "Реалистичные", icon: "🏁" },
    { slug: "g-moto", name: "Мотогонки", icon: "🏍️" },
  ]},
  { slug: "g-sports", name: "Спорт", icon: "🏆", children: [
    { slug: "g-football", name: "Футбол", icon: "⚽" },
    { slug: "g-basketball", name: "Баскетбол", icon: "🏀" },
    { slug: "g-hockey", name: "Хоккей", icon: "🏒" },
    { slug: "g-motorsport", name: "Автоспорт", icon: "🏁" },
  ]},
  { slug: "g-survival", name: "Выживание", icon: "🧟", children: [
    { slug: "g-survival-pure", name: "Survival", icon: "🔥" },
    { slug: "g-sandbox", name: "Sandbox", icon: "🟫" },
    { slug: "g-postapoc", name: "Постапокалипсис", icon: "☢️" },
  ]},
  { slug: "g-online", name: "Онлайн игры", icon: "🌐", isFeatured: true, children: [
    { slug: "g-mmo", name: "MMO", icon: "👥" },
    { slug: "g-moba", name: "MOBA", icon: "🛡️" },
    { slug: "g-battle-royale", name: "Battle Royale", icon: "🪂" },
    { slug: "g-coop", name: "Кооперативные игры", icon: "🤝" },
  ]},
  { slug: "g-indie", name: "Инди", icon: "✨", children: [
    { slug: "g-pixel", name: "Пиксельные игры", icon: "🟪" },
    { slug: "g-auteur", name: "Авторские проекты", icon: "🎨" },
    { slug: "g-retro", name: "Ретро игры", icon: "📺" },
  ]},
];

async function upsertNode(node: Node, kind: CategoryKind, parentId: string | null, order: number) {
  const cat = await prisma.category.upsert({
    where: { slug: node.slug },
    create: {
      slug: node.slug, name: node.name, kind,
      icon: node.icon, image: node.image, description: node.description,
      isFeatured: node.isFeatured ?? false,
      seoTitle: node.seoTitle, seoDescription: node.seoDescription,
      parentId, sortOrder: order,
    },
    update: {
      name: node.name, kind, icon: node.icon, image: node.image,
      description: node.description,
      isFeatured: node.isFeatured ?? false,
      seoTitle: node.seoTitle, seoDescription: node.seoDescription,
      parentId, sortOrder: order,
    },
  });
  if (node.children) {
    let i = 0;
    for (const ch of node.children) {
      await upsertNode(ch, kind, cat.id, i++);
    }
  }
}

export async function seedTaxonomy() {
  let i = 0;
  for (const n of CATEGORIES) await upsertNode(n, "CATEGORY", null, i++);
  i = 0;
  for (const n of GENRES) await upsertNode(n, "GENRE", null, i++);
  const total = await prisma.category.count();
  console.log(`[seed] taxonomy ready: ${total} categories/genres`);
}
