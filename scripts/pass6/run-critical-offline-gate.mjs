import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { computeSourceSnapshot, writeJsonAtomic } from "../release-integrity/source-snapshot.mjs";
import {
  descendantManifestPathForRevision,
  digestValid,
  revisionCoordinates,
} from "../pass36/historical-descendant-chain-lib.mjs";

const root = process.cwd();
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const lineageModeIndex = process.argv.indexOf("--lineage-mode");
const lineageMode = lineageModeIndex >= 0 ? process.argv[lineageModeIndex + 1] : "legacy";
if (!["legacy", "current-root"].includes(lineageMode)) throw new Error(`critical_gate_lineage_mode_invalid:${lineageMode}`);
const defaultTimeoutMs = 30_000;

const ts = (id, file) => ({
  id,
  args: ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", file],
});

const suites = [
  ts("commerce_atomic_paid_outbox", "scripts/pass4992/atomic-commerce-paid-outbox.test.ts"),
  ts("commerce_fulfilment_worker", "scripts/pass4994/commerce-fulfilment-outbox-worker.test.ts"),
  ts("source_receipt_identity_projection", "scripts/pass4993/source-receipt-identity-projection.test.ts"),
  ts("commercial_completeness", "scripts/pass6/test-commercial-completeness-99-9.ts"),
  ts("tier_export_matrix", "scripts/pass6/test-tier-export-completeness-matrix.ts"),
  ts("audit_pdf_paid_completeness", "scripts/pass6/test-audit-pdf-paid-completeness.ts"),
  ts("manual_review_dual_control", "scripts/pass6/test-manual-review-authority-p0.ts"),
  { ...ts("real_markets_registry", "scripts/pass6/test-real-markets-asset-field-registry.ts"), timeoutMs: 60_000 },
  ts("real_markets_receipt_integrity", "scripts/pass6/test-real-markets-data-receipt-integrity.ts"),
  ts("market_risk_delivery_gate", "scripts/pass6/test-market-risk-delivery-gate.ts"),
  ts("shield_klines_gate", "scripts/pass6/test-shield-klines-p0.ts"),
  ts("legacy_live_publication_truth", "scripts/pass6/test-legacy-live-publication-truth.ts"),
  ts("ui_live_publication_truth", "scripts/pass6/test-ui-live-truth.ts"),
  ts("paid_full_data_slo", "scripts/pass6/test-paid-full-data-slo.ts"),
  ...(lineageMode === "current-root" ? [
    { id: "a78_current_root_descendant_integrity", args: ["scripts/pass36/verify-a78-current-root-descendant.mjs"] },
    { id: "a77_legacy_lineage_isolation", args: ["scripts/pass36/verify-a77-legacy-lineage-isolation.mjs"] },
  ] : [
    { id: "preflight_snapshot_recovery", args: ["scripts/pass6/test-preflight-snapshot-recovery.mjs"] },
    { id: "retired_preflight_source_registry", args: ["scripts/pass6/test-retired-preflight-source-registry.mjs"] },
  ]),
  ts("admin_iam_fail_closed", "scripts/pass6/test-admin-iam-fail-closed.ts"),
  ts("control_plane_boundaries", "scripts/pass6/test-control-plane-boundaries.ts"),
  ts("operator_assertion_replay", "scripts/pass6/test-operator-assertion-body-replay.ts"),
  ts("worker_mutation_envelope", "scripts/pass6/test-worker-mutation-envelope.ts"),
  ts("api_abuse_diagnostics", "scripts/pass6/test-api-abuse-diagnostics-p1.ts"),
  ts("api_surface_body_inventory", "scripts/test-pass4659-api-surface-and-body-boundary.ts"),
  ts("api_stream_boundaries", "scripts/pass6/test-api-body-stream-boundaries.ts"),
  ts("audit_malformed_json", "scripts/pass4823/test-audit-malformed-json-routes.ts"),
  ts("tier_value_proof", "scripts/test-pass4643-tier-value-proof.ts"),
  ts("pass4800_mega", "scripts/pass4800/test-mega-pass.ts"),
  ts("production_security_db_hardening", "scripts/security-hardening/test-production-security-db-hardening.ts"),
  ts("supabase_service_rest_boundary", "scripts/pass11/test-supabase-service-rest.ts"),
  { id: "routing_single_dom_contract", args: ["scripts/pass12/test-routing-single-dom-contract.mjs"] },
  ts("proxy_dotted_route_runtime", "scripts/pass4825/test-csp-proxy-runtime.ts"),
];

