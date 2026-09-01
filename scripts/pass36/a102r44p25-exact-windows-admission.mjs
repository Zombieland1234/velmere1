#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateWindowsAdmission } from "./a102r44p25-windows-admission-lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p25-exact-windows-admission-policy.json"), "utf8"));
const descriptor = {
  platform: process.platform,
  arch: process.arch,
  node: process.versions.node,
  npm: null, typescript: null, eslint: null, next: null, playwright: null, chromium: null, chromiumRevision: null,
  cleanUnpack: false, a58FirstChild: false, outputOutsideSource: false, sourceImmutable: false,
  liveKeysPresent: false, productionPaymentsExecuted: false,
  browserRows: 0, screenshots: 0, popupTabs: 0, browserEvidenceChecks: 0,
  sourceManifestSha256: process.env.VELMERE_WINDOWS_SOURCE_MANIFEST_SHA256 ?? "",
  expectedSourceManifestSha256: process.argv[2] ?? "",
};
const report = evaluateWindowsAdmission(descriptor, policy);
console.log(JSON.stringify(report, null, 2));
process.exit(2);
