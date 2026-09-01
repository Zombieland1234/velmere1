#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  A96_PARENT,
  A96_REV,
  buildMinimalPsqlEnvironment,
  classifyDatabaseUrl,
  parseA96Receipt,
  readJson,
  regularFileIdentity,
  sha256,
  verifyA95AdmissionReceipt,
} from "./a96-rls-staging-lib.mjs";
import { collect, payload } from "./a96-source-boundary.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const execute = process.argv.includes("--execute");
const noWrite = process.argv.includes("--no-write") || process.env.VELMERE_A96_NO_WRITE === "1";
const policy = readJson(path.join(root, "config/pass36/a96-rls-tenant-isolation-policy.json"));

function sourceFingerprint() {
  const inventory = collect(root);
  if (inventory.rejected.length) throw new Error(`a96_source_inventory_rejected:${JSON.stringify(inventory.rejected)}`);
  return payload(inventory.rows);
}
function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[A-Za-z0-9+/=_-]{32,}/gu, "[REDACTED]").slice(0, 500);
}
function outputPath() {
  if (noWrite) return null;
  const raw = process.env.VELMERE_A96_OUTPUT_DIR;
  if (!raw) {
    if (!fixtureMode) throw new Error("a96_external_output_dir_required");
    return path.join(os.tmpdir(), "velmere-a96-fixture-output");
  }
  const absolute = path.resolve(raw);
  const relative = path.relative(root, absolute);
  if (!fixtureMode && (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)))) {
    throw new Error("a96_output_dir_must_be_outside_source_root");
  }
  return absolute;
}
function emit(report) {
  const outDir = outputPath();
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
    const file = path.join(outDir, "PASS36_A96_RLS_19_CASE_EXECUTABLE_REPLAY.json");
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return file;
  }
  return null;
}

