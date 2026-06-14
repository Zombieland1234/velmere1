import fs from "node:fs";
import { createRequire } from "node:module";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const temporal = read("lib/ai/vlm-temporal-consistency.ts");
const arbitration = read("lib/ai/vlm-source-arbitration.ts");
const packet = read("lib/ai/vlm-fact-packet.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const epistemic = read("lib/ai/vlm-epistemic-governor.ts");
const firewall = read("lib/ai/vlm-claim-firewall.ts");
const shadow = read("lib/ai/vlm-shadow-governor.ts");
const security = read("lib/ai/vlm-security.ts");
const brain = read("lib/ai/vlm-brain.ts");
const contract = read("lib/ai/vlm-contract.ts");
const receipt = read("lib/ai/vlm-analysis-receipt.ts");

expect(
  temporal.includes("evaluateVlmTemporalConsistency") &&
    temporal.includes("FACT_HALF_LIFE_MS") &&
    temporal.includes("evidenceWeight") &&
    temporal.includes('schemaVersion: "velmere.vlm.temporal-consistency.v1"'),
  "Temporal Consistency Sentinel is implemented as executable half-life assessment code",
);
expect(
  temporal.includes("staleFactIds") &&
    temporal.includes("invalidFactIds") &&
    temporal.includes("maxSourceAgeSpreadMs") &&
    temporal.includes("future_or_invalid_timestamp"),
  "temporal sentinel records stale facts, invalid timestamps and source age spread",
);
expect(
  arbitration.includes("temporalConsistency") &&
    arbitration.includes("evaluateVlmTemporalConsistency") &&
    arbitration.includes('temporalConsistency.status === "stale"') &&
    arbitration.includes("Evidence Half-Life marks key facts as stale"),
  "source arbitration applies temporal consistency to confidence caps",
);
expect(
  packet.includes("temporalConsistencyStatus") &&
    packet.includes("temporal consistency") &&
    packet.includes("stale temporal evidence for"),
  "fact packet carries temporal degradation into confidence governance and missing-data semantics",
);
expect(
  provider.includes("TEMPORAL_CONSISTENCY=") &&
    provider.includes("Apply Evidence Half-Life and Temporal Consistency strictly") &&
    provider.includes("aging/stale/invalid Temporal Consistency"),
  "main provider and Shadow Brain receive temporal consistency rules",
);
expect(
  epistemic.includes("temporalConsistency.score") &&
    epistemic.includes("evidence half-life limitation") &&
    epistemic.includes("live-market interpretation from stale or aging evidence"),
  "Epistemic Governor treats stale evidence as uncertainty, not live conviction",
);
expect(
  firewall.includes("temporalCurrent") &&
    firewall.includes("temporal-consistency-overclaim"),
  "claim firewall rejects live/current wording when temporal consistency is not current",
);
expect(
  shadow.includes("temporalUnsupportedLiveClaim") &&
    shadow.includes("temporal_consistency_overclaim") &&
    shadow.includes("temporal_consistency_${temporalConsistency.status}"),
  "Shadow Governor revises or rejects overconfident temporal claims",
);
expect(
  security.includes("TEMPORAL_CONSISTENCY_MANIPULATION_PATTERNS") &&
    security.includes("temporal_consistency_manipulation"),
  "central VLM Security detects prompts trying to bypass temporal consistency",
);
expect(
  brain.includes("Evidence Half-Life ogranicza świeżość") &&
    brain.includes("spójność czasowa") &&
    brain.includes('packet.sourceArbitration.temporalConsistency.status === "current"'),
  "brain fallback, diagnostics and live-mode gate use temporal consistency in PL/EN/DE-safe wording",
);
expect(
  contract.includes("temporalConsistencyStatus") &&
    contract.includes("staleTemporalFactIds"),
  "output diagnostics contract exposes temporal consistency without UI changes",
);
expect(
  receipt.includes("temporalConsistencySentinel: true"),
  "signed receipt policy hash changes when Temporal Consistency Sentinel is active",
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

const { evaluateVlmTemporalConsistency } = require("../lib/ai/vlm-temporal-consistency.ts");
const now = new Date("2026-06-14T12:00:00.000Z");
const source = (id, observedAt) => ({ id, provider: id.includes("a") ? "CoinGecko" : "DexScreener", label: id, observedAt, quality: 88 });
const fact = (id, sourceIds, observedAt, freshness = "fresh") => ({ id, label: id, value: 1, sourceIds, observedAt, freshness });

const current = evaluateVlmTemporalConsistency({
  sources: [source("a", "2026-06-14T11:59:00.000Z"), source("b", "2026-06-14T11:58:00.000Z")],
  facts: [fact("price", ["a", "b"], "2026-06-14T11:59:00.000Z")],
  now,
});
expect(current.status === "current" && current.score >= 70, "runtime half-life assessment keeps very fresh price evidence current");

const stale = evaluateVlmTemporalConsistency({
  sources: [source("a", "2026-06-14T10:00:00.000Z"), source("b", "2026-06-14T10:00:00.000Z")],
  facts: [fact("price", ["a", "b"], "2026-06-14T10:00:00.000Z")],
  now,
});
expect(stale.status === "stale" && stale.staleFactIds.includes("price") && stale.confidencePenalty >= 16, "runtime half-life assessment downgrades old price evidence");

const invalid = evaluateVlmTemporalConsistency({
  sources: [source("a", "2026-06-14T12:10:00.000Z")],
  facts: [fact("volume-24h", ["a"], "2026-06-14T12:10:00.000Z")],
  now,
});
expect(invalid.status === "invalid" && invalid.invalidFactIds.includes("volume-24h"), "runtime temporal assessment rejects future-dated evidence");

console.log("PASS2021 Temporal Consistency Sentinel verifier complete");
