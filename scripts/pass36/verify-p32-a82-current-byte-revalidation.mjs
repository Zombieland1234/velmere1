#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  A82_REVISION,
  evaluateA82RealIntake,
  runA82FixtureHarness,
  verifyA82FixtureRuntime,
} from "../../lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const policyPath = "config/pass36/a82-audit-real-contract-matrix-policy.json";
const receiptPath = "config/pass36/a82-test-receipt.json";
const currentRevisionPath = "config/pass35/current-revision.json";
const authorityPath = "config/pass36/current-release-authority.json";
const outputPath = "artifacts/closure/p32/runtime/a82-current-byte-revalidation.json";
const runtimePath = "artifacts/closure/p32/runtime/a82-current-byte-runtime.json";
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
const testReceipt = JSON.parse(readFileSync(receiptPath, "utf8"));
const intake = JSON.parse(readFileSync(policy.intakeIndex.path, "utf8"));
const runtime = runA82FixtureHarness(process.cwd(), policy);
const real = evaluateA82RealIntake(intake, policy);
const current = JSON.parse(readFileSync(currentRevisionPath, "utf8"));
const authority = JSON.parse(readFileSync(authorityPath, "utf8"));

const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
check("policy:revision", policy.revisionId === A82_REVISION, policy.revisionId);
check("test-receipt:pass", testReceipt.status === "PASS_A82_LOCAL_REAL_CONTRACT_INTAKE_AND_FIXTURE_HARNESS_ONLY" && testReceipt.summary?.failed === 0, testReceipt.summary);
check("runtime:verified", verifyA82FixtureRuntime(runtime, policy, testReceipt.runtimeIntegritySha256), runtime.integrity);
check("runtime:denominators", runtime.denominators.cases === 50 && runtime.denominators.tierOutputs === 150 && runtime.denominators.toolReceipts === 200 && runtime.denominators.semanticMutations === 1000 && runtime.denominators.mutationKilled === 1000, runtime.denominators);
check("runtime:invariants", Object.values(runtime.invariants ?? {}).every((value) => value === 0), runtime.invariants ?? null);
check("real:blocked", real.decision === "BLOCKED_REAL_CASE_EVIDENCE" && real.evidenceReady === 0 && real.rightsApproved === 0 && real.officialToolReceipts === 0 && real.realTierOutputs === 0, real);
check("truth:no-paid-credit", runtime.claims?.paidGateEligible === false && runtime.claims?.liveProven === false && runtime.claims?.saleEnabled === false, runtime.claims);
check("files:runner", existsSync("VELMERE_RUN_A82_AUDIT_REAL_CONTRACT_MATRIX.cmd"));
check("files:patch", existsSync("VELMERE_A82_PATCH.txt"));

const historicalLinkage = {
  currentRevisionId: current.sourceRevisionId ?? null,
  currentA82RevisionId: current.auditRealContractMatrixRevisionId ?? null,
  authorityRevisionId: authority.authorityRevisionId ?? null,
  authorityA82RevisionId: authority.planes?.auditRealContractMatrix?.revisionId ?? null,
  linkageStatus:
    current.auditRealContractMatrixRevisionId === A82_REVISION &&
    authority.planes?.auditRealContractMatrix?.revisionId === A82_REVISION
      ? "HISTORICAL_LINKAGE_CURRENT"
      : "HISTORICAL_LINKAGE_STALE_NOT_USED_FOR_P32_RUNTIME_CREDIT",
};
check("authority:staleness-explicit", typeof historicalLinkage.linkageStatus === "string", historicalLinkage);

const replay = runA82FixtureHarness(process.cwd(), policy);
check("runtime:deterministic", replay.integrity.digest === runtime.integrity.digest, {
  first: runtime.integrity.digest,
  second: replay.integrity.digest,
});

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.p32.a82-current-byte-revalidation.v1",
  generatedAt: new Date().toISOString(),
  state: failed.length ? "FAIL_CURRENT_BYTE_A82_REVALIDATION" : "PASS_CURRENT_BYTE_A82_FIXTURE_REGRESSION_HISTORICAL_AUTHORITY_NOT_PROMOTED",
  creditClass: "CURRENT_BYTE_INTERNAL_FIXTURE_REGRESSION_NO_OFFICIAL_TOOL_NO_FINAL_HOLDOUT_NO_CUSTOMER_VALUE_NO_PAID_OR_BUILD_CREDIT",
  sourceBindings: {
    policyPath,
    policySha256: sha256(readFileSync(policyPath)),
    testReceiptPath: receiptPath,
    testReceiptSha256: sha256(readFileSync(receiptPath)),
    runtimeModulePath: "lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs",
    runtimeModuleSha256: sha256(readFileSync("lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs")),
  },
  historicalLinkage,
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  runtime: {
    integritySha256: runtime.integrity.digest,
    denominators: runtime.denominators,
    classCounts: runtime.classCounts,
    claims: runtime.claims,
  },
  realIntake: real,
  limitations: [
    "A82 local fixture matrix is not the final real-contract holdout.",
    "Official Slither/Foundry/Echidna/Medusa executions remain zero in this receipt.",
    "Independent labels, provider/data rights, paid-tier value, customer value and production build credit remain zero.",
    "Stale historical release-program linkage is preserved as evidence but is not required for P32 current-byte fixture credit.",
  ],
  failures: failed,
  checks,
};
mkdirSync("artifacts/closure/p32/runtime", { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
