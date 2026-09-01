#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeDeterministicZip } from "../pass4826/release-package-contract.mjs";

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(ROOT, "artifacts/pass35/local-product-quality");
const RECEIPT_PATH = path.join(ARTIFACT_ROOT, "PASS35_LOCAL_PDF_QA_RECEIPT.json");
const RASTER_RECEIPT_PATH = path.join(ARTIFACT_ROOT, "PASS35_LOCAL_PDF_RASTER_QA_RECEIPT.json");
const OUTPUT_DIR = path.resolve(ROOT, "../deliverables");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "VELMERE_PASS35_LOCAL_PRODUCT_PDF_QA.zip");
const PACKAGE_RECEIPT_PATH = path.join(OUTPUT_DIR, "PASS35_LOCAL_PRODUCT_PDF_PACKAGE_RECEIPT.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function walk(directory, relative = "") {
  const rows = [];
  for (const name of readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    const local = relative ? `${relative}/${name}` : name;
    const metadata = statSync(absolute, { throwIfNoEntry: true });
    if (metadata.isDirectory()) rows.push(...walk(absolute, local));
    else if (metadata.isFile()) rows.push({ absolute, relative: local, mode: (metadata.mode & 0o111) ? 0o100755 : 0o100644 });
    else throw new Error(`local_pdf_package_unsupported_entry:${local}`);
  }
  return rows;
}

const receipt = JSON.parse(readFileSync(RECEIPT_PATH, "utf8"));
const rasterReceipt = JSON.parse(readFileSync(RASTER_RECEIPT_PATH, "utf8"));
if (!String(receipt.status ?? "").startsWith("PASS")) throw new Error("local_pdf_receipt_not_pass");
if (receipt?.totals?.pdfCount !== 150 || receipt?.totals?.totalPages !== 700) {
  throw new Error("local_pdf_receipt_totals_invalid");
}
for (const tier of ["Basic", "Pro", "Advanced"]) {
  if (receipt?.totals?.byTier?.[tier] !== 50) throw new Error(`local_pdf_receipt_tier_invalid:${tier}`);
}
if (!Array.isArray(receipt.pdfs) || receipt.pdfs.length !== 150) throw new Error("local_pdf_receipt_rows_invalid");
const boundaries = receipt.boundaries ?? {};
if (
  boundaries.synthetic !== true
  || boundaries.offline !== true
  || boundaries.notLive !== true
  || boundaries.notForSale !== true
  || boundaries.investmentRecommendation !== false
  || boundaries.productionEntitlementBypassed !== false
) {
  throw new Error("local_pdf_receipt_truth_boundary_invalid");
}
if (
  rasterReceipt.status !== "PASS"
  || rasterReceipt.pdfCount !== 150
  || rasterReceipt.renderedPageCount !== 700
  || rasterReceipt.promotionAllowed !== false
  || rasterReceipt.externalEvidenceCredit !== 0
) {
  throw new Error("local_pdf_raster_receipt_truth_boundary_invalid");
}

const sourceRows = walk(ARTIFACT_ROOT);
const pdfRows = sourceRows.filter((row) => row.relative.endsWith(".pdf"));
if (pdfRows.length !== 150) throw new Error(`local_pdf_package_pdf_count_invalid:${pdfRows.length}`);
const entries = sourceRows.map((row) => ({
  path: `PASS35_LOCAL_PRODUCT_PDF_QA/${row.relative}`,
  content: readFileSync(row.absolute),
  mode: row.mode,
}));

mkdirSync(OUTPUT_DIR, { recursive: true });
const archive = writeDeterministicZip(OUTPUT_PATH, entries, { overwrite: true });
const receiptCore = {
  schemaVersion: "velmere.pass35.local-product-pdf-package-receipt.v1",
  candidateId: "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
  generatedAt: new Date().toISOString(),
  status: "PASS_LOCAL_SYNTHETIC_PDF_PACKAGE_NO_PROMOTION",
  archive: {
    fileName: path.basename(OUTPUT_PATH),
    sha256: archive.sha256,
    byteLength: archive.byteLength,
    entryCount: archive.entryCount,
  },
  pdfCount: pdfRows.length,
  totalPages: 700,
  byTier: { Basic: 50, Pro: 50, Advanced: 50 },
  manifestSha256: sha256(stable(receipt.pdfs)),
  investmentRecommendationEnabled: false,
  purchaseWorthinessClaimed: false,
  sellEnabled: false,
  paymentEnabled: false,
  promotionAllowed: false,
  externalEvidenceCredit: 0,
  truthBoundary: "This archive contains deterministic synthetic local QA reports. It is not live market data, an investment recommendation, a customer artifact, a paid entitlement, external evidence or promotion approval.",
};
const packageReceipt = { ...receiptCore, receiptSha256: sha256(stable(receiptCore)) };
writeFileSync(PACKAGE_RECEIPT_PATH, `${JSON.stringify(packageReceipt, null, 2)}\n`);
console.log(JSON.stringify(packageReceipt, null, 2));
