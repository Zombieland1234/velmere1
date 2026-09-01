#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const receiptPath = "artifacts/pass35/PASS35_A17_PACKET_PDF_RASTER_QA_RECEIPT.json";
const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };

check(receipt.schemaVersion === "velmere.pass35.a17.packet-pdf-raster-qa-receipt.v1", "schema");
check(receipt.status === "PASS", "status");
check(receipt.renderer === "pypdfium2", "renderer");
check(existsSync(receipt.manifest.path), "manifest missing");
check(sha256(readFileSync(receipt.manifest.path)) === receipt.manifest.sha256, "manifest digest");
check(receipt.totals.pdfCount === 21, "pdf count");
check(receipt.totals.pageCount === 98, "page count");
check(receipt.totals.blankPages === 0, "blank pages");
check(receipt.totals.pagesTouchingRasterEdge === 0, "edge pages");
check(receipt.totals.contactSheets === 3, "contact sheet count");
check(Array.isArray(receipt.pages) && receipt.pages.length === 98, "page rows");
check(receipt.pages.every((row) => row.blank === false && row.touchesRasterEdge === false && row.nonWhitePixelRatio > 0), "page raster truth");
check(Array.isArray(receipt.contactSheets) && receipt.contactSheets.length === 3, "contact sheets");
for (const sheet of receipt.contactSheets) {
  check(existsSync(sheet.path) && statSync(sheet.path).isFile(), `missing contact sheet:${sheet.path}`);
  check(statSync(sheet.path).size === sheet.byteLength, `contact sheet size:${sheet.path}`);
  check(sha256(readFileSync(sheet.path)) === sheet.sha256, `contact sheet digest:${sheet.path}`);
}
check(receipt.failures.length === 0, "raster failures");
check(receipt.boundaries.synthetic && receipt.boundaries.offline && receipt.boundaries.notLive && receipt.boundaries.notForSale, "boundaries");
console.log(JSON.stringify({ status: "PASS_A17_PACKET_PDF_RASTER_RECEIPT", checks, totals: receipt.totals, receiptSha256: receipt.receiptSha256 }, null, 2));
