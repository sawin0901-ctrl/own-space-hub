import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettings, buildAffiliateUrl } from "@/lib/settings";
import { trackClick } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const settings = await getSettings();
  const template =
    product.source === "DIGISELLER"
      ? settings.sources.digiseller.urlTemplate
      : settings.sources.plati.urlTemplate;
  const url = buildAffiliateUrl(product.affiliateUrl, settings.affiliateId, template);

  const h = await headers();
  trackClick(product.id, h).catch(() => {});

  return NextResponse.redirect(url, 302);
}
