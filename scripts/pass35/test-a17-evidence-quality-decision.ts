import { readFileSync } from "node:fs";
import { buildPass35A16CanonicalChannelParityRuntime } from "../../lib/market-integrity/pass35-a16-canonical-channel-parity.ts";
import { runPass35A17EvidenceQualityDecisionRuntime, verifyPass35A17EvidenceQualityDecisionRuntime } from "../../lib/market-integrity/pass35-a17-evidence-quality-decision-runtime.mjs";
import { applyPass35A17EvidenceFamilyRegistry, verifyPass35A17EvidenceFamilyRegistry } from "../../lib/market-integrity/pass35-a17-evidence-family-registry.mjs";

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const rawProduct = JSON.parse(readFileSync("config/pass35/product-tier-content-contract.json", "utf8"));
const registry = JSON.parse(readFileSync("config/pass35/a17-evidence-family-registry.json", "utf8"));
const product = applyPass35A17EvidenceFamilyRegistry(rawProduct, registry);
if (!verifyPass35A17EvidenceFamilyRegistry(rawProduct, registry)) throw new Error("a17_registry_verify");
const parity = buildPass35A16CanonicalChannelParityRuntime({ productContract: product, generatedAt: "2026-07-23T04:00:00.000Z" });
const base = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: parity, evaluatedAt: "2026-07-23T04:00:00.000Z" });
let checks = 0;
const check = (condition: unknown, message: string) => { assert(condition, message); checks += 1; };
check(verifyPass35A17EvidenceQualityDecisionRuntime(base), "a17_evidence_runtime_verify");
check(base.packetDenominator === 21, "a17_packet_denominator");
check(base.channelDecisionDenominator === 63, "a17_channel_decisions");
check(base.integratedDecisionPacketDenominator === 3, "a17_integrated_packets");
check(base.addedFactViolations === 0, "a17_no_added_facts");
check(base.packetAnalyses.every((row: { outcome: string }) => row.outcome === "LIMITED_OFFLINE"), "a17_offline_limited_truth");
check(base.integratedDecisionPackets.every((row: { outputClaimIds: string[]; sourceClaimIds: string[] }) => row.outputClaimIds.length === row.sourceClaimIds.length), "a17_integrated_claim_parity");
check(base.integratedDecisionPackets.every((row: { productionEligible: boolean; paidDeliveryAllowed: boolean }) => !row.productionEligible && !row.paidDeliveryAllowed), "a17_no_paid_unlock");
check(base.packetAnalyses.every((row: { channelDecisions: unknown[] }) => row.channelDecisions.length === 3), "a17_three_guarded_channels");
check(base.packetAnalyses.every((row: { evidenceFloorMet: boolean }) => row.evidenceFloorMet), "a17_tier_evidence_floors");

const addedFact = clone(parity);
addedFact.packets[0].projections.find((row) => row.channel === "brain")?.claimIds.push("invented.claim");
const addedFactResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: addedFact, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(addedFactResult.addedFactViolations === 1, "a17_added_fact_detected");
check(!verifyPass35A17EvidenceQualityDecisionRuntime(addedFactResult), "a17_added_fact_blocks_verify");

const contradiction = clone(parity);
contradiction.packets[0].packet.contradictions = ["material_provider_conflict"];
const contradictionResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: contradiction, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(contradictionResult.packetAnalyses[0].outcome === "ABSTAIN", "a17_contradiction_abstains");
check(contradictionResult.materialContradictionCount === 1, "a17_contradiction_count");

const stale = clone(parity);
stale.packets[0].packet.provenance[0].observedAt = "2026-07-22T00:00:00.000Z";
const staleResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: stale, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(staleResult.packetAnalyses[0].hardBlockers.includes("STALE_PROVENANCE"), "a17_stale_detected");
check(staleResult.packetAnalyses[0].outcome === "ABSTAIN", "a17_stale_abstains");

const rights = clone(parity);
rights.packets[0].packet.provenance[0].rightsState = "WITHDRAWN";
const rightsResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: rights, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(rightsResult.packetAnalyses[0].hardBlockers.includes("WITHHELD_OR_WITHDRAWN_RIGHTS"), "a17_rights_detected");

const floor = clone(parity);
for (const claim of floor.packets.find((row) => row.tier === "advanced")!.packet.claims) {
  (claim as { evidenceIds: readonly string[] }).evidenceIds = ["single.evidence.family"];
}
const floorResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: floor, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(floorResult.packetAnalyses.find((row: { tier: string }) => row.tier === "advanced").hardBlockers.includes("EVIDENCE_FAMILY_FLOOR_NOT_MET"), "a17_floor_detected");

const missingSurface = clone(parity);
missingSurface.packets = missingSurface.packets.filter((row) => !(row.surfaceId === "whale_watch" && row.tier === "pro"));
const missingResult = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: missingSurface, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(missingResult.integratedDecisionPackets.find((row: { tier: string }) => row.tier === "pro").hardBlockers.includes("REQUIRED_SURFACE_MISSING"), "a17_missing_surface_detected");

const tampered = clone(base);
tampered.packetAnalyses[0].qualityScore = 1;
check(!verifyPass35A17EvidenceQualityDecisionRuntime(tampered), "a17_integrity_tamper_detected");
const replay = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: parity, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(replay.integrity.digest === base.integrity.digest, "a17_deterministic");

console.log(JSON.stringify({ status: "PASS_A17_EVIDENCE_QUALITY_DECISION", checks, packets: base.packetDenominator, channelDecisions: base.channelDecisionDenominator, integratedDecisionPackets: base.integratedDecisionPacketDenominator, addedFactViolations: base.addedFactViolations, sellEnabled: base.sellEnabled }, null, 2));
