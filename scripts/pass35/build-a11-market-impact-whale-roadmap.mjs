#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const product = read("config/pass35/product-tier-content-contract.json");
const zero = read("config/pass35/zero-budget-functional-roadmap.json");
const current = read("config/pass35/current-status-register.json");
const surfaceIds = ["market_impact", "whale_watch"];
const surfaces = surfaceIds.map((surfaceId) => product.surfaces.find((row) => row.surfaceId === surfaceId));
if (surfaces.some((row) => !row)) throw new Error("a11_surface_contract_missing");
const matrices = surfaces.flatMap((surface) => ["basic", "pro", "advanced"].map((tier) => {
  const names = ["basic", "pro", "advanced"].slice(0, ["basic", "pro", "advanced"].indexOf(tier) + 1);
  const requiredFields = [...new Set(names.flatMap((name) => surface.tiers[name].requiredFields).filter((field) => !/^all_(basic|pro)_fields$/u.test(field)))];
  const requiredScenarios = [...new Set(names.flatMap((name) => surface.tiers[name].requiredScenarios))];
  return {
    surfaceId: surface.surfaceId,
    tier,
    requiredFields,
    requiredFieldCount: requiredFields.length,
    requiredScenarios,
    requiredScenarioCount: requiredScenarios.length,
    minimumIndependentEvidenceFamilies: tier === "basic" ? 1 : tier === "pro" ? 2 : 3,
    failClosedIf: [...new Set(names.flatMap((name) => surface.tiers[name].failClosedIf))],
    purchaseValueReason: surface.tiers[tier].purchaseValueReason,
  };
}));
const contract = {
  schemaVersion: "velmere.pass35.market-impact-whale-tier-contract.v1",
  passId: "PASS35_A11",
  sourceRevisionId: product.sourceRevisionId,
  visualChangesMade: false,
  providerRuntime: {
    orderBookFamilies: ["binance", "mexc", "coinbase", "kraken"],
    holderDistributionFamilies: ["etherscan"],
    transferHistoryFamilies: ["alchemy"],
    walletLabelFamilies: ["signed_registry"],
    truth: "Provider adapters and local mocked runtime are implemented; current public uptime and real token evidence are not claimed by this contract.",
  },
  corpus: {
    marketImpactCases: 60,
    whaleWatchCases: 60,
    generatedTierPackets: 360,
    runtimeAssertions: 1390,
    meaning: "Deterministic regression and edge-case coverage only; not the production market denominator.",
  },
  surfaceTierMatrices: matrices,
  packetRules: [
    "basic_is_useful_and_narrow_not_a_paid_advertisement",
    "pro_adds_independent_evidence_and_material_decision_fields",
    "advanced_adds_stress_trace_monitoring_and_proof_capsule",
    "wallet_identity_is_unknown_without_verified_label_artifact",
    "visible_depth_is_not_guaranteed_executable_liquidity",
    "missing_stale_conflicted_or_unverified_inputs_fail_closed",
    "packet_digest_binds_tier_projection_to_source_result_digest",
    "no_local_or_fixture_packet_unlocks_billing",
    "visual_files_are_out_of_scope",
  ],
  integration: {
    canonicalPacket: true,
    pdfInputContract: true,
    brainAngelInputContract: true,
    shieldAndRealMarketsInputContract: true,
    frontendHookupDeferredToCodex: true,
  },
  sellEnabled: false,
  paidDeliveryEligible: false,
  realProviderCoverageStatus: "NOT_EXECUTED_FULL_CATALOG",
};
mkdirSync("config/pass35", { recursive: true });
writeFileSync("config/pass35/market-impact-whale-tier-contract.json", `${JSON.stringify(contract, null, 2)}\n`);

