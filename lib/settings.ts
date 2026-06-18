import { prisma } from "./prisma";

export type AppSettings = {
  affiliateId: string;
  syncIntervalMinutes: number;
  sources: {
    digiseller: { enabled: boolean; urlTemplate: string };
    plati: { enabled: boolean; urlTemplate: string };
  };
  seo: {
    siteTitle: string;
    siteDescription: string;
    defaultOgImage: string;
  };
  banners: Array<{ id: string; image: string; href: string; title?: string; position: string }>;
};

const DEFAULTS: AppSettings = {
  affiliateId: process.env.DEFAULT_AFFILIATE_ID ?? "",
  syncIntervalMinutes: Number(process.env.SYNC_INTERVAL_MINUTES ?? 60),
  sources: {
    // {base} — исходный URL товара (Product.affiliateUrl). {affiliateId} — партнёрский ID.
    digiseller: { enabled: true, urlTemplate: "{base}{sep}partner_id={affiliateId}" },
    plati: { enabled: true, urlTemplate: "{base}{sep}ai={affiliateId}" },
  },
  seo: {
    siteTitle: "GamePlaza.site — каталог цифровых игр и ключей",
    siteDescription:
      "Каталог цифровых товаров: игры, ключи активации, подписки. Лучшие цены проверенных продавцов.",
    defaultOgImage: "",
  },
  banners: [],
};

const SETTINGS_KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return DEFAULTS;
    return { ...DEFAULTS, ...(row.value as Partial<AppSettings>) } as AppSettings;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch } as AppSettings;
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next as object },
    update: { value: next as object },
  });
  return next;
}

export function buildAffiliateUrl(
  baseUrl: string,
  affiliateId: string,
  template: string,
): string {
  if (!affiliateId) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return template
    .replace("{base}", baseUrl)
    .replace("{sep}", sep)
    .replace("{affiliateId}", encodeURIComponent(affiliateId));
}
