#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scanCssModulePurity } from "../lib/css-module-purity.mjs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
const contract = JSON.parse(read("config/pass35/a44-visual-master-engine-binding.json"));
let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }
function equal(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }

function messageLeaves(value, prefix = "", output = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => messageLeaves(entry, `${prefix}[${index}]`, output));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) messageLeaves(entry, prefix ? `${prefix}.${key}` : key, output);
  } else output.set(prefix, value);
  return output;
}
function valueDigest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

ok(contract.revisionId === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING", "A44 contract revision mismatch");
ok(read("VELMERE_A44_PATCH.txt").includes(contract.revisionId), "A44 patch marker missing revision");
ok(read("VELMERE_ACTIVE_PASS.txt").trim() === contract.runtimeParentRevision, "A44 must retain exact A42 runtime parent identity");
ok(read("VELMERE_A43_PATCH.txt").includes(contract.parentSourceRevision), "A44 must retain A43 compile recovery parent");

const classifications = new Map();
for (const row of contract.activeVisualFiles) {
  classifications.set(row.path, row.classification);
  ok(exists(row.path), `active visual file missing: ${row.path}`);
  if (!exists(row.path)) continue;
  equal(sha256(row.path), row.candidateSha256, `A44 candidate drift: ${row.path}`);
  if (row.classification === "byte_identical_visual") {
    equal(row.candidateSha256, row.visualSha256, `visual byte parity failed: ${row.path}`);
  } else if (row.classification === "a43_preserved") {
    equal(row.candidateSha256, row.a43Sha256, `A43 protected visual-runtime file drift: ${row.path}`);
  } else if (row.classification === "adapted_ui") {
    const source = read(row.path);
    for (const styleRef of row.visualTokens?.styleRefs ?? []) ok(source.includes(`styles.${styleRef}`), `visual style reference lost in ${row.path}: ${styleRef}`);
    for (const attribute of row.visualTokens?.dataAttributes ?? []) ok(source.includes(attribute), `visual data attribute lost in ${row.path}: ${attribute}`);
    for (const classToken of row.visualTokens?.staticClassTokens ?? []) ok(source.includes(classToken), `visual class token lost in ${row.path}: ${classToken}`);
  }
}
ok(![...classifications.values()].includes("missing"), "A44 active visual graph contains a missing file");

for (const alias of contract.aliases) {
  ok(exists(alias.alias), `compatibility alias missing: ${alias.alias}`);
  ok(exists(alias.target), `compatibility alias target missing: ${alias.target}`);
  const source = read(alias.alias);
  const relativeTarget = `./${path.basename(alias.target).replace(/\.(?:ts|tsx|js|jsx|mjs|cjs)$/u, "")}`;
  ok(source.includes("A44 visual compatibility alias"), `alias marker missing: ${alias.alias}`);
  ok(source.includes(relativeTarget) || source.includes(alias.target.replace(/^lib\//u, "@/lib/").replace(/\.(?:ts|tsx|js|jsx|mjs|cjs)$/u, "")), `alias target binding missing: ${alias.alias}`);
}

for (const asset of contract.publicAssets) {
  ok(exists(asset.path), `visual public asset missing: ${asset.path}`);
  if (exists(asset.path)) equal(sha256(asset.path), asset.sha256, `visual public asset drift: ${asset.path}`);
}

for (const [locale, expectedRows] of Object.entries(contract.messageLeaves)) {
  const leaves = messageLeaves(JSON.parse(read(`messages/${locale}.json`)));
  for (const row of expectedRows) {
    ok(leaves.has(row.path), `visual translation key missing ${locale}:${row.path}`);
    if (leaves.has(row.path)) equal(valueDigest(leaves.get(row.path)), row.valueSha256, `visual translation value drift ${locale}:${row.path}`);
  }
}

for (const protectedFile of contract.protectedEngineFiles) {
  ok(exists(protectedFile.path), `protected A43 engine file missing: ${protectedFile.path}`);
  if (exists(protectedFile.path)) equal(sha256(protectedFile.path), protectedFile.sha256, `protected A43 engine file changed: ${protectedFile.path}`);
}

for (const route of [
  "app/[locale]/page.tsx",
  "app/[locale]/search/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/real-markets/page.tsx",
  "app/[locale]/shield-pro/page.tsx",
  "app/[locale]/shield-map/page.tsx",
  "app/[locale]/security/audits/page.tsx",
  "app/[locale]/atelier/page.tsx",
  "app/[locale]/intelligence/page.tsx",
]) ok(exists(route), `final visual route missing: ${route}`);

const rootLayout = read("app/layout.tsx");
ok(rootLayout.includes('"./globals.css"'), "global visual stylesheet missing");
ok(rootLayout.includes('"./styles/vlm-analysis-tab.css"'), "visual VLM analysis stylesheet missing");
ok(rootLayout.includes('"./styles/premium-ui.css"'), "premium visual stylesheet missing");

const popup = read("components/market-integrity/AssetDetailModal.tsx");
for (const tab of ["overview", "analysis", "market-impact", "whale-watch"]) ok(popup.includes(tab), `four-tab popup is missing ${tab}`);
ok(popup.includes("MarketImpactTab"), "popup Market Impact runtime not mounted");
ok(popup.includes("WhaleWatchTab"), "popup Whale Watch runtime not mounted");
ok(popup.includes("document.body.style.overflow = \"hidden\"") && popup.includes("document.documentElement.style.overflow = \"hidden\""), "popup scroll lock lifecycle missing");

const intelligenceTabs = read("components/market-integrity/AssetIntelligenceTabs.tsx");
ok(intelligenceTabs.includes("fetchRuntime"), "Market Impact/Whale Watch must use current runtime router");
ok(intelligenceTabs.includes("RuntimeDepthChart"), "visual depth chart must remain connected to runtime data");
ok(intelligenceTabs.includes("styles.whaleParticles"), "visual Whale Watch art layer missing");
ok(!intelligenceTabs.includes("function stableHash"), "synthetic visual Whale Watch data generator must not be active");
ok(intelligenceTabs.includes('depth: "basic"') || intelligenceTabs.includes('locale, "basic"'), "Market Impact Basic runtime binding missing");
ok(intelligenceTabs.includes('locale, "pro"'), "Whale Watch Pro runtime binding missing");

const marketRuntime = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
ok(marketRuntime.includes("MAX_RUNTIME_RESPONSE_BYTES") && marketRuntime.includes("response.body.getReader()") && marketRuntime.includes('new TextDecoder("utf-8", { fatal: true })'), "bounded Market Intelligence payload reader missing");
ok(marketRuntime.includes("cache: \"no-store\""), "Market Intelligence requests must remain no-store");

const shield = read("components/market-integrity/ShieldRealMarketsParityClient.tsx");
ok(shield.includes("/api/market-integrity/markets?perPage=250"), "Shield current market endpoint missing");
ok(shield.includes("readJsonResponseBounded"), "Shield bounded JSON missing");
const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
ok(shieldPro.includes("/api/market-integrity/markets?perPage=100"), "Shield Pro current market endpoint missing");
ok(shieldPro.includes("PARTIAL · NOT LIVE"), "Shield Pro truthful status boundary missing");
ok(shieldPro.includes("readJsonResponseBounded"), "Shield Pro bounded JSON missing");
const shieldMap = read("components/market-integrity/ShieldMapCommandClient.tsx");
ok(shieldMap.includes("/api/market-integrity/investigator"), "Shield Map current investigator endpoint missing");
ok(shieldMap.includes("readJsonResponseBounded"), "Shield Map bounded JSON missing");
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
ok(browser.includes("readJsonResponseBounded"), "Browser bounded JSON missing");
ok(browser.includes('buildPass451PdfExactPreview(safeLocale, "pro")'), "Browser current PDF preview contract missing");
const audits = read("components/security/SecurityAuditsCleanPage.tsx");
ok(audits.includes("resolvePass35PaidUiStopSell"), "audit UI stop-sell missing");
ok(audits.includes("vlm_pro_audit_review"), "audit Pro exact SKU binding missing");
ok(audits.includes("vlm_advanced_audit_human_review"), "audit Advanced exact SKU binding missing");
ok(audits.includes("readJsonResponseBounded"), "audit bounded response missing");

const purity = scanCssModulePurity(root);
ok(purity.ok, `CSS Modules purity failed: ${JSON.stringify(purity.failures.slice(0, 8))}`);
const intelligenceCss = read("components/intelligence/IntelligencePage.module.css");
ok(!intelligenceCss.includes("\n:global(#risk-engine),"), "bare global Intelligence selector returned");
ok(intelligenceCss.includes(".page :global(#risk-engine),"), "scoped Intelligence anchor selector missing");

const packageJson = JSON.parse(read("package.json"));
equal(packageJson.velmerePass, contract.runtimeParentRevision, "runtime package identity must stay on exact A42 contract");
equal(packageJson.velmereVisualPass, contract.revisionId, "A44 visual pass identity missing");
ok(packageJson.scripts?.["diagnose:runtime:a44"], "A44 diagnostic command missing");
ok(packageJson.scripts?.["smoke:runtime:a44"], "A44 smoke command missing");
ok(packageJson.scripts?.["dev:clean:a44"], "A44 clean dev command missing");
ok(read("scripts/velmere-dev-bootstrap.mjs").includes("smoke:runtime:a44"), "bootstrap must point operator to A44 smoke");

process.stdout.write(`PASS35 A44 visual master + current engine binding: ${checks}/${checks} PASS\n`);
