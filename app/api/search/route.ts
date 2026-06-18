import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ items: [] });
  const items = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { publisher: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, slug: true, title: true, image: true, price: true },
    take: 10,
  });
  return NextResponse.json({ items });
}
