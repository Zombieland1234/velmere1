#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";

const root = process.cwd();
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const rows = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const H = "a".repeat(64);
function row(casePrefix, tier, locale = "en") { return rows.find((item) => item.caseId.startsWith(casePrefix) && item.tier === tier && item.locale === locale); }
function baseOutput(matrixRow) {
  const output = {
    schemaVersion: "velmere.worldclass.output.v1",
    matrixId: matrixRow.matrixId,
    caseId: matrixRow.caseId,
    surface: matrixRow.surface,
    tier: matrixRow.tier,
    locale: matrixRow.locale,
    language: matrixRow.locale,
    sourceSha256: H,
    corpusSha256: corpus.corpusSha256,
    status: "passed",
    scope: "bounded evaluation",
    evidence: [
      { sourceId: "s1", family: "primary", freshnessStatus: "fresh", licenseStatus: "verified" },
      { sourceId: "s2", family: "independent", freshnessStatus: "fresh", licenseStatus: "verified" }
    ],
    missingData: [], limitations: [], confidence: 70, nextSafeCheck: "Verify next source-bound step.",
    evidenceStatus: "verified", evidenceTable: [], riskDrivers: [], contradictions: [], confidenceBasis: "source bound",
    commercialRights: "verified", freshnessReceipt: H, provenanceReceipt: H, entitlementStatus: "verified",
    sections: Object.fromEntries((matrixRow.requiredSections ?? []).map((name) => [name, {}])),
  };
  for (const field of contract.surfaceRequirements[matrixRow.surface]) output[field] = {};
  return output;
}
const tests = [];
function test(name, expectedOk, mutate, matrixRow) {
  const output = baseOutput(matrixRow);
  mutate?.(output);
  const result = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  tests.push({ name, expectedOk, actualOk: result.ok, failures: result.failures.map((row) => row.code) });
}

const shieldBasic = row("shield-001-", "basic");
test("valid_basic_shield", true, null, shieldBasic);
const shieldPro = row("shield-001-", "pro");
test("pro_one_source_fails", false, (o) => { o.evidence = [o.evidence[0]]; }, shieldPro);
test("pro_missing_data_release_fails", false, (o) => { o.missingData = ["second_provider"]; }, shieldPro);
test("wrong_locale_fails", false, (o) => { o.language = "en"; }, row("angel-041-", "basic", "pl"));
const auditAdvanced = row("smart_contract_audit-001-", "advanced");
test("advanced_audit_without_review_fails", false, null, auditAdvanced);
test("advanced_audit_with_review_passes", true, (o) => { o.humanReview = { authorityId: "reviewer-1", reviewerRole: "security_reviewer", reviewStatus: "approved", reviewedAt: "2026-07-20T00:00:00Z", reviewReceiptSha256: H }; }, auditAdvanced);
const pdfPro = row("lens_pdf-001-", "pro");
test("pdf_parity_mismatch_fails", false, (o) => { o.previewHash = H; o.downloadHash = "b".repeat(64); o.accountCopyHash = H; }, pdfPro);
test("pdf_parity_passes", true, (o) => { o.previewHash = H; o.downloadHash = H; o.accountCopyHash = H; }, pdfPro);
const blocked = row("real_markets-049-", "pro");
test("expected_block_passes_contract", true, (o) => { o.status = "blocked"; o.blockers = ["commercial_data_missing"]; o.evidence = []; o.missingData = ["licensed_data"]; o.confidence = 10; }, blocked);
test("expected_block_released_fails", false, null, blocked);

const failed = tests.filter((row) => row.expectedOk !== row.actualOk);
const result = {
  schemaVersion: "velmere.pass16.worldclass-output-scorer-tests.v1",
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  summary: { tests: tests.length, passed: tests.length - failed.length, failed: failed.length },
  tests,
};
const out = path.join(root, ".velmere/pass16-diagnostics/worldclass-output-scorer-tests.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (!result.ok) { console.error(JSON.stringify(failed, null, 2)); process.exit(1); }
