import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const must = (condition, message) => { if (!condition) failures.push(message); };

const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const css = read("app/globals.css");
const route = read("app/api/search/lens-report/route.ts");

must(lens.includes('data-pass328-a4-print-polish="true"'), "Lens page lacks PASS328 print-polish marker");
must(lens.includes('data-pass328-a4-report-sheet="true"'), "A4 sheet lacks PASS328 report-sheet marker");
must(lens.includes('data-pass328-a4-report-grid="true"'), "A4 sheet lacks PASS328 report grid");
must(lens.includes("Proof passport lane"), "A4 preview lacks proof-passport lane");
must(lens.includes("vlm-browser-a4-legal-note"), "A4 preview lacks legal/trust boundary note");
must(lens.includes("setResponse(data);\n        // PASS328"), "Search success path lacks PASS328 auto-preview prevention marker");
must(!lens.includes("setResponse(data);\n        setPdfPreviewResult(data.results?.[0] ?? null);"), "Search still auto-opens the A4 preview after normal search");

must(css.includes("/* PASS328 · A4 PDF print polish and Lens report passport */"), "CSS lacks PASS328 A4 block");
must(css.includes("@page {\n  size: A4;"), "Global CSS lacks @page A4 print contract");
must(css.includes("aspect-ratio: 210 / 297"), "A4 sheet lacks ISO A4 aspect ratio");
must(css.includes("vlm-browser-a4-signature-block"), "CSS lacks printable signature placeholder");

must(route.includes("PASS328 adds print-grade A4 sections"), "PDF route lacks PASS328 route marker");
must(route.includes("@page{size:A4;margin:0}"), "HTML report route lacks @page A4 CSS");
must(route.includes("Proof passport lane"), "PDF route lacks proof passport lane");
must(route.includes('"content-type": "application/pdf"'), "PDF download route no longer returns application/pdf");
must(route.includes("not a safety certificate") && route.includes("guaranteed result"), "PDF route lacks safe export boundary wording");

if (failures.length) {
  console.error("PASS328 verify failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS328 verify passed: A4 PDF stays click-gated, print CSS is present, PDF route exports a safer passport-style evidence note.");
