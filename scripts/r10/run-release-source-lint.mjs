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
const files = raw.split("\0").filter(Boolean).filter((file) => !exclusions.some((prefix) => file.startsWith(prefix)));
if (!files.length) throw new Error("release_lint_scope_empty");

const eslint = new ESLint({ errorOnUnmatchedPattern: false });
const results = await eslint.lintFiles(files);
const formatter = await eslint.loadFormatter("json");
const rendered = formatter.format(results);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, rendered.endsWith("\n") ? rendered : rendered + "\n");

const summary = results.reduce((acc, result) => {
  acc.files += 1;
  acc.errors += result.errorCount || 0;
  acc.warnings += result.warningCount || 0;
  acc.fatalErrors += result.fatalErrorCount || 0;
  return acc;
}, { files: 0, errors: 0, warnings: 0, fatalErrors: 0 });
summary.scope = patterns;
summary.exclusions = exclusions;
summary.runtimeReleaseGate = true;
summary.runner = "ESLINT_NODE_API_SINGLE_PASS";
summary.sourceFileCount = files.length;
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (summary.errors !== 0 || summary.fatalErrors !== 0) process.exit(1);
