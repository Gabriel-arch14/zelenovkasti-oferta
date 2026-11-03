// Форматиране на числа и пари за български потребители.

export function formatNumber(value: number): string {
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** 14300 (цента) -> "143 €" */
export function formatEuro(cents: number): string {
  return `${formatNumber(cents / 100)} €`;
}

/** Единична цена винаги с два знака: 0.3 -> "0,30 €" */
export function formatUnitPrice(euros: number): string {
  return `${euros.toFixed(2).replace(".", ",")} €`;
}

export function formatArea(sqm: number): string {
  return `${formatNumber(sqm)} м²`;
}

/** Защо няма автоматична цена (за PDF-а и имейлите). */
export function onRequestReasonText(reason: "zone" | "area"): string {
  return reason === "zone"
    ? "За този район уточняваме цената индивидуално."
    : "За толкова голяма площ уточняваме цената индивидуално.";
}

export function formatRange(minCents: number, maxCents: number): string {
  return `${formatEuro(minCents)} – ${formatEuro(maxCents)}`;
}