function readRootJson(rootPath, relativePath, label, blockers) {
  if (typeof relativePath !== "string" || !relativePath) {
    blockers.push(`${label}_path_missing`);
    return null;
  }
  const resolvedRoot = path.resolve(rootPath);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (
    path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    blockers.push(`${label}_path_unsafe`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(resolvedPath, "utf8"));
  } catch {
    blockers.push(`${label}_unreadable`);
    return null;
  }
}

function validRejectedDraftLineageTombstone(document, completedThrough) {
  return (
    document?.checkpointClass === "REJECTED_DRAFT_NO_SOURCE_AUTHORITY"
    && document?.completedThrough === completedThrough
    && document?.payloadIdentityAvailable === false
    && document?.sourceBytesRecovered === false
    && typeof document?.reason === "string"
    && document.reason.length > 0
    && document?.claims?.realEvidenceBound === false
    && document?.claims?.stagingCredit === false
    && document?.claims?.liveProven === false
    && document?.claims?.saleEnabled === false
    && document?.claims?.productionApproved === false
    && document?.claims?.worldClassProven === false
  );
}

export function inspectCriticalOfflineCheckpointTruth(
  rootPath,
  { lineageMode: requestedLineageMode = "current-root" } = {},
) {
  if (requestedLineageMode !== "current-root") {
    return {
      mode: "STANDARD",
      valid: true,
      checkpointClass: null,
      completedThrough: null,
      omittedPasses: [],
      blockers: [],
      basis: "legacy_lineage_mode",
    };
  }

  const blockers = [];
  const mirror = readRootJson(
    rootPath,
    "config/pass35/current-revision.json",
    "current_revision",
    blockers,
  );
  const authority = mirror
    ? readRootJson(
        rootPath,
        mirror.currentReleaseAuthorityPath ?? "config/pass36/current-release-authority.json",
        "current_release_authority",
        blockers,
      )
    : null;
  const manifest = mirror
    ? readRootJson(
        rootPath,
        mirror.currentRootDescendantManifestPath,
        "current_descendant_manifest",
        blockers,
      )
    : null;

  const currentCheckpointPlane =
    authority?.planes?.a102r2LocalClosure?.revisionId === mirror?.sourceRevisionId
      ? authority.planes.a102r2LocalClosure
      : authority?.planes?.localHardeningCheckpoint;
  const observedClasses = {
    mirror: mirror?.checkpointClass,
    authority: authority?.claims?.checkpointClass,
    authorityPlane: currentCheckpointPlane?.checkpointClass,
    manifest: manifest?.checkpointClass,
  };
  const hasCheckpointDeclaration = Object.values(observedClasses)
    .some((value) => value !== undefined && value !== null);

  if (!hasCheckpointDeclaration) {
    return {
      mode: blockers.length ? "INVALID_CHECKPOINT_TRUTH" : "STANDARD",
      valid: blockers.length === 0,
      checkpointClass: null,
      completedThrough: null,
      omittedPasses: [],
      blockers,
      basis: "no_checkpoint_class_declared",
    };
  }

  for (const [source, value] of Object.entries(observedClasses)) {
    if (value !== "ACTION_REQUIRED_NON_PASS") {
      blockers.push(`${source}_checkpoint_class_not_action_required_non_pass`);
    }
  }

  const revisionId = mirror?.sourceRevisionId;
  const parentRevisionId = mirror?.parentSourceRevisionId;
  const currentCoordinates = revisionCoordinates(revisionId);
  const parentCoordinates = revisionCoordinates(parentRevisionId);
  const currentPass = currentCoordinates?.passNumber ?? null;
  const parentPass = parentCoordinates?.passNumber ?? null;
  const completedThrough = mirror?.checkpointCompletedThrough;
  if (
    !Number.isInteger(currentPass)
    || !Number.isInteger(parentPass)
    || !Number.isInteger(completedThrough)
    || completedThrough > parentPass
    || currentPass <= completedThrough
  ) {
    blockers.push("checkpoint_last_completed_canonical_pass_invalid");
  }
  const exactLineageTransition = Boolean(
    currentCoordinates
    && parentCoordinates
    && (
      (
        currentCoordinates.passNumber === parentCoordinates.passNumber
        && currentCoordinates.revisionNumber === parentCoordinates.revisionNumber + 1
      )
      || (
        currentCoordinates.passNumber === parentCoordinates.passNumber + 1
        && currentCoordinates.revisionNumber === 0
      )
      || (
        parentCoordinates.passNumber === completedThrough
        && currentCoordinates.passNumber > parentCoordinates.passNumber
      )
    )
  );
  if (!exactLineageTransition) blockers.push("checkpoint_lineage_parent_transition_invalid");
  const omittedPasses = Number.isInteger(currentPass) && Number.isInteger(completedThrough) && currentPass > completedThrough
    ? Array.from({ length: currentPass - completedThrough }, (_, index) => completedThrough + index + 1)
    : [];

  if (manifest?.revisionId !== revisionId) blockers.push("manifest_revision_mismatch");
  if (manifest?.parentRevisionId !== parentRevisionId) blockers.push("manifest_parent_revision_mismatch");
  if (manifest?.completedThrough !== completedThrough) blockers.push("manifest_completed_through_mismatch");
  if (!digestValid(manifest)) blockers.push("manifest_digest_invalid");
  const parentManifestPath = descendantManifestPathForRevision(parentRevisionId);
  const parentManifest = parentManifestPath
    ? readRootJson(rootPath, parentManifestPath, "parent_descendant_manifest", blockers)
    : null;
  if (parentManifest?.revisionId !== parentRevisionId) blockers.push("parent_manifest_revision_mismatch");
  if (!digestValid(parentManifest)) blockers.push("parent_manifest_digest_invalid");
  if (
    manifest?.parentDescendantManifestDigestSha256
    !== parentManifest?.manifestDigestSha256
  ) {
    blockers.push("manifest_parent_digest_mismatch");
  }
  if (Number.isInteger(parentPass) && parentPass > completedThrough) {
    const actionRequiredParent =
      parentManifest?.checkpointClass === "ACTION_REQUIRED_NON_PASS";
    const rejectedDraftTombstone = validRejectedDraftLineageTombstone(
      parentManifest,
      completedThrough,
    );
    if (!actionRequiredParent && !rejectedDraftTombstone) {
      blockers.push("lineage_parent_checkpoint_class_invalid");
    }
    if (parentManifest?.completedThrough !== completedThrough) {
      blockers.push("lineage_parent_completed_through_mismatch");
    }
  }
  if (mirror?.currentRootDescendantManifestRevisionId !== revisionId) {
    blockers.push("mirror_descendant_revision_mismatch");
  }
  if (
    authority?.authorityRevisionId !== revisionId
    || authority?.currentSource?.revisionId !== revisionId
  ) {
    blockers.push("authority_revision_mismatch");
  }
  if (authority?.currentSource?.parentRevisionId !== parentRevisionId) {
    blockers.push("authority_parent_revision_mismatch");
  }
  if (authority?.claims?.completedThrough !== completedThrough) {
    blockers.push("authority_completed_through_mismatch");
  }
  const authorityCheckpointPlane = currentCheckpointPlane;
  const authorityCheckpointCoordinates = revisionCoordinates(authorityCheckpointPlane?.revisionId);
  if (authorityCheckpointPlane?.completedThrough !== completedThrough) {
    blockers.push("authority_plane_completed_through_mismatch");
  }
  if (
    !authorityCheckpointCoordinates
    || authorityCheckpointCoordinates.passNumber < completedThrough
    || (Number.isInteger(currentPass) && authorityCheckpointCoordinates.passNumber > currentPass)
  ) blockers.push("authority_plane_revision_range_invalid");

  const aggregatePassCreditField =
    Number.isInteger(currentPass) && currentPass >= 90
      ? `a90ToA${currentPass}PassCredit`
      : "a90ToA94PassCredit";
  if (mirror?.[aggregatePassCreditField] !== false) {
    blockers.push(`mirror_${aggregatePassCreditField}_not_false`);
  }
  if (authority?.claims?.[aggregatePassCreditField] !== false) {
    blockers.push("authority_omitted_pass_credit_not_false");
  }
  if (authority?.claims?.decision !== "NO_GO") blockers.push("authority_decision_not_no_go");
  if (omittedPasses.length === 0) blockers.push("omitted_pass_range_empty");
  for (const omittedPass of omittedPasses) {
    const claim = `a${omittedPass}PassCredit`;
    if (manifest?.claims?.[claim] !== false) blockers.push(`manifest_${claim}_not_false`);
  }
  const authorityPlaneUncreditedPasses = authorityCheckpointCoordinates
    && Number.isInteger(completedThrough)
    && authorityCheckpointCoordinates.passNumber > completedThrough
    ? Array.from(
        { length: authorityCheckpointCoordinates.passNumber - completedThrough },
        (_, index) => completedThrough + index + 1,
      )
    : [];
  for (const uncreditedPass of authorityPlaneUncreditedPasses) {
    const claim = `a${uncreditedPass}PassCredit`;
    if (authorityCheckpointPlane?.[claim] !== false) {
      blockers.push(`authority_plane_${claim}_not_false`);
    }
  }

  const promotionClaims = [
    ["mirror_live_proven", mirror?.liveProven],
    ["mirror_sale_enabled", mirror?.saleEnabled],
    ["mirror_world_class_proven", mirror?.worldClassProven],
    ["authority_live_proven", authority?.claims?.liveProven],
    ["authority_sale_enabled", authority?.claims?.saleEnabled],
    ["authority_production_approved", authority?.claims?.productionApproved],
    ["authority_world_class_proven", authority?.claims?.worldClassProven],
    ["manifest_live_proven", manifest?.claims?.liveProven],
    ["manifest_sale_enabled", manifest?.claims?.saleEnabled],
    ["manifest_production_approved", manifest?.claims?.productionApproved],
    ["manifest_world_class_proven", manifest?.claims?.worldClassProven],
  ];
  for (const [claim, value] of promotionClaims) {
    if (value !== false) blockers.push(`${claim}_not_false`);
  }

  return {
    mode: blockers.length ? "INVALID_CHECKPOINT_TRUTH" : "ACTION_REQUIRED_NON_PASS",
    valid: blockers.length === 0,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    revisionId: revisionId ?? null,
    parentRevisionId: parentRevisionId ?? null,
    completedThrough: Number.isInteger(completedThrough) ? completedThrough : null,
    lastCompletedCanonicalPass: Number.isInteger(completedThrough) ? completedThrough : null,
    lineageParentPass: Number.isInteger(parentPass) ? parentPass : null,
    omittedPasses,
    blockers,
    basis: "current_authority_mirror_and_descendant_manifest",
  };
}

