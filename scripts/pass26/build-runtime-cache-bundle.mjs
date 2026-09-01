#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readJson, sha256File } from "../pass24/runtime-lib.mjs";
import {
  BUNDLE_MANIFEST_NAME,
  buildBundleManifest,
  PASS24_REQUIREMENTS_PATH,
  PASS26_POLICY_PATH,
  verifyRuntimeCacheBundle,
  writeJson,
} from "./runtime-bundle-lib.mjs";

function requiredValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Usage requires ${name} VALUE`);
  return path.resolve(process.argv[index + 1]);
}

const nodeArchive = requiredValue("--node-archive");
const npmCache = requiredValue("--npm-cache");
const output = requiredValue("--output");
const policy = readJson(PASS26_POLICY_PATH);
if (!fs.existsSync(nodeArchive) || !fs.statSync(nodeArchive).isFile()) throw new Error(`PASS26 Node archive missing: ${nodeArchive}`);
if (path.basename(nodeArchive) !== policy.nodeArchive.fileName) throw new Error(`PASS26 unapproved Node archive filename: ${path.basename(nodeArchive)}`);
if (sha256File(nodeArchive) !== policy.nodeArchive.sha256) throw new Error("PASS26 Node archive SHA mismatch");
const cacheContent = path.join(npmCache, "_cacache");
if (!fs.existsSync(cacheContent) || !fs.statSync(cacheContent).isDirectory()) throw new Error(`PASS26 npm _cacache missing: ${cacheContent}`);

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "runtime"), { recursive: true });
fs.mkdirSync(path.join(output, "npm-cache"), { recursive: true });
fs.copyFileSync(nodeArchive, path.join(output, "runtime", policy.nodeArchive.fileName));
fs.cpSync(cacheContent, path.join(output, "npm-cache", "_cacache"), { recursive: true, dereference: false, preserveTimestamps: false });
fs.copyFileSync(path.join(process.cwd(), "package-lock.json"), path.join(output, "package-lock.json"));
fs.copyFileSync(PASS24_REQUIREMENTS_PATH, path.join(output, "lockfile-target-manifest.json"));
fs.copyFileSync(path.join(process.cwd(), "config/pass24/runtime-policy.json"), path.join(output, "runtime-policy.json"));

// Verify cache before writing the final manifest. The verifier's manifest step is
// intentionally deferred until the manifest exists.
const requirements = readJson(PASS24_REQUIREMENTS_PATH);
const { verifyCacheCoverage } = await import("../pass24/runtime-lib.mjs");
const cacheCoverage = verifyCacheCoverage(path.join(output, "npm-cache"), requirements);
if (!cacheCoverage.ok) throw new Error(`PASS26 cannot build incomplete cache bundle: ${cacheCoverage.passed}/${cacheCoverage.required}`);
const manifest = buildBundleManifest(output, {
  sourceLockfileSha256: sha256File(path.join(process.cwd(), "package-lock.json")),
  target: readJson(path.join(process.cwd(), "config/pass24/runtime-policy.json")).target,
  nodeArchive: { fileName: policy.nodeArchive.fileName, sha256: policy.nodeArchive.sha256, officialUrl: policy.nodeArchive.officialUrl },
  cacheCoverage: { passed: cacheCoverage.passed, required: cacheCoverage.required, coveragePercent: cacheCoverage.coveragePercent },
});
writeJson(path.join(output, BUNDLE_MANIFEST_NAME), manifest);
const verified = verifyRuntimeCacheBundle(output);
console.log(JSON.stringify({ status: "PASS_RUNTIME_CACHE_BUNDLE", ...verified }, null, 2));
