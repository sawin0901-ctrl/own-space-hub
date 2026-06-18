import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col footer-brand">
          <div className="logo">
            <span className="logo-mark" aria-hidden />
            <span>{t("site.name")}</span>
          </div>
          <p className="muted">{t("footer.about")}</p>
        </div>

        <div className="footer-col">
          <h4>{t("footer.company")}</h4>
          <Link href="/about">{t("footer.company")}</Link>
          <Link href="/contact">{t("footer.contacts")}</Link>
        </div>

        <div className="footer-col">
          <h4>{t("footer.support")}</h4>
          <Link href="/faq">{t("footer.faq")}</Link>
          <Link href="/contact">{t("footer.contacts")}</Link>
        </div>

        <div className="footer-col">
          <h4>{t("footer.legal")}</h4>
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <Link href="/terms">{t("footer.terms")}</Link>
          <Link href="/sitemap.xml">{t("footer.sitemap")}</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span className="muted">© {year} {t("site.name")} — {t("footer.rights")}</span>
        <div className="socials">
          <a href="#" aria-label="Telegram" className="social-btn">TG</a>
          <a href="#" aria-label="VK" className="social-btn">VK</a>
          <a href="#" aria-label="Discord" className="social-btn">DC</a>
        </div>
      </div>
    </footer>
  );
}
