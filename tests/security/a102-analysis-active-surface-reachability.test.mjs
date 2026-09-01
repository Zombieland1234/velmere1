import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const analysisTab = await readFile(new URL("../../components/market-integrity/analysis/AnalysisTab.tsx", import.meta.url), "utf8");
const assetDetail = await readFile(new URL("../../components/market-integrity/AssetDetailModal.tsx", import.meta.url), "utf8");
const engine = await readFile(new URL("../../lib/market-integrity/vlm-analysis.ts", import.meta.url), "utf8");

// The active modal must mount the new AnalysisTab while the legacy launcher remains disconnected.
assert.match(assetDetail, /import AnalysisTab from "@\/components\/market-integrity\/analysis\/AnalysisTab"/);
assert.match(assetDetail, /const VLM_ANALYSIS_TRIGGER_ENABLED = false;/);
assert.match(assetDetail, /<AnalysisTab\s/);

// Current client execution is Basic-only on standard surfaces; Pro/Advanced require server entitlement.
assert.match(analysisTab, /const clientExecutionAllowed = tier === "basic"/);
assert.match(analysisTab, /disabled=\{!clientExecutionAllowed\}/);
assert.match(analysisTab, /data-execution-boundary=/);
assert.match(analysisTab, /if \((?:tier !== "basic"|paidTier)/);
assert.match(analysisTab, /paid_tier_requires_server_entitlement/);

// The active engine may not use symbol/name seeded pseudo-readings or invented fallback sources.
assert.doesNotMatch(engine, /function hashText\(/);
assert.doesNotMatch(engine, /deterministicSeries/);
assert.doesNotMatch(engine, /VLM market data spine/);
assert.doesNotMatch(engine, /Bull 31 · Base 51 · Bear 18/);
assert.match(engine, /provenanceState: "UNAVAILABLE"/);
assert.match(engine, /inputFields:/);
assert.match(engine, /derivation:/);

console.log("A102 active Analysis surface reachability and scaffold exclusion: PASS");
