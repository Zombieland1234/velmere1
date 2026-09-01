import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { inspectPdfBytes, verifyLocalPdfCorpus } from "./verify-local-pdf-corpus.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const loaderPath = pathToFileURL(path.join(repoRoot, "scripts/pass11/register-offline-ts-loader.mjs")).href;
const generatorPath = path.join(repoRoot, "scripts/pass35/generate-local-pdf-corpus.ts");
const manifestPath = path.join(repoRoot, "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_CORPUS_MANIFEST.json");

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function runGenerator() {
  const result = spawnSync(process.execPath, ["--import", loaderPath, generatorPath], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, TZ: "UTC" },
  });
  assert.equal(result.status, 0, `generator failed\n${result.stdout}\n${result.stderr}`);
}

function runGeneratorAsync() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", loaderPath, generatorPath], {
      cwd: repoRoot,
      env: { ...process.env, TZ: "UTC" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`concurrent generator failed (${code})\n${stdout}\n${stderr}`));
    });
  });
}

function captureCorpus() {
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const pdfs = Object.fromEntries(manifest.entries.map((entry) => {
    const bytes = fs.readFileSync(path.join(repoRoot, entry.path));
    return [entry.path, sha256(bytes)];
  }));
  return { manifest, manifestSha256: sha256(manifestBytes), pdfs };
}

let assertions = 0;
runGenerator();
const first = captureCorpus();
runGenerator();
const second = captureCorpus();
await Promise.all([runGeneratorAsync(), runGeneratorAsync()]);
const concurrent = captureCorpus();
const transientGenerationArtifacts = fs.readdirSync(
  path.join(repoRoot, "artifacts/pass35/local-product-quality"),
).filter((name) =>
  name === ".pdf-corpus-generation.lock" || name.startsWith("pdf-corpus.tmp-"),
);

assert.equal(first.manifestSha256, second.manifestSha256); assertions += 1;
assert.deepEqual(first.pdfs, second.pdfs); assertions += 1;
assert.equal(second.manifestSha256, concurrent.manifestSha256); assertions += 1;
assert.deepEqual(second.pdfs, concurrent.pdfs); assertions += 1;
assert.deepEqual(transientGenerationArtifacts, []); assertions += 1;
assert.equal(second.manifest.entries.length, 150); assertions += 1;
assert.equal(new Set(second.manifest.entries.map((entry) => entry.assetId)).size, 50); assertions += 1;
assert.deepEqual(second.manifest.totals.byTier, { Basic: 50, Pro: 50, Advanced: 50 }); assertions += 1;
assert.equal(second.manifest.totals.totalPages, 700); assertions += 1;

for (const tier of ["Basic", "Pro", "Advanced"]) {
  const ids = second.manifest.entries.filter((entry) => entry.tier === tier).map((entry) => entry.assetId).sort();
  const basicIds = second.manifest.entries.filter((entry) => entry.tier === "Basic").map((entry) => entry.assetId).sort();
  assert.deepEqual(ids, basicIds); assertions += 1;
}

const receipt = await verifyLocalPdfCorpus();
assert.equal(receipt.status, "PASS", JSON.stringify(receipt.failures)); assertions += 1;
assert.deepEqual(receipt.totals, {
  pdfCount: 150,
  byTier: { Basic: 50, Pro: 50, Advanced: 50 },
  totalPages: 700,
}); assertions += 1;
assert.equal(receipt.pdfs.every((pdf) => pdf.status === "PASS"), true); assertions += 1;

const firstEntry = second.manifest.entries[0];
const firstBytes = fs.readFileSync(path.join(repoRoot, firstEntry.path));
const expectedPageCount = { Basic: 2, Pro: 4, Advanced: 8 }[firstEntry.tier];
const inspection = inspectPdfBytes(firstBytes, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(inspection.status, "PASS"); assertions += 1;

const bannedMutation = Buffer.from(firstBytes.toString("latin1").replace("NOT FOR SALE", "BUY NOW FIXT"), "latin1");
const bannedInspection = inspectPdfBytes(bannedMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(bannedInspection.reasons.includes("banned_directional_language"), true); assertions += 1;

const markerMutation = Buffer.from(firstBytes.toString("latin1").replaceAll("SYNTHETIC QA", "FIXTURE TEST"), "latin1");
const markerInspection = inspectPdfBytes(markerMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(markerInspection.reasons.includes("synthetic_markers_missing"), true); assertions += 1;

const truncationMutation = Buffer.from(
  firstBytes.toString("latin1").replace("NOT LIVE", "NOT LIVE [cut]"),
  "latin1",
);
const truncationInspection = inspectPdfBytes(truncationMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(
  truncationInspection.reasons.includes("visible_text_truncated:1"),
  true,
); assertions += 1;

const punctuationMutation = Buffer.from(
  firstBytes.toString("latin1").replace("NOT LIVE", "NOT LIVE.."),
  "latin1",
);
const punctuationInspection = inspectPdfBytes(punctuationMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(
  punctuationInspection.reasons.includes("visible_text_double_period:1"),
  true,
); assertions += 1;

const fontMutation = Buffer.from(firstBytes.toString("latin1").replace("/FontFile2", "/FontFileX"), "latin1");
const fontInspection = inspectPdfBytes(fontMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(fontInspection.reasons.includes("embedded_font_missing"), true); assertions += 1;

const unicodeMutation = Buffer.from(firstBytes.toString("latin1").replace("/ToUnicode", "/NoUnicode"), "latin1");
const unicodeInspection = inspectPdfBytes(unicodeMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(unicodeInspection.reasons.includes("unicode_map_missing"), true); assertions += 1;

const fontSizeMutation = Buffer.from(firstBytes.toString("latin1").replace("/F1 7 Tf", "/F1 6 Tf"), "latin1");
const fontSizeInspection = inspectPdfBytes(fontSizeMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(fontSizeInspection.reasons.includes("font_size_below_minimum:6"), true); assertions += 1;

const footerMutation = Buffer.from(firstBytes.toString("latin1").replace(" 455 68 Td", " 300 68 Td"), "latin1");
const footerInspection = inspectPdfBytes(footerMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(
  footerInspection.reasons.some((reason) => reason.startsWith("page_two_footer_overlap:")),
  true,
); assertions += 1;

const subjectMutation = Buffer.from(
  firstBytes.toString("latin1").replace(/\/Subject\s+<[a-f0-9]+>/i, "/Subject <feff006200610064>"),
  "latin1",
);
const subjectInspection = inspectPdfBytes(subjectMutation, {
  pageCount: expectedPageCount,
  symbol: firstEntry.symbol,
  locale: firstEntry.locale,
});
assert.equal(subjectInspection.reasons.includes("pdf_subject_unicode_invalid"), true); assertions += 1;

console.log(JSON.stringify({
  schemaVersion: "velmere.pass35.local-pdf-corpus-test.v1",
  status: "PASS",
  assertions,
  pdfCount: receipt.totals.pdfCount,
  byTier: receipt.totals.byTier,
  totalPages: receipt.totals.totalPages,
  deterministicManifestSha256: second.manifestSha256,
}, null, 2));
