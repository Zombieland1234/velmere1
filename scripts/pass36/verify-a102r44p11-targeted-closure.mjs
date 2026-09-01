import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-final-local-closure-policy.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-action-required-current-state.json"), "utf8"));
const loader = "./scripts/pass11/register-offline-ts-loader.mjs";
const rows = [];
const check = (id, ok, detail = null) => rows.push({ id, ok: Boolean(ok), detail });

function runJson(id, args, expected) {
  const run = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", TERM: "dumb" },
    shell: false,
    windowsHide: true,
  });
  let parsed;
  try { parsed = JSON.parse(run.stdout); } catch { parsed = undefined; }
  const ok = run.status === 0 && Boolean(parsed) && expected(parsed);
  check(id, ok, {
    exitCode: run.status,
    stdoutBytes: Buffer.byteLength(run.stdout || ""),
    stderrBytes: Buffer.byteLength(run.stderr || ""),
    status: parsed?.status ?? parsed?.summary?.status ?? null,
    failed: parsed?.failed ?? parsed?.summary?.failed ?? null,
  });
  return parsed;
}

check("revision", policy.revisionId === state.revisionId);
check("parent", policy.parentRevisionId === state.parentRevisionId);
check("global-no-go", policy.globalTruth?.decision === "NO_GO" && state.decision === "NO_GO");
check("global-flags-false", [policy.globalTruth?.live, policy.globalTruth?.saleEnabled, policy.globalTruth?.productionApproved, policy.globalTruth?.worldClassProven].every((value) => value === false));

runJson("compiler-ast-policy", ["scripts/pass36/verify-a102r44p11-compiler-ast-policy.mjs"], (x) => x.failed === 0 && x.fixtureFiles === 9);
runJson("runtime-customer-truth", ["scripts/pass36/verify-a102r44p11-runtime-customer-truth.mjs"], (x) => x.failed === 0 && x.angelSummary?.assertions === 1083);
runJson("pdf-customer-truth-policy", ["scripts/pass36/verify-a102r44p11-pdf-customer-truth-policy.mjs"], (x) => x.failed === 0);
runJson("route-runtime-rebaseline", ["scripts/pass36/verify-a102r44p11-route-runtime-rebaseline.mjs"], (x) => x.failed === 0);
runJson("r44p10-metamorphic-retained", ["tests/pass36/a102r44p10-metamorphic-generalization.mjs"], (x) => x.failed === 0 && x.assertions === 432 && x.passed === 432);
runJson("r44p10-customer-truth-retained", ["tests/pass36/a102r44p10-customer-truth-normalizer.mjs"], (x) => x.failed === 0 && x.checks === 9 && x.passed === 9);
runJson("r44p10-local-e2e-retained", ["tests/pass36/a102r44p10-real-local-e2e.mjs"], (x) => x.failed === 0 && x.assertions === 14 && x.passed === 14);
runJson("r44p10-active-copy-retained", ["tests/pass36/a102r44p10-active-copy-truth.mjs"], (x) => x.failed === 0 && x.checks === 26 && x.passed === 26);
runJson("audit-fixture-matrix", ["scripts/pass36/test-a82-audit-real-contract-matrix.mjs"], (x) => x.summary?.failed === 0 && x.fixtureDenominators?.cases === 50 && x.realCasesFullyVerified === 0);
runJson("shield-matrix", ["--import", loader, "scripts/pass36/verify-a84-shield-full-catalog-tier-matrix.ts"], (x) => x.failed === 0 && x.fixtureDenominators?.activeAssets === 318 && x.rightsApprovedAssets === 0);
runJson("shield-pro-map-matrix", ["--import", loader, "scripts/pass36/verify-a85-shield-pro-map-full-depth-matrix.ts"], (x) => x.failed === 0 && x.fixtureDenominators?.activeAssets === 318 && x.realEntitlementsVerified === 0);
runJson("real-markets-matrix", ["--import", loader, "scripts/pass36/verify-a86-real-markets-cross-asset-matrix.ts"], (x) => x.failed === 0 && x.denominators?.instruments === 583 && x.realIntake?.rightsApproved === 0);
runJson("impact-whale-matrix", ["--import", loader, "scripts/pass36/verify-a87-market-impact-whale-watch-matrix.ts"], (x) => x.summary?.failed === 0);
runJson("brain-angel-risk-matrix", ["--import", loader, "scripts/pass36/verify-a88-brain-angel-risk-eval.ts"], (x) => x.summary?.failed === 0);

const failed = rows.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.targeted-closure-verification.v1",
  revisionId: policy.revisionId,
  status: failed.length ? "FAIL_R44P11_TARGETED_CLOSURE" : "PASS_R44P11_TARGETED_LOCAL_CLOSURE_NO_PROMOTION",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  checksDetail: rows,
  creditBoundary: policy.creditBoundary,
  remainingExternalBlockers: state.remainingExternalBlockers,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
