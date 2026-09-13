#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function exactGitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().toLowerCase();
}
function commandFor(name) {
  const commands = {
    "ROUTE_AST_REGISTRY_CANDIDATE.json": "node scripts/pass15/build-route-export-ast-registry.mjs --output <evidence>/ROUTE_AST_REGISTRY_CANDIDATE.json",
    "ROUTE_DISPATCH_REBASELINE.json": "node scripts/pass15/rebaseline-route-dispatch-manifest.mjs --candidate-output <evidence>/ROUTE_DISPATCH_MANIFEST_CANDIDATE.json",
    "SECRET_FIXTURE_BOUNDARY.json": "node scripts/r11/verify-secret-fixture-boundary.mjs --output <evidence>/SECRET_FIXTURE_BOUNDARY.json",
    "WORKFLOW_SEMANTIC_POLICY.json": "node scripts/r11/verify-workflow-semantic-policy.mjs --output <evidence>/WORKFLOW_SEMANTIC_POLICY.json",
    "RELEASE_LINT_SUMMARY.json": "node scripts/r10/run-release-source-lint.mjs --output <evidence>/RELEASE_LINT.json --summary <evidence>/RELEASE_LINT_SUMMARY.json",
    "FINDING_LEVEL_LOCAL_BENCHMARK.json": "tsx scripts/r11/run-finding-level-local-benchmark.ts --output <evidence>/FINDING_LEVEL_LOCAL_BENCHMARK.json",
    "REAL_MARKET_IDENTITY.json": "tsx scripts/r11/verify-real-market-master.ts --output <evidence>/REAL_MARKET_IDENTITY.json",
    "PAID_BROWSER_AUTHORITY.json": "node scripts/r11/verify-paid-browser-authority.mjs --output <evidence>/PAID_BROWSER_AUTHORITY.json",
    "R11_TRUTH_SCOPE.json": "node scripts/r11/verify-truth-scope-v2.mjs --output <evidence>/R11_TRUTH_SCOPE.json",
  };
  return commands[name] ?? null;
}
function extractDenominator(receipt) {
  const keys = [
    "denominator",
    "denominatorConserved",
    "expectedCaseCount",
    "observedCaseCount",
    "caseCount",
    "expectedFindingCount",
    "trackedScopeFileCount",
    "explicitlyExcludedFileCount",
    "eligibleFileCount",
    "checkedFileCount",
    "ignoredFileCount",
    "failedFileCount",
    "routeDenominator",
    "candidateFileCount",
    "fileCount",
  ];
  return Object.fromEntries(keys.filter((key) => receipt?.[key] !== undefined).map((key) => [key, receipt[key]]));
}

const evidenceDir = path.resolve(arg("--evidence-dir", "/tmp/r11b"));
const outputPath = path.resolve(arg("--output", path.join(evidenceDir, "EVIDENCE_LEDGER.json")));
const workflowPath = arg("--workflow", ".github/workflows/r11b-internal-readonly-gate.yml");
const sourceSha = String(process.env.GITHUB_SHA || exactGitValue(["rev-parse", "HEAD"])).trim().toLowerCase();
const treeHash = exactGitValue(["rev-parse", "HEAD^{tree}"]);
if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error("evidence_ledger_source_sha_invalid");
if (!/^[0-9a-f]{40}$/u.test(treeHash)) throw new Error("evidence_ledger_tree_hash_invalid");
if (!fs.existsSync(evidenceDir) || !fs.statSync(evidenceDir).isDirectory()) throw new Error("evidence_ledger_dir_missing");

const workflowBytes = fs.readFileSync(workflowPath);
const workflowHash = sha256Bytes(workflowBytes);
const criticalEmbeddedBindings = new Set([
  "SECRET_FIXTURE_BOUNDARY.json",
  "WORKFLOW_SEMANTIC_POLICY.json",
  "RELEASE_LINT_SUMMARY.json",
  "FINDING_LEVEL_LOCAL_BENCHMARK.json",
  "REAL_MARKET_IDENTITY.json",
  "PAID_BROWSER_AUTHORITY.json",
  "R11_TRUTH_SCOPE.json",
]);
const excludedNames = new Set([path.basename(outputPath), "EVIDENCE_LEDGER_VERIFICATION.json"]);
const names = fs.readdirSync(evidenceDir)
  .filter((name) => name.endsWith(".json") && !excludedNames.has(name))
  .sort();
if (!names.length) throw new Error("evidence_ledger_empty");

const evidence = [];
const bindingFailures = [];
for (const name of names) {
  const filePath = path.join(evidenceDir, name);
  const metadata = fs.lstatSync(filePath);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(`evidence_ledger_unsafe_file:${name}`);
  const bytes = fs.readFileSync(filePath);
  let receipt = null;
  let parseError = null;
  try {
    receipt = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }
  const embeddedSourceSha = typeof receipt?.sourceSha === "string" ? receipt.sourceSha.toLowerCase() : null;
  const requiresEmbeddedSourceSha = criticalEmbeddedBindings.has(name);
  const embeddedBindingMatches = embeddedSourceSha === null ? !requiresEmbeddedSourceSha : embeddedSourceSha === sourceSha;
  if (!embeddedBindingMatches) {
    bindingFailures.push({ name, embeddedSourceSha, expectedSourceSha: sourceSha, requiresEmbeddedSourceSha });
  }
  evidence.push({
    name,
    sha256: sha256Bytes(bytes),
    byteLength: bytes.length,
    schemaVersion: typeof receipt?.schemaVersion === "string" ? receipt.schemaVersion : null,
    embeddedSourceSha,
    requiresEmbeddedSourceSha,
    embeddedBindingMatches,
    parseError,
    command: commandFor(name),
    denominator: extractDenominator(receipt),
    passed: typeof receipt?.passed === "boolean" ? receipt.passed : null,
    status: typeof receipt?.status === "string" ? receipt.status : null,
  });
}

const missingCritical = [...criticalEmbeddedBindings].filter((name) => !names.includes(name));
const ledger = {
  schemaVersion: "velmere.r11b.evidence-ledger.v1",
  repo: process.env.GITHUB_REPOSITORY || "Zombieland1234/velmere1",
  sourceSha,
  treeHash,
  subjectType: "EXACT_GIT_HEAD",
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  workflowPath,
  workflowHash,
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  environment: {
    ci: process.env.CI === "true",
    runnerOs: process.env.RUNNER_OS || null,
    runnerArch: process.env.RUNNER_ARCH || null,
  },
  createdAt: new Date().toISOString(),
  expectedCriticalReceipts: [...criticalEmbeddedBindings].sort(),
  missingCriticalReceipts: missingCritical,
  bindingFailures,
  evidenceCount: evidence.length,
  evidenceHashes: evidence,
  passed: missingCritical.length === 0 && bindingFailures.length === 0 && evidence.every((row) => row.parseError === null),
  truthBoundary: "This per-run ledger cryptographically binds the listed local evidence files to the exact Git subject, tree, workflow bytes and GitHub run metadata. It is a same-repository consistency and provenance control, not an independent external audit, not an append-only external transparency log, and not production/staging proof.",
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ sourceSha, treeHash, workflowHash, evidenceCount: ledger.evidenceCount, missingCriticalReceipts: missingCritical, bindingFailures, passed: ledger.passed }, null, 2));
if (!ledger.passed) process.exit(1);
