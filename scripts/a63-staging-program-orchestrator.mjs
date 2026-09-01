#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  appendJournalEvent,
  decisionOf,
  evaluateProgram,
  readJson,
  redactObject,
  sha256,
  verifyJournal,
  writeJsonAtomic,
} from "./pass36/a63-staging-program-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./pass36/current-source-authority-lib.mjs";

const root = process.cwd();
const policy = readJson(path.join(root, "config/pass36/a63-staging-program-orchestrator.json"));
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const fixtureMode = args.has("--fixture");
const resume = args.has("--resume");
const outputRoot = path.join(root, "artifacts/pass36/a63");
fs.mkdirSync(outputRoot, { recursive: true });

const npmVersion = () => {
  const npmCliPath = String(process.env.VELMERE_A79_NPM_CLI_PATH ?? "").trim();
  if (!path.isAbsolute(npmCliPath) || !fs.existsSync(npmCliPath)) return "unavailable";
  const metadata = fs.lstatSync(npmCliPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) return "unavailable";
  const env = { PATH: path.dirname(process.execPath), HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? process.env.TEMP ?? "" };
  for (const key of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT"]) if (typeof process.env[key] === "string") env[key] = process.env[key];
  const result = spawnSync(process.execPath, [npmCliPath, "--version"], { encoding: "utf8", timeout: 15000, shell: false, env });
  return result.status === 0 ? result.stdout.trim() : "unavailable";
};
const fileJson = (relative) => {
  const absolute = path.join(root, relative);
  return fs.existsSync(absolute) ? readJson(absolute) : null;
};
const initialSourceAuthority = validateCurrentSourceAuthorityExact(root);
const sourceManifestSha256 = initialSourceAuthority.manifestSha256;
const environment = { ...process.env };
const programId = fixtureMode ? "A63-FIXTURE-PROGRAM-0001" : String(environment.VELMERE_A63_PROGRAM_ID ?? "A63-BLOCKED-NO-PROGRAM-ID");
const runRoot = path.join(outputRoot, "runs", programId.replace(/[^A-Za-z0-9._-]/gu, "_"));
const journalPath = path.join(runRoot, "journal.json");
const envelopesRoot = path.join(runRoot, "envelopes");
fs.mkdirSync(envelopesRoot, { recursive: true });
let journal = resume && fs.existsSync(journalPath) ? readJson(journalPath) : [];
const journalVerification = verifyJournal(journal);
if (!journalVerification.ok) throw new Error(`a63_existing_journal_invalid:${journalVerification.reason}`);

const currentContext = () => ({
  runtime: { node: process.versions.node, npm: npmVersion() },
  sourceManifestSha256,
  expectedSourceManifestSha256: fixtureMode ? sourceManifestSha256 : environment.VELMERE_A63_EXPECTED_SOURCE_MANIFEST_SHA256,
  environment: fixtureMode ? {
    VELMERE_A63_PROGRAM_ID: programId,
    VELMERE_A63_PROJECT_CLASS: policy.projectClass,
    VELMERE_A63_STAGING_ENVIRONMENT_ID: "fixture-staging-environment-0001",
    VELMERE_A63_EXPECTED_SOURCE_MANIFEST_SHA256: sourceManifestSha256,
    VELMERE_A63_CONFIRM: policy.confirmationToken,
    VELMERE_A63_CONTROL_URL: "https://control.staging.example.test/a63",
    VELMERE_A63_TELEMETRY_URL: "https://telemetry.staging.example.test/a63",
    VELMERE_A63_SECURITY_URL: "https://security.staging.example.test/a63",
    VELMERE_A63_CONTROL_SECRET: "fixture-control-secret-000000000000000000000001",
    VELMERE_A63_TELEMETRY_SECRET: "fixture-telemetry-secret-0000000000000000000001",
    VELMERE_A63_SECURITY_SECRET: "fixture-security-secret-00000000000000000000001",
  } : environment,
  a60: fileJson(policy.requiredPreconditions.a60.path),
  a61: fileJson(policy.requiredPreconditions.a61.path),
  a77: fileJson(policy.requiredPreconditions.lineage.cleanRoot.path),
  criticalGate: fileJson(policy.requiredPreconditions.criticalGate.path),
  stageReceipts: Object.fromEntries(policy.stages.map((stage) => [stage.id, fileJson(stage.receiptPath)])),
  nowMs: Date.now(),
  fixtureMode,
});

function persistJournal() { writeJsonAtomic(journalPath, journal); }
function journalEvent(event) {
  journal = appendJournalEvent(journal, { at: new Date().toISOString(), revisionId: policy.revisionId, programId, ...event });
  persistJournal();
}
function stageArguments(stage) {
  const command = [...stage.command];
  for (const [argument, envName] of Object.entries(stage.argumentEnvironment ?? {})) {
    if (environment[envName]) command.push(argument, environment[envName]);
  }
  return command;
}
function verifySourceManifest() {
  const result = spawnSync(process.execPath, ["scripts/pass36/verify-current-source-authority.mjs"], { cwd: root, encoding: "utf8", timeout: 120000, shell: false });
  const current = validateCurrentSourceAuthorityExact(root);
  return { ok: result.status === 0 && current.passed && current.manifestSha256 === sourceManifestSha256, exitCode: result.status, stdoutSha256: sha256(result.stdout ?? ""), stderrSha256: sha256(result.stderr ?? ""), current };
}
function writeEnvelope(stage, receipt) {
  const receiptPath = path.join(root, stage.receiptPath);
  const receiptBytes = fs.readFileSync(receiptPath);
  const core = {
    schemaVersion: "velmere.pass36.a63.stage-envelope.v1",
    revisionId: policy.revisionId,
    programId,
    stageId: stage.id,
    stageRevisionId: stage.revisionId,
    decision: decisionOf(receipt),
    receiptPath: stage.receiptPath,
    receiptSha256: sha256(receiptBytes),
    sourceManifestSha256,
    environmentDigestSha256: currentContext().environment ? evaluateProgram({ ...currentContext(), stageReceipts: {} }, policy).environmentDigestSha256 : null,
    fixtureMode: false,
    saleEnabled: false,
    liveProven: false,
  };
  const envelope = { ...core, envelopeSha256: sha256(JSON.stringify(core)) };
  writeJsonAtomic(path.join(envelopesRoot, `${stage.id}.json`), envelope);
  return envelope;
}

if (fixtureMode) {
  const base = currentContext();
  base.runtime = { ...policy.runtime };
  base.a60 = { revisionId: policy.requiredPreconditions.a60.revisionId, decision: policy.requiredPreconditions.a60.decision, fixtureMode: false, generatedAt: "2026-07-26T12:00:00.000Z", sourceManifestSha256 };
  base.a61 = { revisionId: policy.requiredPreconditions.a61.revisionId, decision: policy.requiredPreconditions.a61.decision, fixtureMode: false, generatedAt: "2026-07-26T12:01:00.000Z" };
  base.criticalGate = { lineageMode: "legacy", summary: { suites: 30, passed: 30, exactByteBlocked: 0, runtimeDependencyBlocked: 0, semanticOrUnknownFailed: 0 }, criticalGate30Of30Credit: true };
  base.nowMs = Date.parse("2026-07-26T13:00:00.000Z");
  base.stageReceipts = Object.fromEntries(policy.stages.map((stage, index) => [stage.id, { revisionId: stage.revisionId, decision: stage.expectedDecision, fixtureMode: false, generatedAt: new Date(Date.parse("2026-07-26T12:10:00.000Z") + index * 60000).toISOString(), sourceManifestSha256, saleEnabled: false, liveProven: false }]));
  const report = evaluateProgram(base, policy);
  report.decision = report.decision === policy.decisions.verified ? "FIXTURE_PASS" : "FIXTURE_FAIL";
  writeJsonAtomic(path.join(outputRoot, "PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.json"), report);
  console.log(JSON.stringify({ decision: report.decision, summary: report.summary }, null, 2));
  process.exit(report.decision === "FIXTURE_PASS" ? 0 : 1);
}

let context = currentContext();
let report = evaluateProgram({ ...context, stageReceipts: {} }, policy);
if (!report.preflight.passed || !execute) {
  report = { ...report, executionRequested: execute, resumeRequested: resume, executedStages: 0, mutationStarted: false };
  redactObject(report, Object.entries(environment).filter(([name]) => /SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE_KEY|API_KEY/u.test(name)).map(([, value]) => value));
  writeJsonAtomic(path.join(outputRoot, "PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.json"), report);
  fs.writeFileSync(path.join(outputRoot, "PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.md"), `# PASS36 A63 — staging program orchestrator\n\nDecision: **${report.decision}**\n\n- Preflight passed: ${report.preflight.passed}\n- Execute requested: ${execute}\n- Stages executed: 0\n- Sale enabled: false\n- LIVE proven: false\n`, "utf8");
  console.log(JSON.stringify({ decision: report.decision, preflightPassed: report.preflight.passed, executedStages: 0 }, null, 2));
  process.exit(report.preflight.passed && !execute ? 0 : 2);
}

const beforeVerification = verifySourceManifest();
if (!beforeVerification.ok) throw new Error("a63_source_manifest_pre_execution_failed");
journalEvent({ type: "PROGRAM_STARTED", sourceManifestSha256, environmentDigestSha256: report.environmentDigestSha256 });
const completed = [];
let mutationStarted = false;
let stageFailure = null;
for (const stage of policy.stages) {
  const envelopePath = path.join(envelopesRoot, `${stage.id}.json`);
  if (resume && fs.existsSync(envelopePath)) {
    const envelope = readJson(envelopePath);
    if (envelope.programId !== programId || envelope.sourceManifestSha256 !== sourceManifestSha256 || envelope.decision !== stage.expectedDecision) throw new Error(`a63_resume_envelope_invalid:${stage.id}`);
    completed.push(stage.id);
    continue;
  }
  journalEvent({ type: "STAGE_STARTING", stageId: stage.id, mutationRisk: stage.mutationRisk });
  if (stage.mutationRisk) mutationStarted = true;
  const command = stageArguments(stage);
  const result = spawnSync(command[0], command.slice(1), { cwd: root, env: environment, encoding: "utf8", timeout: 60 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
  journalEvent({ type: "STAGE_PROCESS_COMPLETED", stageId: stage.id, exitCode: result.status, stdoutSha256: sha256(result.stdout ?? ""), stderrSha256: sha256(result.stderr ?? "") });
  const receipt = fileJson(stage.receiptPath);
  context = { ...currentContext(), stageReceipts: Object.fromEntries(policy.stages.filter((row) => completed.includes(row.id) || row.id === stage.id).map((row) => [row.id, fileJson(row.receiptPath)])) };
  const validation = evaluateProgram(context, policy);
  const stageResult = validation.stageResults.find((row) => row.stageId === stage.id);
  if (result.status !== 0 || !stageResult?.passed) {
    stageFailure = { stageId: stage.id, exitCode: result.status, validation: stageResult ?? null };
    journalEvent({ type: "STAGE_FAILED", stageId: stage.id, mutationRisk: stage.mutationRisk });
    break;
  }
  const verification = verifySourceManifest();
  if (!verification.ok || verification.current.manifestSha256 !== sourceManifestSha256) {
    stageFailure = { stageId: stage.id, reason: "source_drift" };
    journalEvent({ type: "SOURCE_DRIFT", stageId: stage.id });
    break;
  }
  writeEnvelope(stage, receipt);
  completed.push(stage.id);
  journalEvent({ type: "STAGE_VERIFIED", stageId: stage.id, receiptDecision: decisionOf(receipt) });
}

context = currentContext();
report = evaluateProgram(context, policy);
if (stageFailure && mutationStarted && environment.VELMERE_A63_RECOVERY_CONFIRM !== "I_CONFIRM_ALL_MUTATING_STAGES_ARE_CLOSED_AND_THE_DISPOSABLE_STAGING_BASELINE_IS_SAFE") report.decision = policy.decisions.recoveryRequired;
report.executionRequested = true;
report.resumeRequested = resume;
report.executedStages = completed.length;
report.mutationStarted = mutationStarted;
report.stageFailure = stageFailure;
report.journal = verifyJournal(journal);
report.sourceUnchanged = validateCurrentSourceAuthorityExact(root).manifestSha256 === sourceManifestSha256;
redactObject(report, Object.entries(environment).filter(([name]) => /SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE_KEY|API_KEY/u.test(name)).map(([, value]) => value));
writeJsonAtomic(path.join(outputRoot, "PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.json"), report);
fs.writeFileSync(path.join(outputRoot, "PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.md"), `# PASS36 A63 — staging program orchestrator\n\nDecision: **${report.decision}**\n\n- Stages verified: ${report.summary.stagesVerified}/${policy.stages.length}\n- Source unchanged: ${report.sourceUnchanged}\n- Mutation started: ${mutationStarted}\n- Sale enabled: false\n- LIVE proven: false\n`, "utf8");
console.log(JSON.stringify({ decision: report.decision, stagesVerified: completed.length, mutationStarted, sourceUnchanged: report.sourceUnchanged }, null, 2));
process.exit(report.decision === policy.decisions.verified ? 0 : 1);
