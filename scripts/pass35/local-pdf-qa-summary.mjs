import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { canonicalJson, sha256 } from "./source-inventory.mjs";
import { PASS35_CANDIDATE_ID } from "./release-manifest-set.mjs";

export const PASS35_LOCAL_PDF_QA_SUMMARY_PATH = "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json";
export const PASS35_LOCAL_PDF_QA_RECEIPT_PATH = "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_QA_RECEIPT.json";
export const PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH = "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_RASTER_QA_RECEIPT.json";

function readReceipt(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const bytes = readFileSync(absolutePath);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function receiptReference(relativePath, receipt) {
  return {
    path: relativePath,
    sha256: sha256(receipt.bytes),
    byteLength: receipt.bytes.length,
  };
}

function digestCore(core) {
  return sha256(canonicalJson(core));
}

export function buildPass35LocalPdfQaSummary(rootPath = process.cwd()) {
  const root = path.resolve(rootPath);
  const pdf = readReceipt(root, PASS35_LOCAL_PDF_QA_RECEIPT_PATH);
  const raster = readReceipt(root, PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH);
  const core = {
    schemaVersion: "velmere.pass35.local-pdf-qa-summary.v1",
    candidateId: PASS35_CANDIDATE_ID,
    status: "PASS_LOCAL_PDF_QA_SUMMARY_NO_PROMOTION",
    promotionAllowed: false,
    sellEnabled: false,
    evidenceArchiveRequiredForFullVerification: true,
    sourceReceipts: {
      pdf: {
        ...receiptReference(PASS35_LOCAL_PDF_QA_RECEIPT_PATH, pdf),
        schemaVersion: pdf.value.schemaVersion,
        mode: pdf.value.mode,
        status: pdf.value.status,
        assertions: pdf.value.assertions,
        totals: pdf.value.totals,
        boundaries: pdf.value.boundaries,
      },
      raster: {
        ...receiptReference(PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH, raster),
        schemaVersion: raster.value.schemaVersion,
        status: raster.value.status,
        environment: raster.value.environment,
        pdfCount: raster.value.pdfCount,
        renderedPageCount: raster.value.renderedPageCount,
        expectedPageCount: raster.value.expectedPageCount,
        blankPages: raster.value.blankPages,
        pagesTouchingRasterEdge: raster.value.pagesTouchingRasterEdge,
        contactSheetCount: raster.value.contactSheets?.length ?? 0,
      },
    },
    boundaries: {
      synthetic: true,
      offline: true,
      notLive: true,
      notForSale: true,
      commercialUseAllowed: false,
      investmentRecommendation: false,
      externalEvidenceCredit: 0,
    },
    truthBoundary: "This compact summary binds the omitted full PDF and raster QA receipts by exact SHA-256 for SOURCE_ONLY inspection. It does not reproduce or replace the 150 PDFs, 700 rasterized pages, contact sheets, or full evidence archive, and it grants no staging, LIVE, customer, legal, commercial, independent, or promotion credit.",
  };
  const summary = { ...core, summarySha256: digestCore(core) };
  const outputPath = path.join(root, PASS35_LOCAL_PDF_QA_SUMMARY_PATH);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export function validatePass35LocalPdfQaSummary(summary) {
  const blockers = [];
  const add = (condition, code) => { if (!condition) blockers.push(code); };
  const core = { ...(summary ?? {}) };
  delete core.summarySha256;
  add(summary?.schemaVersion === "velmere.pass35.local-pdf-qa-summary.v1", "local_pdf_summary_schema_invalid");
  add(summary?.candidateId === PASS35_CANDIDATE_ID, "local_pdf_summary_candidate_invalid");
  add(summary?.status === "PASS_LOCAL_PDF_QA_SUMMARY_NO_PROMOTION", "local_pdf_summary_status_invalid");
  add(summary?.promotionAllowed === false && summary?.sellEnabled === false, "local_pdf_summary_no_promotion_boundary_invalid");
  add(summary?.evidenceArchiveRequiredForFullVerification === true, "local_pdf_summary_evidence_archive_boundary_invalid");
  add(summary?.summarySha256 === digestCore(core), "local_pdf_summary_digest_invalid");
  const pdf = summary?.sourceReceipts?.pdf;
  add(pdf?.path === PASS35_LOCAL_PDF_QA_RECEIPT_PATH, "local_pdf_summary_pdf_path_invalid");
  add(/^[a-f0-9]{64}$/u.test(pdf?.sha256 ?? "") && Number.isInteger(pdf?.byteLength) && pdf.byteLength > 0, "local_pdf_summary_pdf_binding_invalid");
  add(pdf?.schemaVersion === "velmere.pass35.local-pdf-qa-receipt.v1" && pdf?.mode === "synthetic_offline_renderer_qa" && pdf?.status === "PASS", "local_pdf_summary_pdf_contract_invalid");
  add(
    Number.isInteger(pdf?.assertions?.total)
    && pdf.assertions.total >= 3359
    && pdf?.assertions?.passed === pdf.assertions.total
    && pdf?.assertions?.failed === 0,
    "local_pdf_summary_pdf_assertions_invalid",
  );
  add(pdf?.totals?.pdfCount === 150 && pdf?.totals?.totalPages === 700, "local_pdf_summary_pdf_totals_invalid");
  const raster = summary?.sourceReceipts?.raster;
  add(raster?.path === PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH, "local_pdf_summary_raster_path_invalid");
  add(/^[a-f0-9]{64}$/u.test(raster?.sha256 ?? "") && Number.isInteger(raster?.byteLength) && raster.byteLength > 0, "local_pdf_summary_raster_binding_invalid");
  add(raster?.schemaVersion === "velmere.pass35.local-pdf-raster-qa.v1" && raster?.status === "PASS", "local_pdf_summary_raster_contract_invalid");
  add(raster?.pdfCount === 150 && raster?.renderedPageCount === 700 && raster?.expectedPageCount === 700, "local_pdf_summary_raster_totals_invalid");
  add(raster?.blankPages === 0 && raster?.pagesTouchingRasterEdge === 0 && raster?.contactSheetCount === 3, "local_pdf_summary_raster_quality_invalid");
  add(JSON.stringify(summary?.boundaries) === JSON.stringify({
    synthetic: true,
    offline: true,
    notLive: true,
    notForSale: true,
    commercialUseAllowed: false,
    investmentRecommendation: false,
    externalEvidenceCredit: 0,
  }), "local_pdf_summary_boundaries_invalid");
  return [...new Set(blockers)].sort();
}

export function verifyPass35LocalPdfQaSummary(rootPath = process.cwd(), { verifySourceReceiptsWhenPresent = true } = {}) {
  const root = path.resolve(rootPath);
  const summaryPath = path.join(root, PASS35_LOCAL_PDF_QA_SUMMARY_PATH);
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const blockers = validatePass35LocalPdfQaSummary(summary);
  if (verifySourceReceiptsWhenPresent) {
    for (const receipt of Object.values(summary.sourceReceipts ?? {})) {
      const absolutePath = path.join(root, receipt.path);
      if (!existsSync(absolutePath)) continue;
      const bytes = readFileSync(absolutePath);
      if (sha256(bytes) !== receipt.sha256 || bytes.length !== receipt.byteLength) blockers.push(`local_pdf_summary_source_receipt_mismatch:${receipt.path}`);
    }
  }
  return {
    schemaVersion: "velmere.pass35.local-pdf-qa-summary-verification.v1",
    candidateId: PASS35_CANDIDATE_ID,
    status: blockers.length ? "FAIL_LOCAL_PDF_QA_SUMMARY" : "PASS_LOCAL_PDF_QA_SUMMARY_NO_PROMOTION",
    promotionAllowed: false,
    blockers: [...new Set(blockers)].sort(),
  };
}
