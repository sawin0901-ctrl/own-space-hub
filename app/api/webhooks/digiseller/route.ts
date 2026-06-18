import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// Digiseller webhook (Уведомления о продажах).
// Документация: https://my.digiseller.com/inside/api_general.asp
// Подпись считается как md5(seller_id + invoice_id + amount + currency_type + DIGISELLER_API_KEY)

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const apiKey = process.env.DIGISELLER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const form = await req.formData();
  const data = Object.fromEntries(form.entries()) as Record<string, string>;

  const sigPayload =
    (data.seller_id ?? "") +
    (data.invoice_id ?? "") +
    (data.amount ?? "") +
    (data.currency_type ?? "") +
    apiKey;
  const expected = crypto.createHash("md5").update(sigPayload).digest("hex");
  if ((data.sign ?? "").toLowerCase() !== expected.toLowerCase()) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  await prisma.payment.upsert({
    where: { externalId: data.invoice_id },
    update: { status: "paid", rawPayload: data as never },
    create: {
      provider: "digiseller",
      externalId: data.invoice_id,
      amount: data.amount ?? "0",
      currency: data.currency_type ?? "RUB",
      status: "paid",
      rawPayload: data as never,
    },
  });

  return NextResponse.json({ ok: true });
}
