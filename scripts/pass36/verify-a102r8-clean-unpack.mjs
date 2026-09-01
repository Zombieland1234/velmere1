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
  validateA102R8ParsedArchive,
} from "./package-a102r8-deterministic.mjs";
import { collect, payload } from "./a102r8-source-boundary.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const safeId = (value) => value.replace(/[^a-z0-9_.-]+/giu, "_");

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--source-zip", "--receipt-dir"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    invariant(allowed.has(token), `a102r8_clean_argument_unknown:${token}`);
    invariant(!values.has(token), `a102r8_clean_argument_duplicate:${token}`);
    const value = argv[index + 1];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r8_clean_argument_value:${token}`);
    values.set(token, value);
    index += 1;
  }
  for (const required of allowed) invariant(values.has(required), `a102r8_clean_argument_required:${required}`);
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
  invariant(absolute.startsWith(`${root}${path.sep}`), `a102r8_clean_extract_escape:${entry.path}`);
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
      TERM: "dumb",
      CI: "1",
      NO_COLOR: "1",
      NODE_ENV: "test",
      VELMERE_A102R8_CLEAN_UNPACK: "1",
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: step.timeout ?? 180_000,
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
  if (step.passedCount) passed &&= parsed?.passed === step.passedCount && (parsed?.failed === undefined || parsed?.failed === 0);
  if (step.assertionsCount) passed &&= parsed?.assertions === step.assertionsCount && (parsed?.failed === undefined || parsed?.failed === 0);
  if (step.sourceAudit) passed &&= parsed?.syntaxErrors === 0
    && parsed?.missingLocalImports === 0
    && parsed?.missingCssModuleClasses === 0;
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
  invariant(sourceMeta.isFile() && !sourceMeta.isSymbolicLink(), "a102r8_clean_source_zip_not_regular");
  fs.mkdirSync(receiptDir, { recursive: true });
  const parsed = parseDeterministicZip(sourceZip);
  const packageValidation = validateA102R8ParsedArchive(parsed, "source");
  const cleanRoot = path.join(receiptDir, "clean-source");
  fs.rmSync(cleanRoot, { recursive: true, force: true });
  fs.mkdirSync(cleanRoot, { recursive: true });
  for (const entry of parsed.entries) writeEntry(cleanRoot, entry);
  invariant(fs.existsSync(path.join(cleanRoot, SOURCE_MANIFEST_PATH)), "a102r8_clean_source_manifest_missing");

  const beforeInventory = collect(cleanRoot);
  invariant(beforeInventory.rejected.length === 0, `a102r8_clean_rejected_before:${JSON.stringify(beforeInventory.rejected)}`);
  const before = payload(beforeInventory.rows);

  const node = process.execPath;
    const steps = [
    { id: "a58_release_integrity_literal_first_child", command: [node, "scripts/pass36/verify-a58-release-integrity.mjs"], expected: "PASS_RELEASE_INTEGRITY_NO_PROMOTION", firstA58: true },
    { id: "a102r8_group_core", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "core"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_CORE_NO_PROMOTION", checks: 5 },
    { id: "a102r8_group_history", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "history"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_HISTORY_NO_PROMOTION", checks: 5 },
    { id: "a102r8_group_route_product", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "route_product"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_ROUTE_PRODUCT_NO_PROMOTION", checks: 5 },
    { id: "a102r8_group_operational", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "operational"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_OPERATIONAL_NO_PROMOTION", checks: 6 },
    { id: "a102r8_group_final_a", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "final_a"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_FINAL_A_NO_PROMOTION", checks: 4 },
    { id: "a102r8_group_final_b1", command: [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", "final_b1"], expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_FINAL_B1_NO_PROMOTION", checks: 2 },
    { id: "a102r8_source_audit_direct", command: [node, "scripts/a44-source-integrity-audit.mjs"], sourceAudit: true },
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
    schemaVersion: "velmere.pass36.a102r8.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: localContractPassed
      ? "ACTION_REQUIRED_A102R8_CLEAN_UNPACK_LOCAL_CONTRACT_NO_EXACT_RUNTIME_BROWSER_OR_REAL_CREDIT"
      : "FAIL_A102R8_CLEAN_UNPACK_LOCAL_CONTRACT",
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
      realDurableAccountVaultRuns: 0,
      realBrowserStoragePrivacyRows: 0,
      realSharedDeviceAccountSwitchLogoutRows: 0,
      durableServerCheckoutDraftRows: 0,
      durableServerAuditBookmarkRows: 0,
      durableServerPdfActivityReceiptRows: 0,
    },
    notExecutedOrNotCredited: [
      ["fresh_exact_npm_ci_lint_typecheck_builds_next_start", "NOT_EXECUTED_ON_A102R8_FINAL_BYTES"],
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
  const receiptPath = path.join(receiptDir, "PASS36_A102R8_CLEAN_UNPACK_RECEIPT.json");
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!localContractPassed) process.exitCode = 1;
}

try { main(); }
catch (error) {
  process.stderr.write(`${JSON.stringify({
    schemaVersion: "velmere.pass36.a102r8.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: "FAIL_A102R8_CLEAN_UNPACK_LOCAL_CONTRACT",
    error: error instanceof Error ? error.message : String(error),
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  })}\n`);
  process.exitCode = 1;
}
