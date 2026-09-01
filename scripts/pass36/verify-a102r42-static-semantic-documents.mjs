import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildA60ChildEnvironment } from "./a79-exact-build-browser-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const SPECS = Object.freeze([
  { id: "approved", script: "scripts/pass36/verify-a102r42-approved-current-source-changes.mjs", schema: "velmere.pass36.a102r42.approved-current-source-changes-verification.v1", checks: null },
  { id: "authority-migration", script: "scripts/pass36/verify-a102r42-current-source-authority-denominator-migration.mjs", schema: "velmere.pass36.a102r42.current-source-authority-denominator-migration-verification.v1", checks: 68 },
  { id: "a60-failure-migration", script: "scripts/pass36/verify-a102r42-a60-failure-finalization-denominator-migration.mjs", schema: "velmere.pass36.a102r42.a60-failure-finalization-denominator-migration-verification.v1", checks: 21 },
  { id: "frozen-regression-migration", script: "scripts/pass36/verify-a102r42-frozen-regression-denominator-migration.mjs", schema: "velmere.pass36.a102r42.frozen-regression-denominator-migration-verification.v1", checks: 17 },
  { id: "a80r1-migration", script: "scripts/pass36/verify-a102r42-a80r1-receipt-denominator-migration.mjs", schema: "velmere.pass36.a102r42.a80r1-receipt-denominator-migration-verification.v1", checks: 12 },
  { id: "package-boundary-migration", script: "scripts/pass36/verify-a102r42-package-boundary-denominator-migration.mjs", schema: "velmere.pass36.a102r42.package-boundary-denominator-migration-verification.v1", checks: 16 },
  { id: "descendant-migration", script: "scripts/pass36/verify-a102r42-descendant-verifier-denominator-migration.mjs", schema: "velmere.pass36.a102r42.descendant-verifier-denominator-migration-verification.v1", checks: 16 },
  { id: "a42", script: "scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs", schema: "velmere.pass36.a102r42.a42-critical-rebaseline-verification.v1", checks: 54 },
]);

export function verifyA102R42StaticSemanticDocuments(root = process.cwd()) {
  const rows = SPECS.map((spec) => {
    const run = spawnSync(process.execPath, [spec.script], {
      cwd: path.resolve(root),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: buildA60ChildEnvironment(process.env),
      shell: false,
      windowsHide: true,
    });
    let value = null;
    let parseError = null;
    try {
      value = parseStrictJsonCli(run.stdout ?? "", { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
    const dynamicApprovedChecks = spec.id !== "approved"
      || (Number.isInteger(value?.fileCount) && value.fileCount > 0 && value?.checks === 11 + 4 * value.fileCount);
    const passed = run.status === 0
      && run.signal === null
      && (run.stderr ?? "").length === 0
      && parseError === null
      && value?.schemaVersion === spec.schema
      && value?.failed === 0
      && value?.passed === value?.checks
      && (spec.checks === null || value?.checks === spec.checks)
      && dynamicApprovedChecks
      && value?.globalDecision === "NO_GO"
      && value?.live === false
      && value?.saleEnabled === false
      && value?.productionApproved === false
      && value?.worldClassProven === false;
    return {
      id: spec.id,
      script: spec.script,
      passed,
      exitCode: run.status,
      signal: run.signal,
      stderrBytes: Buffer.byteLength(run.stderr ?? "", "utf8"),
      parseError,
      observedSchema: value?.schemaVersion ?? null,
      observedChecks: value?.checks ?? null,
      observedPassed: value?.passed ?? null,
      observedFailed: value?.failed ?? null,
    };
  });
  const failed = rows.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r42.static-semantic-document-verification.v1",
    status: failed.length === 0 ? "PASS_A102R42_STATIC_SEMANTIC_DOCUMENTS_NO_PROMOTION" : "FAIL_A102R42_STATIC_SEMANTIC_DOCUMENTS",
    checks: rows.length,
    passed: rows.length - failed.length,
    failed: failed.length,
    rows,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  const report = verifyA102R42StaticSemanticDocuments();
  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}
