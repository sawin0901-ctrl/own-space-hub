import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, string> = { status: "ok" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.postgres = "ok";
  } catch {
    result.postgres = "down";
    result.status = "degraded";
  }
  try {
    await redis.ping();
    result.redis = "ok";
  } catch {
    result.redis = "down";
    result.status = "degraded";
  }
  return NextResponse.json(result);
}