export function evaluateCriticalOfflineGateTruth({
  advisoryCodeOnlyPassed,
  exactNodeRuntime,
  genuineRuntimePackagesAvailable,
  checkpointTruth,
}) {
  const checkpointTruthValid = checkpointTruth?.valid === true;
  const actionRequiredNonPass =
    checkpointTruthValid && checkpointTruth?.mode === "ACTION_REQUIRED_NON_PASS";
  const exactExecutionPassed =
    advisoryCodeOnlyPassed && exactNodeRuntime && genuineRuntimePackagesAvailable;
  const executionAccepted = exactExecutionPassed && checkpointTruthValid;
  const offlineReleaseCandidateEligible =
    executionAccepted && !actionRequiredNonPass;
  const status = !advisoryCodeOnlyPassed
    ? "BLOCKED"
    : !checkpointTruthValid
      ? "BLOCKED_CHECKPOINT_TRUTH"
      : !exactNodeRuntime
        ? "PASS_ADVISORY_WRONG_NODE_RUNTIME"
        : !genuineRuntimePackagesAvailable
          ? "PASS_ADVISORY_TEST_SHIMS"
          : actionRequiredNonPass
            ? "PASS_CODE_ONLY_ACTION_REQUIRED_CHECKPOINT"
            : "PASS_OFFLINE_RELEASE_CANDIDATE";
  return {
    status,
    exactExecutionPassed,
    executionAccepted,
    checkpointTruthValid,
    actionRequiredNonPass,
    offlineReleaseCandidateEligible,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function boundedTail(value, max = 2_000) {
  return value.length <= max ? value : value.slice(-max);
}

function main() {
const sourceBefore = computeSourceSnapshot(root);
const startedAt = new Date().toISOString();
let results;

const MAX_CAPTURE_BYTES = 32 * 1024 * 1024;

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function readCapturedResult({ id, args, exitCode, durationMs, timeoutMs, stdoutPath, stderrPath, timedOut = false, spawnError = null }) {
  let stdoutBuffer = Buffer.alloc(0);
  let stderrBuffer = Buffer.alloc(0);
  let stdoutBytes = 0;
  let stderrBytes = 0;
  try {
    stdoutBytes = statSync(stdoutPath).size;
    stdoutBuffer = readFileSync(stdoutPath);
  } catch (ignoredError) { void ignoredError; }
  try {
    stderrBytes = statSync(stderrPath).size;
    stderrBuffer = readFileSync(stderrPath);
  } catch (ignoredError) { void ignoredError; }
  const outputLimitExceeded = stdoutBytes + stderrBytes > MAX_CAPTURE_BYTES;
  if (stdoutBuffer.length > MAX_CAPTURE_BYTES) stdoutBuffer = stdoutBuffer.subarray(-MAX_CAPTURE_BYTES);
  if (stderrBuffer.length > MAX_CAPTURE_BYTES) stderrBuffer = stderrBuffer.subarray(-MAX_CAPTURE_BYTES);
  const stdout = stdoutBuffer.toString("utf8");
  const stderr = stderrBuffer.toString("utf8");
  return {
    id,
    command: [process.execPath, ...args].join(" "),
    exitCode,
    signal: null,
    timedOut,
    outputLimitExceeded,
    spawnError,
    durationMs,
    timeoutMs,
    stdoutBytes,
    stdoutSha256: sha256(stdout),
    stderrBytes,
    stderrSha256: sha256(stderr),
    failureTail: exitCode === 0 && !timedOut && !outputLimitExceeded && !spawnError
      ? null
      : boundedTail(`${stdout}\n${stderr}`),
  };
}

function runSuitesViaUnixShell() {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "velmere-critical-shell-"));
  const resultPath = path.join(tempDirectory, "results.tsv");
  writeFileSync(resultPath, "");
  const batchSize = 10;
  const shellErrors = [];

  for (let batchStart = 0; batchStart < suites.length; batchStart += batchSize) {
    const batch = suites.slice(batchStart, batchStart + batchSize);
    const scriptPath = path.join(tempDirectory, `run-${batchStart}.sh`);
    const lines = ["#!/usr/bin/env bash", "set +e"];
    for (const [offset, suite] of batch.entries()) {
      const index = batchStart + offset;
      const stdoutPath = path.join(tempDirectory, `${index}.stdout.log`);
      const stderrPath = path.join(tempDirectory, `${index}.stderr.log`);
      const command = [process.execPath, ...suite.args].map(shellQuote).join(" ");
      const suiteTimeoutMs = suite.timeoutMs ?? defaultTimeoutMs;
      lines.push(
        `printf '%s\\n' ${shellQuote(`[RUN] ${suite.id}`)}`,
        "started=$(date +%s%3N)",
        `timeout --signal=TERM --kill-after=1s ${Math.ceil(suiteTimeoutMs / 1000)}s ${command} > ${shellQuote(stdoutPath)} 2> ${shellQuote(stderrPath)}`,
        "rc=$?",
        "ended=$(date +%s%3N)",
        "duration=$((ended-started))",
        `printf '%s\\t%s\\t%s\\n' ${shellQuote(String(index))} "$rc" "$duration" >> ${shellQuote(resultPath)}`,
        `if [ "$rc" -eq 0 ]; then printf '%s\\n' ${shellQuote(`[PASS] ${suite.id}`)}; else printf '%s\\n' ${shellQuote(`[FAIL] ${suite.id}`)}; fi`,
      );
    }
    writeFileSync(scriptPath, `${lines.join("\n")}\n`, { mode: 0o700 });
    const shell = spawnSync("bash", [scriptPath], {
      cwd: root,
      env: { ...process.env, TZ: "UTC", NODE_ENV: "test" },
      stdio: ["ignore", "inherit", "inherit"],
      timeout: batch.reduce((total, suite) => total + (suite.timeoutMs ?? defaultTimeoutMs) + 2_000, 0),
      killSignal: "SIGKILL",
      windowsHide: true,
    });
    if (shell.error || shell.status !== 0) {
      shellErrors.push(shell.error?.message ?? `batch_${batchStart}_shell_exit_${shell.status ?? "unknown"}`);
    }
    // A fresh shell per bounded batch avoids loader-worker/stdio exhaustion in
    // constrained CI containers while preserving one process per test suite.
    spawnSync("sleep", ["0.1"], { stdio: "ignore" });
  }

  const rowsByIndex = new Map();
  if (existsSync(resultPath)) {
    for (const line of readFileSync(resultPath, "utf8").split(/\r?\n/u).filter(Boolean)) {
      const [index, exitCode, durationMs] = line.split("\t");
      rowsByIndex.set(Number(index), { exitCode: Number(exitCode), durationMs: Number(durationMs) });
    }
  }
  const output = suites.map((suite, index) => {
    const captured = rowsByIndex.get(index);
    const stdoutPath = path.join(tempDirectory, `${index}.stdout.log`);
    const stderrPath = path.join(tempDirectory, `${index}.stderr.log`);
    const timedOut = captured?.exitCode === 124 || captured?.exitCode === 137;
    return readCapturedResult({
      id: suite.id,
      args: suite.args,
      exitCode: captured?.exitCode ?? null,
      durationMs: captured?.durationMs ?? 0,
      timeoutMs: suite.timeoutMs ?? defaultTimeoutMs,
      stdoutPath,
      stderrPath,
      timedOut,
      spawnError: captured ? null : shellErrors.join(";") || "missing_batch_result",
    });
  });
  try { rmSync(tempDirectory, { recursive: true, force: true }); } catch (ignoredError) { void ignoredError; }
  return output;
}

function runSuitePortable(suite) {
  const started = Date.now();
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "velmere-critical-portable-"));
  const stdoutPath = path.join(tempDirectory, "stdout.log");
  const stderrPath = path.join(tempDirectory, "stderr.log");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  let result;
  try {
    result = spawnSync(process.execPath, suite.args, {
      cwd: root,
      env: { ...process.env, TZ: "UTC", NODE_ENV: "test" },
      stdio: ["ignore", stdoutFd, stderrFd],
      timeout: suite.timeoutMs ?? defaultTimeoutMs,
      killSignal: "SIGKILL",
      windowsHide: true,
    });
  } finally {
    try { closeSync(stdoutFd); } catch (ignoredError) { void ignoredError; }
    try { closeSync(stderrFd); } catch (ignoredError) { void ignoredError; }
  }
  const row = readCapturedResult({
    id: suite.id,
    args: suite.args,
    exitCode: result?.status ?? null,
    durationMs: Date.now() - started,
    timeoutMs: suite.timeoutMs ?? defaultTimeoutMs,
    stdoutPath,
    stderrPath,
    timedOut: result?.error?.code === "ETIMEDOUT",
    spawnError: result?.error?.message ?? null,
  });
  try { rmSync(tempDirectory, { recursive: true, force: true }); } catch (ignoredError) { void ignoredError; }
  return row;
}

