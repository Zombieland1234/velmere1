#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { inspectPass35A17PacketPdf } from "../../lib/reporting/pass35-a17-packet-pdf-runtime.mjs";

const MANIFEST_PATH = "artifacts/pass35/PASS35_A17_PACKET_PDF_CORPUS_MANIFEST.json";
const QA_RECEIPT_PATH = "artifacts/pass35/PASS35_A17_PACKET_PDF_QA_RECEIPT.json";
const RASTER_RECEIPT_PATH = "artifacts/pass35/PASS35_A17_PACKET_PDF_RASTER_QA_RECEIPT.json";
const mode = process.argv.includes("--raster") ? "raster" : "structure";
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const readJsonBytes = (filePath) => {
  const bytes = readFileSync(filePath);
  return { bytes, value: JSON.parse(bytes) };
};
const sameArray = (left, right) => JSON.stringify(left) === JSON.stringify(right);
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };

const manifestFile = readJsonBytes(MANIFEST_PATH);
const manifest = manifestFile.value;
check(manifest.schemaVersion === "velmere.pass35.a17.packet-pdf-corpus-manifest.v1", "manifest schema");
check(manifest.pdfCount === 21 && manifest.totalPages === 98, "manifest totals");
check(sameArray(manifest.byTier, { basic: 7, pro: 7, advanced: 7 }), "manifest tier counts");
check(manifest.boundaries?.synthetic && manifest.boundaries?.offline && manifest.boundaries?.notLive && manifest.boundaries?.notForSale, "manifest boundaries");
check(Array.isArray(manifest.entries) && manifest.entries.length === 21, "manifest entries");

