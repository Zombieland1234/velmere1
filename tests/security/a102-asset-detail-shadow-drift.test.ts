import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildVlmModalEvidencePacket } from "../../lib/market-integrity/vlm-modal-evidence-packet.js";

const assetDetail = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/AssetDetailModal.tsx"), "utf8");
const packetSource = fs.readFileSync(path.join(process.cwd(), "lib/market-integrity/vlm-modal-evidence-packet.ts"), "utf8");

// Shadow/scaffold gate: former tier launcher/result implementation remains unreachable and gets no customer credit.
assert.match(assetDetail, /const VLM_ANALYSIS_TRIGGER_ENABLED = false;/);
assert.match(assetDetail, /void VlmAnalysisResultSurface;/);
assert.match(assetDetail, /<AnalysisTab\s/);
assert.doesNotMatch(assetDetail, /\$\{confidence\}% confidence/);

// Its heuristic is explicitly an evidence-completeness ceiling, never a calibrated confidence probability.
assert.match(packetSource, /evidenceCoverageCap/);
assert.doesNotMatch(packetSource, /\n\s*confidenceCap: number;/);
assert.match(packetSource, /not a calibrated probability/);
assert.match(assetDetail, /Calibrated confidence unavailable/);
assert.match(assetDetail, /Evidence coverage/);

const sparse = buildVlmModalEvidencePacket({
  tier: "Basic",
  symbol: "SPARSE",
  name: "Sparse",
  priceLabel: "100",
  sourceLabel: "provider-a",
  riskScore: null,
});
const fuller = buildVlmModalEvidencePacket({
  tier: "Basic",
  symbol: "FULL",
  name: "Full",
  priceLabel: "100",
  sourceLabel: "provider-a",
  sourceTimeLabel: "live",
  riskScore: 0,
  candles: Array.from({ length: 8 }, (_, index) => ({ timestamp: index + 1, open: 100, high: 101, low: 99, close: 100 + index, volume: 100 })),
});
assert.ok(fuller.evidenceCoverageCap > sparse.evidenceCoverageCap, "the heuristic should react to evidence completeness");
assert.equal("confidenceCap" in fuller, false, "modal coverage heuristic must not masquerade as confidence");

console.log("A102 AssetDetail shadow/scaffold drift and evidence-ceiling truth: PASS");
