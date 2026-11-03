import { after, NextResponse } from "next/server";
import { z } from "zod";

import { getCatalog } from "@/lib/catalog";
import { sendQuoteEmails } from "@/lib/email/send-quote-emails";
import { calculateQuote, MAX_AREA_SQM, MIN_AREA_SQM } from "@/lib/pricing";
import { createQuoteNumber, getQuoteDates } from "@/lib/quote-meta";
import { createServiceClient } from "@/lib/supabase";
import type { ApiResponse, QuoteOffer } from "@/lib/types";

const bodySchema = z.object({
  serviceId: z.uuid(),
  zoneId: z.uuid(),
  frequencyId: z.uuid().nullable(),
  areaSqm: z.number().min(MIN_AREA_SQM).max(MAX_AREA_SQM),
  extraIds: z.array(z.uuid()).max(20),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(30)
    .regex(/^[0-9+()\-\s]+$/),
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  message: z.string().trim().max(2000).optional(),
  gdprConsent: z.literal(true),
  // Скрито поле за защита от ботове: хората не го виждат, ботовете го попълват.
  website: z.string().max(200).optional(),
});

function fail(error: string, status: number) {
  return NextResponse.json<ApiResponse>({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("Заявката не е валидна.", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("Проверете въведените данни и опитайте отново.", 400);
  }
  const body = parsed.data;

  // Бот: правим се, че е успяло, но нищо не записваме.
  if (body.website) {
    return NextResponse.json<ApiResponse>({
      ok: true,
      result: { status: "invalid", error: "" },
    });
  }

  try {
    // Цената се смята НАНОВО на сървъра от актуалните цени в базата.
    // Нищо, което идва от браузъра, не се приема като цена.
    const catalog = await getCatalog();
    const result = calculateQuote(catalog, {
      serviceId: body.serviceId,
      zoneId: body.zoneId,
      frequencyId: body.frequencyId,
      areaSqm: body.areaSqm,
      extraIds: body.extraIds,
    });

    if (result.status === "invalid") {
      return fail(result.error, 400);
    }

    const priced = result.status === "ok";
    // Един и същ момент за номера и датите (иначе около полунощ може да се разминат).
    const now = new Date();
    const quoteNumber = createQuoteNumber(now);
    const supabase = createServiceClient();
    const { error } = await supabase.from("quotes").insert({
      service_id: body.serviceId,
      zone_id: body.zoneId,
      frequency_id: body.frequencyId,
      area_sqm: Math.round(body.areaSqm * 100) / 100,
      customer_name: body.name,
      phone: body.phone,
      email: body.email,
      message: body.message || null,
      gdpr_consent: true,
      total_estimate: priced ? result.totalCents / 100 : null,
      total_min: priced ? result.minCents / 100 : null,
      total_max: priced ? result.maxCents / 100 : null,
      // Номерът на офертата се пази в breakdown, докато няма отделна колона.
      breakdown: { ...result, quoteNumber },
    });

    if (error) {
      console.error("Грешка при запис на запитване:", error.message);
      return fail("Запитването не можа да бъде записано. Опитайте отново.", 500);
    }

    // Имейлите тръгват СЛЕД като клиентът получи отговор (after).
    // Така не чака PDF и Resend, а грешка в имейла не проваля вече записаното запитване.
    const offer: QuoteOffer = {
      quoteNumber,
      ...getQuoteDates(now),
      customer: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        message: body.message || null,
      },
      result,
    };
    after(async () => {
      const sent = await sendQuoteEmails(offer);
      console.info(
        `Оферта ${quoteNumber}: имейл до клиента: ${sent.customer}, до собственика: ${sent.owner}`,
      );
    });

    return NextResponse.json<ApiResponse>({ ok: true, result, quoteNumber });
  } catch (err) {
    console.error("Грешка в /api/quotes:", err);
    return fail("Възникна грешка на сървъра. Опитайте отново след малко.", 500);
  }
}