results = process.platform === "win32"
  ? suites.map((suite) => runSuitePortable(suite))
  : runSuitesViaUnixShell();
for (const row of results) {
  const passed = row.exitCode === 0 && !row.timedOut && !row.outputLimitExceeded && !row.spawnError;
  process.stdout.write(`[${passed ? "PASS" : "FAIL"}] ${row.id} ${row.durationMs}ms\n`);
}

const sourceAfter = computeSourceSnapshot(root);
const sourceImmutable = sourceBefore.sha256 === sourceAfter.sha256;
const failed = results.filter((row) => row.exitCode !== 0 || row.timedOut || row.outputLimitExceeded || row.spawnError);
const requireFromRoot = createRequire(path.join(root, "package.json"));
const requiredRuntimePackages = ["next/server", "@supabase/supabase-js", "stripe"];
const genuineRuntimePackages = Object.fromEntries(requiredRuntimePackages.map((specifier) => {
  try {
    requireFromRoot.resolve(specifier);
    return [specifier, true];
  } catch {
    return [specifier, false];
  }
}));
const genuineRuntimePackagesAvailable = Object.values(genuineRuntimePackages).every(Boolean);
const exactNodeRuntime = process.version === "v24.18.0";
const advisoryCodeOnlyPassed = failed.length === 0 && sourceImmutable;
const checkpointTruth = inspectCriticalOfflineCheckpointTruth(root, { lineageMode });
const gateTruth = evaluateCriticalOfflineGateTruth({
  advisoryCodeOnlyPassed,
  exactNodeRuntime,
  genuineRuntimePackagesAvailable,
  checkpointTruth,
});
const receipt = {
  schemaVersion: "velmere.pass6.critical-offline-gate.v1",
  lineageMode,
  generatedAt: new Date().toISOString(),
  startedAt,
  status: gateTruth.status,
  advisoryCodeOnlyPassed,
  exactExecutionPassed: gateTruth.exactExecutionPassed,
  executionAccepted: gateTruth.executionAccepted,
  checkpointTruthValid: gateTruth.checkpointTruthValid,
  actionRequiredNonPass: gateTruth.actionRequiredNonPass,
  offlineReleaseCandidateEligible: gateTruth.offlineReleaseCandidateEligible,
  liveReleaseEligible: false,
  liveClaimed: false,
  checkpointTruth,
  truthBoundary: gateTruth.actionRequiredNonPass && gateTruth.executionAccepted
    ? "Deterministic code-only execution passed on the exact Node runtime with genuine framework/SDK packages, but the exact current authority is an ACTION_REQUIRED_NON_PASS checkpoint. This proves the recorded suite execution only and grants no offline release-candidate, omitted-pass, browser, staging, real-data, LIVE or sale credit."
    : !gateTruth.checkpointTruthValid
      ? `Deterministic code-only suite execution cannot be admitted because current checkpoint truth is missing or contradictory (${checkpointTruth.blockers.join(",") || "checkpoint_truth_invalid"}). This is not an offline release-candidate proof and grants no LIVE or sale credit.`
      : gateTruth.offlineReleaseCandidateEligible
    ? "Deterministic code-only execution passed on the exact Node runtime with genuine framework/SDK packages. No provider, staging, production, payment, database, browser or 30-day SLO evidence is claimed."
    : exactNodeRuntime && genuineRuntimePackagesAvailable
      ? `Deterministic code-only execution used the exact Node runtime and genuine framework/SDK packages, but ${failed.length} suite(s) or the source-immutability check failed. This is not an offline release-candidate proof and claims no provider, staging, production, payment, database, browser or 30-day SLO evidence.`
      : `Advisory code-only execution could not prove the full runtime contract: exactNodeRuntime=${exactNodeRuntime}, genuineRuntimePackagesAvailable=${genuineRuntimePackagesAvailable}. Compatibility shims may have been used. This is not an offline release-candidate proof and claims no provider, staging, production, payment, database, browser or 30-day SLO evidence.`,
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    exactNodeRequired: "v24.18.0",
    exactNodeRuntime,
    genuineRuntimePackages,
    genuineRuntimePackagesAvailable,
  },
  sourceBefore,
  sourceAfter,
  sourceImmutable,
  suiteCount: suites.length,
  passedSuiteCount: results.length - failed.length,
  failedSuiteCount: failed.length,
  results,
};

if (output) writeJsonAtomic(path.resolve(root, output), receipt);
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (!receipt.executionAccepted) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
