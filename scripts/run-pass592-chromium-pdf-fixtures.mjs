import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const fixturePath = path.join(root, "fixtures/pass580-pdf-visual-regression.json");
const proofPath = path.join(root, "fixtures/pass592-chromium-render-proof.json");
const keepArtifacts = process.env.PASS592_KEEP_ARTIFACTS === "1";
const limit = Number.parseInt(process.env.PASS592_FIXTURE_LIMIT || "27", 10);
const outputRoot = process.env.PASS592_OUTPUT_DIR
  ? path.resolve(process.env.PASS592_OUTPUT_DIR)
  : fs.mkdtempSync(path.join(os.tmpdir(), "velmere-pass592-"));

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findChromium() {
  const configured = process.env.CHROMIUM_PATH;
  const candidates = [
    configured,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chromium executable not found. Set CHROMIUM_PATH.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function copy(locale) {
  if (locale === "pl") {
    return {
      title: "Velmère · dowód renderu PDF",
      decision: "Decyzja i granice pewności",
      sources: "Źródła i świeżość",
      analysis: "Pola analizy",
      boundary: "Braki, następny test i podpis",
      note: "Brak źródła pozostaje jawny; raport nie udaje danych live.",
    };
  }
  if (locale === "de") {
    return {
      title: "Velmère · PDF-Rendernachweis",
      decision: "Entscheidung und Konfidenzgrenze",
      sources: "Quellen und Aktualität",
      analysis: "Analysefelder",
      boundary: "Lücken, nächster Test und Signatur",
      note: "Eine fehlende Quelle bleibt sichtbar; der Bericht simuliert keine Live-Daten.",
    };
  }
  return {
    title: "Velmère · PDF render proof",
    decision: "Decision and confidence boundary",
    sources: "Sources and freshness",
    analysis: "Analysis fields",
    boundary: "Gaps, next test and signature",
    note: "Missing evidence stays explicit; the report never fabricates live data.",
  };
}

function densityText(density) {
  if (density === "short") return "Verified evidence with compact wording.";
  if (density === "normal") {
    return "Verified evidence with a second-source check, timestamp boundary and a concise explanation of what may change the conclusion.";
  }
  return "https://evidence.velmere.example/source/provider/ethereum/mainnet/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef · Kapitalmarktinformationsverarbeitungssicherheitsnachweis · deterministic-identifier-0000000000000000000000000000000000000000000000000000000000000001";
}

function page(index, heading, body) {
  return `<section class="page" data-page="${index}">
    <header><span>VELMÈRE CYBERSECURITY</span><span>PASS592 · ${index}/4</span></header>
    <main><p class="eyebrow">${escapeHtml(heading)}</p>${body}</main>
    <footer><span>source-bound research</span><span>VLM PDF PROOF</span></footer>
  </section>`;
}

function buildHtml(fixture) {
  const c = copy(fixture.locale);
  const stress = densityText(fixture.density);
  const sourceRows = Array.from({ length: fixture.expectedSourceRows }, (_, index) =>
    `<article class="row"><b>S${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(stress)}</span><em>${index % 2 ? "partial" : "confirmed"}</em></article>`,
  ).join("");
  const fieldRows = Array.from({ length: fixture.expectedFieldBudget }, (_, index) =>
    `<article class="field"><small>C${String(index + 1).padStart(2, "0")} · S${String((index % Math.max(1, fixture.expectedSourceRows)) + 1).padStart(2, "0")}</small><b>Evidence field ${index + 1}</b><p>${escapeHtml(stress)}</p></article>`,
  ).join("");
  const boundaryRows = Array.from({ length: fixture.density === "overloaded" ? 8 : 4 }, (_, index) =>
    `<li>${index + 1}. ${escapeHtml(c.note)} ${escapeHtml(stress)}</li>`,
  ).join("");

  return `<!doctype html><html lang="${fixture.locale}"><head><meta charset="utf-8"><title>${escapeHtml(c.title)}</title><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html,body { margin:0; padding:0; background:#d7d4cc; font-family:Arial,Helvetica,sans-serif; color:#171717; }
  body { width:210mm; }
  .page { width:210mm; height:297mm; page-break-after:always; break-after:page; overflow:hidden; background:#fbf8f0; padding:15mm 16mm 12mm; display:grid; grid-template-rows:auto 1fr auto; }
  .page:last-child { page-break-after:auto; break-after:auto; }
  header,footer { display:flex; justify-content:space-between; gap:8mm; font:700 8px/1.4 ui-monospace,monospace; letter-spacing:.16em; color:#8a6b2f; }
  footer { border-top:1px solid rgba(0,0,0,.14); padding-top:4mm; color:rgba(0,0,0,.45); }
  main { min-height:0; overflow:hidden; padding-top:10mm; }
  h1 { margin:0 0 6mm; font:700 34px/1.02 Georgia,serif; letter-spacing:-.04em; }
  .eyebrow { margin:0 0 5mm; font:700 9px/1.4 ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#8a6b2f; }
  .lead { font-size:14px; line-height:1.65; max-width:155mm; overflow-wrap:anywhere; }
  .rows { display:grid; gap:2.4mm; }
  .row { min-height:18mm; border:1px solid rgba(0,0,0,.12); border-radius:4mm; padding:3mm 4mm; display:grid; grid-template-columns:12mm 1fr auto; gap:3mm; align-items:start; font-size:9px; line-height:1.45; }
  .row span,.field p,li { overflow-wrap:anywhere; word-break:break-word; hyphens:auto; }
  .row em { font:700 7px ui-monospace,monospace; text-transform:uppercase; color:#6b5124; }
  .fields { display:grid; grid-template-columns:1fr 1fr; gap:2.4mm; }
  .field { min-height:21mm; border:1px solid rgba(0,0,0,.1); border-radius:4mm; padding:3mm; overflow:hidden; }
  .field small { display:block; color:#8a6b2f; font:700 7px ui-monospace,monospace; }
  .field b { display:block; margin-top:1.5mm; font-size:9px; }
  .field p { margin:1.5mm 0 0; font-size:7px; line-height:1.4; color:rgba(0,0,0,.62); }
  ul { margin:0; padding-left:5mm; display:grid; gap:3mm; font-size:9px; line-height:1.55; }
  .seal { margin-top:8mm; padding:5mm; border:1px solid rgba(138,107,47,.25); border-radius:5mm; font:700 9px/1.5 ui-monospace,monospace; color:#6b5124; }
  </style></head><body>
  ${page(1, c.decision, `<h1>${escapeHtml(c.title)}</h1><p class="lead">${escapeHtml(stress)} ${escapeHtml(c.note)}</p><div class="seal">${fixture.id} · ${fixture.depth.toUpperCase()} · ${fixture.density.toUpperCase()}</div>`)}
  ${page(2, c.sources, `<div class="rows">${sourceRows}</div>`)}
  ${page(3, c.analysis, `<div class="fields">${fieldRows}</div>`)}
  ${page(4, c.boundary, `<ul>${boundaryRows}</ul><div class="seal">4 pages · ${fixture.expectedFieldBudget} fields · ${fixture.expectedSourceRows} sources</div>`)}
  </body></html>`;
}


function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("PASS592 received an invalid PNG buffer.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function pdfPageCount(buffer) {
  const source = buffer.toString("latin1");
  const pageObjects = source.match(/\/Type\s*\/Page\b/g) || [];
  if (pageObjects.length) return pageObjects.length;
  const treeCount = source.match(/\/Type\s*\/Pages[\s\S]{0,320}?\/Count\s+(\d+)/);
  return treeCount ? Number.parseInt(treeCount[1], 10) : 0;
}

async function loadPlaywright() {
  try {
    const module = await import("playwright");
    return module.chromium;
  } catch (error) {
    throw new Error(
      `PASS592 requires the project dev dependency @playwright/test/playwright. Run npm ci under Node.js 20.x before this gate. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const fixtures = (payload.fixtures || []).slice(0, Number.isFinite(limit) ? limit : 27);
if (payload.fixtures?.length !== 27) throw new Error("Expected 27 PASS580 fixtures.");
const chromiumExecutable = findChromium();
const chromium = await loadPlaywright();
fs.mkdirSync(outputRoot, { recursive: true });
const results = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutable,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1240, height: 7016 },
    deviceScaleFactor: 1,
  });

  for (const fixture of fixtures) {
    await page.setContent(buildHtml(fixture), { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const pages = document.querySelectorAll(".page");
      if (pages.length !== 4) throw new Error(`Expected 4 fixture pages, got ${pages.length}`);
    });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    const viewport = pngSize(screenshot);
    const renderedPages = pdfPageCount(pdf);
    const reasons = [];
    if (renderedPages !== fixture.expectedPages) reasons.push("pdf_page_count_mismatch");
    if (viewport.width < 1000 || viewport.height < 1400) reasons.push("viewport_too_small");

    const result = {
      fixtureId: fixture.id,
      locale: fixture.locale,
      depth: fixture.depth,
      density: fixture.density,
      expectedPages: fixture.expectedPages,
      renderedPages,
      viewport,
      screenshotSha256: crypto.createHash("sha256").update(screenshot).digest("hex"),
      pdfSha256: crypto.createHash("sha256").update(pdf).digest("hex"),
      state: reasons.length ? "fail" : "pass",
      reasons,
    };
    results.push(result);

    if (keepArtifacts) {
      fs.writeFileSync(path.join(outputRoot, `${fixture.id}.html`), buildHtml(fixture));
      fs.writeFileSync(path.join(outputRoot, `${fixture.id}.png`), screenshot);
      fs.writeFileSync(path.join(outputRoot, `${fixture.id}.pdf`), pdf);
    }
  }
} finally {
  await browser.close();
}

const canonical = results
  .map((result) => `${result.fixtureId}:${result.screenshotSha256}:${result.pdfSha256}:${result.renderedPages}`)
  .join("|");
const proof = {
  version: "pass592-chromium-render-proof",
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  nodeContract: "20.x",
  executionDriver: "playwright-single-browser",
  chromium: `Chromium executable: ${chromiumExecutable}`,
  fixtureCount: results.length,
  expectedFixtureCount: 27,
  state: results.length === 27 && results.every((result) => result.state === "pass") ? "pass" : "review",
  aggregateSha256: crypto.createHash("sha256").update(canonical).digest("hex"),
  results,
  boundary: "This proof records actual Chromium PNG/PDF hashes. A pass under another Node version does not replace the required Node.js 20 CI execution.",
};
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
if (!keepArtifacts) fs.rmSync(outputRoot, { recursive: true, force: true });
console.log(`PASS592 ${proof.state.toUpperCase()} · ${proof.fixtureCount}/27 fixtures · ${proof.aggregateSha256}`);
if (proof.state !== "pass" && results.length === 27) process.exitCode = 1;
