import { getSettings, saveSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const s = await getSettings();

  async function save(formData: FormData) {
    "use server";
    await saveSettings({
      affiliateId: String(formData.get("affiliateId") ?? ""),
      syncIntervalMinutes: Number(formData.get("syncIntervalMinutes") ?? 60),
      sources: {
        digiseller: {
          enabled: formData.get("digiseller_enabled") === "on",
          urlTemplate: String(formData.get("digiseller_template") ?? "{base}{sep}partner_id={affiliateId}"),
        },
        plati: {
          enabled: formData.get("plati_enabled") === "on",
          urlTemplate: String(formData.get("plati_template") ?? "{base}{sep}ai={affiliateId}"),
        },
      },
      seo: {
        siteTitle: String(formData.get("seo_title") ?? ""),
        siteDescription: String(formData.get("seo_desc") ?? ""),
        defaultOgImage: String(formData.get("seo_og") ?? ""),
      },
    });
    revalidatePath("/admin/settings");
  }

  return (
    <>
      <h1>Настройки</h1>
      <form action={save}>
        <h2>Партнёрская программа</h2>
        <div className="form-row">
          <label>Партнёрский ID (подставляется как <code>ai=...</code> или <code>partner_id=...</code>)</label>
          <input name="affiliateId" defaultValue={s.affiliateId} />
        </div>
        <div className="form-row">
          <label>Интервал синхронизации (мин)</label>
          <input type="number" name="syncIntervalMinutes" defaultValue={s.syncIntervalMinutes} min={5} />
        </div>

        <h2>Источники товаров</h2>
        <div className="form-row">
          <label>
            <input type="checkbox" name="digiseller_enabled" defaultChecked={s.sources.digiseller.enabled} />{" "}
            Digiseller включён
          </label>
        </div>
        <div className="form-row">
          <label>Шаблон ссылки Digiseller</label>
          <input name="digiseller_template" defaultValue={s.sources.digiseller.urlTemplate} />
        </div>
        <div className="form-row">
          <label>
            <input type="checkbox" name="plati_enabled" defaultChecked={s.sources.plati.enabled} />{" "}
            Plati.market включён
          </label>
        </div>
        <div className="form-row">
          <label>Шаблон ссылки Plati</label>
          <input name="plati_template" defaultValue={s.sources.plati.urlTemplate} />
        </div>
        <p className="muted">
          В шаблоне доступны переменные: <code>{"{base}"}</code>, <code>{"{sep}"}</code> (? или &), <code>{"{affiliateId}"}</code>.
        </p>

        <h2>SEO</h2>
        <div className="form-row">
          <label>Title сайта</label>
          <input name="seo_title" defaultValue={s.seo.siteTitle} />
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea name="seo_desc" defaultValue={s.seo.siteDescription} rows={3} />
        </div>
        <div className="form-row">
          <label>OG-картинка по умолчанию (URL)</label>
          <input name="seo_og" defaultValue={s.seo.defaultOgImage} />
        </div>

        <button className="btn" type="submit">Сохранить</button>
      </form>
    </>
  );
}
