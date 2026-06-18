"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MegaItem } from "@/lib/megaMenu";

export function SiteHeader({ mega }: { mega: { categories: MegaItem[]; genres: MegaItem[] } }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState<null | "cat" | "genre">(null);
  const prefix = locale === "ru" ? "" : `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = () => setMegaOpen(null);
    window.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return () => window.removeEventListener("keydown", close);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`${prefix}/search?q=${encodeURIComponent(q.trim())}`);
  }

  const active = megaOpen === "cat" ? mega.categories : megaOpen === "genre" ? mega.genres : null;

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`} onMouseLeave={() => setMegaOpen(null)}>
      <div className="container header-inner">
        <Link href={`${prefix}/`} className="logo">
          <span className="logo-mark" aria-hidden />
          <span>{t("site.name")}</span>
        </Link>

        <nav className="main-nav">
          <Link href={`${prefix}/catalog`}>{t("nav.catalog")}</Link>
          <button
            type="button"
            className="nav-trigger"
            aria-expanded={megaOpen === "cat"}
            onMouseEnter={() => setMegaOpen("cat")}
            onFocus={() => setMegaOpen("cat")}
            onClick={() => setMegaOpen(megaOpen === "cat" ? null : "cat")}
          >
            {t("nav.categories")} <span aria-hidden>▾</span>
          </button>
          <button
            type="button"
            className="nav-trigger"
            aria-expanded={megaOpen === "genre"}
            onMouseEnter={() => setMegaOpen("genre")}
            onFocus={() => setMegaOpen("genre")}
            onClick={() => setMegaOpen(megaOpen === "genre" ? null : "genre")}
          >
            Жанры <span aria-hidden>▾</span>
          </button>
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

      {active && active.length > 0 && (
        <div className="mega-menu" onMouseEnter={() => {}}>
          <div className="container mega-grid">
            {active.map((c) => (
              <div key={c.id} className="mega-col">
                <Link href={`${prefix}/category/${c.slug}`} className="mega-title" onClick={() => setMegaOpen(null)}>
                  <span aria-hidden>{c.icon}</span> {c.name}
                </Link>
                <ul>
                  {c.children.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <Link href={`${prefix}/category/${s.slug}`} onClick={() => setMegaOpen(null)}>
                        {s.icon} {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

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