const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = { DONE: 0, PARTIAL: 0, NOT_DONE: 0 };
for (const row of core) zeroCounts[row.status] += 1;
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
const currentCounts = { DONE: 0, PARTIAL: 0, BLOCKED_EXTERNAL: 0, NOT_DONE: 0 };
for (const row of current.rows) currentCounts[row.status] += 1;
const canonicalWeighted = Number((((currentCounts.DONE + currentCounts.PARTIAL * 0.5) / current.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((currentCounts.DONE / current.rows.length) * 100).toFixed(1));

const lines = [
  "# PASS35 A11 — Market Impact + Whale Watch Product Runtime",
  "",
  `- Source revision: \`${contract.sourceRevisionId}\``,
  "- Visual changes: **NO**",
  `- Canonical roadmap: **${canonicalWeighted}% weighted / ${canonicalStrict}% strict**`,
  `- Zero-budget functional core: **${zeroWeighted}%**`,
  `- Surfaces: **${surfaces.length}**`,
  `- Tier variants: **${matrices.length}**`,
  `- Regression: **${contract.corpus.marketImpactCases} Market Impact + ${contract.corpus.whaleWatchCases} Whale Watch assets / ${contract.corpus.generatedTierPackets} packets**`,
  "",
  "## Provider runtime",
  "",
  `- Order books: ${contract.providerRuntime.orderBookFamilies.join(", ")}`,
  `- Holder distribution: ${contract.providerRuntime.holderDistributionFamilies.join(", ")}`,
  `- Transfer history: ${contract.providerRuntime.transferHistoryFamilies.join(", ")}`,
  `- Wallet labels: ${contract.providerRuntime.walletLabelFamilies.join(", ")}`,
  "",
  "> Local mocked provider execution proves the adapters and control plane only. It is not a live-market claim.",
  "",
  "## Surface × tier matrix",
  "",
  "| Surface | Tier | Fields | Scenarios | Evidence families |",
  "|---|---|---:|---:|---:|",
];
for (const row of matrices) lines.push(`| ${row.surfaceId} | ${row.tier} | ${row.requiredFieldCount} | ${row.requiredScenarioCount} | ${row.minimumIndependentEvidenceFamilies} |`);
for (const surface of surfaces) {
  lines.push("", `## ${surface.surfaceId.toUpperCase()}`, "", `- Role: ${surface.productRole}`, `- Coverage: ${surface.marketCoverageRule}`, `- Value boundary: ${surface.tierValueBoundary}`, "");
  for (const tier of ["basic", "pro", "advanced"]) {
    const row = surface.tiers[tier];
    lines.push(`### ${tier.toUpperCase()} — ${row.purpose}`, "", `**Customer question:** ${row.customerQuestion}`, "", `**Purchase value:** ${row.purchaseValueReason}`, "", "**Required fields:**", ...row.requiredFields.map((field) => `- ${field}`), "", "**Scenarios:**", ...(row.requiredScenarios.length ? row.requiredScenarios.map((scenario) => `- ${scenario}`) : ["- Narrow Basic scope only."]), "");
  }
}
lines.push("## Current boundary", "", "- Market Impact and Whale Watch paid tiers remain disabled.", "- Full active-catalog provider runtime, real labels and monitoring delivery remain unproven.", "- PDF, Brain and Angel may consume these packets only by packet ID/digest and may not add facts.", "");
const board = `${lines.join("\n")}\n`;
mkdirSync("artifacts/release", { recursive: true });
writeFileSync("artifacts/release/PASS35_A11_MARKET_IMPACT_WHALE_TIER_CONTRACT.md", board);
const summary = {
  schemaVersion: "velmere.pass35.a11-market-impact-whale-summary.v1",
  passId: "PASS35_A11",
  sourceRevisionId: contract.sourceRevisionId,
  visualChangesMade: false,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: currentCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCounts: zeroCounts,
  surfaceCount: surfaces.length,
  tierVariantCount: matrices.length,
  marketImpactCases: contract.corpus.marketImpactCases,
  whaleWatchCases: contract.corpus.whaleWatchCases,
  generatedTierPackets: contract.corpus.generatedTierPackets,
  runtimeAssertions: contract.corpus.runtimeAssertions,
  providerFamilies: contract.providerRuntime.orderBookFamilies,
  realProviderCoverageStatus: contract.realProviderCoverageStatus,
  sellEnabled: false,
  paidDeliveryEligible: false,
  contractSha256: sha(readFileSync("config/pass35/market-impact-whale-tier-contract.json")),
  boardSha256: sha(board),
};
writeFileSync("artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A11_MARKET_IMPACT_WHALE_ROADMAP_BUILT", ...summary }, null, 2));
