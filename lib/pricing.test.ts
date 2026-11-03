// Пускане: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatEuro } from "./format";
import { calculateQuote } from "./pricing";
import type { Catalog, QuoteInput } from "./types";

// Същите данни като началните в schema.sql
const catalog: Catalog = {
  services: [
    { id: "s-maint", slug: "poddrushka-na-dvorove", name: "Поддръжка на двор", description: null, price_per_sqm: 0.3, min_price: 40, supports_frequency: true },
    { id: "s-seed", slug: "ozelenyavane-zasyavane", name: "Озеленяване със засяване на трева", description: null, price_per_sqm: 3.5, min_price: 300, supports_frequency: false },
    { id: "s-sod", slug: "ozelenyavane-rolkova-trava", name: "Озеленяване с ролкова трева", description: null, price_per_sqm: 8, min_price: 400, supports_frequency: false },
  ],
  extras: [
    { id: "e-fert", slug: "torene", name: "Торене", price: 0.2, price_type: "per_sqm" },
    { id: "e-haul", slug: "izvozvane-otpadatsi", name: "Извозване на отпадъци", price: 40, price_type: "fixed" },
  ],
  zones: [
    { id: "z-sofia", slug: "sofia", name: "София", multiplier: 1, on_request: false },
    { id: "z-boyana", slug: "boyana", name: "Бояна", multiplier: 1.1, on_request: false },
    { id: "z-other", slug: "other", name: "Друг район (по договаряне)", multiplier: 1, on_request: true },
  ],
  frequencies: [
    { id: "f-once", slug: "once", name: "Еднократно", discount_percent: 0 },
    { id: "f-weekly", slug: "weekly", name: "Седмично", discount_percent: 15 },
  ],
};

const base: QuoteInput = {
  serviceId: "s-maint",
  zoneId: "z-sofia",
  frequencyId: "f-once",
  areaSqm: 300,
  extraIds: [],
};

describe("calculateQuote", () => {
  it("примерът от плана: 300 м² поддръжка в Бояна с извозване = 143 €", () => {
    const r = calculateQuote(catalog, {
      ...base,
      zoneId: "z-boyana",
      extraIds: ["e-haul"],
    });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 14300);
    assert.equal(r.minCents, 13000); // 130 €
    assert.equal(r.maxCents, 15500); // 155 €
  });

  it("прилага минималната цена при малка площ", () => {
    const r = calculateQuote(catalog, { ...base, areaSqm: 50 }); // 15 € < 40 €
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 4000);
  });

  it("отстъпката за честота важи за поддръжка", () => {
    const r = calculateQuote(catalog, { ...base, frequencyId: "f-weekly" });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 7650); // 90 € - 15% = 76,50 €
    assert.equal(r.minCents, 7000);
    assert.equal(r.maxCents, 8500);
  });

  it("отстъпката не важи за услуги, които не я поддържат", () => {
    const r = calculateQuote(catalog, {
      ...base,
      serviceId: "s-seed",
      frequencyId: "f-weekly",
      areaSqm: 200,
    });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 70000); // 200 × 3,50 = 700 €
    assert.equal(r.selection.frequencyName, null);
  });

  it("добавка на м² се смята по площта", () => {
    const r = calculateQuote(catalog, {
      ...base,
      serviceId: "s-seed",
      areaSqm: 100,
      extraIds: ["e-fert"],
    });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 37000); // 350 (над минимума 300) + 20
  });

  it("една и съща добавка, избрана два пъти, се брои веднъж", () => {
    const r = calculateQuote(catalog, { ...base, extraIds: ["e-haul", "e-haul"] });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    assert.equal(r.totalCents, 13000); // 90 + 40
  });

  it("район по договаряне не връща цена", () => {
    const r = calculateQuote(catalog, { ...base, zoneId: "z-other" });
    assert.equal(r.status, "on_request");
  });

  it("много голяма площ е по договаряне", () => {
    const r = calculateQuote(catalog, { ...base, areaSqm: 50000 });
    assert.equal(r.status, "on_request");
  });

  it("отхвърля невалидна площ", () => {
    for (const areaSqm of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 0.5, 1_000_000]) {
      const r = calculateQuote(catalog, { ...base, areaSqm });
      assert.equal(r.status, "invalid", `площ ${areaSqm}`);
    }
  });

  it("отхвърля непознати услуга, район, честота и добавка", () => {
    assert.equal(calculateQuote(catalog, { ...base, serviceId: "x" }).status, "invalid");
    assert.equal(calculateQuote(catalog, { ...base, zoneId: "x" }).status, "invalid");
    assert.equal(calculateQuote(catalog, { ...base, frequencyId: "x" }).status, "invalid");
    assert.equal(calculateQuote(catalog, { ...base, extraIds: ["x"] }).status, "invalid");
  });

  it("сумата от редовете е равна на общата сума", () => {
    const r = calculateQuote(catalog, {
      ...base,
      zoneId: "z-boyana",
      frequencyId: "f-weekly",
      extraIds: ["e-fert", "e-haul"],
    });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") return;
    const sum = r.lines.reduce((acc, line) => acc + line.amountCents, 0);
    assert.equal(sum, r.totalCents);
  });
});

describe("formatEuro", () => {
  it("форматира цели суми без стотинки", () => {
    assert.equal(formatEuro(14300).replace(/\s/g, " "), "143 €");
  });
  it("показва стотинки, когато ги има", () => {
    assert.equal(formatEuro(7650).replace(/\s/g, " "), "76,50 €");
  });
});
