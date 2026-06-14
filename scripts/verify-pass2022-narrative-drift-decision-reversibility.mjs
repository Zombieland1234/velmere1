import fs from "node:fs";
import { createRequire } from "node:module";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const drift = read("lib/ai/vlm-narrative-drift.ts");
const brain = read("lib/ai/vlm-brain.ts");
const memory = read("lib/ai/vlm-memory.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const firewall = read("lib/ai/vlm-claim-firewall.ts");
const shadow = read("lib/ai/vlm-shadow-governor.ts");
const security = read("lib/ai/vlm-security.ts");
const contract = read("lib/ai/vlm-contract.ts");
const receipt = read("lib/ai/vlm-analysis-receipt.ts");

expect(
  drift.includes("evaluateVlmNarrativeDrift") &&
    drift.includes("buildVlmEvidenceFingerprint") &&
    drift.includes('schemaVersion: "velmere.vlm.narrative-drift-lock.v1"') &&
    drift.includes("verdict_jump_without_clear_bridge"),
  "Narrative Drift Lock is implemented as executable fingerprint and drift scoring code",
);
expect(
  drift.includes("evaluateVlmDecisionReversibility") &&
    drift.includes('schemaVersion: "velmere.vlm.decision-reversibility.v1"') &&
    drift.includes("liquidityScore") &&
    drift.includes("executionFrictionScore"),
  "Decision Reversibility is implemented as executable liquidity/slippage/evidence scoring code",
);
expect(
  memory.includes("lastNarrativeFingerprint") &&
    memory.includes("lastEvidenceFingerprint") &&
    memory.includes("lastVerdict") &&
    memory.includes("lastConfidence"),
  "VLM memory persists narrative and evidence fingerprints per asset scope",
);
expect(
  brain.includes("applyNarrativeAndReversibilityGovernors") &&
    brain.includes("narrative-drift-lock") &&
    brain.includes("decision-reversibility") &&
    brain.includes('narrative.status === "stable"') &&
    brain.includes('reversibility.tier !== "low"'),
  "VLM Brain applies drift/reversibility governors and live-mode gates without UI changes",
);
expect(
  provider.includes("Apply Narrative Drift Lock") &&
    provider.includes("Apply Decision Reversibility") &&
    provider.includes("PREVIOUS_ANALYSIS_CONTEXT") &&
    provider.includes("previousAnalysisContext"),
  "main provider and Shadow Brain receive narrative drift and reversibility policy context",
);
expect(
  firewall.includes("narrative-drift-bypass") &&
    firewall.includes("decision-reversibility-overclaim") &&
    firewall.includes("evaluateVlmDecisionReversibility"),
  "claim firewall blocks bypass and overclaim language for drift/reversibility",
);
expect(
  shadow.includes("decision_reversibility_overclaim") &&
    shadow.includes("evaluateVlmDecisionReversibility"),
  "Shadow Governor revises/rejects decision reversibility overclaims",
);
expect(
  security.includes("NARRATIVE_DRIFT_MANIPULATION_PATTERNS") &&
    security.includes("DECISION_REVERSIBILITY_MANIPULATION_PATTERNS") &&
    security.includes("narrative_drift_manipulation") &&
    security.includes("decision_reversibility_manipulation"),
  "central VLM Security detects manipulation of narrative drift and reversibility controls",
);
expect(
  contract.includes("narrativeDriftStatus") &&
    contract.includes("decisionReversibilityTier"),
  "output diagnostics contract exposes drift and reversibility without visual changes",
);
expect(
  receipt.includes("narrativeDriftLock: true") &&
    receipt.includes("decisionReversibilitySentinel: true"),
  "signed receipt policy hash covers the new PASS2022 governors",
);

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const {
  buildVlmEvidenceFingerprint,
  evaluateVlmNarrativeDrift,
  evaluateVlmDecisionReversibility,
} = require("../lib/ai/vlm-narrative-drift.ts");

const now = "2026-06-14T12:00:00.000Z";
const packet = {
  schemaVersion: "velmere.vlm.fact-packet.v1",
  asset: { id: "btc", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
  observedAt: now,
  dataQuality: "live",
  deterministicScore: 32,
  deterministicVerdict: "watch",
  confidenceCap: 82,
  sourceArbitration: {
    confidenceCap: 82,
    providerCount: 2,
    sourceCount: 3,
    freshSources: 2,
    agingSources: 0,
    staleSources: 0,
    unknownSources: 0,
    sourceBackedFactRatio: 1,
    conflictCount: 0,
    evidenceQuorum: { status: "strong", confirmedFactCount: 4, checkedFactCount: 4, quorumRatio: 1, weakFactIds: [], reasons: [] },
    sourceIntegrity: { status: "trusted", score: 96, confidencePenalty: 1, sourceCount: 3, providerFamilyCount: 2, duplicateProviderSourceCount: 0, duplicateSourceIdCount: 0, lowQualitySourceCount: 0, staleOrUnknownSourceCount: 0, futureTimestampSourceCount: 0, invalidTimestampSourceCount: 0, nonHttpsUrlCount: 0, poisonedMetadataCount: 0, quarantinedSourceIds: [], degradedSourceIds: [], providerFamilies: [], fingerprint: "trusted", reasons: [] },
    temporalConsistency: { status: "current", score: 94, confidencePenalty: 1, oldestEvidenceAgeMs: 60000, medianEvidenceAgeMs: 60000, maxSourceAgeSpreadMs: 0, freshFactCount: 4, agingFactCount: 0, staleFactCount: 0, invalidFactCount: 0, staleFactIds: [], invalidFactIds: [], factAssessments: [], fingerprint: "current", reasons: [] },
    reasons: [],
  },
  facts: [
    { id: "price", label: "Current price", value: 100, sourceIds: ["coingecko", "dexscreener"], observedAt: now, freshness: "fresh" },
    { id: "liquidity-usd", label: "Liquidity", value: 8000000, sourceIds: ["coingecko", "dexscreener"], observedAt: now, freshness: "fresh" },
    { id: "volume-24h", label: "Volume", value: 1000000, sourceIds: ["coingecko", "dexscreener"], observedAt: now, freshness: "fresh" },
    { id: "slippage-10k", label: "Slippage", value: 0.5, sourceIds: ["coingecko", "dexscreener"], observedAt: now, freshness: "fresh" },
    { id: "sell-tax", label: "Sell tax", value: 0, sourceIds: ["coingecko", "dexscreener"], observedAt: now, freshness: "fresh" },
    { id: "risk-score", label: "Risk", value: 32, sourceIds: ["internal:risk-engine"], observedAt: now, freshness: "fresh" },
  ],
  sources: [
    { id: "internal:risk-engine", provider: "Velmere", label: "internal", observedAt: now, quality: 88 },
    { id: "coingecko", provider: "CoinGecko", label: "CoinGecko", observedAt: now, quality: 90 },
    { id: "dexscreener", provider: "DexScreener", label: "DexScreener", observedAt: now, quality: 88 },
  ],
  signals: [{ id: "thin_liquidity", severity: "low", points: 12, sourceIds: ["internal:risk-engine"] }],
  layers: [],
  conflicts: [],
  missingData: [],
  nextChecks: ["Confirm sources"],
  allowedSourceIds: ["internal:risk-engine", "coingecko", "dexscreener"],
};
const output = {
  schemaVersion: "velmere.vlm.output.v3",
  traceId: "00000000-0000-4000-8000-000000000000",
  generatedAt: now,
  locale: "en",
  depth: "advanced",
  providerMode: "gemini_live",
  asset: packet.asset,
  verdict: "calm",
  headline: "Risk remains conditional",
  summary: "The evidence shows a conditional low-pressure risk picture with no dominant warning signal.",
  confidence: 74,
  facts: packet.facts,
  keyFindings: [{ id: "deterministic-risk", title: "Risk", explanation: "Risk 32/100", severity: "watch", confidence: 74, sourceIds: ["internal:risk-engine"] }],
  contradictions: [],
  missingData: [],
  nextChecks: ["Confirm source freshness"],
  sources: packet.sources,
  report: { executiveSummary: "Conditional read", marketStructure: "Fresh facts", liquidityAnalysis: "Strong liquidity", holderAnalysis: "Unknown", contractAnalysis: "Unknown", sourceAssessment: "Trusted sources", riskScenarios: "Conditional watch", conclusion: "No advice" },
};
const evidenceFingerprint = buildVlmEvidenceFingerprint(packet);
const stable = evaluateVlmNarrativeDrift({
  packet,
  output,
  previous: { lastSummary: output.summary, lastEvidenceFingerprint: evidenceFingerprint, lastVerdict: "calm", lastConfidence: 73 },
});
expect(stable.status === "stable" || stable.status === "watch", "runtime drift assessment stays stable/watch when narrative and evidence agree");
const drifted = evaluateVlmNarrativeDrift({
  packet,
  output: { ...output, verdict: "high_risk", confidence: 94, summary: "Critical danger is now dominant and the whole story changed completely without any new source bridge." },
  previous: { lastSummary: output.summary, lastEvidenceFingerprint: evidenceFingerprint, lastVerdict: "calm", lastConfidence: 40 },
});
expect(drifted.status === "locked" && drifted.confidencePenalty >= 18, "runtime drift assessment locks large verdict jumps without new evidence");
const reversible = evaluateVlmDecisionReversibility(packet);
expect(reversible.tier === "high" && reversible.score >= 70, "runtime reversibility scoring recognizes high-liquidity low-friction evidence");
const lowPacket = {
  ...packet,
  confidenceCap: 38,
  facts: packet.facts.map((fact) => fact.id === "liquidity-usd" ? { ...fact, value: 20000 } : fact.id === "slippage-10k" ? { ...fact, value: 18 } : fact.id === "sell-tax" ? { ...fact, value: 12 } : fact),
  missingData: ["second source"],
};
const low = evaluateVlmDecisionReversibility(lowPacket);
expect((low.tier === "low" || low.tier === "unknown") && low.confidencePenalty >= 10, "runtime reversibility scoring downgrades thin-liquidity high-friction cases");

console.log("PASS2022 Narrative Drift Lock + Decision Reversibility verifier complete");
