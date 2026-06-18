import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["ru", "en", "uk", "de"] as const;
export const defaultLocale = "ru" as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) notFound();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
