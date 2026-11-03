// Пускане: npm run test:pdf (влиза и в npm test)
// Не върви с tsx (react-pdf е само ESM), затова се пакетира с esbuild и се пуска с node.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import zlib from "node:zlib";

import { generateQuotePdf } from "./quote-pdf";
import { sampleOnRequestPdfData, samplePdfData } from "./sample";

const asText = (pdf: Buffer) => pdf.toString("latin1");

/** Брой страници в PDF файла. */
function pageCount(pdf: Buffer): number {
  return asText(pdf).match(/\/Type\s*\/Page(?![s])/g)?.length ?? 0;
}

/**
 * "Таблиците на буквите" (ToUnicode) във файла. По тях програмите разбират
 * кой символ е коя буква, когато копираш текст от PDF-а.
 */
function unicodeMaps(pdf: Buffer): string[] {
  const text = asText(pdf);
  const maps: string[] = [];
  const re = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    try {
      const out = zlib.inflateSync(pdf.subarray(start, end)).toString("latin1");
      if (out.includes("begincmap")) maps.push(out);
    } catch {
      // не е компресиран поток (напр. шрифт)
    }
  }
  return maps;
}

describe("generateQuotePdf", () => {
  it("прави валиден PDF на една страница", async () => {
    const pdf = await generateQuotePdf(samplePdfData);
    assert.equal(asText(pdf.subarray(0, 5)), "%PDF-");
    assert.equal(pageCount(pdf), 1);
  });

  it("вгражда шрифта с кирилица", async () => {
    const pdf = await generateQuotePdf(samplePdfData);
    assert.match(asText(pdf), /PTSans/);
  });

  it("работи и за оферта по договаряне", async () => {
    const pdf = await generateQuotePdf(sampleOnRequestPdfData);
    assert.equal(pageCount(pdf), 1);
  });

  it("копираният текст е верен и когато PDF-ите се правят един след друг", async () => {
    // Капан на react-pdf: при общ шрифт вторият различен PDF получаваше
    // празно място в таблицата и всички букви след него се разместваха.
    const pdfs = [];
    for (const data of [samplePdfData, sampleOnRequestPdfData, samplePdfData]) {
      pdfs.push(await generateQuotePdf(data));
    }
    for (const pdf of pdfs) {
      const maps = unicodeMaps(pdf);
      assert.ok(maps.length > 0, "няма таблица на буквите");
      for (const map of maps) assert.doesNotMatch(map, /<>/);
    }
  });

  it("издържа няколко едновременни заявки", async () => {
    const pdfs = await Promise.all([
      generateQuotePdf(samplePdfData),
      generateQuotePdf(sampleOnRequestPdfData),
      generateQuotePdf(samplePdfData),
    ]);
    for (const pdf of pdfs) assert.equal(pageCount(pdf), 1);
  });
});
