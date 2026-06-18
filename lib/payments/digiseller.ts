import type { PaymentProvider } from "./provider";

// Минимальная обёртка над Digiseller. Создание счёта в Digiseller
// обычно выполняется через готовый product URL вида
// https://oplata.info/asp2/pay.asp?id_d=<product_id>&email=...&lang=ru-RU
// Для кастомного флоу используйте Digiseller API (создание уникального товара/счёта).

export const digisellerProvider: PaymentProvider = {
  id: "digiseller",
  async createInvoice(input) {
    const productId = process.env.DIGISELLER_PRODUCT_ID;
    if (!productId) throw new Error("DIGISELLER_PRODUCT_ID is not set");

    const url = new URL("https://oplata.info/asp2/pay.asp");
    url.searchParams.set("id_d", productId);
    url.searchParams.set("summ", input.amount);
    url.searchParams.set("curr", input.currency);
    url.searchParams.set("lang", "ru-RU");
    url.searchParams.set("ref", input.orderId);

    return {
      paymentUrl: url.toString(),
      externalId: input.orderId,
    };
  },
};
