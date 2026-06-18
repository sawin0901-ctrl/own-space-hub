"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const prefix = locale === "ru" ? "" : `/${locale}`;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`${prefix}/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={`${prefix}/`} className="logo">{t("site.name")}</Link>
        <nav className="main-nav">
          <Link href={`${prefix}/`}>{t("nav.home")}</Link>
          <Link href={`${prefix}/catalog`}>{t("nav.catalog")}</Link>
          <Link href={`${prefix}/categories`}>{t("nav.categories")}</Link>
        </nav>
        <form className="search-form" onSubmit={onSubmit}>
          <input
            type="search"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">{t("search.submit")}</button>
        </form>
      </div>
    </header>
  );
}
