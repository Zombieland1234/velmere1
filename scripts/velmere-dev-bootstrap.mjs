#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  A42_DEV_RUNTIME_REVISION,
  findInvalidJsonFiles,
  loadA42Contract,
  prepareDevRuntimeCache,
  verifyCriticalFiles,
} from "../lib/build/dev-runtime-cache-recovery.mjs";
import {
  PASS35_A42_REVISION_ID,
  computeSourceFingerprint,
  isProcessAlive,
  readJsonFile,
  selectDevBundler,
  sourceFingerprintPath,
  writeJsonFileAtomic,
  sessionMarkerPath,
} from "./lib/a42-dev-runtime-policy.mjs";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";
import { scanCssModulePurity } from "./lib/css-module-purity.mjs";

const root = process.cwd();
const hasA43Patch = fs.existsSync(path.join(root, "VELMERE_A43_PATCH.txt"));
const hasA44Patch = fs.existsSync(path.join(root, "VELMERE_A44_PATCH.txt"));
const PRIVATE_NEXT_ENV_PATTERN = /^(?:__NEXT_PRIVATE_|NEXT_PRIVATE_)/u;
// A35 compatibility invariants remain explicit even though A41 added direct
// route shells. The generic dispatcher and canonical history handler are still
// required fallbacks for operations that do not have dedicated route shells.
const HISTORICAL_CANONICAL_RUNTIME_PATHS = Object.freeze([
  "app/api/market-integrity/[operation]/route.ts",
  "lib/server/market-integrity-route-modules/history.ts",
]);

