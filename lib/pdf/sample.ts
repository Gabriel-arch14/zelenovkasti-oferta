// Примерни данни за пробен PDF (npm run pdf:sample) и за теста на PDF-а.
// Цената се смята със същата функция като на сайта, за да е реалистична.

import { calculateQuote } from "../pricing";
import type { Catalog, OfferResult, QuoteOffer } from "../types";

// Част от началните цени в supabase/schema.sql
const sampleCatalog: Catalog = {
  services: [
    { id: "s-maint", slug: "poddrushka-na-dvorove", name: "Поддръжка на двор", description: null, price_per_sqm: 0.3, min_price: 40, supports_frequency: true },
  ],
  extras: [
    { id: "e-fert", slug: "torene", name: "Торене", price: 0.2, price_type: "per_sqm" },
    { id: "e-haul", slug: "izvozvane-otpadatsi", name: "Извозване на отпадъци", price: 40, price_type: "fixed" },
  ],
  zones: [
    { id: "z-boyana", slug: "boyana", name: "Бояна", multiplier: 1.1, on_request: false },
    { id: "z-other", slug: "other", name: "Друг район (по договаряне)", multiplier: 1, on_request: true },
  ],
  frequencies: [
    { id: "f-monthly", slug: "monthly", name: "Месечно", discount_percent: 10 },
  ],
};

function sampleResult(zoneId: string): OfferResult {
  const result = calculateQuote(sampleCatalog, {
    serviceId: "s-maint",
    zoneId,
    frequencyId: "f-monthly",
    areaSqm: 450,
    extraIds: ["e-fert", "e-haul"],
  });
  if (result.status === "invalid") throw new Error(result.error);
  return result;
}

const customer = {
  name: "Мария Петрова",
  phone: "+359 888 000 000",
  email: "maria@example.com",
  message: "Дворът е с наклон и има няколко овощни дървета. Удобно ми е в събота.",
};

/** Оферта с изчислена цена. */
export const samplePdfData: QuoteOffer = {
  quoteNumber: "ZV-20261103-K7QM",
  issuedOn: "03.11.2026",
  validUntil: "17.11.2026",
  customer,
  result: sampleResult("z-boyana"),
};

/** Оферта "по договаряне" (район без автоматична цена). */
export const sampleOnRequestPdfData: QuoteOffer = {
  ...samplePdfData,
  quoteNumber: "ZV-20261103-P3XD",
  customer: { ...customer, message: null },
  result: sampleResult("z-other"),
};
