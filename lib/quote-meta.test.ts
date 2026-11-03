// Пускане: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createQuoteNumber, getQuoteDates } from "./quote-meta";

describe("createQuoteNumber", () => {
  it("има формат ZV-ГГГГММДД-XXXX", () => {
    const n = createQuoteNumber(new Date("2026-11-03T10:00:00Z"));
    assert.match(n, /^ZV-20261103-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("ползва българската дата, не тази в UTC (зимно време, UTC+2)", () => {
    // 22:30 UTC на 2 ноември = 00:30 на 3 ноември в София
    const n = createQuoteNumber(new Date("2026-11-02T22:30:00Z"), "TEST");
    assert.equal(n, "ZV-20261103-TEST");
  });

  it("ползва българската дата и през лятото (UTC+3)", () => {
    // 21:30 UTC на 31 юли = 00:30 на 1 август в София
    const n = createQuoteNumber(new Date("2026-07-31T21:30:00Z"), "TEST");
    assert.equal(n, "ZV-20260801-TEST");
  });

  it("случайната част няма 0, O, 1 и I (за да не се бъркат)", () => {
    for (let i = 0; i < 200; i++) {
      const code = createQuoteNumber().slice(-4);
      assert.doesNotMatch(code, /[0O1I]/);
    }
  });
});

describe("getQuoteDates", () => {
  it("офертата е валидна 14 дни", () => {
    const d = getQuoteDates(new Date("2026-11-03T10:00:00Z"));
    assert.deepEqual(d, { issuedOn: "03.11.2026", validUntil: "17.11.2026" });
  });

  it("минава правилно през края на годината", () => {
    const d = getQuoteDates(new Date("2026-12-25T10:00:00Z"));
    assert.deepEqual(d, { issuedOn: "25.12.2026", validUntil: "08.01.2027" });
  });

  it("не се обърква от смяната на часовото време", () => {
    // 25 октомври 2026 часовникът се връща с час назад
    const d = getQuoteDates(new Date("2026-10-20T21:30:00Z")); // 00:30 на 21.10 в София
    assert.deepEqual(d, { issuedOn: "21.10.2026", validUntil: "04.11.2026" });
  });
});