function fail(message, details = []) {
  process.stderr.write(`[velmere-dev] ${message}\n`);
  for (const detail of details) process.stderr.write(`- ${detail}\n`);
  process.exit(1);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function invalidJsonEnvironment(env) {
  const invalid = [];
  for (const [name, raw] of Object.entries(env)) {
    if (!name.endsWith("_JSON") || typeof raw !== "string" || !raw.trim()) continue;
    try {
      JSON.parse(raw);
    } catch (error) {
      invalid.push({ name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return invalid;
}

if (PASS35_A42_REVISION_ID !== A42_DEV_RUNTIME_REVISION) {
  fail("mixed or outdated project tree detected: A42 revision constants disagree", [
    `runtime policy=${PASS35_A42_REVISION_ID}`,
    `cache contract=${A42_DEV_RUNTIME_REVISION}`,
  ]);
}

let contract;
try {
  contract = loadA42Contract(root);
} catch (error) {
  fail("mixed or outdated project tree detected: A42 contract cannot be loaded", [
    error instanceof Error ? error.message : String(error),
  ]);
}

const requiredSourcePaths = Array.isArray(contract.requiredSourcePaths) ? contract.requiredSourcePaths : [];
for (const historicalPath of HISTORICAL_CANONICAL_RUNTIME_PATHS) {
  if (!requiredSourcePaths.includes(historicalPath)) {
    fail("A35/A41 route lineage invariant is missing from the A42 contract", [historicalPath]);
  }
}
const missingSources = requiredSourcePaths.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));
if (missingSources.length > 0) {
  fail("required A42 source is missing; extract the final ZIP into a new empty folder", missingSources);
}

const activePass = readText(contract.activePassFile ?? "VELMERE_ACTIVE_PASS.txt").trim();
const packageJson = JSON.parse(readText("package.json"));
const currentAuthority = JSON.parse(readText("config/pass36/current-release-authority.json"));
const currentAuthorityRevision = String(currentAuthority.authorityRevisionId ?? "").trim();
const identityFailures = [];
// A42 is a historical runtime-recovery contract embedded in the current source.
// It must validate its own policy revision while admitting the exact current
// release authority instead of incorrectly requiring the whole project to still
// identify as A42.
if (contract.revisionId !== A42_DEV_RUNTIME_REVISION) identityFailures.push(`A42 contract pass=${contract.revisionId ?? "missing"}`);
if (!currentAuthorityRevision) identityFailures.push("current authority revision=missing");
if (activePass !== currentAuthorityRevision) identityFailures.push(`active pass=${activePass}`);
if (packageJson.velmerePass !== currentAuthorityRevision) identityFailures.push(`package pass=${packageJson.velmerePass ?? "missing"}`);
if (identityFailures.length > 0) {
  fail("mixed or outdated project tree detected: current authority mismatch", identityFailures);
}

const critical = verifyCriticalFiles(root, contract.criticalFiles);
if (!critical.ok) {
  fail(
    "mixed or outdated project tree detected: critical A42 files do not match the final package",
    critical.failures.slice(0, 20).map((row) => `${row.relativePath}: ${row.reason}`),
  );
}

const malformedSources = findInvalidJsonFiles(root, contract.sourceJsonTargets ?? [], {
  generated: false,
  maximumBytes: contract.cachePolicy?.maximumSourceJsonBytes ?? 32 * 1024 * 1024,
});
if (malformedSources.length > 0) {
  fail(
    "malformed source JSON detected; re-extract the final package before starting Next",
    malformedSources.slice(0, 20).map((row) => `${row.label}: ${row.error}`),
  );
}

const cssModulePurity = scanCssModulePurity(root);
if (!cssModulePurity.ok) {
  fail(
    "CSS Modules pure-selector preflight failed; Webpack would poison the shared route graph",
    cssModulePurity.failures.slice(0, 20).map((row) => `${row.file}:${row.line} ${row.selector}`),
  );
}

const malformedEnvironment = invalidJsonEnvironment(process.env);
if (malformedEnvironment.length > 0) {
  fail(
    "malformed JSON environment variables detected; values are intentionally not printed",
    malformedEnvironment.map((row) => `${row.name}: ${row.error}`),
  );
}

const inheritedPrivateNextVariables = Object.keys(process.env).filter((name) => PRIVATE_NEXT_ENV_PATTERN.test(name)).sort();
if (inheritedPrivateNextVariables.length > 0) {
  fail(
    "private Next.js variables reached the bootstrap; start through `npm run dev` so A42 can sanitize them",
    inheritedPrivateNextVariables,
  );
}

const previousSession = readJsonFile(sessionMarkerPath(root));
const previousSessionAlive = previousSession && isProcessAlive(Number(previousSession.parentPid));
if (previousSessionAlive) {
  fail("another A42 development launcher is already active for this folder", [
    `parentPid=${previousSession.parentPid}`,
    `bundler=${previousSession.bundler ?? "unknown"}`,
  ]);
}
const forceClear = process.env.VELMERE_DEV_CLEAR_NEXT_CACHE === "1" || Boolean(previousSession && !previousSessionAlive);
const cache = prepareDevRuntimeCache({ root, contract, forceClear });
if (cache.cacheCleared) {
  process.stdout.write(`[velmere-dev] cleared generated .next state: ${cache.reasons.join(", ") || "A42 recovery"}\n`);
}
const sourceFingerprint = computeSourceFingerprint(root);
if (sourceFingerprint.missing.length > 0) {
  fail("A42 source fingerprint is incomplete", sourceFingerprint.missing);
}
writeJsonFileAtomic(sourceFingerprintPath(root), {
  ...sourceFingerprint,
  writtenAt: new Date().toISOString(),
  writtenBy: "velmere-dev-bootstrap",
});

const bundler = selectDevBundler({ explicit: process.env.VELMERE_DEV_BUNDLER });
const npmVersion = currentNpmVersion() ?? "unknown";
const exactRuntime = process.versions.node === contract.runtime.node && npmVersion === contract.runtime.npm;

process.stdout.write("[velmere-dev] route recovery contract A41 is present; A42 source/cache recovery is active; A43 Webpack CSS recovery is active; A44 visual-master engine binding is active\n");
process.stdout.write(`[velmere-dev] active source authority: ${currentAuthorityRevision}\n`);
process.stdout.write(`[velmere-dev] runtime recovery contract: ${A42_DEV_RUNTIME_REVISION}\n`);
process.stdout.write(`[velmere-dev] critical source identity: ${critical.checks.length}/${critical.checks.length} hashes match · fingerprint ${sourceFingerprint.digest.slice(0, 23)}…\n`);
process.stdout.write(`[velmere-dev] runtime: Node ${process.versions.node} · npm ${npmVersion}${exactRuntime ? " · exact" : ` · expected Node ${contract.runtime.node}/npm ${contract.runtime.npm}`}\n`);
process.stdout.write(`[velmere-dev] selected bundler: ${bundler}${process.platform === "win32" && bundler === "webpack" ? " · Windows reliability default" : ""}\n`);
process.stdout.write("[velmere-dev] open after Next is ready:\n");
process.stdout.write("- home:       http://localhost:3000/pl\n");
process.stdout.write("- Browser:    http://localhost:3000/pl/search\n");
process.stdout.write("- Shield:     http://localhost:3000/pl/market-integrity\n");
process.stdout.write("- Shield Pro: http://localhost:3000/pl/shield-pro\n");
process.stdout.write("- Shield Map: http://localhost:3000/pl/shield-map\n");
process.stdout.write(`[velmere-dev] after Ready, run in a second terminal: npm run ${hasA44Patch ? "smoke:runtime:a44" : hasA43Patch ? "smoke:runtime:a43" : "smoke:runtime:a42"}\n`);
