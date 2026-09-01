#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildWorldclassSmartContractAuditOutput,
  buildWorldclassLensPdfOutput,
} from "../../lib/worldclass/audit-lens-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";

const root = process.cwd();
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass18/audit-lens-output-adapter-policy.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass18/audit-lens-evidence-fixtures.json"), "utf8"));
const matrix = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const cases = new Map(corpus.cases.map((row) => [row.id, row]));
const packets = new Map(fixtures.fixtures.map((row) => [row.caseId, row]));
const H = createHash("sha256").update("pass18-boundary-source").digest("hex");
function clone(value) { return structuredClone(value); }
function row(casePrefix, tier, locale = "en") { return matrix.find((item) => item.caseId.startsWith(casePrefix) && item.tier === tier && item.locale === locale); }
function run(matrixRow, packet, options = {}) {
  const corpusCase = cases.get(matrixRow.caseId);
  const args = { matrixRow, corpusCase, evidencePacket: packet, sourceSha256: H, corpusSha256: corpus.corpusSha256, entitlementStatus: options.entitlementStatus ?? (matrixRow.tier === "basic" ? "unverified" : "verified"), policy };
  const output = matrixRow.surface === "smart_contract_audit" ? buildWorldclassSmartContractAuditOutput(args) : buildWorldclassLensPdfOutput(args);
  const score = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  return { output, score };
}
const tests = [];
function test(name, predicate) {
  try { const detail = predicate(); const ok = detail === true || detail?.ok === true; tests.push({ name, ok, detail: detail === true ? null : detail }); }
  catch (error) { tests.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); }
}

const auditVulnerableBasic = row("smart_contract_audit-001-", "basic");
const auditVulnerablePro = row("smart_contract_audit-001-", "pro");
const auditVulnerableAdvanced = row("smart_contract_audit-001-", "advanced");
const auditCleanBasic = row("smart_contract_audit-002-", "basic");
const auditCleanPacket = packets.get(auditCleanBasic.caseId);
const auditPacket = packets.get(auditVulnerableBasic.caseId);

test("audit_basic_source_bound_passes", () => { const { output, score } = run(auditVulnerableBasic, auditPacket); return { ok: score.ok && output.status === "passed" && output.findings.length > 0 }; });
test("audit_pro_two_analyzers_passes", () => { const { output, score } = run(auditVulnerablePro, auditPacket); return { ok: score.ok && output.status === "passed" && output.evidence.length >= 2 }; });
test("audit_advanced_without_real_human_review_blocks", () => { const { output, score } = run(auditVulnerableAdvanced, auditPacket); return { ok: score.ok && output.status === "blocked" && output.blockers.includes("real_human_review_required") }; });
test("audit_advanced_real_human_review_can_release", () => { const packet = clone(auditPacket); packet.humanReview = { authorityId: "human-reviewer-1", authorityKind: "real_human", reviewerRole: "independent_security_reviewer", reviewStatus: "approved", reviewedAt: "2026-07-20T09:00:00.000Z", reviewReceiptSha256: "a".repeat(64) }; const { output, score } = run(auditVulnerableAdvanced, packet); return { ok: score.ok && output.status === "passed" && output.humanReview?.reviewStatus === "approved" }; });
test("audit_advanced_ai_only_review_blocks", () => { const packet = clone(auditPacket); packet.humanReview = { authorityId: "ai-1", authorityKind: "ai_model", reviewerRole: "automated", reviewStatus: "approved", reviewedAt: "2026-07-20T09:00:00.000Z", reviewReceiptSha256: "b".repeat(64) }; const { output } = run(auditVulnerableAdvanced, packet); return { ok: output.status === "blocked" && output.blockers.includes("real_human_review_required") }; });
test("audit_identity_mismatch_blocks", () => { const packet = clone(auditPacket); packet.contract.sourceSha256 = "c".repeat(64); const { output } = run(auditVulnerablePro, packet); return { ok: output.status === "blocked" && output.blockers.includes("contract_identity_unverified") }; });
test("audit_source_unavailable_blocks", () => { const packet = clone(auditPacket); packet.contract.sourceAvailable = false; const { output } = run(auditVulnerableBasic, packet); return { ok: output.status === "blocked" }; });
test("audit_pro_single_family_blocks", () => { const packet = clone(auditPacket); packet.analyses = packet.analyses.filter((row) => row.family === "static_semantic"); const { output } = run(auditVulnerablePro, packet); return { ok: output.status === "blocked" && output.blockers.includes("analyzer_family_floor_not_met") }; });
test("audit_finding_without_location_blocks", () => { const packet = clone(auditPacket); for (const analysis of packet.analyses) for (const finding of analysis.findings) finding.evidence = []; const { output } = run(auditVulnerablePro, packet); return { ok: output.status === "blocked" && output.blockers.includes("finding_without_reproducible_location") }; });
test("audit_paid_restricted_license_blocks", () => { const packet = clone(auditPacket); for (const analysis of packet.analyses) analysis.licenseStatus = "restricted"; const { output } = run(auditVulnerablePro, packet); return { ok: output.status === "blocked" && output.blockers.includes("analyzer_family_floor_not_met") }; });
test("audit_paid_entitlement_missing_blocks", () => { const { output } = run(auditVulnerablePro, auditPacket, { entitlementStatus: "unverified" }); return { ok: output.status === "blocked" && output.blockers.includes("entitlement_unverified") }; });
test("audit_clean_control_never_claims_certificate", () => { const { output, score } = run(auditCleanBasic, auditCleanPacket); return { ok: score.ok && output.status === "passed" && output.findings.length === 0 && /not a safety certificate|Nie jest to certyfikat|kein Sicherheitszertifikat/u.test(output.customerVerdict) }; });

