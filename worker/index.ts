// Standalone-воркер автоимпорта.
// Один Docker-сервис (importer) запускает этот файл и крутится 24/7:
//   1) если ImportState.status === RUNNING — продолжает бесконечный скан ID;
//   2) каждый час делает ре-чек самых старых импортированных товаров.
// Курсор хранится в БД, поэтому после рестарта импорт продолжается с того же места.
import { prisma } from "../lib/prisma";
import { ensureInitialAdmin } from "../lib/auth";
import { runScanner, recheckExisting, getImportState, processRetryQueue } from "../lib/importers/scanner";
import { seedTaxonomy } from "../lib/seed/taxonomy";

const RECHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 час
const RETRY_INTERVAL_MS = 60 * 1000;         // раз в минуту дренируем retry-очередь
const IDLE_POLL_MS = 10_000;


async function main() {
  console.log("[importer] starting");
  await ensureInitialAdmin().catch((e) => console.error("[importer] admin init failed", e));
  await seedTaxonomy().catch((e) => console.error("[importer] seed failed", e));

  // Гарантируем строку состояния
  await getImportState();

  let lastRecheckAt = 0;

  // Главный цикл: пока процесс жив — пытаемся работать
  while (true) {
    try {
      const state = await getImportState();

      if (state.status === "RUNNING") {
        // Один runScanner работает бесконечно, пока статус RUNNING
        await runScanner();
      } else {
        // Ничего не делаем активно, ждём команду из админки
        await sleep(IDLE_POLL_MS);
      }

      // Периодический ре-чек существующих товаров
      if (Date.now() - lastRecheckAt > RECHECK_INTERVAL_MS) {
        lastRecheckAt = Date.now();
        try {
          const n = await recheckExisting(200);
          if (n > 0) console.log(`[importer] re-checked ${n} existing products`);
        } catch (e) {
          console.error("[importer] re-check failed", e);
        }
      }
    } catch (e: any) {
      console.error("[importer] loop error", e?.message ?? e);
      await prisma.importState.update({
        where: { source: "DIGISELLER" },
        data: { status: "ERROR", lastError: String(e?.message ?? e) },
      }).catch(() => {});
      await sleep(15_000);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error("[importer] fatal", e);
  process.exit(1);
});
