import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const exts = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".json"]);
const skip = new Set(["node_modules", ".next", "artifacts", "receipts", "fixtures"]);
const canonicalIds = [
  "shield-basic", "shield-pro", "shield-advanced",
  "shield-pro-basic", "shield-pro-pro", "shield-pro-advanced",
  "real-markets-basic", "real-markets-pro", "real-markets-advanced",
];
const legacyDottedIds = [
  "shield.basic", "shield.pro", "shield.advanced",
  "shield_pro.basic", "shield_pro.pro", "shield_pro.advanced",
  "real_markets.basic", "real_markets.pro", "real_markets.advanced",
];
const states = ["LOADING", "READY", "PARTIAL", "STALE", "WITHHELD", "UNAVAILABLE", "ERROR_CUSTOMER_SAFE"];
const semanticMarkers = [
  "REFERENCE", "INDICATIVE", "DELAYED", "OFFICIAL_CLOSE", "CURRENT_QUOTE",
  "VENUE_QUOTE", "EXECUTABLE_QUOTE", "DERIVED", "HISTORICAL",
];
const rightsStates = ["GREEN_EXACT", "GREEN_CONDITIONAL", "AMBER_REVIEW", "RED_BLOCKED", "GRAY_UNKNOWN"];

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(candidate, out);
    else if (exts.has(path.extname(entry.name))) out.push(candidate);
  }
  return out;
}

const all = walk(ROOT);
const corpus = [];
for (const file of all) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (/shield|real.?markets|market.?integrity|vlm-tiered-table/i.test(rel)) {
    let text = "";
    try { text = fs.readFileSync(file, "utf8"); } catch { /* Unreadable files remain represented by empty text. */ }
    corpus.push({ rel, text });
  }
}
const topologyText = fs.readFileSync(path.join(ROOT, "lib/product/vlm-canonical-product-topology.ts"), "utf8");
const contractPath = path.join(ROOT, "lib/product/vlm-tiered-table-customer-contract.ts");
const runtimeTestPath = path.join(ROOT, "scripts/current-execution/test-tiered-table-customer-boundary-runtime.mts");
const contractText = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, "utf8") : "";

const requirements = {
  canonicalIds: Object.fromEntries(canonicalIds.map((id) => [id, topologyText.includes(`"${id}"`) && contractText.includes(`"${id}"`)])),
  legacyDottedIdsRejected: legacyDottedIds.every((id) => !contractText.includes(`"${id}"`)),
  states: Object.fromEntries(states.map((state) => [state, new RegExp(`\\b${state}\\b`).test(contractText)])),
  rightsStates: Object.fromEntries(rightsStates.map((state) => [state, new RegExp(`\\b${state}\\b`).test(contractText)])),
  rightsPreflight: /rightsAllowed|rights_blocked|GRAY_UNKNOWN behaves exactly like RED_BLOCKED/u.test(contractText),
  tierMismatch: /tier_identity_mismatch|silentTierDowngradeAllowed/u.test(contractText),
  blockedRiskNull: /riskScore:\s*args\.riskScore\s*\?\?\s*null/u.test(contractText),
  blockedConfidenceNull: /confidence:\s*args\.confidence\s*\?\?\s*null/u.test(contractText),
  semanticClasses: Object.fromEntries(semanticMarkers.map((state) => [state, new RegExp(`\\b${state}\\b`).test(contractText)])),
  customerProjection: /VlmTieredTableCustomerProjection|evaluateVlmTieredTableCustomerBoundary/u.test(contractText),
  canonicalTopologyBinding: /getVlmCanonicalCustomerProduct/u.test(contractText),
  runtimeCompanionPresent: fs.existsSync(runtimeTestPath),
  shieldProjectionUsesSharedState: /VlmCustomerDataState/u.test(fs.readFileSync(path.join(ROOT, "lib/market-integrity/shield-pro-table-customer-projection.ts"), "utf8")),
};

const missing = [];
for (const [key, value] of Object.entries(requirements.canonicalIds)) if (!value) missing.push(`canonical_id:${key}`);
for (const [key, value] of Object.entries(requirements.states)) if (!value) missing.push(`state:${key}`);
for (const [key, value] of Object.entries(requirements.rightsStates)) if (!value) missing.push(`rights_state:${key}`);
for (const [key, value] of Object.entries(requirements.semanticClasses)) if (!value) missing.push(`semantic_class:${key}`);
for (const key of [
  "legacyDottedIdsRejected", "rightsPreflight", "tierMismatch", "blockedRiskNull",
  "blockedConfidenceNull", "customerProjection", "canonicalTopologyBinding",
  "runtimeCompanionPresent", "shieldProjectionUsesSharedState",
]) if (!requirements[key]) missing.push(key);

const result = {
  schemaVersion: "velmere.tiered-table-product-contract.static.v2",
  sourceFiles: corpus.length,
  sourceListSha256: crypto.createHash("sha256").update(corpus.map((item) => item.rel).sort().join("\n")).digest("hex"),
  contractSha256: crypto.createHash("sha256").update(contractText).digest("hex"),
  requirements,
  missing,
  classification: missing.length === 0 ? "PASS_STATIC_BOUNDED" : "WITHHELD_CONTRACT_GAPS",
  ok: missing.length === 0,
  customerFinalCredit: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(2);
