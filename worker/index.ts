// Standalone-воркер: cron-синхронизация товаров. Запускается отдельным процессом.
import cron from "node-cron";
import { runSync } from "../lib/importers/sync";
import { getSettings } from "../lib/settings";
import { ensureInitialAdmin } from "../lib/auth";

async function main() {
  console.log("[worker] starting");
  await ensureInitialAdmin().catch((e) => console.error("[worker] admin init failed", e));

  const settings = await getSettings();
  const interval = Math.max(5, settings.syncIntervalMinutes);
  console.log(`[worker] sync interval = ${interval} min`);

  // первый запуск через минуту после старта, чтобы дать БД подняться
  setTimeout(() => runOnce(), 60_000);

  cron.schedule(`*/${interval} * * * *`, runOnce);
}

async function runOnce() {
  console.log(`[worker] sync started at ${new Date().toISOString()}`);
  try {
    const res = await runSync();
    console.log("[worker] sync done", res);
  } catch (e) {
    console.error("[worker] sync failed", e);
  }
}

main().catch((e) => {
  console.error("[worker] fatal", e);
  process.exit(1);
});
