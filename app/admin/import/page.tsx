import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getImportState, setImportStatus } from "@/lib/importers/scanner";
import { retryStats, listFailed, clearFailed } from "@/lib/importers/retryQueue";
import { importByUrl } from "@/lib/importers/manual";

export const dynamic = "force-dynamic";


// Пресеты скорости импорта (как требует ТЗ: адаптивная стратегия)
const SPEED_PROFILES = {
  low:    { concurrency: 1, delayMs: 600_000, label: "Низкая — 1 товар / 10 мин" },
  medium: { concurrency: 5, delayMs: 1_800_000, label: "Средняя — 5 товаров / 30 мин" },
  high:   { concurrency: 10, delayMs: 1_800_000, label: "Высокая — 10 товаров / 30 мин" },
  fast:   { concurrency: 5, delayMs: 2_000, label: "Максимум — 5 / 2 сек (только тесты)" },
} as const;
type ProfileKey = keyof typeof SPEED_PROFILES;

export default async function ImportPage() {
  const state = await getImportState();
  const [recent, retry, failed, importedToday] = await Promise.all([
    prisma.importLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    retryStats().catch(() => ({ pending: 0, due: 0, failed: 0 })),
    listFailed(20).catch(() => []),
    prisma.importLog.count({
      where: {
        source: "DIGISELLER",
        createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
        status: { in: ["IMPORTED", "UPDATED"] },
      },
    }),
  ]);

  const jar = await cookies();
  const flashRaw = jar.get(MANUAL_FLASH)?.value;
  let manualFlash: { ok: boolean; message: string; slug?: string } | null = null;
  if (flashRaw) {
    try { manualFlash = JSON.parse(decodeURIComponent(flashRaw)); } catch { /* ignore */ }
    jar.set(MANUAL_FLASH, "", { path: "/admin", maxAge: 0 });
  }

  async function manualImport(formData: FormData) {
    "use server";
    const url = String(formData.get("url") ?? "").trim();
    const r = await importByUrl(url);
    const flash = r.ok
      ? { ok: true, message: `${r.action === "IMPORTED" ? "Добавлен" : "Обновлён"} (${r.source} #${r.externalId})`, slug: r.slug }
      : { ok: false, message: r.error };
    const c = await cookies();
    c.set(MANUAL_FLASH, encodeURIComponent(JSON.stringify(flash)), { path: "/admin", maxAge: 30, httpOnly: true });
    revalidatePath("/admin/import");
  }


  async function start(formData: FormData) {
    "use server";
    const startId = Math.max(1, Number(formData.get("startId") ?? 1));
    const maxIdRaw = String(formData.get("maxId") ?? "").trim();
    const maxId = maxIdRaw === "" || maxIdRaw === "0" ? null : Number(maxIdRaw);
    const concurrency = Math.min(50, Math.max(1, Number(formData.get("concurrency") ?? 1)));
    const delayMs = Math.max(0, Number(formData.get("delayMs") ?? 2000));
    const recheckHours = Math.max(1, Number(formData.get("recheckHours") ?? 24));
    const dailyLimit = Math.max(0, Number(formData.get("dailyLimit") ?? 200));

    await prisma.importState.update({
      where: { source: "DIGISELLER" },
      data: { status: "RUNNING", startId, maxId, concurrency, delayMs, recheckHours, dailyLimit, lastError: null },
    });
    revalidatePath("/admin/import");
  }

  async function applyProfile(formData: FormData) {
    "use server";
    const key = String(formData.get("profile") ?? "medium") as ProfileKey;
    const p = SPEED_PROFILES[key] ?? SPEED_PROFILES.medium;
    await prisma.importState.update({
      where: { source: "DIGISELLER" },
      data: { concurrency: p.concurrency, delayMs: p.delayMs, status: "RUNNING", lastError: null },
    });
    revalidatePath("/admin/import");
  }

  async function pause() { "use server"; await setImportStatus("PAUSED"); revalidatePath("/admin/import"); }
  async function resume() { "use server"; await setImportStatus("RUNNING", { lastError: null }); revalidatePath("/admin/import"); }
  async function reset() {
    "use server";
    await prisma.importState.update({
      where: { source: "DIGISELLER" },
      data: { status: "IDLE", cursorId: 0, totalChecked: 0, totalImported: 0, totalSkipped: 0, totalErrors: 0, lastError: null },
    });
    revalidatePath("/admin/import");
  }
  async function clearFailedAction() { "use server"; await clearFailed(); revalidatePath("/admin/import"); }

  const progress = state.maxId ? ((state.cursorId / state.maxId) * 100).toFixed(2) : null;
  const dailyLeft = state.dailyLimit > 0 ? Math.max(0, state.dailyLimit - importedToday) : null;

  return (
    <>
      <h1>Автоимпорт товаров</h1>
      <p className="muted">
        Бесконечный сканер ID Digiseller + Redis retry-очередь для ошибочных карточек (15&nbsp;мин → 1&nbsp;час → перенос в журнал ошибок).
        Курсор хранится в БД, импорт продолжается с того же ID после рестарта Docker.
      </p>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="num">{state.status}</div><div className="lbl">Статус</div></div>
        <div className="stat-card"><div className="num">{state.cursorId}</div><div className="lbl">Текущий ID</div></div>
        <div className="stat-card"><div className="num">{importedToday}</div><div className="lbl">Импортировано за 24ч</div></div>
        {dailyLeft !== null && <div className="stat-card"><div className="num">{dailyLeft}</div><div className="lbl">Осталось до лимита</div></div>}
        <div className="stat-card"><div className="num">{state.totalImported}</div><div className="lbl">Всего импортировано</div></div>
        <div className="stat-card"><div className="num">{state.totalChecked}</div><div className="lbl">Проверено всего</div></div>
        <div className="stat-card"><div className="num">{state.totalSkipped}</div><div className="lbl">Пропущено</div></div>
        <div className="stat-card"><div className="num">{state.totalErrors}</div><div className="lbl">Ошибок</div></div>
        <div className="stat-card"><div className="num">{retry.pending}</div><div className="lbl">В retry-очереди</div></div>
        <div className="stat-card"><div className="num">{retry.due}</div><div className="lbl">Готово к повтору</div></div>
        <div className="stat-card"><div className="num">{retry.failed}</div><div className="lbl">Окончательно провалено</div></div>
        {progress && <div className="stat-card"><div className="num">{progress}%</div><div className="lbl">Прогресс</div></div>}
      </div>

      {state.lastError && (
        <div style={{ marginTop: 12, padding: 12, background: "#3a1414", borderRadius: 8, color: "#ffb4b4" }}>
          Последняя ошибка: {state.lastError}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Добавить товар вручную</h2>
      <form action={manualImport} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          name="url"
          placeholder="https://plati.market/itm/5927800?ai=... или https://digiseller.ru/...id_d=12345"
          required
          style={{ flex: "1 1 480px", padding: 8 }}
        />
        <button className="btn" type="submit">＋ Импортировать</button>
      </form>
      {manualFlash && (
        <div style={{
          marginTop: 10, padding: "10px 12px", borderRadius: 6, fontSize: 14,
          background: manualFlash.ok ? "#10331a" : "#3a1414",
          color: manualFlash.ok ? "#b6f3c5" : "#ffb4b4",
        }}>
          {manualFlash.message}
          {manualFlash.ok && manualFlash.slug && (
            <> — <a href={`/product/${manualFlash.slug}`} target="_blank" rel="noreferrer">открыть страницу товара</a></>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Профиль скорости</h2>

      <form action={applyProfile} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select name="profile" defaultValue="medium" className="form-row" style={{ padding: 8 }}>
          {Object.entries(SPEED_PROFILES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button className="btn" type="submit">Применить профиль и запустить</button>
      </form>
      <p className="muted" style={{ fontSize: ".85rem" }}>
        Текущие значения: concurrency={state.concurrency}, delay={state.delayMs}мс.
      </p>

      <h2 style={{ marginTop: 32 }}>Ручные настройки</h2>
      <form action={start} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <div className="form-row"><label>Начальный ID</label><input type="number" name="startId" defaultValue={state.startId} min={1} /></div>
        <div className="form-row"><label>Конечный ID (пусто = бесконечно)</label><input type="number" name="maxId" defaultValue={state.maxId ?? ""} min={0} /></div>
        <div className="form-row"><label>Параллельных запросов</label><input type="number" name="concurrency" defaultValue={state.concurrency} min={1} max={50} /></div>
        <div className="form-row"><label>Пауза между батчами, мс</label><input type="number" name="delayMs" defaultValue={state.delayMs} min={0} /></div>
        <div className="form-row"><label>Лимит импортов в сутки (0 = без лимита)</label><input type="number" name="dailyLimit" defaultValue={state.dailyLimit} min={0} /></div>
        <div className="form-row"><label>Период ре-чека существующих, часов</label><input type="number" name="recheckHours" defaultValue={state.recheckHours} min={1} /></div>
        <button className="btn" type="submit">▶ Запустить / Применить</button>
      </form>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <form action={resume}><button className="btn" type="submit">▶ Возобновить</button></form>
        <form action={pause}><button className="btn btn-secondary" type="submit">⏸ Пауза</button></form>
        <form action={reset}><button className="btn btn-secondary" type="submit">⟲ Сбросить курсор</button></form>
        <form action={clearFailedAction}><button className="btn btn-secondary" type="submit">🗑 Очистить журнал провалов</button></form>
      </div>

      {failed.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Окончательно провалившиеся (после 3 попыток)</h2>
          <table className="data-table">
            <thead><tr><th>ID товара</th><th>Попыток</th><th>Когда</th><th>Ошибка</th></tr></thead>
            <tbody>
              {failed.map((f, i) => (
                <tr key={i}>
                  <td>{f.id}</td>
                  <td>{f.attempt}</td>
                  <td>{f.at ? new Date(f.at).toISOString().replace("T", " ").slice(0, 19) : ""}</td>
                  <td className="muted">{f.lastError ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 style={{ marginTop: 32 }}>Последние события</h2>
      <table className="data-table">
        <thead><tr><th>Время</th><th>ID</th><th>Статус</th><th>Сообщение</th></tr></thead>
        <tbody>
          {recent.map((l) => (
            <tr key={l.id}>
              <td>{l.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
              <td>{l.externalId}</td>
              <td>{l.status}</td>
              <td className="muted">{l.message ?? ""}</td>
            </tr>
          ))}
          {recent.length === 0 && <tr><td colSpan={4} className="muted">Пока пусто.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
