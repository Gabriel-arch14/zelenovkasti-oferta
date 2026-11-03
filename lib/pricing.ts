// Ценовата логика. Чиста функция: без база данни, без мрежа.
// Ползва се и в браузъра (цена на живо), и на сървъра (окончателното изчисление).
// Всички суми се смятат в ЦЕНТОВЕ (цели числа), за да няма грешки от десетични дроби.

import { formatArea, formatUnitPrice } from "./format";
import type {
  Catalog,
  QuoteInput,
  QuoteLine,
  QuoteResult,
  QuoteSelection,
} from "./types";

/** Под тази площ не смятаме. */
export const MIN_AREA_SQM = 1;
/** Над тази площ цената е "по договаряне". */
export const MAX_AUTO_AREA_SQM = 20000;
/** Горна граница, която приема базата данни. */
export const MAX_AREA_SQM = 100000;

/** Ориентировъчният диапазон е ±8% около сметнатата сума, закръглен на 5 €. */
const RANGE_LOW = 0.92;
const RANGE_HIGH = 1.08;
const ROUND_STEP_CENTS = 500;

const toCents = (euros: number) => Math.round(euros * 100);

export function calculateQuote(
  catalog: Catalog,
  input: QuoteInput,
): QuoteResult {
  const areaSqm = Math.round(input.areaSqm * 100) / 100;

  if (!Number.isFinite(areaSqm) || areaSqm < MIN_AREA_SQM) {
    return { status: "invalid", error: "Въведете площ от поне 1 м²." };
  }
  if (areaSqm > MAX_AREA_SQM) {
    return { status: "invalid", error: "Площта е твърде голяма." };
  }

  const service = catalog.services.find((s) => s.id === input.serviceId);
  if (!service) return { status: "invalid", error: "Непозната услуга." };

  const zone = catalog.zones.find((z) => z.id === input.zoneId);
  if (!zone) return { status: "invalid", error: "Непознат район." };

  const frequency = input.frequencyId
    ? catalog.frequencies.find((f) => f.id === input.frequencyId)
    : null;
  if (input.frequencyId && !frequency) {
    return { status: "invalid", error: "Непозната честота." };
  }

  const extraIds = [...new Set(input.extraIds)];
  const extras = [];
  for (const id of extraIds) {
    const extra = catalog.extras.find((e) => e.id === id);
    if (!extra) return { status: "invalid", error: "Непозната добавка." };
    extras.push(extra);
  }

  const appliedFrequency =
    service.supports_frequency && frequency ? frequency : null;

  const selection: QuoteSelection = {
    serviceName: service.name,
    zoneName: zone.name,
    areaSqm,
    frequencyName: appliedFrequency ? appliedFrequency.name : null,
    extraNames: extras.map((e) => e.name),
  };

  // Район или площ, за които не смятаме автоматично
  if (zone.on_request) {
    return { status: "on_request", reason: "zone", selection };
  }
  if (areaSqm > MAX_AUTO_AREA_SQM) {
    return { status: "on_request", reason: "area", selection };
  }

  const lines: QuoteLine[] = [];

  // 1. Основна цена: площ × цена на м², но не по-малко от минималната
  const rawBase = Math.round(areaSqm * toCents(service.price_per_sqm));
  const minPrice = toCents(service.min_price);
  const minApplied = rawBase < minPrice;
  const base = Math.max(rawBase, minPrice);
  lines.push({
    key: "base",
    label: service.name,
    amountCents: base,
    note: minApplied
      ? "Минимална цена за услугата"
      : `${formatArea(areaSqm)} × ${formatUnitPrice(service.price_per_sqm)} на м²`,
  });

  // 2. Отстъпка за честота (само за услуги, които я поддържат)
  let discount = 0;
  if (appliedFrequency && appliedFrequency.discount_percent > 0) {
    discount = Math.round((base * appliedFrequency.discount_percent) / 100);
    lines.push({
      key: "discount",
      label: `Отстъпка за честота: ${appliedFrequency.name.toLowerCase()}`,
      amountCents: -discount,
      note: `${appliedFrequency.discount_percent}% от основната цена`,
    });
  }

  // 3. Добавки
  let extrasTotal = 0;
  for (const extra of extras) {
    const unit = toCents(extra.price);
    const amount =
      extra.price_type === "per_sqm" ? Math.round(areaSqm * unit) : unit;
    extrasTotal += amount;
    lines.push({
      key: `extra-${extra.id}`,
      label: extra.name,
      amountCents: amount,
      note:
        extra.price_type === "per_sqm"
          ? `${formatArea(areaSqm)} × ${formatUnitPrice(extra.price)} на м²`
          : "Фиксирана цена",
    });
  }

  // 4. Коефициент на района
  const subtotal = base - discount + extrasTotal;
  const total = Math.round(subtotal * zone.multiplier);
  if (total !== subtotal) {
    lines.push({
      key: "zone",
      label: `Район: ${zone.name}`,
      amountCents: total - subtotal,
      note: `Коефициент ×${zone.multiplier.toFixed(2).replace(".", ",")}`,
    });
  }

  // 5. Диапазон за показване
  const minCents =
    Math.floor((total * RANGE_LOW) / ROUND_STEP_CENTS) * ROUND_STEP_CENTS;
  const maxCents =
    Math.ceil((total * RANGE_HIGH) / ROUND_STEP_CENTS) * ROUND_STEP_CENTS;

  return {
    status: "ok",
    selection,
    lines,
    subtotalCents: subtotal,
    zoneMultiplier: zone.multiplier,
    totalCents: total,
    minCents,
    maxCents,
  };
}
