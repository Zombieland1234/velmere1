#!/usr/bin/env node
import assert from "node:assert/strict";
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
  A42_CRITICAL_RUNTIME_TARGETS,
  PASS35_A42_REVISION_ID,
  computeSourceFingerprint,
  countGlobalJsonParseSignatures,
  isProcessAlive,
  readJsonFile,
  removeFileIfPresent,
  sessionMarkerPath,
  sourceFingerprintPath,
  sanitizeNextChildEnvironment,
  selectDevBundler,
  shouldRecoverFromGlobalJsonParse,
  writeJsonFileAtomic,
} from "./lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const checks = [];
const failures = [];
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}

let contract = null;
try {
  contract = loadA42Contract(root);
  check("identity:contract_loads", true);
} catch (error) {
  check("identity:contract_loads", false, error instanceof Error ? error.message : String(error));
}

let repair = null;
if (process.argv.includes("--repair") && contract) {
  const sessionPath = sessionMarkerPath(root);
  const activeSession = readJsonFile(sessionPath);
  const activePid = Number(activeSession?.parentPid);
  if (activeSession && isProcessAlive(activePid)) {
    check("repair:no_active_dev_session", false, { activePid, sessionPath });
  } else {
    removeFileIfPresent(sessionPath);
    repair = prepareDevRuntimeCache({ root, contract, forceClear: true });
    const repairedFingerprint = computeSourceFingerprint(root);
    writeJsonFileAtomic(sourceFingerprintPath(root), {
      ...repairedFingerprint,
      writtenAt: new Date().toISOString(),
      writtenBy: "a42-runtime-diagnostics-repair",
    });
    check("repair:no_active_dev_session", true);
    check("repair:generated_next_removed", !fs.existsSync(path.join(root, ".next")), repair);
    check("repair:cache_marker_rewritten", fs.existsSync(path.join(root, ".velmere/dev-runtime/cache-marker.json")), repair);
    check("repair:source_fingerprint_rewritten", fs.existsSync(sourceFingerprintPath(root)), repairedFingerprint.digest);
  }
}

const packageJson = JSON.parse(read("package.json"));
const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();
check("identity:policy_revision", PASS35_A42_REVISION_ID === A42_DEV_RUNTIME_REVISION, { policy: PASS35_A42_REVISION_ID, contract: A42_DEV_RUNTIME_REVISION });
check("identity:active_pass", activePass === A42_DEV_RUNTIME_REVISION, activePass);
check("identity:package_pass", packageJson.velmerePass === A42_DEV_RUNTIME_REVISION, packageJson.velmerePass);
if (contract) check("identity:contract_revision", contract.revisionId === A42_DEV_RUNTIME_REVISION, contract.revisionId);

