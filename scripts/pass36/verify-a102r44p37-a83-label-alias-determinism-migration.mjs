#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/pass36/r44p37-a83-label-alias-determinism-migration.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const rows = [];
const check = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });

check("revision", policy.revisionId === "VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT");
check("finding", policy.findingId === "R44P37-P0-A83-SHARED-LABEL-ALIAS-NONDETERMINISM" && policy.severity === "P0");
check("old-denominator", policy.previousResult.checks === 22 && policy.previousResult.passed === 20 && policy.previousResult.failed === 2 && policy.previousResult.physicalPdfs === 450 && policy.previousResult.renderedPages === 2100 && policy.previousResult.semanticMutations === 8100);
check("old-failures", JSON.stringify(policy.previousResult.failedCheckIds) === JSON.stringify(["corpus:deterministic", "corpus:verify"]));
check("new-denominator", policy.expectedRetest.checks === 22 && policy.expectedRetest.passed === 22 && policy.expectedRetest.failed === 0 && policy.expectedRetest.physicalPdfs === 450 && policy.expectedRetest.renderedPages === 2100 && policy.expectedRetest.semanticMutations === 8100 && policy.expectedRetest.byteIdenticalCorpusRuns === true);

for (const file of policy.repair.files) {
  const absolute = path.join(root, file.path);
  const bytes = fs.readFileSync(absolute);
  const source = bytes.toString("utf8");
  check(`file:${file.path}:sha`, sha256(bytes) === file.currentSha256, { expected: file.currentSha256, actual: sha256(bytes) });
  check(`file:${file.path}:copy-on-write`, /report\.labels\s*=\s*\{\s*\.\.\.report\.labels,\s*signature:/u.test(source));
  check(`file:${file.path}:no-direct-shared-mutation`, !/report\.labels\.signature\s*=/u.test(source));
}
check("repair-mode", policy.repair.mode === "COPY_ON_WRITE_REPORT_LABELS" && policy.repair.directSharedMutationForbidden === true && policy.repair.denominatorsPreserved === true);
check("no-promotion", policy.creditBoundary.realCustomerPdfCredit === 0 && Object.entries(policy.creditBoundary).filter(([key]) => key !== "realCustomerPdfCredit").every(([, value]) => value === false));

const failed = rows.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p37.a83-label-alias-determinism-migration-verification.v1",
  revisionId: policy.revisionId,
  status: failed.length ? "FAIL_R44P37_A83_LABEL_ALIAS_DETERMINISM_MIGRATION" : "PASS_R44P37_A83_LABEL_ALIAS_DETERMINISM_MIGRATION",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  truthBoundary: "This verifier proves the copy-on-write source repair and preserved A83 denominator contract. Full corpus determinism, PDF semantic correctness, customer value, sale and LIVE remain separate execution gates."
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
