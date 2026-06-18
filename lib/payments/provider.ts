// Абстракция платёжных провайдеров. MVP реализует Digiseller;
// заглушки для ЮKassa / СБП / банковских карт РФ добавляются по аналогии.

export type CreateInvoiceInput = {
  orderId: string;
  amount: string; // строковая сумма во избежание float
  currency: "RUB" | "USD" | "EUR";
  description: string;
  returnUrl: string;
};

export type CreateInvoiceResult = {
  paymentUrl: string;
  externalId: string;
};

export interface PaymentProvider {
  readonly id: "digiseller" | "yookassa" | "sbp" | "card_ru";
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
}

import { digisellerProvider } from "./digiseller";

const providers: Record<string, PaymentProvider> = {
  digiseller: digisellerProvider,
};

export function getProvider(id: string): PaymentProvider {
  const p = providers[id];
  if (!p) throw new Error(`Payment provider not configured: ${id}`);
  return p;
}
