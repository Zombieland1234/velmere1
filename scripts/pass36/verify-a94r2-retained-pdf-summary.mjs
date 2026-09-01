#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const REV = "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT";
const summary = JSON.parse(fs.readFileSync("config/pass36/a94r2-retained-pdf-evidence-summary.json", "utf8"));
const DIGEST = /^[a-f0-9]{64}$/u;
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("revision", summary.revisionId === REV, summary.revisionId);
add("evidence-mode", summary.evidenceMode === "PHYSICAL_SYNTHETIC_FILES_IN_MATERIALS_HASH_BOUND_FROM_SOURCE_ONLY", summary.evidenceMode);
add("documents", summary.qa?.documents === 450, summary.qa?.documents);
add("pages", summary.qa?.pages === 2100, summary.qa?.pages);
add("locale-denominator", summary.qa?.byLocale?.pl === 150 && summary.qa?.byLocale?.en === 150 && summary.qa?.byLocale?.de === 150, summary.qa?.byLocale);
add("tier-denominator", summary.qa?.byTier?.basic === 150 && summary.qa?.byTier?.pro === 150 && summary.qa?.byTier?.advanced === 150, summary.qa?.byTier);
add("pypdf", summary.qa?.pypdfPassed === 450, summary.qa?.pypdfPassed);
add("pdfinfo", summary.qa?.pdfinfoPassed === 450, summary.qa?.pdfinfoPassed);
add("pdftotext", summary.qa?.pdftotextPassed === 450, summary.qa?.pdftotextPassed);
add("ghostscript", summary.qa?.ghostscriptSamplePassed === 45, summary.qa?.ghostscriptSamplePassed);
add("a4-pages", summary.qa?.a4Pages === 2100, summary.qa?.a4Pages);
add("rotation-zero", summary.qa?.rotationZeroPages === 2100, summary.qa?.rotationZeroPages);
add("blank-zero", summary.qa?.blankPages === 0, summary.qa?.blankPages);
add("edge-contact-zero", summary.qa?.edgeContactPages === 0, summary.qa?.edgeContactPages);
for (const [id, value] of Object.entries({
  receipt: summary.bindings?.receiptSha256,
  details: summary.bindings?.detailsSha256,
  contactSheet: summary.bindings?.contactSheetSha256,
  corpusAggregate: summary.bindings?.entryAggregateSha256,
})) add(`digest:${id}`, DIGEST.test(value ?? ""), value ?? null);
const core = { ...summary };
delete core.integritySha256;
add("summary-integrity", summary.integritySha256 === sha256(canonical(core)), { declared: summary.integritySha256, actual: sha256(canonical(core)) });
add("real-customer-zero", summary.realCustomerPdfs === 0, summary.realCustomerPdfs);
add("browser-zero", summary.productionBrowserRuns === 0, summary.productionBrowserRuns);
add("secure-delivery-zero", summary.secureCustomerDeliveries === 0, summary.secureCustomerDeliveries);
add("no-promotion", summary.customerPurchaseWorthinessProven === false && summary.liveProven === false && summary.saleEnabled === false, { customerPurchaseWorthinessProven: summary.customerPurchaseWorthinessProven, liveProven: summary.liveProven, saleEnabled: summary.saleEnabled });

const failures = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a94r2.retained-pdf-summary-verification.v1",
  revisionId: REV,
  status: failures.length ? "FAIL_A94R2_RETAINED_PDF_SUMMARY" : "PASS_A94R2_RETAINED_PDF_SUMMARY_SYNTHETIC_ONLY_NO_SALE_CREDIT",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  failures,
  documents: summary.qa?.documents ?? null,
  pages: summary.qa?.pages ?? null,
  realCustomerPdfs: 0,
  productionBrowserRuns: 0,
  secureCustomerDeliveries: 0,
  saleEnabled: false,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
