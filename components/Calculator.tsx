"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { BASE_PATH } from "@/lib/base-path";
import { formatArea, formatEuro, formatRange, formatUnitPrice } from "@/lib/format";
import { calculateQuote, MAX_AREA_SQM, MIN_AREA_SQM } from "@/lib/pricing";
import type { ApiResponse, Catalog, QuoteResult } from "@/lib/types";

const STEP_LABELS = ["Услуга", "Детайли", "Контакти"] as const;

function parseArea(text: string): number {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Какво да покажем най-отгоре в панела с цената. */
function headline(result: QuoteResult | null): { main: string; sub: string } {
  if (!result) {
    return {
      main: "Изберете услуга",
      sub: "Цената се показва тук и се променя с всеки ваш избор.",
    };
  }
  if (result.status === "invalid") {
    return { main: "Въведете площ", sub: result.error };
  }
  if (result.status === "on_request") {
    return {
      main: "По договаряне",
      sub:
        result.reason === "zone"
          ? "За този район уточняваме цената с вас. Оставете контакт и ще се обадим."
          : "За толкова голяма площ уточняваме цената с вас. Оставете контакт и ще се обадим.",
    };
  }
  return {
    main: formatRange(result.minCents, result.maxCents),
    sub: "Точната сума се уточнява след оглед на място.",
  };
}

function PriceSummary({ result }: { result: QuoteResult | null }) {
  const head = headline(result);
  const ok = result?.status === "ok" ? result : null;

  return (
    <section
      aria-labelledby="price-title"
      className="overflow-hidden rounded-[1.75rem] border border-ink/15 bg-paper"
    >
      <div className="lawn-stripes on-dark px-6 pb-7 pt-6 text-white">
        <h2 id="price-title" className="text-base font-medium text-white/90">
          Ориентировъчна цена
        </h2>
        <p
          role="status"
          className="mt-2 font-display text-4xl font-bold leading-[1.05] text-balance"
        >
          {head.main}
        </p>
        <p className="mt-3 text-sm text-white/90">{head.sub}</p>
      </div>

      {ok && (
        <ul className="px-6 py-1">
          {ok.lines.map((line) => (
            <li
              key={line.key}
              className="flex items-start justify-between gap-4 border-b border-line py-3"
            >
              <div>
                <p className="font-medium">{line.label}</p>
                {line.note && <p className="text-sm text-muted">{line.note}</p>}
              </div>
              <p
                className={`shrink-0 font-medium tabular-nums ${
                  line.amountCents < 0 ? "text-lawn" : ""
                }`}
              >
                {line.amountCents < 0 ? "−" : ""}
                {formatEuro(Math.abs(line.amountCents))}
              </p>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 py-4">
            <p className="font-display text-xl font-bold">Изчислена сума</p>
            <p className="font-display text-xl font-bold tabular-nums">
              {formatEuro(ok.totalCents)}
            </p>
          </li>
        </ul>
      )}
    </section>
  );
}

function ChoiceCard({
  type,
  name,
  checked,
  onChange,
  title,
  description,
  aside,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string | null;
  aside?: ReactNode;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className="soft-transition flex items-start gap-3 rounded-xl border border-line bg-paper p-4 hover:border-ink/50 peer-checked:border-ink peer-checked:bg-white peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-5 shrink-0 place-items-center border ${
            type === "radio" ? "rounded-full" : "rounded"
          } ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
        >
          {checked && (
            <svg
              viewBox="0 0 16 16"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <span>
            <span className="block font-medium">{title}</span>
            {description && (
              <span className="mt-0.5 block text-sm text-muted">{description}</span>
            )}
          </span>
          {aside && (
            <span className="text-sm text-muted sm:text-right">{aside}</span>
          )}
        </span>
      </span>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base placeholder:text-muted/70";

const primaryButton =
  "soft-transition rounded-lg bg-dandelion px-6 py-3 text-base font-semibold text-ink hover:bg-dandelion-deep disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "soft-transition rounded-lg border border-line bg-paper px-5 py-3 text-base font-medium hover:border-ink/50";

export default function Calculator({ catalog }: { catalog: Catalog }) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [areaText, setAreaText] = useState("200");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState(catalog.zones[0]?.id ?? "");
  const [frequencyId, setFrequencyId] = useState<string | null>(
    catalog.frequencies[0]?.id ?? null,
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<QuoteResult | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  const service = catalog.services.find((s) => s.id === serviceId) ?? null;
  const area = parseArea(areaText);
  const areaValid =
    Number.isFinite(area) && area >= MIN_AREA_SQM && area <= MAX_AREA_SQM;
  const effectiveFrequencyId = service?.supports_frequency ? frequencyId : null;

  const result = useMemo<QuoteResult | null>(() => {
    if (!service) return null;
    return calculateQuote(catalog, {
      serviceId: service.id,
      zoneId,
      frequencyId: effectiveFrequencyId,
      areaSqm: area,
      extraIds,
    });
  }, [catalog, service, zoneId, effectiveFrequencyId, area, extraIds]);

  const canNext = step === 0 ? Boolean(service) : areaValid && Boolean(zoneId);

  function toggleExtra(id: string) {
    setExtraIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function reset() {
    setDone(null);
    setQuoteNumber(null);
    setStep(0);
    setServiceId(null);
    setExtraIds([]);
    setError(null);
    setConsent(false);
    setMessage("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_PATH}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          zoneId,
          frequencyId: effectiveFrequencyId,
          areaSqm: area,
          extraIds,
          name,
          phone,
          email,
          message: message || undefined,
          gdprConsent: consent,
          website,
        }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setDone(data.result);
      setQuoteNumber(data.quoteNumber ?? null);
    } catch {
      setError("Нещо се обърка при изпращането. Опитайте отново след малко.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Екран след успешно изпращане ----------
  if (done) {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="rounded-[1.5rem] border border-line bg-paper p-6 sm:p-8">
          <h2 className="font-display text-3xl font-bold">
            Запитването е изпратено
          </h2>
          <p className="mt-3 max-w-prose text-lg">
            Благодарим, {name.trim().split(" ")[0]}. Ще се свържем с вас на{" "}
            <strong className="font-semibold">{phone}</strong>, за да уточним
            оглед и точната цена.
          </p>
          {quoteNumber && (
            <p className="mt-3 text-muted">
              Номер на запитването:{" "}
              <strong className="font-semibold text-ink">{quoteNumber}</strong>.
              Изпращаме ориентировъчната оферта и на {email}.
            </p>
          )}
          <button type="button" onClick={reset} className={`${secondaryButton} mt-8`}>
            Направи нова оферта
          </button>
        </div>
        {done.status !== "invalid" && (
          <aside>
            <PriceSummary result={done} />
          </aside>
        )}
      </div>
    );
  }

  // ---------- Калкулатор ----------
  const head = headline(result);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <form
        onSubmit={onSubmit}
        className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-8"
      >
        <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2" aria-label="Стъпки">
          {STEP_LABELS.map((label, index) => {
            const current = index === step;
            const past = index < step;
            return (
              <li key={label} aria-current={current ? "step" : undefined}>
                <button
                  type="button"
                  disabled={!past}
                  onClick={() => setStep(index)}
                  className={`flex items-center gap-2 text-base ${
                    current ? "font-semibold" : "text-muted"
                  } ${past ? "cursor-pointer underline-offset-4 hover:underline" : ""}`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${
                      current
                        ? "bg-ink text-white"
                        : past
                          ? "bg-lawn text-white"
                          : "border border-line"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Стъпка 1: услуга */}
        {step === 0 && (
          <fieldset>
            <legend className="font-display text-3xl font-bold">
              Каква услуга ви трябва?
            </legend>
            <div className="mt-5 grid gap-3">
              {catalog.services.map((s) => (
                <ChoiceCard
                  key={s.id}
                  type="radio"
                  name="service"
                  checked={serviceId === s.id}
                  onChange={() => setServiceId(s.id)}
                  title={s.name}
                  description={s.description}
                  aside={
                    <>
                      {formatUnitPrice(s.price_per_sqm)} на м²
                      <br />
                      минимум {formatEuro(Math.round(s.min_price * 100))}
                    </>
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        {/* Стъпка 2: детайли */}
        {step === 1 && service && (
          <div className="grid gap-8">
            <h2 className="font-display text-3xl font-bold">
              Разкажете ни за двора
            </h2>

            <div>
              <label htmlFor="area" className="mb-1.5 block font-medium">
                Площ на двора
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-44">
                  <input
                    id="area"
                    type="text"
                    inputMode="decimal"
                    value={areaText}
                    onChange={(e) => setAreaText(e.target.value)}
                    aria-invalid={!areaValid}
                    aria-describedby="area-help"
                    className={`${inputClass} pr-12 tabular-nums`}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-muted"
                  >
                    м²
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Плъзнете, за да зададете площ"
                  min={10}
                  max={1000}
                  step={10}
                  value={Math.min(1000, Math.max(10, areaValid ? area : 10))}
                  onChange={(e) => setAreaText(e.target.value)}
                  className="h-2 flex-1 cursor-pointer accent-lawn"
                />
              </div>
              <p
                id="area-help"
                className={`mt-2 text-sm ${areaValid ? "text-muted" : "text-danger"}`}
              >
                {areaValid
                  ? "Приблизителна площ е достатъчна. Можете да я измерите в Google Maps."
                  : `Въведете площ между ${MIN_AREA_SQM} и ${formatArea(MAX_AREA_SQM)}.`}
              </p>
            </div>

            <div>
              <label htmlFor="zone" className="mb-1.5 block font-medium">
                Район
              </label>
              <select
                id="zone"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className={`${inputClass} sm:max-w-sm`}
              >
                {catalog.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {service.supports_frequency && catalog.frequencies.length > 0 && (
              <fieldset>
                <legend className="mb-1.5 font-medium">Колко често?</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {catalog.frequencies.map((f) => (
                    <ChoiceCard
                      key={f.id}
                      type="radio"
                      name="frequency"
                      checked={frequencyId === f.id}
                      onChange={() => setFrequencyId(f.id)}
                      title={f.name}
                      description={
                        f.discount_percent > 0
                          ? `Отстъпка ${f.discount_percent}%`
                          : undefined
                      }
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {catalog.extras.length > 0 && (
              <fieldset>
                <legend className="mb-1.5 font-medium">
                  Добавки (по желание)
                </legend>
                <div className="grid gap-3">
                  {catalog.extras.map((x) => (
                    <ChoiceCard
                      key={x.id}
                      type="checkbox"
                      name="extras"
                      checked={extraIds.includes(x.id)}
                      onChange={() => toggleExtra(x.id)}
                      title={x.name}
                      aside={
                        x.price_type === "per_sqm"
                          ? `${formatUnitPrice(x.price)} на м²`
                          : formatEuro(Math.round(x.price * 100))
                      }
                    />
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {/* Стъпка 3: контакти */}
        {step === 2 && (
          <div className="grid gap-5">
            <div>
              <h2 className="font-display text-3xl font-bold">
                Как да се свържем с вас?
              </h2>
              {result && result.status !== "invalid" && (
                <p className="mt-2 text-muted">
                  {result.selection.serviceName}, {formatArea(result.selection.areaSqm)},{" "}
                  {result.selection.zoneName}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block font-medium">
                  Име
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block font-medium">
                  Телефон
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  minLength={6}
                  maxLength={30}
                  pattern="[0-9+()\-\s]+"
                  title="Само цифри, интервали и знаците + ( ) -"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block font-medium">
                Имейл
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-1.5 block font-medium">
                Нещо, което да знаем? (по желание)
              </label>
              <textarea
                id="message"
                rows={3}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Скрито поле срещу ботове. Хората не го виждат. */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
              <label htmlFor="website">Не попълвайте това поле</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-lawn"
              />
              <span className="text-sm">
                Съгласен съм ЗеленоВкъщи да обработва данните ми, за да се
                свърже с мен по това запитване.
              </span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/40 bg-white p-3 text-danger"
              >
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={secondaryButton}
            >
              Назад
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className={primaryButton}
            >
              Напред
            </button>
          ) : (
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting ? "Изпращане..." : "Изпрати запитване"}
            </button>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-6">
        <PriceSummary result={result} />
      </aside>

      {/* Лента с цената на телефон, за да се вижда докато попълвате */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/15 bg-paper/95 px-4 py-3 backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4">
          <span className="text-sm text-muted">Ориентировъчно</span>
          <span className="text-right font-display text-xl font-bold">
            {head.main}
          </span>
        </div>
      </div>
    </div>
  );
}
