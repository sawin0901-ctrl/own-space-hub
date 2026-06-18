import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getImportState, setImportStatus } from "@/lib/importers/scanner";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const state = await getImportState();
  const recent = await prisma.importLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

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
      data: {
        status: "RUNNING",
        startId,
        maxId,
        concurrency,
        delayMs,
        recheckHours,
        dailyLimit,
        lastError: null,
      },
    });
    revalidatePath("/admin/import");
  }

  async function pause() {
    "use server";
    await setImportStatus("PAUSED");
    revalidatePath("/admin/import");
  }

  async function reset() {
    "use server";
    await prisma.importState.update({
      where: { source: "DIGISELLER" },
      data: {
        status: "IDLE",
        cursorId: 0,
        totalChecked: 0,
        totalImported: 0,
        totalSkipped: 0,
        totalErrors: 0,
        lastError: null,
      },
    });
    revalidatePath("/admin/import");
  }

  const progress = state.maxId ? ((state.cursorId / state.maxId) * 100).toFixed(2) : null;

  return (
    <>
      <h1>Автоимпорт товаров</h1>
      <p className="muted">
        Бесконечный сканер ID Digiseller. Воркер забирает курсор из БД и продолжает с последнего проверенного ID
        после рестарта Docker.
      </p>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="num">{state.status}</div><div className="lbl">Статус</div></div>
        <div className="stat-card"><div className="num">{state.cursorId}</div><div className="lbl">Текущий ID</div></div>
        <div className="stat-card"><div className="num">{state.totalImported}</div><div className="lbl">Импортировано</div></div>
        <div className="stat-card"><div className="num">{state.totalChecked}</div><div className="lbl">Проверено всего</div></div>
        <div className="stat-card"><div className="num">{state.totalSkipped}</div><div className="lbl">Пропущено</div></div>
        <div className="stat-card"><div className="num">{state.totalErrors}</div><div className="lbl">Ошибок</div></div>
        {progress && <div className="stat-card"><div className="num">{progress}%</div><div className="lbl">Прогресс</div></div>}
      </div>

      {state.lastError && (
        <div style={{ marginTop: 12, padding: 12, background: "#3a1414", borderRadius: 8, color: "#ffb4b4" }}>
          Последняя ошибка: {state.lastError}
        </div>
      )}

      <form action={start} style={{ marginTop: 24, display: "grid", gap: 12, maxWidth: 560 }}>
        <h3>Настройки запуска</h3>
        <div className="form-row">
          <label>Начальный ID</label>
          <input type="number" name="startId" defaultValue={state.startId} min={1} />
        </div>
        <div className="form-row">
          <label>Конечный ID (пусто = бесконечно)</label>
          <input type="number" name="maxId" defaultValue={state.maxId ?? ""} min={0} />
        </div>
        <div className="form-row">
          <label>Параллельных запросов</label>
          <input type="number" name="concurrency" defaultValue={state.concurrency} min={1} max={50} />
        </div>
        <div className="form-row">
          <label>Пауза между батчами, мс</label>
          <input type="number" name="delayMs" defaultValue={state.delayMs} min={0} />
        </div>
        <div className="form-row">
          <label>Лимит импортов в сутки (0 = без лимита)</label>
          <input type="number" name="dailyLimit" defaultValue={state.dailyLimit} min={0} />
        </div>
        <div className="form-row">
          <label>Период ре-чека существующих, часов</label>
          <input type="number" name="recheckHours" defaultValue={state.recheckHours} min={1} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">▶ Запустить / Применить</button>
        </div>
      </form>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <form action={pause}><button className="btn btn-secondary" type="submit">⏸ Пауза</button></form>
        <form action={reset}><button className="btn btn-secondary" type="submit">⟲ Сбросить курсор</button></form>
      </div>

      <h2 style={{ marginTop: 32 }}>Последние события</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>ID</th>
            <th>Статус</th>
            <th>Сообщение</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((l: typeof recent[number]) => (
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
