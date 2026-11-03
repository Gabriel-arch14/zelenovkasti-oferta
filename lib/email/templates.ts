// Текстът на имейлите: тема, HTML и обикновен текст.
// Чисти функции без мрежа, за да се тестват лесно (lib/email/templates.test.ts).
//
// Всяко нещо, което идва от клиента (име, съобщение...), минава през escapeHtml.
// Иначе някой може да напише HTML код в полето "съобщение" и той да се изпълни
// в имейла на собственика.

import { COMPANY } from "../company";
import { formatArea, formatEuro, formatRange, onRequestReasonText } from "../format";
import type { QuoteOffer } from "../types";

export type EmailContent = { subject: string; html: string; text: string };

/** Прави текста безопасен за HTML: < > & " ' стават обикновени символи. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- Общи части ----------

/** Цената с една фраза: диапазон или "по договаряне". */
function priceSummary(offer: QuoteOffer): { headline: string; detail: string } {
  const r = offer.result;
  if (r.status === "ok") {
    return {
      headline: `Ориентировъчна цена: ${formatRange(r.minCents, r.maxCents)}`,
      detail: `Изчислена сума: ${formatEuro(r.totalCents)}. Точната цена уточняваме след оглед.`,
    };
  }
  return { headline: "Цена по договаряне", detail: onRequestReasonText(r.reason) };
}

/** Какво е избрал клиентът, като двойки [етикет, стойност]. */
function selectionRows(offer: QuoteOffer): [string, string][] {
  const sel = offer.result.selection;
  const rows: [string, string][] = [
    ["Услуга", sel.serviceName],
    ["Площ", formatArea(sel.areaSqm)],
    ["Район", sel.zoneName],
  ];
  if (sel.frequencyName) rows.push(["Честота", sel.frequencyName]);
  if (sel.extraNames.length > 0) rows.push(["Добавки", sel.extraNames.join(", ")]);
  return rows;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0];

// Прост HTML с вградени стилове: имейл програмите (Gmail, Outlook)
// не поддържат външни CSS файлове.
function htmlTable(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#475c4d;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;vertical-align:top">${value}</td></tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px">${cells}</table>`;
}

function htmlLayout(body: string): string {
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#12301e;line-height:1.5;max-width:560px">` +
    body +
    `<p style="margin-top:32px;font-size:12px;color:#475c4d">` +
    `${COMPANY.name} · ${COMPANY.city} · ${COMPANY.phone}<br>` +
    `Демонстрационен проект. Фирмата, цените и контактите са измислени.</p>` +
    `</div>`
  );
}

const textRows = (rows: [string, string][]) =>
  rows.map(([label, value]) => `${label}: ${value}`).join("\n");

// ---------- Имейл до клиента ----------

export function customerEmail(
  offer: QuoteOffer,
  options: { pdfAttached: boolean },
): EmailContent {
  const price = priceSummary(offer);
  const rows = selectionRows(offer);
  const hello = `Здравейте, ${firstName(offer.customer.name)}!`;
  const pdfLine = options.pdfAttached
    ? "Прикачили сме офертата като PDF файл."
    : "";
  const contactLine = `Ще се свържем с вас на ${offer.customer.phone}, за да уточним оглед и точната цена.`;

  const html = htmlLayout(
    `<p>${escapeHtml(hello)}</p>` +
      `<p>Благодарим за запитването. Ето вашата ориентировъчна оферта <strong>№ ${escapeHtml(offer.quoteNumber)}</strong>.</p>` +
      `<div style="background:#edf2e8;border-left:4px solid #e9b82d;padding:12px 16px;margin:20px 0">` +
      `<div style="font-size:18px;font-weight:bold">${escapeHtml(price.headline)}</div>` +
      `<div style="font-size:14px;color:#475c4d">${escapeHtml(price.detail)}</div></div>` +
      htmlTable(rows.map(([l, v]) => [l, escapeHtml(v)])) +
      `<p style="margin-top:20px">${escapeHtml(contactLine)}${pdfLine ? `<br>${escapeHtml(pdfLine)}` : ""}</p>` +
      `<p>Офертата е валидна до ${escapeHtml(offer.validUntil)}.</p>`,
  );

  const text = [
    hello,
    "",
    `Благодарим за запитването. Ето вашата ориентировъчна оферта № ${offer.quoteNumber}.`,
    "",
    price.headline,
    price.detail,
    "",
    textRows(rows),
    "",
    contactLine,
    pdfLine,
    `Офертата е валидна до ${offer.validUntil}.`,
    "",
    `${COMPANY.name} · ${COMPANY.city} · ${COMPANY.phone}`,
    "Демонстрационен проект. Фирмата, цените и контактите са измислени.",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === "")) // без двойни празни редове
    .join("\n");

  return {
    subject: `Вашата оферта ${offer.quoteNumber} от ${COMPANY.name}`,
    html,
    text,
  };
}

// ---------- Известие до собственика ----------

export function ownerEmail(offer: QuoteOffer): EmailContent {
  const { customer, result } = offer;
  const price = priceSummary(offer);
  const sel = result.selection;

  // Телефонът и имейлът са валидирани от zod, но пак ги escape-ваме, защото са в href.
  const phoneHref = `tel:${customer.phone.replace(/[^0-9+]/g, "")}`;
  const contactRows: [string, string][] = [
    ["Име", escapeHtml(customer.name)],
    ["Телефон", `<a href="${escapeHtml(phoneHref)}">${escapeHtml(customer.phone)}</a>`],
    ["Имейл", `<a href="mailto:${escapeHtml(customer.email)}">${escapeHtml(customer.email)}</a>`],
  ];
  const rows = selectionRows(offer);

  const html = htmlLayout(
    `<h2 style="margin:0 0 4px">Ново запитване № ${escapeHtml(offer.quoteNumber)}</h2>` +
      `<p style="margin:0 0 20px;color:#475c4d">Получено на ${escapeHtml(offer.issuedOn)}.</p>` +
      `<h3 style="margin:0 0 8px">Клиент</h3>` +
      htmlTable(contactRows) +
      `<h3 style="margin:20px 0 8px">Запитване</h3>` +
      htmlTable(rows.map(([l, v]) => [l, escapeHtml(v)])) +
      `<div style="background:#edf2e8;border-left:4px solid #e9b82d;padding:12px 16px;margin:20px 0">` +
      `<div style="font-size:18px;font-weight:bold">${escapeHtml(price.headline)}</div>` +
      `<div style="font-size:14px;color:#475c4d">${escapeHtml(price.detail)}</div></div>` +
      (customer.message
        ? `<h3 style="margin:20px 0 8px">Съобщение</h3>` +
          `<p style="white-space:pre-wrap;margin:0">${escapeHtml(customer.message)}</p>`
        : ""),
  );

  const text = [
    `Ново запитване № ${offer.quoteNumber} (${offer.issuedOn})`,
    "",
    "Клиент",
    textRows([
      ["Име", customer.name],
      ["Телефон", customer.phone],
      ["Имейл", customer.email],
    ]),
    "",
    "Запитване",
    textRows(rows),
    "",
    price.headline,
    price.detail,
    ...(customer.message ? ["", "Съобщение", customer.message] : []),
  ].join("\n");

  return {
    subject: `Ново запитване ${offer.quoteNumber}: ${sel.serviceName}, ${formatArea(sel.areaSqm)}, ${sel.zoneName}`,
    html,
    text,
  };
}
