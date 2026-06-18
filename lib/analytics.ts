import { createHash } from "crypto";
import { prisma } from "./prisma";

function hashIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.IP_HASH_SALT ?? "salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function extractIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}

export async function trackView(productId: string, headers: Headers) {
  try {
    await prisma.productView.create({
      data: {
        productId,
        ipHash: hashIp(extractIp(headers)),
        userAgent: headers.get("user-agent") ?? undefined,
        referer: headers.get("referer") ?? undefined,
      },
    });
  } catch {
    /* ignore analytics errors */
  }
}

export async function trackClick(productId: string, headers: Headers) {
  try {
    await prisma.affiliateClick.create({
      data: {
        productId,
        ipHash: hashIp(extractIp(headers)),
        userAgent: headers.get("user-agent") ?? undefined,
        referer: headers.get("referer") ?? undefined,
      },
    });
  } catch {
    /* ignore */
  }
}
