import { prisma } from "@/lib/prisma";

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[&<>'"]/g, (c) => ESCAPE[c]);

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, take: 50000 }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const urls: string[] = [`<url><loc>${esc(base)}/</loc></url>`, `<url><loc>${esc(base)}/catalog</loc></url>`];
  for (const c of categories) {
    urls.push(`<url><loc>${esc(base)}/category/${esc(c.slug)}</loc><lastmod>${c.updatedAt.toISOString()}</lastmod></url>`);
  }
  for (const p of products) {
    urls.push(`<url><loc>${esc(base)}/product/${esc(p.slug)}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
