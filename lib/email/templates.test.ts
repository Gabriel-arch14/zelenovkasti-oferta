// Пускане: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sampleOnRequestPdfData, samplePdfData } from "../pdf/sample";
import type { QuoteOffer } from "../types";
import { customerEmail, escapeHtml, ownerEmail } from "./templates";

describe("escapeHtml", () => {
  it("обезврежда HTML символите", () => {
    assert.equal(
      escapeHtml(`<script>alert("x")</script> & 'y'`),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("customerEmail", () => {
  it("съдържа номера, диапазона и първото име", () => {
    const e = customerEmail(samplePdfData, { pdfAttached: true });
    assert.equal(e.subject, "Вашата оферта ZV-20261103-K7QM от ЗеленоВкъщи");
    assert.match(e.text, /Здравейте, Мария!/);
    assert.match(e.text, /Ориентировъчна цена: 250 € – 300 €/);
    assert.match(e.text, /Прикачили сме офертата като PDF файл/);
    assert.match(e.html, /ZV-20261103-K7QM/);
  });

  it("не споменава PDF, ако не е прикачен", () => {
    const e = customerEmail(samplePdfData, { pdfAttached: false });
    assert.doesNotMatch(e.text, /PDF/);
    assert.doesNotMatch(e.html, /PDF/);
  });

  it("при район по договаряне не показва сума", () => {
    const e = customerEmail(sampleOnRequestPdfData, { pdfAttached: true });
    assert.match(e.text, /Цена по договаряне/);
    assert.doesNotMatch(e.text, /€/);
  });
});

describe("ownerEmail", () => {
  const hostile: QuoteOffer = {
    ...samplePdfData,
    customer: {
      ...samplePdfData.customer,
      name: `Иван <img src=x onerror="alert(1)">`,
      message: `<a href="http://evil.example">Натисни</a>`,
    },
  };

  it("не пуска HTML от клиента в имейла", () => {
    const e = ownerEmail(hostile);
    assert.doesNotMatch(e.html, /<img/);
    assert.doesNotMatch(e.html, /<a href="http:\/\/evil/);
    assert.match(e.html, /&lt;img src=x/);
  });

  it("темата казва какво е запитването", () => {
    const e = ownerEmail(samplePdfData);
    assert.equal(
      e.subject,
      "Ново запитване ZV-20261103-K7QM: Поддръжка на двор, 450 м², Бояна",
    );
    assert.match(e.text, /Телефон: \+359 888 000 000/);
    assert.match(e.html, /href="tel:\+359888000000"/);
  });
});
