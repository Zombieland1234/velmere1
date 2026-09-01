#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  A42_CACHE_MARKER_RELATIVE_PATH,
  A42_DEV_RUNTIME_REVISION,
  computeContractFingerprint,
  findInvalidJsonFiles,
  inspectJsonText,
  loadA42Contract,
  prepareDevRuntimeCache,
  readCacheMarker,
  verifyCriticalFiles,
  writeCacheMarker,
} from "../../lib/build/dev-runtime-cache-recovery.mjs";
import {
  A42_CRITICAL_RUNTIME_TARGETS,
  GLOBAL_JSON_PARSE_RECOVERY_THRESHOLD,
  GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS,
  GLOBAL_JSON_PARSE_SIGNATURE,
  PASS35_A42_REVISION_ID,
  clearGeneratedNextState,
  computeSourceFingerprint,
  countGlobalJsonParseSignatures,
  generatedNextDirectory,
  sanitizeNextChildEnvironment,
  selectDevBundler,
  shouldRecoverFromGlobalJsonParse,
} from "../lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const checks = [];
const failures = [];
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function makeTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a42-"));
}
function makeNextJson(targetRoot, relativePath, text) {
  const filePath = path.join(targetRoot, ".next", relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
  return filePath;
}

let contract = null;
try {
  contract = loadA42Contract(root);
  check("contract_loads", true);
} catch (error) {
  check("contract_loads", false, error instanceof Error ? error.message : String(error));
}

if (contract) {
  check("revision_constants_agree", PASS35_A42_REVISION_ID === A42_DEV_RUNTIME_REVISION, { PASS35_A42_REVISION_ID, A42_DEV_RUNTIME_REVISION });
  check("contract_revision_exact", contract.revisionId === A42_DEV_RUNTIME_REVISION, contract.revisionId);
  check("contract_parent_exact", contract.parentRevisionId === "VELMERE_PASS35_A41_BROWSER_SHIELD_ROUTE_RUNTIME_RECOVERY", contract.parentRevisionId);
  check("runtime_node_exact", contract.runtime?.node === "24.18.0", contract.runtime);
  check("runtime_npm_exact", contract.runtime?.npm === "11.16.0", contract.runtime);
  check("runtime_next_exact", contract.runtime?.next === "16.2.7", contract.runtime);
  check("windows_default_webpack", contract.runtime?.devBundlerDefaultByPlatform?.win32 === "webpack", contract.runtime);
  check("non_windows_default_turbopack", contract.runtime?.devBundlerDefaultByPlatform?.other === "turbopack", contract.runtime);
  check("cache_missing_marker_policy", contract.cachePolicy?.clearOnMissingMarker === true);
  check("cache_revision_policy", contract.cachePolicy?.clearOnRevisionMismatch === true);
  check("cache_fingerprint_policy", contract.cachePolicy?.clearOnFingerprintMismatch === true);
  check("cache_malformed_json_policy", contract.cachePolicy?.clearOnMalformedGeneratedJson === true);
  check("cache_direct_next_boundary", contract.cachePolicy?.generatedDirectory === ".next", contract.cachePolicy);
  check("cache_marker_boundary", contract.cachePolicy?.markerPath === A42_CACHE_MARKER_RELATIVE_PATH, contract.cachePolicy?.markerPath);

  const required = Array.isArray(contract.requiredSourcePaths) ? contract.requiredSourcePaths : [];
  const missingRequired = required.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));
  check("required_source_depth", required.length >= 30, required.length);
  check("required_sources_present", missingRequired.length === 0, missingRequired);

  const critical = verifyCriticalFiles(root, contract.criticalFiles);
  check("critical_hashes_all_match", critical.ok, critical.failures);
  check("critical_hash_depth", critical.checks.length >= 28, critical.checks.length);

  const currentAuthority = JSON.parse(read("config/pass36/current-release-authority.json"));
  const currentAuthorityRevision = String(currentAuthority.authorityRevisionId ?? "").trim();
  const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();
  check("active_pass_exact", Boolean(currentAuthorityRevision) && activePass === currentAuthorityRevision, activePass);
  const packageJson = JSON.parse(read("package.json"));
  check("package_pass_identity", Boolean(currentAuthorityRevision) && packageJson.velmerePass === currentAuthorityRevision, packageJson.velmerePass);
  check("package_dev_runner", packageJson.scripts?.dev === "node scripts/velmere-dev-runner.mjs", packageJson.scripts?.dev);
  check("package_dev_webpack", packageJson.scripts?.["dev:webpack"] === "node scripts/velmere-dev-runner.mjs --webpack", packageJson.scripts?.["dev:webpack"]);
  check("package_dev_turbopack", packageJson.scripts?.["dev:turbopack"] === "node scripts/velmere-dev-runner.mjs --turbopack", packageJson.scripts?.["dev:turbopack"]);
  check("package_dev_clean", packageJson.scripts?.["dev:clean:a42"] === "node scripts/velmere-dev-runner.mjs --clean", packageJson.scripts?.["dev:clean:a42"]);
  check("package_clean_only", packageJson.scripts?.["clean:dev:a42"] === "node scripts/a42-clean-dev-cache.mjs", packageJson.scripts?.["clean:dev:a42"]);
  check("package_diagnostics", packageJson.scripts?.["diagnose:dev:a42"] === "node scripts/a42-runtime-diagnostics.mjs --write", packageJson.scripts?.["diagnose:dev:a42"]);
  check("package_repair", packageJson.scripts?.["repair:dev:a42"]?.includes("--repair --write"), packageJson.scripts?.["repair:dev:a42"]);
  check("package_smoke", packageJson.scripts?.["smoke:runtime:a42"] === "node scripts/a42-runtime-smoke.mjs", packageJson.scripts?.["smoke:runtime:a42"]);
  check("package_a42_gate_includes_windows_recovery", packageJson.scripts?.["test:pass35:a42"] === "node scripts/pass35/test-a42-dev-runtime-cache-recovery.mjs && node scripts/pass35/test-a42-windows-dev-runtime-recovery.mjs && node scripts/pass35/test-a42-runner-recovery-integration.mjs", packageJson.scripts?.["test:pass35:a42"]);

  const malformedSource = findInvalidJsonFiles(root, contract.sourceJsonTargets, {
    generated: false,
    maximumBytes: contract.cachePolicy.maximumSourceJsonBytes,
  });
  check("source_json_all_valid", malformedSource.length === 0, malformedSource);

  const concatenated = inspectJsonText('{"first":1}{"second":2}', "concatenated.json");
  check("concatenated_json_rejected", concatenated.ok === false, concatenated);
  check("concatenated_json_position_exposed", Number.isInteger(concatenated.position), concatenated.position);
  check("concatenated_json_context_exposed", typeof concatenated.context === "string" && concatenated.context.includes("second"), concatenated.context);
  check("valid_json_accepted", inspectJsonText('{"ok":true}\n', "valid.json").ok === true);

  check("bundler_windows_default", selectDevBundler({ platform: "win32", env: {} }) === "webpack");
  check("bundler_linux_default", selectDevBundler({ platform: "linux", env: {} }) === "turbopack");
  check("bundler_explicit_override", selectDevBundler({ platform: "win32", env: {}, explicit: "turbopack" }) === "turbopack");
  check("bundler_env_override", selectDevBundler({ platform: "linux", env: { VELMERE_DEV_BUNDLER: "webpack" } }) === "webpack");
  const sanitized = sanitizeNextChildEnvironment({
    PATH: "safe",
    NEXT_PRIVATE_STANDALONE_CONFIG: '{"bad":true}',
    __NEXT_PRIVATE_PREBUNDLED_REACT: "next",
    VELMERE_TURBOPACK_DEV_CACHE: "1",
  }, "webpack");
  check("private_next_env_removed", !Object.hasOwn(sanitized.env, "NEXT_PRIVATE_STANDALONE_CONFIG") && !Object.hasOwn(sanitized.env, "__NEXT_PRIVATE_PREBUNDLED_REACT"), sanitized);
  check("normal_env_preserved", sanitized.env.PATH === "safe", sanitized.env.PATH);
  check("webpack_disables_turbo_cache", sanitized.env.VELMERE_TURBOPACK_DEV_CACHE === "0", sanitized.env.VELMERE_TURBOPACK_DEV_CACHE);
  const turboSanitized = sanitizeNextChildEnvironment({ VELMERE_TURBOPACK_DEV_CACHE: "1" }, "turbopack");
  check("explicit_turbo_cache_opt_in_preserved", turboSanitized.env.VELMERE_TURBOPACK_DEV_CACHE === "1");
  check("signature_count", countGlobalJsonParseSignatures(`${GLOBAL_JSON_PARSE_SIGNATURE}\n${GLOBAL_JSON_PARSE_SIGNATURE}`) === 2);
  const now = Date.now();
  check("recovery_threshold_turbopack", shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: Array.from({ length: GLOBAL_JSON_PARSE_RECOVERY_THRESHOLD }, (_, index) => now - index), now }) === true);
  check("recovery_not_for_webpack", shouldRecoverFromGlobalJsonParse({ bundler: "webpack", occurrenceTimes: Array.from({ length: 10 }, () => now), now }) === false);
  check("recovery_window_bounded", shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: Array.from({ length: 10 }, () => now - GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS - 1), now }) === false);

  const sourceFingerprint = computeSourceFingerprint(root);
  check("source_fingerprint_complete", sourceFingerprint.missing.length === 0, sourceFingerprint.missing);
  check("source_fingerprint_sha256", /^sha256:[0-9a-f]{64}$/u.test(sourceFingerprint.digest), sourceFingerprint.digest);
  check("contract_fingerprint_sha256", /^[0-9a-f]{64}$/u.test(computeContractFingerprint(contract)), computeContractFingerprint(contract));

  {
    const temp = makeTemp();
    try {
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("missing_marker_clears_existing_next", result.cacheCleared === true, result);
      check("missing_marker_removes_manifest", !fs.existsSync(manifest));
      check("missing_marker_writes_marker", readCacheMarker(temp).ok === true, readCacheMarker(temp));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      writeCacheMarker(temp, contract, { seededBy: "test" });
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("matching_marker_preserves_valid_cache", result.cacheCleared === false, result);
      check("matching_marker_preserves_manifest", fs.existsSync(manifest));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      writeCacheMarker(temp, contract, { seededBy: "test" });
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"first":1}{"second":2}');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("malformed_generated_json_clears_cache", result.cacheCleared === true, result);
      check("malformed_generated_json_removed", !fs.existsSync(manifest));
      check("malformed_generated_reason_named", result.reasons.some((reason) => reason.startsWith("malformed_generated_json:")), result.reasons);
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      const markerPath = path.join(temp, A42_CACHE_MARKER_RELATIVE_PATH);
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, `${JSON.stringify({ schemaVersion: "velmere.pass35.a42.dev-cache-marker.v1", revisionId: A42_DEV_RUNTIME_REVISION, sourceFingerprint: "0".repeat(64) })}\n`, "utf8");
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("fingerprint_mismatch_clears_cache", result.cacheCleared === true, result);
      check("fingerprint_mismatch_reason", result.reasons.includes("cache_source_fingerprint_mismatch"), result.reasons);
      check("fingerprint_mismatch_removes_manifest", !fs.existsSync(manifest));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      const markerPath = path.join(temp, A42_CACHE_MARKER_RELATIVE_PATH);
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, `${JSON.stringify({ schemaVersion: "velmere.pass35.a42.dev-cache-marker.v1", revisionId: "OLD", sourceFingerprint: computeContractFingerprint(contract) })}\n`, "utf8");
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("revision_mismatch_clears_cache", result.cacheCleared === true, result);
      check("revision_mismatch_reason", result.reasons.includes("cache_revision_mismatch"), result.reasons);
      check("revision_mismatch_removes_manifest", !fs.existsSync(manifest));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      writeCacheMarker(temp, contract, { seededBy: "test" });
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract, forceClear: true });
      check("explicit_clean_clears_cache", result.cacheCleared === true, result);
      check("explicit_clean_reason", result.reasons.includes("explicit_clean_start"), result.reasons);
      check("explicit_clean_removes_manifest", !fs.existsSync(manifest));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      const markerPath = path.join(temp, A42_CACHE_MARKER_RELATIVE_PATH);
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, "not json", "utf8");
      const manifest = makeNextJson(temp, "server/app-paths-manifest.json", '{"/":"app/page.js"}\n');
      const result = prepareDevRuntimeCache({ root: temp, contract });
      check("malformed_marker_clears_cache", result.cacheCleared === true, result);
      check("malformed_marker_reason", result.reasons.includes("cache_marker_malformed"), result.reasons);
      check("malformed_marker_removes_manifest", !fs.existsSync(manifest));
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  {
    const temp = makeTemp();
    try {
      check("safe_next_path_is_direct_child", generatedNextDirectory(temp) === path.join(path.resolve(temp), ".next"), generatedNextDirectory(temp));
      makeNextJson(temp, "server/test.json", '{"ok":true}');
      const cleared = clearGeneratedNextState(temp, "test");
      check("safe_clear_removes_only_next", cleared.cleared === true && !fs.existsSync(path.join(temp, ".next")), cleared);
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }

  const bootstrap = read("scripts/velmere-dev-bootstrap.mjs");
  const runner = read("scripts/velmere-dev-runner.mjs");
  const i18n = read("i18n.ts");
  const nextConfig = read("next.config.mjs");
  const proxy = read("proxy.ts");
  const rootLayout = read("app/layout.tsx");
  const launcher = read("VELMERE_START_A42.cmd");
  const docs = read("docs/VELMERE_WINDOWS_A42_RUNTIME_RECOVERY.md");
  const fixture = read("fixtures/pass35/a42/windows-global-json-crash.log");

  check("bootstrap_a42_identity", bootstrap.includes("A42 source/cache recovery is active"));
  check("bootstrap_preserves_a41_gate", bootstrap.includes("route recovery contract A41 is present"));
  check("bootstrap_rejects_mixed_tree", bootstrap.includes("mixed or outdated project tree detected"));
  check("bootstrap_checks_critical_hashes", bootstrap.includes("verifyCriticalFiles"));
  check("bootstrap_prepares_cache", bootstrap.includes("prepareDevRuntimeCache"));
  check("bootstrap_rejects_competing_session", bootstrap.includes("another A42 development launcher is already active"));
  check("bootstrap_writes_source_fingerprint", bootstrap.includes("sourceFingerprintPath"));
  check("bootstrap_old_line_removed", !bootstrap.includes("source preflight passed; no product files were modified"));
  for (const route of ["/pl", "/pl/search", "/pl/market-integrity", "/pl/shield-pro", "/pl/shield-map"]) {
    check(`bootstrap_url:${route}`, bootstrap.includes(`http://localhost:3000${route}`));
  }

  check("runner_sanitizes_private_next_env", runner.includes("sanitizeNextChildEnvironment"));
  check("runner_monitors_global_json_signature", runner.includes("countGlobalJsonParseSignatures"));
  check("runner_single_webpack_recovery", runner.includes("retrying the same source with Webpack") && runner.includes("!recoveryUsed"));
  check("runner_clears_next_before_recovery", runner.includes("clearGeneratedNextState"));
  check("runner_windows_tree_termination", runner.includes("taskkill") && runner.includes('"/T"'));

  check("i18n_static_pl_import", i18n.includes('import plMessages from "./messages/pl.json"'));
  check("i18n_static_en_import", i18n.includes('import enMessages from "./messages/en.json"'));
  check("i18n_static_de_import", i18n.includes('import deMessages from "./messages/de.json"'));
  check("i18n_no_dynamic_json_import", !/import\(`\.\/messages\/\$\{/u.test(i18n));
  check("next_config_turbo_dev_cache_opt_in", nextConfig.includes('process.env.VELMERE_TURBOPACK_DEV_CACHE === "1"'));
  check("next_config_dev_cache_controlled", nextConfig.includes("turbopackFileSystemCacheForDev"));
  check("metadata_manifest_absolute", rootLayout.includes('manifest: "/manifest.webmanifest"'));
  check("metadata_icon_absolute", rootLayout.includes('url: "/icon.svg"'));
  check("proxy_root_metadata_bypass", proxy.includes('"/manifest.webmanifest"') && proxy.includes('"/icon.svg"'));
  check("proxy_locale_metadata_alias", proxy.includes("resolveMetadataAlias") && proxy.includes("manifest\\.webmanifest"));
  check("proxy_preserves_a41_public_aliases", ["/browser", "/shield", "/shield-pro", "/shield-map"].every((route) => proxy.includes(`"${route}"`)));

  check("smoke_target_depth", A42_CRITICAL_RUNTIME_TARGETS.length >= 15, A42_CRITICAL_RUNTIME_TARGETS.length);
  for (const route of ["/pl", "/pl/search", "/pl/market-integrity", "/pl/shield-pro", "/pl/shield-map", "/pl/intelligence", "/pl/atelier", "/pl/security/audits", "/manifest.webmanifest", "/icon.svg", "/api/auth/session", "/api/market-integrity/markets?perPage=3"]) {
    check(`smoke_target:${route}`, A42_CRITICAL_RUNTIME_TARGETS.some((target) => target.path === route));
  }

  check("windows_launcher_revision", launcher.includes(A42_DEV_RUNTIME_REVISION));
  check("windows_launcher_clean_start", launcher.includes("npm run dev:clean:a42"));
  check("docs_windows_webpack", docs.includes("Windows") && docs.includes("Webpack"));
  check("docs_smoke_command", docs.includes("npm run smoke:runtime:a42"));
  check("fixture_signature", fixture.includes(GLOBAL_JSON_PARSE_SIGNATURE));
  check("fixture_cross_surface", fixture.includes("/pl/search") && fixture.includes("/api/auth/session"));

  const stopSell = read("config/pass35/product-cell-catalog.json");
  check("stop_sell_preserved", !stopSell.includes('"sellEnabled": true'));
  const a41SourceContractPath = path.join(root, "config/pass35/a41-critical-route-recovery.json");
  check("a41_evidence_present", fs.existsSync(a41SourceContractPath));
  if (fs.existsSync(a41SourceContractPath)) {
    const a41 = JSON.parse(fs.readFileSync(a41SourceContractPath, "utf8"));
    check("a41_previous_gate_passed", a41.revisionId === "VELMERE_PASS35_A41_BROWSER_SHIELD_ROUTE_RUNTIME_RECOVERY", a41.revisionId);
  }

  const bootstrapRun = spawnSync(process.execPath, ["scripts/velmere-dev-bootstrap.mjs"], {
    cwd: root,
    env: { ...process.env, VELMERE_DEV_BUNDLER: "webpack", VELMERE_DEV_CLEAR_NEXT_CACHE: "1" },
    encoding: "utf8",
  });
  check("bootstrap_executes", bootstrapRun.status === 0, { status: bootstrapRun.status, stderr: bootstrapRun.stderr?.slice(0, 1000) });
  check("bootstrap_reports_a42", bootstrapRun.stdout?.includes(A42_DEV_RUNTIME_REVISION), bootstrapRun.stdout?.slice(0, 1000));
  check("bootstrap_reports_webpack", bootstrapRun.stdout?.includes("selected bundler: webpack"), bootstrapRun.stdout?.slice(0, 1000));
}

const result = {
  schemaVersion: "velmere.pass35.a42.dev-runtime-cache-recovery.test.v2",
  revisionId: A42_DEV_RUNTIME_REVISION,
  generatedAt: new Date().toISOString(),
  truthBoundary: "The A42 gate proves source identity, bounded generated-cache invalidation, private Next environment sanitation, Windows Webpack selection, global JSON crash recovery policy, metadata/i18n hardening and preservation of the A41 source contract. It does not claim an exact Next browser run in this environment.",
  summary: {
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
  },
  checks,
  failures,
};

const output = path.join(root, "artifacts/pass35/a42/PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`[a42] FAIL ${failure.name}${failure.detail === undefined ? "" : `: ${JSON.stringify(failure.detail)}`}\n`);
  process.exit(1);
}