const lensCompleteBasic = row("lens_pdf-001-", "basic");
const lensCompletePro = row("lens_pdf-001-", "pro");
const lensCompleteAdvanced = row("lens_pdf-001-", "advanced");
const lensCompletePacket = packets.get(lensCompleteBasic.caseId);
const lensMissingBasic = row("lens_pdf-002-", "basic");
const lensMissingPro = row("lens_pdf-002-", "pro");
const lensRestrictedBasic = row("lens_pdf-005-", "basic");
const lensRestrictedPro = row("lens_pdf-005-", "pro");
const lensIdentityPro = row("lens_pdf-009-", "pro");
const lensChartPro = row("lens_pdf-008-", "pro");

test("lens_basic_three_channel_parity_passes", () => { const { output, score } = run(lensCompleteBasic, lensCompletePacket); return { ok: score.ok && output.status === "passed" && output.previewHash === output.downloadHash && output.previewHash === output.accountCopyHash }; });
test("lens_pro_page_floor_passes", () => { const { output, score } = run(lensCompletePro, lensCompletePacket); return { ok: score.ok && output.status === "passed" && output.pageManifest.pageCount >= 4 }; });
test("lens_advanced_page_floor_passes", () => { const { output, score } = run(lensCompleteAdvanced, lensCompletePacket); return { ok: score.ok && output.status === "passed" && output.pageManifest.pageCount >= 8 }; });
test("lens_canonical_hash_mismatch_blocks", () => { const packet = clone(lensCompletePacket); const receipt = packet.renderReceipts.find((item) => item.tier === "pro" && item.locale === "en" && item.channel === "download"); receipt.canonicalPayloadSha256 = "d".repeat(64); const { output } = run(lensCompletePro, packet); return { ok: output.status === "blocked" && output.blockers.includes("customer_payload_parity_failed") }; });
test("lens_missing_account_copy_receipt_blocks", () => { const packet = clone(lensCompletePacket); packet.renderReceipts = packet.renderReceipts.filter((item) => !(item.tier === "pro" && item.locale === "en" && item.channel === "account_copy")); const { output } = run(lensCompletePro, packet); return { ok: output.status === "blocked" }; });
test("lens_page_count_mismatch_blocks", () => { const packet = clone(lensCompletePacket); const receipt = packet.renderReceipts.find((item) => item.tier === "advanced" && item.locale === "en" && item.channel === "preview"); receipt.pageCount = 1; const { output } = run(lensCompleteAdvanced, packet); return { ok: output.status === "blocked" }; });
test("lens_one_source_basic_passes_with_limitations", () => { const packet = packets.get(lensMissingBasic.caseId); const { output, score } = run(lensMissingBasic, packet); return { ok: score.ok && output.status === "passed" && output.missingData.includes("second_source") }; });
test("lens_one_source_paid_blocks", () => { const packet = packets.get(lensMissingPro.caseId); const { output } = run(lensMissingPro, packet); return { ok: output.status === "blocked" && output.blockers.includes("source_family_floor_not_met") }; });
test("lens_restricted_basic_metadata_only_passes", () => { const packet = packets.get(lensRestrictedBasic.caseId); const { output, score } = run(lensRestrictedBasic, packet); return { ok: score.ok && output.status === "passed" && output.commercialRights === "display_only" }; });
test("lens_restricted_paid_blocks", () => { const packet = packets.get(lensRestrictedPro.caseId); const { output } = run(lensRestrictedPro, packet); return { ok: output.status === "blocked" }; });
test("lens_identity_ambiguous_paid_blocks", () => { const packet = packets.get(lensIdentityPro.caseId); const { output } = run(lensIdentityPro, packet); return { ok: output.status === "blocked" && output.missingData.includes("canonical_identity") }; });
test("lens_chart_missing_paid_blocks", () => { const packet = packets.get(lensChartPro.caseId); const { output } = run(lensChartPro, packet); return { ok: output.status === "blocked" && output.missingData.includes("chart_data") }; });
test("lens_transport_wrappers_may_differ", () => { const packet = clone(lensCompletePacket); const rows = packet.renderReceipts.filter((item) => item.tier === "pro" && item.locale === "en"); const distinct = new Set(rows.map((item) => item.transportSha256)).size === 3; const { output, score } = run(lensCompletePro, packet); return { ok: distinct && score.ok && output.status === "passed" }; });

const failed = tests.filter((row) => !row.ok);
const result = { schemaVersion: "velmere.pass18.audit-lens-output-adapter-boundary-tests.v1", generatedAt: "2026-07-20T09:00:00.000Z", ok: failed.length === 0, tests: tests.length, passed: tests.length - failed.length, failed: failed.length, rows: tests, truthBoundary: policy.truthBoundary };
const out = path.join(root, ".velmere/pass18-diagnostics/audit-lens-output-adapter-boundary-tests.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: result.ok, tests: result.tests, passed: result.passed, failed: result.failed }, null, 2));
if (!result.ok) { console.error(JSON.stringify(failed, null, 2)); process.exit(1); }
