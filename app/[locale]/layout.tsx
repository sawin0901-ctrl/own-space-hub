import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSettings } from "@/lib/settings";
import "../globals.css";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  try {
    const { locale } = await params;
    const settings = await getSettings();
    const t = await getTranslations({ locale });
    return {
      title: { default: settings.seo.siteTitle, template: `%s — ${t("site.name")}` },
      description: settings.seo.siteDescription,
      openGraph: {
        title: settings.seo.siteTitle,
        description: settings.seo.siteDescription,
        images: settings.seo.defaultOgImage ? [settings.seo.defaultOgImage] : undefined,
        type: "website",
        siteName: t("site.name"),
      },
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, l === "ru" ? "/" : `/${l}`])),
      },
    };
  } catch {
    return {};
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
