import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, string> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (e: any) {
    checks.db = `error: ${e?.message ?? e}`;
  }
  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG" ? "ok" : pong;
  } catch (e: any) {
    checks.redis = `error: ${e?.message ?? e}`;
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
