import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="site-footer">
      <div className="container">
        <p>{t("footer.about")}</p>
        <p className="muted">© {new Date().getFullYear()} {t("site.name")} — {t("footer.rights")}</p>
      </div>
    </footer>
  );
}
