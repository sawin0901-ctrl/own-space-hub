import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const config = {
  // Не трогаем api, _next, admin и файлы с расширениями.
  matcher: ["/((?!api|_next|admin|sitemap.xml|robots.txt|.*\\..*).*)"],
};
