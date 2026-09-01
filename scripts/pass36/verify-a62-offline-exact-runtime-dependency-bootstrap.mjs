#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { evaluateA62Inputs } from "./a62-offline-runtime-dependency-lib.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`a62_argument_missing:${name}`);
  return value;
}
const root = path.resolve(process.cwd());
const policyPath = path.resolve(process.env.VELMERE_A62_POLICY ?? path.join(root, "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json"));
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const result = evaluateA62Inputs({
  root,
  policy,
  nodeArchivePath: arg("--node-archive") ?? process.env.VELMERE_A62_NODE_ARCHIVE ?? null,
  dependencyBundlePath: arg("--dependency-bundle") ?? process.env.VELMERE_A62_DEPENDENCY_BUNDLE ?? null,
  browserBundlePath: arg("--browser-bundle") ?? process.env.VELMERE_A62_BROWSER_BUNDLE ?? null,
  expectedBrowserBundleSha256: arg("--browser-bundle-sha256") ?? process.env.VELMERE_A62_EXPECTED_BROWSER_BUNDLE_SHA256 ?? null,
  extractRuntime: process.argv.includes("--extract-runtime")
});
const stable = {
  schemaVersion: result.schemaVersion,
  revisionId: result.revisionId,
  decision: result.decision,
  summary: result.summary,
  runtime: result.runtime,
  dependencies: result.dependencies,
  browser: result.browser,
  errors: result.errors,
  saleEnabled: false,
  liveProven: false,
  truthBoundary: result.truthBoundary
};
const output = path.join(root, "config/pass36/a62-offline-runtime-dependency-intake-receipt.json");
fs.writeFileSync(output, `${JSON.stringify(stable, null, 2)}\n`);
console.log(JSON.stringify(stable, null, 2));
if (result.decision === policy.decisions.rejected) process.exitCode = 1;