if (mode === "structure") {
  const qaFile = readJsonBytes(QA_RECEIPT_PATH);
  const receipt = qaFile.value;
  check(receipt.schemaVersion === "velmere.pass35.a17.packet-pdf-qa-receipt.v1", "qa schema");
  check(receipt.status === "PASS", "qa status");
  check(receipt.manifest?.path === MANIFEST_PATH, "qa manifest path");
  check(receipt.manifest?.sha256 === sha256(manifestFile.bytes), "qa manifest digest");
  check(receipt.totals?.pdfCount === 21 && receipt.totals?.totalPages === 98, "qa totals");
  check(receipt.totals?.passingPdfs === 21 && receipt.totals?.failedPdfs === 0, "qa pass totals");
  check(receipt.assertions?.total === 266 && receipt.assertions?.passed === 266 && receipt.assertions?.failed === 0, "qa assertions");
  check(Array.isArray(receipt.failures) && receipt.failures.length === 0, "qa failures");
  check(Array.isArray(receipt.pdfs) && receipt.pdfs.length === 21, "qa pdf rows");
  const { receiptSha256, ...receiptCore } = receipt;
  check(receiptSha256 === sha256(JSON.stringify(receiptCore)), "qa receipt digest");

  const qaByPath = new Map(receipt.pdfs.map((row) => [row.path, row]));
  for (const entry of manifest.entries) {
    const row = qaByPath.get(entry.path);
    check(Boolean(row), `qa row missing:${entry.path}`);
    check(row.status === "PASS", `qa row status:${entry.path}`);
    check(row.sha256 === entry.sha256 && row.observedSha256 === entry.sha256, `qa sha:${entry.path}`);
    check(row.byteLength === entry.byteLength && row.observedByteLength === entry.byteLength, `qa bytes:${entry.path}`);
    check(row.pageCount === entry.pageCount && row.packetId === entry.packetId, `qa packet:${entry.path}`);
    check(sameArray(row.claimIds, entry.claimIds), `qa claims:${entry.path}`);
  }

  const presentCount = manifest.entries.filter((entry) => existsSync(entry.path)).length;
  check(presentCount === 0 || presentCount === manifest.entries.length, "partial physical PDF corpus forbidden");
  if (presentCount === manifest.entries.length) {
    for (const entry of manifest.entries) {
      const bytes = readFileSync(entry.path);
      const inspection = inspectPass35A17PacketPdf(bytes, entry);
      check(sha256(bytes) === entry.sha256, `physical sha:${entry.path}`);
      check(bytes.byteLength === entry.byteLength, `physical bytes:${entry.path}`);
      check(inspection.reasons.length === 0, `physical structure:${entry.path}:${inspection.reasons.join("|")}`);
      check(inspection.pageCount === entry.pageCount, `physical pages:${entry.path}`);
      check(inspection.packetIdCount === entry.pageCount, `physical packet IDs:${entry.path}`);
      check(sameArray(inspection.claimIds, entry.claimIds), `physical claims:${entry.path}`);
    }
  }
  console.log(JSON.stringify({
    status: "PASS_A17_PACKET_PDF_PACKAGE_BOUNDARY",
    mode: presentCount === manifest.entries.length ? "PHYSICAL_PDF_BYTES" : "SOURCE_PACKAGE_HASH_BOUND_RECEIPTS",
    checks,
    pdfCount: 21,
    totalPages: 98,
    qaReceiptSha256: receipt.receiptSha256,
  }, null, 2));
} else {
  const rasterFile = readJsonBytes(RASTER_RECEIPT_PATH);
  const receipt = rasterFile.value;
  check(receipt.schemaVersion === "velmere.pass35.a17.packet-pdf-raster-qa-receipt.v1", "raster schema");
  check(receipt.status === "PASS" && receipt.renderer === "pypdfium2", "raster status/renderer");
  check(receipt.manifest?.path === MANIFEST_PATH, "raster manifest path");
  check(receipt.manifest?.sha256 === sha256(manifestFile.bytes), "raster manifest digest");
  check(receipt.totals?.pdfCount === 21 && receipt.totals?.pageCount === 98, "raster totals");
  check(receipt.totals?.blankPages === 0 && receipt.totals?.pagesTouchingRasterEdge === 0, "raster blank/edge");
  check(receipt.totals?.contactSheets === 3, "raster contact sheet total");
  check(Array.isArray(receipt.pages) && receipt.pages.length === 98, "raster page rows");
  check(receipt.pages.every((row) => row.blank === false && row.touchesRasterEdge === false && row.nonWhitePixelRatio > 0 && /^sha256:[0-9a-f]{64}$/u.test(row.pngSha256) && row.pngByteLength > 0), "raster page truth");
  check(Array.isArray(receipt.contactSheets) && receipt.contactSheets.length === 3, "raster sheet rows");
  check(Array.isArray(receipt.failures) && receipt.failures.length === 0, "raster failures");
  check(receipt.boundaries?.synthetic && receipt.boundaries?.offline && receipt.boundaries?.notLive && receipt.boundaries?.notForSale, "raster boundaries");
  const { receiptSha256, ...receiptCore } = receipt;
  check(receiptSha256 === sha256(canonicalJson(receiptCore)), "raster receipt digest");

  const sheetPresentCount = receipt.contactSheets.filter((sheet) => existsSync(sheet.path)).length;
  check(sheetPresentCount === 0 || sheetPresentCount === receipt.contactSheets.length, "partial contact sheets forbidden");
  for (const sheet of receipt.contactSheets) {
    check(["basic", "pro", "advanced"].includes(sheet.tier), `sheet tier:${sheet.tier}`);
    check(/^sha256:[0-9a-f]{64}$/u.test(sheet.sha256) && sheet.byteLength > 0 && sheet.sourceFirstPages === 7, `sheet metadata:${sheet.tier}`);
    if (sheetPresentCount === receipt.contactSheets.length) {
      check(statSync(sheet.path).isFile() && statSync(sheet.path).size === sheet.byteLength, `sheet file:${sheet.path}`);
      check(sha256(readFileSync(sheet.path)) === sheet.sha256, `sheet digest:${sheet.path}`);
    }
  }
  console.log(JSON.stringify({
    status: "PASS_A17_PACKET_PDF_RASTER_PACKAGE_BOUNDARY",
    mode: sheetPresentCount === receipt.contactSheets.length ? "PHYSICAL_CONTACT_SHEETS" : "SOURCE_PACKAGE_HASH_BOUND_RECEIPT",
    checks,
    totals: receipt.totals,
    rasterReceiptSha256: receipt.receiptSha256,
  }, null, 2));
}