const scripts = packageJson.scripts ?? {};
const expectedScripts = {
  dev: "node scripts/velmere-dev-runner.mjs",
  "dev:webpack": "node scripts/velmere-dev-runner.mjs --webpack",
  "dev:turbopack": "node scripts/velmere-dev-runner.mjs --turbopack",
  "dev:clean": "node scripts/velmere-dev-runner.mjs --clean",
  "dev:clean:a42": "node scripts/velmere-dev-runner.mjs --clean",
  "diagnose:runtime:a42": "node scripts/a42-runtime-diagnostics.mjs --write",
  "smoke:runtime:a42": "node scripts/a42-runtime-smoke.mjs",
  "diagnose:dev:a42": "node scripts/a42-runtime-diagnostics.mjs --write",
  "repair:dev:a42": "node scripts/a42-runtime-diagnostics.mjs --repair --write",
  "clean:dev-cache:a42": "node scripts/a42-clean-dev-cache.mjs",
  "test:pass35:a42": "node scripts/pass35/test-a42-dev-runtime-cache-recovery.mjs && node scripts/pass35/test-a42-windows-dev-runtime-recovery.mjs && node scripts/pass35/test-a42-runner-recovery-integration.mjs",
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:script:${name}`, scripts[name] === value, scripts[name]);
check("package:aggregate_test_includes_a42", String(scripts.test ?? "").includes("npm run test:pass35:a42"));
check("package:runtime_node_exact", packageJson.engines?.node === "24.18.0", packageJson.engines);
check("package:runtime_npm_exact", packageJson.engines?.npm === "11.16.0", packageJson.engines);

check("policy:windows_defaults_webpack", selectDevBundler({ platform: "win32", env: {} }) === "webpack");
check("policy:linux_defaults_turbopack", selectDevBundler({ platform: "linux", env: {} }) === "turbopack");
check("policy:explicit_turbopack", selectDevBundler({ platform: "win32", env: {}, explicit: "turbopack" }) === "turbopack");
check("policy:explicit_webpack", selectDevBundler({ platform: "linux", env: {}, explicit: "webpack" }) === "webpack");

const sanitized = sanitizeNextChildEnvironment({
  PATH: process.env.PATH ?? "",
  __NEXT_PRIVATE_STANDALONE_CONFIG: '{"valid":true}{"extra":true}',
  NEXT_PRIVATE_STANDALONE_CONFIG: "bad",
  NEXT_PRIVATE_TEST_MODE: "bad",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
}, "webpack");
check("policy:private_double_underscore_removed", sanitized.env.__NEXT_PRIVATE_STANDALONE_CONFIG === undefined, sanitized.removed);
check("policy:private_single_prefix_removed", sanitized.env.NEXT_PRIVATE_STANDALONE_CONFIG === undefined, sanitized.removed);
check("policy:private_family_removed", sanitized.env.NEXT_PRIVATE_TEST_MODE === undefined, sanitized.removed);
check("policy:public_env_preserved", sanitized.env.NEXT_PUBLIC_SITE_URL === "http://localhost:3000");
check("policy:webpack_disables_turbo_cache", sanitized.env.VELMERE_TURBOPACK_DEV_CACHE === "0");

const signature = "Unexpected non-whitespace character after JSON";
const signatureText = `x ${signature} y `.repeat(3);
const signatureCount = countGlobalJsonParseSignatures(signatureText);
check("policy:signature_counter", signatureCount === 3, signatureCount);
check("policy:recovery_threshold", shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: [1000, 1001, 1002], now: 1003 }));
check("policy:recovery_window_expires", !shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: [1, 2, 3], now: 20_000 }));
check("policy:no_webpack_recovery_loop", !shouldRecoverFromGlobalJsonParse({ bundler: "webpack", occurrenceTimes: [1000, 1001, 1002], now: 1003 }));

const nextConfig = read("next.config.mjs");
check("next_config:dev_cache_flag", nextConfig.includes("turbopackFileSystemCacheForDev"));
check("next_config:dev_cache_env_gate", nextConfig.includes("VELMERE_TURBOPACK_DEV_CACHE"));
check("next_config:build_cache_separate", nextConfig.includes("turbopackFileSystemCacheForBuild"));
check("next_config:dev_cache_not_unconditional", !/turbopackFileSystemCacheForDev:\s*true/u.test(nextConfig));

const i18n = read("i18n.ts");
for (const locale of ["pl", "en", "de"]) check(`i18n:static_${locale}`, i18n.includes(`from "./messages/${locale}.json"`));
check("i18n:no_template_json_import", !i18n.includes("import(`./messages/${locale}.json`)"));
check("i18n:catalog_binding", i18n.includes("MESSAGE_CATALOG[locale]"));

const rootLayout = read("app/layout.tsx");
check("metadata:absolute_manifest", rootLayout.includes('manifest: "/manifest.webmanifest"'));
check("metadata:absolute_icon", rootLayout.includes('url: "/icon.svg"'));
const proxy = read("proxy.ts");
check("proxy:metadata_alias_resolver", proxy.includes("resolveMetadataAlias"));
check("proxy:localized_manifest_alias", proxy.includes("manifest.webmanifest"));
check("proxy:localized_icon_alias", proxy.includes("icon.svg"));
check("proxy:favicon_alias", proxy.includes("favicon.ico"));
check("proxy:root_metadata_bypass", proxy.includes("ROOT_METADATA_PATHS.has(normalizedPath)"));

const bootstrap = read("scripts/velmere-dev-bootstrap.mjs");
check("bootstrap:loads_contract", bootstrap.includes("loadA42Contract"));
check("bootstrap:verifies_critical_hashes", bootstrap.includes("verifyCriticalFiles"));
check("bootstrap:prepares_cache", bootstrap.includes("prepareDevRuntimeCache"));
check("bootstrap:rejects_mixed_tree", bootstrap.includes("mixed or outdated project tree detected"));
check("bootstrap:validates_env_json", bootstrap.includes("invalidJsonEnvironment"));
check("bootstrap:rejects_private_next_env", bootstrap.includes("private Next.js variables reached the bootstrap"));
check("bootstrap:stale_session_recovery", bootstrap.includes("previousSession") && bootstrap.includes("forceClear"));
check("bootstrap:a41_preserved", bootstrap.includes("route recovery contract A41 is present"));
check("bootstrap:a42_banner", bootstrap.includes("A42 source/cache recovery is active"));
check("bootstrap:old_a40_banner_removed", !bootstrap.includes("source preflight passed; no product files were modified"));

const runner = read("scripts/velmere-dev-runner.mjs");
check("runner:sanitizes_private_next", runner.includes("sanitizeNextChildEnvironment"));
check("runner:webpack_flag", runner.includes('bundler === "webpack" ? ["--webpack"]'));
check("runner:turbopack_flag", runner.includes('["--turbopack"]'));
check("runner:global_json_recovery", runner.includes("repeated global JSON.parse crash detected"));
check("runner:single_webpack_fallback", runner.includes('startNext("webpack")'));
check("runner:windows_taskkill_tree", runner.includes('spawnSync("taskkill"') && runner.includes('"/T"'));
check("runner:line_buffer", runner.includes("lineBuffer") && runner.includes("inspectOutputLine"));
check("runner:launch_report", runner.includes("last-launch.json") && runner.includes("writeLaunchReport"));
check("runner:no_source_delete", !runner.includes('rmSync(path.join(root, "app"') && !runner.includes('rmSync(path.join(root, "lib"'));

const smoke = read("scripts/a42-runtime-smoke.mjs");
check("smoke:global_json_signature", smoke.includes("GLOBAL_JSON_PARSE_SIGNATURE"));
check("smoke:next_error_body_guard", smoke.includes("contentLooksLikeNextError"));
check("smoke:manifest_json_parse", smoke.includes("JSON.parse(text)"));
check("smoke:bounded_response_preview", smoke.includes("256 * 1024"));
check("smoke:timeout", smoke.includes("AbortController"));
check("smoke:receipt", smoke.includes("runtime-smoke.v1"));
check("smoke:target_depth", A42_CRITICAL_RUNTIME_TARGETS.length >= 12, A42_CRITICAL_RUNTIME_TARGETS.length);
for (const requiredId of ["home", "browser", "shield", "shield_pro", "shield_map", "intelligence", "atelier", "security_audits", "manifest", "icon", "auth_session", "market_feed"]) {
  check(`smoke:target:${requiredId}`, A42_CRITICAL_RUNTIME_TARGETS.some((target) => target.id === requiredId));
}

const requiredFiles = [
  "VELMERE_ACTIVE_PASS.txt",
  "VELMERE_START_A42.cmd",
  "config/pass35/a42-dev-runtime-cache-recovery.json",
  "lib/build/dev-runtime-cache-recovery.mjs",
  "scripts/velmere-dev-bootstrap.mjs",
  "scripts/velmere-dev-runner.mjs",
  "scripts/a42-clean-dev-cache.mjs",
  "scripts/a42-dev-runtime-diagnostics.mjs",
  "scripts/a42-runtime-diagnostics.mjs",
  "scripts/a42-runtime-smoke.mjs",
  "scripts/lib/a42-dev-runtime-policy.mjs",
  "scripts/pass35/test-a42-dev-runtime-cache-recovery.mjs",
  "scripts/pass35/test-a42-windows-dev-runtime-recovery.mjs",
  "scripts/pass35/test-a42-runner-recovery-integration.mjs",
];
for (const relativePath of requiredFiles) check(`file:${relativePath}`, fs.existsSync(path.join(root, relativePath)));

const fingerprint = computeSourceFingerprint(root);
check("fingerprint:revision", fingerprint.revisionId === A42_DEV_RUNTIME_REVISION, fingerprint.revisionId);
check("fingerprint:sha256", /^sha256:[0-9a-f]{64}$/u.test(fingerprint.digest), fingerprint.digest);
check("fingerprint:file_depth", fingerprint.files.length >= 12, fingerprint.files.length);

let sourceInvalid = [];
let critical = { ok: false, checks: [], failures: [] };
if (contract) {
  sourceInvalid = findInvalidJsonFiles(root, contract.sourceJsonTargets ?? [], {
    generated: false,
    maximumBytes: contract.cachePolicy?.maximumSourceJsonBytes ?? 32 * 1024 * 1024,
  });
  check("contract:source_json_valid", sourceInvalid.length === 0, sourceInvalid);
  critical = verifyCriticalFiles(root, contract.criticalFiles);
  check("contract:critical_hashes_match", critical.ok, critical.failures);
  check("contract:critical_hash_depth", critical.checks.length >= 25, critical.checks.length);
  check("contract:windows_default", contract.runtime?.devBundlerDefaultByPlatform?.win32 === "webpack", contract.runtime);
  check("contract:other_default", contract.runtime?.devBundlerDefaultByPlatform?.other === "turbopack", contract.runtime);
}

const productCells = read("config/pass35/product-cell-catalog.json");
check("truth:stop_sell_preserved", !productCells.includes('"sellEnabled": true'));
const a41EvidencePath = path.join(root, "artifacts/pass35/a41/PASS35_A41_BROWSER_SHIELD_RUNTIME_RECOVERY.json");
check("regression:a41_evidence_present", fs.existsSync(a41EvidencePath));
if (fs.existsSync(a41EvidencePath)) {
  const a41 = JSON.parse(fs.readFileSync(a41EvidencePath, "utf8"));
  check("regression:a41_previous_gate_passed", a41.summary?.failed === 0, a41.summary);
}

assert.equal(checks.length >= 90, true, `A42 diagnostics unexpectedly shallow: ${checks.length}`);
const result = {
  schemaVersion: "velmere.pass35.a42.runtime-diagnostics.v2",
  revisionId: A42_DEV_RUNTIME_REVISION,
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static runtime-recovery diagnostics. They prove source identity, cache policy and route-smoke contracts, not a successful browser render or provider LIVE result.",
  runtime: {
    node: process.versions.node,
    expectedNode: packageJson.engines?.node,
    expectedNpm: packageJson.engines?.npm,
  },
  fingerprint,
  sourceInvalid,
  critical,
  repair,
  summary: {
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
  },
  failures,
  checks,
};

if (process.argv.includes("--write")) {
  const output = path.join(root, "artifacts/pass35/a42/PASS35_A42_RUNTIME_DIAGNOSTICS.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result.summary, null, 2));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
