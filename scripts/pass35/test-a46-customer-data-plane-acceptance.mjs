#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const revision = "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE";

const required = [
  "config/pass35/a46-customer-data-plane-acceptance.json",
  "scripts/a46-data-plane-acceptance.mjs",
  "scripts/a46-exact-data-acceptance.mjs",
  "scripts/a46-runtime-diagnostics.mjs",
  "scripts/a46-package-evidence.mjs",
  "scripts/pass35/test-a46-customer-data-plane-acceptance.mjs",
  "scripts/pass35/test-a46-data-plane-fixture.mjs",
  "VELMERE_RUN_A46_DATA_ACCEPTANCE.cmd",
  "VELMERE_A46_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);

const contract = JSON.parse(read("config/pass35/a46-customer-data-plane-acceptance.json"));
const current = JSON.parse(read("config/pass35/current-revision.json"));
const hardening = JSON.parse(read("config/pass35/a57r1-hardening-integrity.json"));
const pkg = JSON.parse(read("package.json"));
check("identity:revision", contract.revisionId === revision, contract.revisionId);
check("identity:parent", contract.parentRevisionId === "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE", contract.parentRevisionId);
check("identity:package", pkg.velmereDataAcceptancePass === revision, pkg.velmereDataAcceptancePass);
for (const [name, expected] of Object.entries({
  "dev:clean:a46": "node scripts/velmere-dev-runner.mjs --clean",
  "diagnose:runtime:a46": "node scripts/a46-runtime-diagnostics.mjs --write",
  "test:pass35:a46": "node scripts/pass35/test-a46-customer-data-plane-acceptance.mjs",
  "smoke:data:a46": "node scripts/a46-data-plane-acceptance.mjs",
  "accept:data:a46": "node scripts/a46-exact-data-acceptance.mjs",
  "package:evidence:a46": "node scripts/a46-package-evidence.mjs",
  "test:pass35:a46:data-fixture": "node scripts/pass35/test-a46-data-plane-fixture.mjs",
})) check(`package:${name}`, pkg.scripts?.[name] === expected, pkg.scripts?.[name]);

const modal = read("components/market-integrity/AssetDetailModal.tsx");
check("ui:operator_gate_env", modal.includes('process.env.NEXT_PUBLIC_VELMERE_OPERATOR_EVIDENCE === "1"'));
check("ui:operator_gate_non_production", modal.includes('process.env.NODE_ENV !== "production"'));
check("ui:customer_marker", modal.includes('data-a46-customer-runtime-hygiene="operator-evidence-removed-by-default"'));
check("ui:early_return_before_pass_arrays", modal.indexOf("if (!operatorEvidenceEnabled)") < modal.indexOf("const freshnessFingerprint"));
check("ui:env_default_disabled", read(".env.example").includes("NEXT_PUBLIC_VELMERE_OPERATOR_EVIDENCE=0"));
check("ui:production_env_default_disabled", read("ENV_PRODUCTION_READY.example").includes("NEXT_PUBLIC_VELMERE_OPERATOR_EVIDENCE=0"));

const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
check("shieldpro:kline_urlsearchparams", shieldPro.includes("const klineParams = new URLSearchParams"));
for (const token of ['symbol: row.symbol','assetClass: "crypto"','marketId: row.id','quote: "USD"','range: config.api']) check(`shieldpro:kline_identity:${token}`, shieldPro.includes(token));
check("shieldpro:no_symbol_only_legacy_query", !shieldPro.includes('klines?symbol=${encodeURIComponent(row.symbol)}&range='));

const dataScript = read("scripts/a46-data-plane-acceptance.mjs");
for (const endpoint of [
  "/api/market-integrity/markets",
  "/api/market-integrity/search",
  "/api/market-integrity/klines",
  "/api/market-integrity/investigator",
  "/api/market-integrity/market-intelligence",
  "/api/search?q=bitcoin",
  "/api/search/lens-report?tier=basic&format=json",
  "/api/search/lens-report?tier=basic",
]) check(`data:endpoint:${endpoint}`, dataScript.includes(endpoint));
check("data:bounded_stream_reader", dataScript.includes("response.body?.getReader()") && dataScript.includes("response_too_large"));
check("data:fatal_utf8", dataScript.includes('TextDecoder("utf-8", { fatal: true })'));
check("data:no_store", dataScript.includes('cache: "no-store"'));
check("data:full_kline_identity", dataScript.includes('assetClass: "crypto"') && dataScript.includes('quote: "USD"') && dataScript.includes("marketId"));
check("data:truthful_withholding", dataScript.includes("[200, 403, 424]") && dataScript.includes("evidence-withheld"));
check("data:pdf_magic", dataScript.includes('toString("ascii") === "%PDF-"'));
check("data:placeholder_rejection", dataScript.includes("placeholderText"));

const integrity = contract.integrity;
check("integrity:visual_count", integrity?.summary?.visualFiles === 338, integrity?.summary);
check("integrity:authorized_visual_changes", integrity?.summary?.authorizedVisualChanges === 2, integrity?.summary);
check("integrity:no_unexpected_visual_changes", integrity?.summary?.unexpectedVisualChanges === 0, integrity?.summary);
check("integrity:assets", integrity?.summary?.publicAssets === 225 && integrity?.summary?.publicAssetsMatched === 225, integrity?.summary);
check("integrity:engine", integrity?.summary?.protectedEngineFiles === 510 && integrity?.summary?.protectedEngineMatched === 510, integrity?.summary);
const tombstoneDigest = (row) => crypto.createHash("sha256").update(`A59_RETIRED_ROUTE_SHELL\0${row.path}\0${[...(row.replacementPaths ?? [])].sort((a, b) => a.localeCompare(b)).join("\0")}`).digest("hex");
const verifyCurrentRow = (row) => {
  const absolute = path.join(root, row.path);
  if (row.classification === "A59_RETIRED_ROUTE_SHELL") {
    return !fs.existsSync(absolute)
      && Array.isArray(row.replacementPaths)
      && row.replacementPaths.length >= 3
      && row.replacementPaths.every((replacement) => fs.existsSync(path.join(root, replacement)))
      && tombstoneDigest(row) === row.currentSha256;
  }
  return fs.existsSync(absolute) && sha256(row.path) === row.currentSha256;
};
check("integrity:current_hardening_schema", hardening.schemaVersion === "velmere.pass35.a57r1.hardening-integrity.v2" && hardening.sourceRevisionId === current.sourceRevisionId, hardening.schemaVersion);
check("integrity:current_engine_rows", hardening.integrity?.protectedEngineFiles?.length === 510, hardening.counts);
check("integrity:current_asset_rows", hardening.integrity?.publicAssets?.length === 225, hardening.counts);
for (const row of hardening.integrity?.protectedEngineFiles ?? []) check(`engine:${row.path}`, verifyCurrentRow(row), row.path);
for (const row of hardening.integrity?.publicAssets ?? []) check(`asset:${row.path}`, verifyCurrentRow(row), row.path);
check("integrity:current_visual_rows", hardening.integrity?.visualFiles?.length === 338 && hardening.integrity.visualFiles.every(verifyCurrentRow), hardening.counts);

const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a46.contract-test.v1", revisionId: revision, generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, failures, checks };
fs.mkdirSync(path.join(root, "artifacts/pass35/a46"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a46/PASS35_A46_CONTRACT_TEST.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
