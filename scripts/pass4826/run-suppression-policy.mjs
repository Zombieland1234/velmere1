#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { runInstalledEslint } from "../pass13/eslint-cli-runtime.mjs";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { createLintInputManifest, validateEslintResults } from "../pass4825/quality-inventory-contract.mjs";
import {
  evaluateSuppressions,
  scanSuppressionDirectives,
  sealSuppressionEvidence,
  sha256Suppression,
  validateSuppressionAllowlist,
} from "./suppression-policy-contract.mjs";

const ROOT = process.cwd();
const ALLOWLIST_PATH = "config/pass4826-suppression-allowlist.json";
const OUTPUT_PATH = "artifacts/pass4826/PASS4826_SUPPRESSIONS_POLICY_EVIDENCE.json";

function inside(relative, code) {
  const absolute = path.resolve(ROOT, relative);
  const normalized = path.relative(ROOT, absolute);
  if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) throw new Error(`${code}_outside_root`);
  return absolute;
}

const sourceBefore = computePass4823SourceTree(ROOT);
const allowlistBytes = readFileSync(inside(ALLOWLIST_PATH, "allowlist"));
const allowlist = JSON.parse(allowlistBytes.toString("utf8"));
validateSuppressionAllowlist(allowlist);
const lintManifest = await createLintInputManifest(ROOT);
const directives = lintManifest.entries.flatMap((entry) => scanSuppressionDirectives(
  entry.path,
  readFileSync(inside(entry.path, "lint_input"), "utf8"),
));
const evaluationTime = new Date().toISOString();
const suppression = evaluateSuppressions({ directives, allowlist, evaluationTime });

const eslintExecution = runInstalledEslint({
  root: ROOT,
  args: [".", "--format", "json", "--max-warnings", "0"],
  timeout: 20 * 60_000,
  maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "true", NEXT_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" },
});
const lint = eslintExecution.result;
if (lint.error) throw lint.error;
const lintResults = JSON.parse(String(lint.stdout ?? ""));
const lintCompleteness = await validateEslintResults({ root: ROOT, results: lintResults, inputManifest: lintManifest });
const errorCount = lintResults.reduce((total, entry) => total + Number(entry.errorCount ?? 0), 0);
const warningCount = lintResults.reduce((total, entry) => total + Number(entry.warningCount ?? 0), 0);
const sourceAfter = computePass4823SourceTree(ROOT);
const sourceUnchanged = sourceBefore.sha256 === sourceAfter.sha256;
const passed = suppression.passed
  && lint.status === 0
  && errorCount === 0
  && warningCount === 0
  && lintCompleteness.complete === true
  && sourceUnchanged;
const core = {
  schemaVersion: "velmere.pass4826.world-class-evidence.v1",
  requirementId: "suppressions_policy",
  status: passed ? "PASS" : "FAIL",
  passed,
  sourceTreeSha256: sourceBefore.sha256,
  postRunSourceTreeSha256: sourceAfter.sha256,
  sourceUnchanged,
  claims: {
    suppressionsPolicyPassed: passed,
    lintScopeComplete: lintCompleteness.complete === true,
    eslintZeroErrors: errorCount === 0,
    eslintZeroWarnings: warningCount === 0,
    allowlistSourceBound: sourceUnchanged && /^[a-f0-9]{64}$/u.test(sha256Suppression(allowlistBytes)),
    unexpectedSuppressionCount: suppression.unexpectedSuppressionCount,
    expiredSuppressionCount: suppression.expiredSuppressionCount,
    missingJustificationCount: suppression.missingJustificationCount,
  },
  scope: {
    lintManifestSchemaVersion: lintManifest.schemaVersion,
    lintFileCount: lintManifest.fileCount,
    lintByteLength: lintManifest.byteLength,
    lintAggregateSha256: lintManifest.aggregateChecksumSha256,
    directiveCount: suppression.directiveCount,
    allowlistEntryCount: suppression.allowlistEntryCount,
    matchedDirectiveCount: suppression.matchedDirectiveCount,
    allowlistPath: ALLOWLIST_PATH,
    allowlistFileSha256: sha256Suppression(allowlistBytes),
  },
  eslint: {
    exitCode: lint.status,
    signal: lint.signal ?? null,
    timedOut: lint.error?.code === "ETIMEDOUT",
    resultCount: lintResults.length,
    errorCount,
    warningCount,
    stderrSha256: sha256Suppression(String(lint.stderr ?? "")),
    nodeExecutable: eslintExecution.invocation.executable,
    cliPath: eslintExecution.identity.cliRelativePath,
    cliSha256: eslintExecution.identity.cliSha256,
    packageVersion: eslintExecution.identity.packageVersion,
    shell: eslintExecution.invocation.shell,
  },
  findings: {
    unallowlisted: suppression.unallowlisted,
    forbidden: suppression.forbidden,
    staleAllowances: suppression.staleAllowances,
    expired: suppression.expired,
    missingJustification: suppression.missingJustification,
  },
  limitations: [
    "The allowlist records maintainer roles rather than named individuals; repository governance must map roles to accountable people.",
    "A suppression-policy PASS proves exact source-bound directives and clean ESLint output, not semantic correctness of every suppressed rule.",
  ],
  generatedAt: evaluationTime,
};
const receipt = sealSuppressionEvidence(core);
mkdirSync(path.dirname(inside(OUTPUT_PATH, "output")), { recursive: true });
writeFileSync(inside(OUTPUT_PATH, "output"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  status: receipt.status,
  sourceTreeSha256: sourceBefore.sha256,
  lintFileCount: lintManifest.fileCount,
  directives: suppression.directiveCount,
  matched: suppression.matchedDirectiveCount,
  unexpected: suppression.unexpectedSuppressionCount,
  expired: suppression.expiredSuppressionCount,
  missingJustification: suppression.missingJustificationCount,
  eslintErrors: errorCount,
  eslintWarnings: warningCount,
  output: OUTPUT_PATH,
}, null, 2));
process.exit(passed ? 0 : 1);
