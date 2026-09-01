#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "config/pass22/provider-rights-evidence-manifest.json");
const original = fs.readFileSync(manifestPath, "utf8");
const base = JSON.parse(original);
const tests = [];
function run(name, fn) {
  try { fn(); tests.push({ name, ok: true }); }
  catch (error) { tests.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); }
}
function invoke(expectOk) {
  const result = spawnSync(process.execPath, ["scripts/pass22/verify-provider-rights-evidence.mjs"], { cwd: root, encoding: "utf8" });
  if ((result.status === 0) !== expectOk) throw new Error(`unexpected_rc:${result.status}\n${result.stdout}\n${result.stderr}`);
}
function writeEvidence(row) { fs.writeFileSync(manifestPath, `${JSON.stringify({ ...base, evidence: [row] }, null, 2)}\n`); }
const valid = {
  schemaVersion: "velmere.pass22.provider-rights-evidence.v1",
  providerId: "binance", evidenceId: "pre_0123456789abcdef01234567", documentKind: "SIGNED_CONTRACT",
  documentSha256: "a".repeat(64), sourceLocationHash: "b".repeat(64), capturedAt: "2026-07-19T00:00:00.000Z",
  effectiveAt: "2026-07-19T00:00:00.000Z", expiresAt: "2027-07-19T00:00:00.000Z", jurisdiction: "EU",
  reviewer: { reviewerIdHash: "c".repeat(64), reviewedAt: "2026-07-19T01:00:00.000Z", legalReview: true },
  reviewDecision: "APPROVED",
  rights: { displayUseAllowed: true, commercialUseAllowed: true, redistributionAllowed: false, modelTrainingAllowed: false },
  restrictions: ["Provider attribution required"], notesRedacted: null
};
try {
  run("empty_manifest_is_valid_and_rights_zero", () => { fs.writeFileSync(manifestPath, original); invoke(true); });
  run("valid_reviewed_record_passes_schema", () => { writeEvidence(valid); invoke(true); });
  run("unknown_provider_fails", () => { writeEvidence({ ...valid, providerId: "unknown_provider" }); invoke(false); });
  run("expired_approval_fails", () => { writeEvidence({ ...valid, expiresAt: "2026-07-19T00:00:00.000Z" }); invoke(false); });
  run("approval_without_legal_review_fails", () => { writeEvidence({ ...valid, reviewer: { ...valid.reviewer, legalReview: false } }); invoke(false); });
  run("rejected_record_cannot_grant_rights", () => { writeEvidence({ ...valid, reviewDecision: "REJECTED" }); invoke(false); });
  run("dpa_cannot_grant_commercial_rights", () => { writeEvidence({ ...valid, documentKind: "DPA" }); invoke(false); });
  run("redistribution_requires_commercial_right", () => { writeEvidence({ ...valid, rights: { ...valid.rights, commercialUseAllowed: false, redistributionAllowed: true } }); invoke(false); });
  run("bad_document_hash_fails", () => { writeEvidence({ ...valid, documentSha256: "not-a-hash" }); invoke(false); });
  run("duplicate_provider_evidence_fails", () => {
    fs.writeFileSync(manifestPath, `${JSON.stringify({ ...base, evidence: [valid, { ...valid, evidenceId: "pre_abcdef0123456789abcdef01" }] }, null, 2)}\n`); invoke(false);
  });
  run("rls_source_contract_passes", () => {
    const result = spawnSync(process.execPath, ["scripts/pass22/verify-owner-operator-rls.mjs"], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  });
} finally {
  fs.writeFileSync(manifestPath, original);
}
// Restore the canonical zero-rights diagnostic after destructive boundary fixtures.
invoke(true);
const failed = tests.filter((test) => !test.ok);
const report = { schemaVersion: "velmere.pass22.provider-rights-rls-boundary-tests.v1", generatedAt: "2026-07-20T14:30:00.000Z", ok: failed.length === 0, pass: tests.length - failed.length, fail: failed.length, tests };
const output = path.join(root, ".velmere/pass22-diagnostics/provider-rights-rls-boundary-tests.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
