// Пробен PDF без сайт и без база: npm run pdf:sample
// Записва out/oferta-primer.pdf (и вариант "по договаряне"), за да видиш как изглежда.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateQuotePdf } from "../lib/pdf/quote-pdf";
import { sampleOnRequestPdfData, samplePdfData } from "../lib/pdf/sample";

async function main() {
  const outDir = path.join(process.cwd(), "out");
  await mkdir(outDir, { recursive: true });

  const files: [string, Buffer][] = [
    ["oferta-primer.pdf", await generateQuotePdf(samplePdfData)],
    ["oferta-po-dogovaryane.pdf", await generateQuotePdf(sampleOnRequestPdfData)],
  ];

  for (const [name, pdf] of files) {
    const file = path.join(outDir, name);
    await writeFile(file, pdf);
    console.log(`Готово: ${file} (${Math.round(pdf.length / 1024)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
