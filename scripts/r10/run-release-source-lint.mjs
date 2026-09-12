#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ESLint } from "eslint";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const outputPath = arg("--output", "artifacts/r10/integration/build/RELEASE_LINT.json");
const summaryPath = arg("--summary", "artifacts/r10/integration/build/RELEASE_LINT_SUMMARY.json");
const patterns = [
  "app/**",
  "components/**",
  "lib/**",
  "config/**",
  "types/**",
  "i18n.ts",
  "navigation.ts",
  "proxy.ts",
  "routing.ts",
  "next.config.mjs",
];
const exclusions = ["components/backup/legacy/"];

const raw = execFileSync("git", ["ls-files", "-z", ...patterns], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const trackedScopeFiles = raw.split("\0").filter(Boolean);
const explicitlyExcludedFiles = trackedScopeFiles.filter((file) => exclusions.some((prefix) => file.startsWith(prefix)));
const eligibleFiles = trackedScopeFiles.filter((file) => !exclusions.some((prefix) => file.startsWith(prefix)));
if (!eligibleFiles.length) throw new Error("release_lint_scope_empty");

const eslint = new ESLint({ errorOnUnmatchedPattern: false });
const ignoredFlags = await Promise.all(eligibleFiles.map((file) => eslint.isPathIgnored(file)));
const ignoredFiles = eligibleFiles.filter((_, index) => ignoredFlags[index]);
const checkedCandidates = eligibleFiles.filter((_, index) => !ignoredFlags[index]);
if (!checkedCandidates.length) throw new Error("release_lint_checked_scope_empty");

const results = await eslint.lintFiles(checkedCandidates);
const formatter = await eslint.loadFormatter("json");
const rendered = formatter.format(results);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, rendered.endsWith("\n") ? rendered : rendered + "\n");

const failedFiles = results
  .filter((result) => (result.errorCount || 0) > 0 || (result.fatalErrorCount || 0) > 0)
  .map((result) => path.relative(process.cwd(), result.filePath).replaceAll(path.sep, "/"));

const summary = results.reduce((acc, result) => {
  acc.errors += result.errorCount || 0;
  acc.warnings += result.warningCount || 0;
  acc.fatalErrors += result.fatalErrorCount || 0;
  return acc;
}, { errors: 0, warnings: 0, fatalErrors: 0 });
summary.scope = patterns;
summary.exclusions = exclusions;
summary.runtimeReleaseGate = true;
summary.runner = "ESLINT_NODE_API_SINGLE_PASS_DENOMINATOR_BOUND";
summary.trackedScopeFileCount = trackedScopeFiles.length;
summary.explicitlyExcludedFileCount = explicitlyExcludedFiles.length;
summary.eligibleFileCount = eligibleFiles.length;
summary.checkedFileCount = results.length;
summary.ignoredFileCount = ignoredFiles.length;
summary.failedFileCount = failedFiles.length;
summary.explicitlyExcludedFiles = explicitlyExcludedFiles;
summary.ignoredFiles = ignoredFiles;
summary.failedFiles = failedFiles;
summary.denominatorConserved = summary.eligibleFileCount === summary.checkedFileCount + summary.ignoredFileCount;
summary.checkedCandidateCountMatched = checkedCandidates.length === results.length;
summary.sourceFileCount = eligibleFiles.length;
summary.files = results.length;

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (!summary.denominatorConserved) throw new Error("release_lint_denominator_not_conserved");
if (!summary.checkedCandidateCountMatched) throw new Error("release_lint_result_count_mismatch");
if (summary.errors !== 0 || summary.fatalErrors !== 0) process.exit(1);
