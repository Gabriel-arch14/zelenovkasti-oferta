// Номер на оферта и дати. Всичко е по българско време (Europe/Sofia),
// иначе запитване в 01:00 у нас би получило вчерашната дата (сървърът е в UTC).

export const TIME_ZONE = "Europe/Sofia";

/** Колко дни е валидна ориентировъчната оферта. */
export const OFFER_VALID_DAYS = 14;

// Без 0/O и 1/I, за да не се бъркат, когато клиентът диктува номера по телефона.
// 32 символа: така всеки случаен байт дава равномерен избор (байт % 32).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

type CalendarDate = { year: number; month: number; day: number };

/** Коя дата е в България в дадения момент. */
function sofiaDate(moment: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Добавя дни към календарна дата (сметката е в UTC, за да няма изненади от лятното часово време). */
function addDays(date: CalendarDate, days: number): CalendarDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** { 2026, 11, 3 } -> "03.11.2026" */
function formatBg(date: CalendarDate): string {
  return `${pad(date.day)}.${pad(date.month)}.${date.year}`;
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Номер на оферта: ZV-ГГГГММДД-XXXX, например ZV-20261103-K7QM. */
export function createQuoteNumber(
  moment: Date = new Date(),
  code: string = randomCode(),
): string {
  const d = sofiaDate(moment);
  return `ZV-${d.year}${pad(d.month)}${pad(d.day)}-${code}`;
}

/** Дата на издаване и срок на валидност, готови за показване. */
export function getQuoteDates(moment: Date = new Date()): {
  issuedOn: string;
  validUntil: string;
} {
  const today = sofiaDate(moment);
  return {
    issuedOn: formatBg(today),
    validUntil: formatBg(addDays(today, OFFER_VALID_DAYS)),
  };
}
