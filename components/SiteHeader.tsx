"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefix = locale === "ru" ? "" : `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`${prefix}/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-inner">
        <Link href={`${prefix}/`} className="logo">
          <span className="logo-mark" aria-hidden />
          <span>{t("site.name")}</span>
        </Link>

        <nav className="main-nav">
          <Link href={`${prefix}/catalog`}>{t("nav.catalog")}</Link>
          <Link href={`${prefix}/categories`}>{t("nav.categories")}</Link>
          <Link href={`${prefix}/catalog?sort=new`}>{t("nav.new")}</Link>
          <Link href={`${prefix}/catalog?sort=price_asc`}>{t("nav.deals")}</Link>
        </nav>

        <form className="search-form" onSubmit={onSubmit} role="search">
          <span className="search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("search.submit")}
          />
        </form>

        <div className="header-actions">
          <Link href="/admin" className="icon-btn" aria-label={t("nav.account")}>
            <span aria-hidden>👤</span>
          </Link>
        </div>

        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          <Link href={`${prefix}/catalog`} onClick={() => setOpen(false)}>{t("nav.catalog")}</Link>
          <Link href={`${prefix}/categories`} onClick={() => setOpen(false)}>{t("nav.categories")}</Link>
          <Link href={`${prefix}/catalog?sort=new`} onClick={() => setOpen(false)}>{t("nav.new")}</Link>
          <Link href={`${prefix}/catalog?sort=price_asc`} onClick={() => setOpen(false)}>{t("nav.deals")}</Link>
          <Link href="/admin" onClick={() => setOpen(false)}>{t("nav.account")}</Link>
        </div>
      )}
    </header>
  );
}
