#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { parseDeterministicZip } from "../pass4826/release-package-contract.mjs";
import {
  SOURCE_MANIFEST_PATH,
  REVISION_ID,
  validateA102R5ParsedArchive,
} from "./package-a102r5-deterministic.mjs";
import { collect, payload } from "./a102r5-source-boundary.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const safeId = (value) => value.replace(/[^a-z0-9_.-]+/giu, "_");

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--source-zip", "--receipt-dir"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    invariant(allowed.has(token), `a102r5_clean_argument_unknown:${token}`);
    invariant(!values.has(token), `a102r5_clean_argument_duplicate:${token}`);
    const value = argv[index + 1];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r5_clean_argument_value:${token}`);
    values.set(token, value);
    index += 1;
  }
  for (const required of allowed) invariant(values.has(required), `a102r5_clean_argument_required:${required}`);
  return {
    sourceZip: path.resolve(values.get("--source-zip")),
    receiptDir: path.resolve(values.get("--receipt-dir")),
  };
}

function parseLastJson(stdout) {
  const text = stdout.trim();
  try { return JSON.parse(text); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] !== "{") continue;
    try { return JSON.parse(text.slice(index)); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  }
  return null;
}

function writeEntry(root, entry) {
  const absolute = path.resolve(root, ...entry.path.split("/"));
  invariant(absolute.startsWith(`${root}${path.sep}`), `a102r5_clean_extract_escape:${entry.path}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, entry.content, { mode: entry.mode & 0o777 });
  fs.chmodSync(absolute, entry.mode & 0o777);
}

function runStep(cleanRoot, receiptDir, step, index) {
  const started = Date.now();
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: cleanRoot,
    env: {
      PATH: [path.dirname(process.execPath), "/usr/bin", "/bin"].join(path.delimiter),
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      TZ: "UTC",
      CI: "1",
      NO_COLOR: "1",
      NODE_ENV: "test",
      VELMERE_A102R5_CLEAN_UNPACK: "1",
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: step.timeout ?? 900_000,
    killSignal: "SIGKILL",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const prefix = `${String(index).padStart(2, "0")}-${safeId(step.id)}`;
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stdout.log`), stdout);
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stderr.log`), stderr);
  const parsed = parseLastJson(stdout);
  const parsedStatus = parsed?.status ?? parsed?.decision ?? parsed?.suite ?? null;
  let passed = result.status === 0 && result.signal === null && !result.error;
  if (step.expected) passed &&= parsedStatus === step.expected;
  if (step.checks) passed &&= parsed?.checks === step.checks && parsed?.failed === 0;
  if (step.firstA58) {
    passed &&= parsed?.summary?.blockingFailed === 0
      && parsed?.promotionAllowed === false
      && parsed?.saleEnabled === false
      && parsed?.liveProven === false;
  }
  return {
    index,
    id: step.id,
    command: step.command,
    durationMs: Date.now() - started,
    exitCode: result.status,
    signal: result.signal,
    spawnError: result.error?.message ?? null,
    parsedStatus,
    stdoutBytes: Buffer.byteLength(stdout),
    stdoutSha256: sha256(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    stderrSha256: sha256(stderr),
    passed,
  };
}

