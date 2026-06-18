// Redis-очередь повторных попыток импорта.
// ZSET ключ → score = unix-ms когда повторить, member = JSON {id, attempt}.
// Алгоритм: 1-я ошибка → +15 мин, 2-я → +1 час, 3+ → переносим в «failed» список (admin-видим).
import { redis } from "../redis";

const KEY_RETRY = "gp:import:retry:digiseller";
const KEY_FAILED = "gp:import:failed:digiseller";
const MAX_ATTEMPTS = 3;

type RetryItem = { id: number; attempt: number; lastError?: string };

const DELAYS_MS = [
  15 * 60_000,      // attempt 1 → ждём 15 мин до 2-й попытки
  60 * 60_000,      // attempt 2 → 1 час до 3-й попытки
];

export async function enqueueRetry(id: number, message?: string, prevAttempt = 0): Promise<"queued" | "failed"> {
  const attempt = prevAttempt + 1;
  if (attempt > MAX_ATTEMPTS) {
    await redis.lpush(KEY_FAILED, JSON.stringify({ id, attempt, lastError: message ?? null, at: Date.now() }));
    await redis.ltrim(KEY_FAILED, 0, 999);
    return "failed";
  }
  const delayMs = DELAYS_MS[attempt - 1] ?? DELAYS_MS[DELAYS_MS.length - 1];
  const score = Date.now() + delayMs;
  const member: RetryItem = { id, attempt, lastError: message };
  await redis.zadd(KEY_RETRY, score, JSON.stringify(member));
  return "queued";
}

/** Снять из очереди все элементы, которым уже пора (score <= now). */
export async function popDue(limit = 20): Promise<RetryItem[]> {
  const now = Date.now();
  const raw = await redis.zrangebyscore(KEY_RETRY, 0, now, "LIMIT", 0, limit);
  if (!raw.length) return [];
  // Удаляем то, что забрали (best-effort, дубли вторично не страшны — upsert).
  await redis.zrem(KEY_RETRY, ...raw);
  return raw
    .map((s) => { try { return JSON.parse(s) as RetryItem; } catch { return null; } })
    .filter((x): x is RetryItem => !!x);
}

export async function retryStats(): Promise<{ pending: number; due: number; failed: number }> {
  const now = Date.now();
  const [pending, due, failed] = await Promise.all([
    redis.zcard(KEY_RETRY),
    redis.zcount(KEY_RETRY, 0, now),
    redis.llen(KEY_FAILED),
  ]);
  return { pending, due, failed };
}

export async function listFailed(limit = 50): Promise<Array<{ id: number; attempt: number; lastError?: string; at?: number }>> {
  const raw = await redis.lrange(KEY_FAILED, 0, limit - 1);
  return raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

export async function clearFailed(): Promise<void> {
  await redis.del(KEY_FAILED);
}

export { MAX_ATTEMPTS };
