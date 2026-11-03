import "server-only";

import { Resend, type CreateEmailOptions } from "resend";

import { generateQuotePdf } from "../pdf/quote-pdf";
import type { QuoteOffer } from "../types";
import { customerEmail, ownerEmail } from "./templates";

// Без собствен домейн Resend праща само от този адрес
// и само до имейла, с който е регистриран акаунтът.
const DEFAULT_FROM = "ЗеленоВкъщи <onboarding@resend.dev>";

/** sent = изпратен, failed = грешка, skipped = не е пращан (липсва настройка). */
export type EmailOutcome = "sent" | "failed" | "skipped";

/**
 * Праща PDF офертата на клиента и известие на собственика.
 *
 * Никога не хвърля грешка: всеки проблем (липсващ ключ, грешка в PDF-а,
 * отказ от Resend) се записва в лога и функцията продължава.
 * Така имейлите не могат да провалят вече записаното запитване.
 */
export async function sendQuoteEmails(
  offer: QuoteOffer,
): Promise<{ customer: EmailOutcome; owner: EmailOutcome }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Имейлите са изключени: липсва RESEND_API_KEY в .env.local.");
    return { customer: "skipped", owner: "skipped" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const ownerAddress = process.env.OWNER_EMAIL || null;
  const n = offer.quoteNumber;

  // Ако PDF-ът не стане, пращаме имейлите и без него.
  let pdf: Buffer | null = null;
  try {
    pdf = await generateQuotePdf(offer);
  } catch (err) {
    console.error(`PDF за оферта ${n} не можа да се генерира:`, err);
  }
  const attachments = pdf
    ? [{ filename: `oferta-${n}.pdf`, content: pdf }]
    : undefined;

  const toCustomer = send(resend, `клиента (${n})`, `${n}-customer`, {
    from,
    to: offer.customer.email,
    // Отговорът на клиента отива при собственика (ако е зададен).
    replyTo: ownerAddress ?? undefined,
    attachments,
    ...customerEmail(offer, { pdfAttached: pdf !== null }),
  });

  let toOwner: Promise<EmailOutcome> = Promise.resolve("skipped");
  if (ownerAddress) {
    toOwner = send(resend, `собственика (${n})`, `${n}-owner`, {
      from,
      to: ownerAddress,
      // Собственикът натиска "Отговор" и пише директно на клиента.
      replyTo: offer.customer.email,
      attachments,
      ...ownerEmail(offer),
    });
  } else {
    console.warn("Известието до собственика е изключено: липсва OWNER_EMAIL в .env.local.");
  }

  const [customer, owner] = await Promise.all([toCustomer, toOwner]);
  return { customer, owner };
}

/** Едно изпращане. Връща резултат вместо да хвърля грешка. */
async function send(
  resend: Resend,
  who: string,
  idempotencyKey: string,
  email: CreateEmailOptions,
): Promise<EmailOutcome> {
  try {
    // idempotencyKey: ако същата заявка стигне до Resend два пъти,
    // имейлът се изпраща само веднъж.
    const { error } = await resend.emails.send(email, { idempotencyKey });
    if (error) {
      // Логваме само кода и съобщението на Resend, без ключове и лични данни.
      console.error(`Имейлът до ${who} не е изпратен: ${error.name}: ${error.message}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error(`Имейлът до ${who} не е изпратен (мрежова грешка):`, err);
    return "failed";
  }
}
