// Типове, които описват каталога с цени (идва от Supabase) и резултата от изчислението.

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_per_sqm: number;
  min_price: number;
  supports_frequency: boolean;
};

export type Extra = {
  id: string;
  slug: string;
  name: string;
  price: number;
  price_type: "per_sqm" | "fixed";
};

export type Zone = {
  id: string;
  slug: string;
  name: string;
  multiplier: number;
  on_request: boolean;
};

export type Frequency = {
  id: string;
  slug: string;
  name: string;
  discount_percent: number;
};

export type Catalog = {
  services: Service[];
  extras: Extra[];
  zones: Zone[];
  frequencies: Frequency[];
};

export type QuoteInput = {
  serviceId: string;
  zoneId: string;
  frequencyId: string | null;
  areaSqm: number;
  extraIds: string[];
};

export type QuoteLine = {
  key: string;
  label: string;
  amountCents: number;
  note?: string;
};

export type QuoteSelection = {
  serviceName: string;
  zoneName: string;
  areaSqm: number;
  frequencyName: string | null;
  extraNames: string[];
};

export type QuoteResult =
  | {
      status: "ok";
      selection: QuoteSelection;
      lines: QuoteLine[];
      subtotalCents: number;
      zoneMultiplier: number;
      totalCents: number;
      minCents: number;
      maxCents: number;
    }
  | {
      status: "on_request";
      reason: "zone" | "area";
      selection: QuoteSelection;
    }
  | { status: "invalid"; error: string };

/** Резултат, за който се издава оферта: с цена или "по договаряне". */
export type OfferResult = Exclude<QuoteResult, { status: "invalid" }>;

/** Всичко, което е нужно за PDF офертата и имейлите. */
export type QuoteOffer = {
  /** ZV-ГГГГММДД-XXXX (виж lib/quote-meta.ts) */
  quoteNumber: string;
  /** Вече форматирани дати, напр. "03.11.2026" */
  issuedOn: string;
  validUntil: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    message?: string | null;
  };
  result: OfferResult;
};

export type ApiResponse =
  | { ok: true; result: QuoteResult; quoteNumber?: string }
  | { ok: false; error: string };