function main() {
  const { sourceZip, receiptDir } = parseArguments(process.argv.slice(2));
  const sourceMeta = fs.lstatSync(sourceZip);
  invariant(sourceMeta.isFile() && !sourceMeta.isSymbolicLink(), "a102r5_clean_source_zip_not_regular");
  fs.mkdirSync(receiptDir, { recursive: true });
  const parsed = parseDeterministicZip(sourceZip);
  const packageValidation = validateA102R5ParsedArchive(parsed, "source");
  const cleanRoot = path.join(receiptDir, "clean-source");
  fs.rmSync(cleanRoot, { recursive: true, force: true });
  fs.mkdirSync(cleanRoot, { recursive: true });
  for (const entry of parsed.entries) writeEntry(cleanRoot, entry);
  invariant(fs.existsSync(path.join(cleanRoot, SOURCE_MANIFEST_PATH)), "a102r5_clean_source_manifest_missing");

  const beforeInventory = collect(cleanRoot);
  invariant(beforeInventory.rejected.length === 0, `a102r5_clean_rejected_before:${JSON.stringify(beforeInventory.rejected)}`);
  const before = payload(beforeInventory.rows);

  const node = process.execPath;
  const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
  const steps = [
    { id: "a58_release_integrity_literal_first_child", command: [node, "scripts/pass36/verify-a58-release-integrity.mjs"], expected: "PASS_RELEASE_INTEGRITY_NO_PROMOTION", firstA58: true },
    { id: "a102r5_authority", command: [node, "scripts/pass36/verify-a102r5-action-required-authority.mjs"], expected: "PASS_A102R5_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT" },
    { id: "a88r1_final_descendant_verifier", command: [node, ...loader, "scripts/pass36/verify-a88r1-semantic-route-privacy-pdf.ts"], expected: "PASS_A88R1_VERIFIER_NO_PROMOTION" },
    { id: "a89_final_descendant_verifier", command: [node, ...loader, "scripts/pass36/verify-a89-account-auth-tenant-privacy-red-team.ts"], expected: "PASS_A89_VERIFIER_NO_PROMOTION" },
    { id: "a57_current_contract", command: [node, "scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs"], checks: 1138 },
    { id: "a59_static_budget", command: [node, "scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], expected: "PASS_STATIC_BUDGET_RECOVERY" },
    { id: "route_dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"], checks: 1480 },
    { id: "route_dispatch_tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"], expected: "PASS" },
    { id: "lazy_routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"], checks: 176 },
    { id: "product_tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"], expected: "PASS_PRODUCT_TIER_CONTENT_CONTRACT" },
    { id: "zero_budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"], expected: "PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP" },
    { id: "a102_observation_boundary", command: [node, "scripts/pass36/test-a102-repeated-slo-vendor-exit-observation-boundaries.mjs"], expected: "PASS_A102R1_STRUCTURAL_BOUNDARY_LOCAL_SYNTHETIC_ONLY_REAL_CLAIMS_REJECTED" },
    { id: "a102r2_local_p1", command: [node, ...loader, "scripts/pass36/test-a102r2-local-p1-hardening.ts"], expected: "PASS_A102R2_LOCAL_P1_HARDENING_NO_PROMOTION" },
    { id: "a102r2_provider_rights", command: [node, ...loader, "scripts/pass36/test-a102r2-provider-rights-egress-gate.ts"], expected: "PASS_A102R2_PROVIDER_RIGHTS_EGRESS_FAIL_CLOSED_NO_PROMOTION" },
    { id: "a102r5_paid_entitlement_boundary", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], expected: "PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE" },
    { id: "vlm_verify_preflight", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"] },
    { id: "mega4800_paid_delivery_regression", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"] },
    { id: "a73_cookie_verifier", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"] },
    { id: "cross_surface_verifier", command: [node, "scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs"], expected: "PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT" },
    { id: "api_body_stream", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"] },
    { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], expected: "PASS" },
    { id: "source_audit", command: [node, "scripts/a44-source-integrity-audit.mjs"] },
  ];
  const results = [];
  for (const [offset, step] of steps.entries()) {
    const result = runStep(cleanRoot, receiptDir, step, offset + 1);
    results.push(result);
    if (!result.passed) break;
  }

  const afterInventory = collect(cleanRoot);
  const after = payload(afterInventory.rows);
  const sourceImmutable = afterInventory.rejected.length === 0
    && JSON.stringify(before) === JSON.stringify(after);
  const a58LiteralFirstChild = results[0]?.id === "a58_release_integrity_literal_first_child";
  const localContractPassed = results.length === steps.length
    && results.every((row) => row.passed)
    && sourceImmutable
    && a58LiteralFirstChild;
  const receipt = {
    schemaVersion: "velmere.pass36.a102r5.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: localContractPassed
      ? "ACTION_REQUIRED_A102R5_CLEAN_UNPACK_LOCAL_CONTRACT_NO_EXACT_RUNTIME_BROWSER_OR_REAL_CREDIT"
      : "FAIL_A102R5_CLEAN_UNPACK_LOCAL_CONTRACT",
    sourceZip: {
      fileName: path.basename(sourceZip),
      byteLength: parsed.byteLength,
      sha256: parsed.archiveSha256,
      entries: parsed.entries.length,
      payloadFileCount: packageValidation.payloadFileCount,
      payloadByteLength: packageValidation.payloadByteLength,
      manifestSha256: packageValidation.manifest.manifestSha256,
      manifestFileSha256: packageValidation.manifestFileSha256,
    },
    cleanRoot,
    localContractPassed,
    a58LiteralFirstChild,
    sourceBefore: before,
    sourceAfter: after,
    sourceImmutable,
    requiredSteps: steps.length,
    executedSteps: results.length,
    passedSteps: results.filter((row) => row.passed).length,
    failedSteps: results.filter((row) => !row.passed).map((row) => row.id),
    steps: results,
    environmentTruth: {
      auditNodeVersion: process.version.replace(/^v/u, ""),
      requiredNodeVersion: "24.18.0",
      exactRuntimeBuildBrowserExecuted: false,
      exactBrowserRows: 0,
      freshA88R2HandlerMutationExecuted: false,
    },
    notExecutedOrNotCredited: [
      ["fresh_exact_npm_ci_lint_typecheck_builds_next_start", "NOT_EXECUTED_ON_A102R5_FINAL_BYTES"],
      ["exact_playwright_chromium_148_0_7778_96_revision_1223", "NOT_AVAILABLE"],
      ["browser_rows", "0_OF_54_CREDIT"],
      ["a77r1_a80r1", "0_OF_4_CREDIT"],
      ["a102_real_observation_windows", "0_OF_3_OVER_AT_LEAST_72_HOURS"],
      ["real_staging", "0_OF_10"],
      ["provider_rights", "0_OF_21"],
      ["legal_dpo", "0_OF_20"],
      ["real_audits_official_tools_customer_pdfs", "0_OF_50_0_OF_200_0_OF_50"],
      ["customer_cohorts_independent_assurance", "0_OF_2_AND_0"],
    ].map(([gate, status]) => ({ gate, status })),
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  const receiptPath = path.join(receiptDir, "PASS36_A102R5_CLEAN_UNPACK_RECEIPT.json");
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!localContractPassed) process.exitCode = 1;
}

try { main(); }
catch (error) {
  process.stderr.write(`${JSON.stringify({
    schemaVersion: "velmere.pass36.a102r5.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: "FAIL_A102R5_CLEAN_UNPACK_LOCAL_CONTRACT",
    error: error instanceof Error ? error.message : String(error),
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  })}\n`);
  process.exitCode = 1;
}