function main() {
  const startedAt = new Date().toISOString();
  const before = sourceFingerprint();
  const checks = [];
  const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  let childReceipt = null;
  let decision;
  let mutationStarted = false;
  let executedStages = 0;

  try {
    add("identity:policy", policy.revisionId === A96_REV && policy.parentRevisionId === A96_PARENT);
    add("mode:execution-requested", execute, { fixtureMode, execute });
    if (!execute) throw new Error("a96_execute_flag_required");

    const confirmation = process.env.VELMERE_A96_CONFIRM ?? "";
    add("confirmation:exact", fixtureMode || confirmation === policy.confirmationToken, { present: Boolean(confirmation) });
    if (!fixtureMode && confirmation !== policy.confirmationToken) throw new Error("a96_confirmation_invalid");

    const databaseClass = process.env.VELMERE_A96_DATABASE_CLASS ?? "";
    add("database:class", fixtureMode || databaseClass === policy.databaseClass, databaseClass || null);
    if (!fixtureMode && databaseClass !== policy.databaseClass) throw new Error("a96_database_class_invalid");

    if (!fixtureMode) {
      const admission = verifyA95AdmissionReceipt(
        process.env.VELMERE_A96_A95_ADMISSION_RECEIPT ?? "",
        process.env.VELMERE_A96_A95_ADMISSION_SHA256 ?? "",
        policy,
      );
      add("a95:admission-ready", admission.decision === policy.requiredA95Decision, {
        decision: admission.decision,
        receiptSha256: admission.identity.sha256,
      });
    } else {
      add("a95:admission-ready", true, { fixtureOnly: true, noStagingCredit: true });
    }

    const parsedDb = classifyDatabaseUrl(process.env.VELMERE_A96_DATABASE_URL ?? "", policy, { fixtureMode });
    add("database:url-safe", parsedDb.ok, parsedDb.ok ? parsedDb.publicIdentity : { reason: parsedDb.reason });
    if (!parsedDb.ok) throw new Error(`a96_database_url_rejected:${parsedDb.reason}`);

    const expectedHostSha = process.env.VELMERE_A96_DATABASE_HOST_SHA256 ?? "";
    const hostHashOk = fixtureMode || (/^[a-f0-9]{64}$/u.test(expectedHostSha) && parsedDb.publicIdentity.hostSha256 === expectedHostSha);
    add("database:host-anchor", hostHashOk, { hostSha256: parsedDb.publicIdentity.hostSha256, anchorPresent: Boolean(expectedHostSha) });
    if (!hostHashOk) throw new Error("a96_database_host_anchor_mismatch");

    const psqlIdentity = regularFileIdentity(process.env.VELMERE_A96_PSQL_PATH ?? "");
    const expectedPsqlSha = process.env.VELMERE_A96_PSQL_SHA256 ?? "";
    const psqlHashOk = /^[a-f0-9]{64}$/u.test(expectedPsqlSha) && psqlIdentity.sha256 === expectedPsqlSha;
    add("psql:exact-binary", psqlHashOk, { sha256: psqlIdentity.sha256, byteLength: psqlIdentity.byteLength, mode: psqlIdentity.mode });
    if (!psqlHashOk) throw new Error("a96_psql_sha256_mismatch");

    const sqlIdentity = regularFileIdentity(path.join(root, policy.sqlPath));
    const matrix = readJson(path.join(root, policy.matrixPath));
    add("matrix:exact-denominator", matrix.cases?.length === policy.requiredCases
      && matrix.cases.filter((row) => row.kind === "owner").length === policy.requiredOwnerCases
      && matrix.cases.filter((row) => row.kind === "operator").length === policy.requiredOperatorCases, {
      cases: matrix.cases?.length,
      owner: matrix.cases?.filter((row) => row.kind === "owner").length,
      operator: matrix.cases?.filter((row) => row.kind === "operator").length,
    });

    const args = ["-X", "--no-psqlrc", "-v", "ON_ERROR_STOP=1", "-q", "-f", sqlIdentity.absolute];
    const secretNeedles = [parsedDb.connection.password, parsedDb.connection.user, process.env.VELMERE_A96_DATABASE_URL ?? ""].filter(Boolean);
    const argumentText = JSON.stringify(args);
    add("psql:no-credential-arguments", secretNeedles.every((needle) => !argumentText.includes(needle)));
    if (secretNeedles.some((needle) => argumentText.includes(needle))) throw new Error("a96_credentials_in_process_arguments");

    const env = buildMinimalPsqlEnvironment(parsedDb.connection);
    mutationStarted = true; // database transaction may now begin; rollback is mandatory.
    executedStages = 1;
    const child = spawnSync(psqlIdentity.absolute, args, {
      cwd: root,
      env,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: policy.budgets.timeoutMs,
      maxBuffer: Math.max(policy.budgets.maximumStdoutBytes, policy.budgets.maximumStderrBytes),
      windowsHide: true,
    });
    add("psql:process-exit", child.status === 0 && child.signal === null, {
      status: child.status,
      signal: child.signal,
      error: child.error ? safeError(child.error) : null,
      stdoutSha256: sha256(child.stdout ?? ""),
      stderrSha256: sha256(child.stderr ?? ""),
    });
    if (child.error) throw child.error;
    if (child.status !== 0 || child.signal) throw new Error("a96_psql_execution_failed");
    if (Buffer.byteLength(child.stderr ?? "", "utf8") > policy.budgets.maximumStderrBytes) throw new Error("a96_stderr_too_large");

    childReceipt = parseA96Receipt(child.stdout ?? "", policy);
    add("receipt:19-of-19", childReceipt.casesExecuted === 19 && childReceipt.casesPassed === 19, {
      casesExecuted: childReceipt.casesExecuted,
      casesPassed: childReceipt.casesPassed,
      checksExecuted: childReceipt.checksExecuted,
    });
    add("receipt:rollback", childReceipt.transactionRolledBack === true);
    add("receipt:no-promotion", childReceipt.liveProven === false && childReceipt.saleEnabled === false);
    decision = policy.decisions.verified;
  } catch (error) {
    add("execution:failure", false, { code: safeError(error) });
    if (/integrity|sha256|duplicate|semantic|receipt|realpath|regular_file/u.test(safeError(error))) decision = policy.decisions.rejected;
    else decision = policy.decisions.blocked;
  }

  const after = sourceFingerprint();
  const sourceUnchanged = before.aggregateSha256 === after.aggregateSha256
    && before.pathSetSha256 === after.pathSetSha256
    && before.fileCount === after.fileCount;
  add("source:unchanged", sourceUnchanged, { before, after });
  if (!sourceUnchanged) decision = policy.decisions.rejected;

  const failed = checks.filter((row) => !row.passed);
  const verified = decision === policy.decisions.verified && failed.length === 0 && childReceipt;
  const report = {
    schemaVersion: "velmere.pass36.a96.rls-tenant-isolation-execution-receipt.v1",
    revisionId: A96_REV,
    parentRevisionId: A96_PARENT,
    generatedAt: new Date().toISOString(),
    startedAt,
    completedAt: new Date().toISOString(),
    fixtureMode,
    decision: verified ? policy.decisions.verified : decision,
    preflightPassed: verified,
    mutationStarted,
    executedStages,
    sourceUnchanged,
    sourceFingerprintBefore: before,
    sourceFingerprintAfter: after,
    rls: childReceipt ? {
      casesPrepared: childReceipt.casesPrepared,
      casesExecuted: childReceipt.casesExecuted,
      casesPassed: childReceipt.casesPassed,
      checksExecuted: childReceipt.checksExecuted,
      transactionRolledBack: childReceipt.transactionRolledBack,
      resultDigestSha256: sha256(JSON.stringify(childReceipt.results)),
    } : { casesPrepared: policy.requiredCases, casesExecuted: 0, casesPassed: 0, checksExecuted: 0, transactionRolledBack: false },
    summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
    truthBoundary: policy.truthBoundary,
    a96PassCredit: false,
    stagingCredit: verified && !fixtureMode,
    live: false,
    liveProven: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  const serialized = JSON.stringify(report);
  const rawSecrets = [process.env.VELMERE_A96_DATABASE_URL, process.env.VELMERE_A96_CONFIRM].filter(Boolean);
  if (rawSecrets.some((secret) => serialized.includes(secret))) throw new Error("a96_receipt_secret_leak");
  const file = emit(report);
  console.log(JSON.stringify({ decision: report.decision, fixtureMode, summary: report.summary, rls: report.rls, sourceUnchanged, output: file }, null, 2));
  if (!verified) process.exitCode = 1;
}

try { main(); }
catch (error) {
  console.error(JSON.stringify({ decision: policy.decisions.rejected, error: safeError(error), live: false, saleEnabled: false }, null, 2));
  process.exit(1);
}
