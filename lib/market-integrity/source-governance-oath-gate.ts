import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { SelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";
import type { VerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";
import type { CredentialRetentionHaloGate } from "@/lib/market-integrity/credential-retention-halo-gate";

export const PASS308_SOURCE_GOVERNANCE_OATH_GATE = true;

export type SourceGovernanceOathSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type SourceGovernanceOathState =
  | "oath_greenlit"
  | "oath_guided_review"
  | "oath_redacted_review"
  | "oath_operator_lock";

export type SourceGovernanceOathLaneId =
  | "source_origin_oath"
  | "freshness_oath"
  | "selective_disclosure_oath"
  | "credential_oath"
  | "retention_oath"
  | "customer_language_oath";

export type SourceGovernanceOathLane = {
  id: SourceGovernanceOathLaneId;
  label: string;
  state: SourceGovernanceOathState;
  score: number;
  oathText: string;
  publicBoundary: string;
  operatorBoundary: string;
};

export type SourceGovernanceOathAction = {
  id: string;
  label: string;
  posture: "publish_guided" | "hold_for_review" | "redact_first" | "operator_only";
  reason: string;
  safeBoundary: string;
};

export type SourceGovernanceOathGate = {
  version: "velmere_source_governance_oath_gate_v1_pass308";
  surface: SourceGovernanceOathSurface;
  query: string;
  oathId: string;
  oathState: SourceGovernanceOathState;
  governanceScore: number;
  oathPressure: number;
  sourceOriginScore: number;
  publicCopyScore: number;
  operatorLockScore: number;
  headline: string;
  lanes: SourceGovernanceOathLane[];
  actions: SourceGovernanceOathAction[];
  customerMicrocopy: string;
  operatorMicrocopy: string;
  psychologyRules: string[];
  blockedManipulationPatterns: string[];
  innovation: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback = 0) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return fallback;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function cleanQuery(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function slug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function stateFor(score: number, pressure: number): SourceGovernanceOathState {
  if (pressure >= 78 || score < 35) return "oath_operator_lock";
  if (pressure >= 60 || score < 54) return "oath_redacted_review";
  if (pressure >= 39 || score < 76) return "oath_guided_review";
  return "oath_greenlit";
}

function postureFor(state: SourceGovernanceOathState): SourceGovernanceOathAction["posture"] {
  if (state === "oath_greenlit") return "publish_guided";
  if (state === "oath_guided_review") return "hold_for_review";
  if (state === "oath_redacted_review") return "redact_first";
  return "operator_only";
}

function headlineFor(state: SourceGovernanceOathState) {
  if (state === "oath_greenlit") return "Source Governance Oath allows a guided public proof because origin, freshness, disclosure, credential and retention lanes agree";
  if (state === "oath_guided_review") return "Source Governance Oath keeps the proof in guided review until one source or language lane is rechecked";
  if (state === "oath_redacted_review") return "Source Governance Oath requires redaction before the proof can leave operator review";
  return "Source Governance Oath locks the proof to operator-only until source origin, expiry and customer language are verified";
}

function buildLane(input: {
  id: SourceGovernanceOathLaneId;
  label: string;
  score: number;
  pressure: number;
  oathText: string;
  publicBoundary: string;
  operatorBoundary: string;
}): SourceGovernanceOathLane {
  const score = clampScore(input.score);
  const state = stateFor(score, input.pressure);
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    oathText: input.oathText,
    publicBoundary: input.publicBoundary,
    operatorBoundary: input.operatorBoundary,
  };
}

export function buildSourceGovernanceOathGate(input: {
  surface: SourceGovernanceOathSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  selectiveDisclosureVaultGate?: SelectiveDisclosureVaultGate;
  verifiableSourceCredentialGate?: VerifiableSourceCredentialGate;
  credentialRetentionHaloGate?: CredentialRetentionHaloGate;
}): SourceGovernanceOathGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 50));

  const freshnessScore = input.freshnessTimecodeLedgerGate?.freshnessScore ?? confidence;
  const disclosureScore = input.selectiveDisclosureVaultGate?.disclosureScore ?? confidence;
  const privacyScore = input.selectiveDisclosureVaultGate?.privacyScore ?? 70;
  const credentialScore = input.verifiableSourceCredentialGate?.credentialScore ?? confidence;
  const issuerQuorum = input.verifiableSourceCredentialGate?.issuerQuorum ?? credentialScore;
  const retentionScore = input.credentialRetentionHaloGate?.retentionScore ?? average([freshnessScore, disclosureScore, credentialScore], 52);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - confidence + knownFaults.length * 8 + missingCount * 2);
  const redactionPressure = input.selectiveDisclosureVaultGate?.redactionPressure ?? clampScore(100 - disclosureScore + missingCount * 2);
  const expiryPressure = input.credentialRetentionHaloGate?.retentionPressure ?? clampScore(100 - retentionScore + knownFaults.length * 5);

  const sourceOriginScore = clampScore(average([confidence, issuerQuorum, freshnessScore], 50) - knownFaults.length * 3);
  const publicCopyScore = clampScore(average([disclosureScore, privacyScore, retentionScore], 50) - redactionPressure * 0.15);
  const operatorLockScore = clampScore(average([faultPressure, redactionPressure, expiryPressure], 0));
  const oathPressure = clampScore(operatorLockScore * 0.42 + (100 - sourceOriginScore) * 0.25 + missingCount * 3 + knownFaults.length * 7);
  const governanceScore = clampScore(average([sourceOriginScore, publicCopyScore, credentialScore, retentionScore, freshnessScore], 52) - oathPressure * 0.12);

  const lanes = [
    buildLane({
      id: "source_origin_oath",
      label: "Source origin oath",
      score: sourceOriginScore,
      pressure: 100 - sourceOriginScore + knownFaults.length * 4,
      oathText: "Never promote a market or luxury proof when origin, issuer or adapter lineage is unclear.",
      publicBoundary: "Public UI receives only the origin class, not raw internal source debt.",
      operatorBoundary: "Operator must verify issuer, adapter lineage and missing-source reason before release.",
    }),
    buildLane({
      id: "freshness_oath",
      label: "Freshness oath",
      score: freshnessScore,
      pressure: 100 - freshnessScore + knownFaults.length * 3,
      oathText: "Never let live-source proof outlive its timecode, replay window or expiry boundary.",
      publicBoundary: "Customer copy is downgraded when a source moves near stale or operator-only.",
      operatorBoundary: "Operator sees TTL, stale debt and refresh action before report copy moves.",
    }),
    buildLane({
      id: "selective_disclosure_oath",
      label: "Selective disclosure oath",
      score: disclosureScore,
      pressure: redactionPressure,
      oathText: "Reveal the minimum proof that supports trust without exposing raw payloads or private fields.",
      publicBoundary: "Public copy stays summary-level, guided or redacted based on proof pressure.",
      operatorBoundary: "Operator validates redaction, private fields and proof routing before export.",
    }),
    buildLane({
      id: "credential_oath",
      label: "Credential oath",
      score: credentialScore,
      pressure: 100 - credentialScore + Math.max(0, 62 - issuerQuorum),
      oathText: "A credential is a short-lived source handshake, not a promise of price, safety or solvency.",
      publicBoundary: "Customer sees credential class and expiry boundary only.",
      operatorBoundary: "Operator sees issuer quorum, attestation pressure and unsupported lanes.",
    }),
    buildLane({
      id: "retention_oath",
      label: "Retention oath",
      score: retentionScore,
      pressure: expiryPressure,
      oathText: "Expire, redact or purge proof before it becomes misleading, stale or over-retained.",
      publicBoundary: "Customer copy exposes the proof lifecycle without permanent trust language.",
      operatorBoundary: "Operator must check purge, replay retention and vault retention before reuse.",
    }),
    buildLane({
      id: "customer_language_oath",
      label: "Customer language oath",
      score: publicCopyScore,
      pressure: Math.max(redactionPressure, faultPressure * 0.65),
      oathText: "Use calm language: no pressure, no commands, no absolute safety and no artificial urgency.",
      publicBoundary: "Public text stays evidence-first, educational and no-verdict.",
      operatorBoundary: "Operator can see unresolved source debt without exposing it as customer persuasion.",
    }),
  ];

  const laneScore = average(lanes.map((lane) => lane.score), governanceScore);
  const oathState = stateFor(average([governanceScore, laneScore], 52), oathPressure);
  const headline = headlineFor(oathState);
  const actionPosture = postureFor(oathState);
  const oathId = `oath-${slug(input.surface)}-${slug(query || "source")}-${Math.round(governanceScore)}`;

  return {
    version: "velmere_source_governance_oath_gate_v1_pass308",
    surface: input.surface,
    query,
    oathId,
    oathState,
    governanceScore,
    oathPressure,
    sourceOriginScore,
    publicCopyScore,
    operatorLockScore,
    headline,
    lanes,
    actions: [
      {
        id: "source-governance-oath-action",
        label: oathState === "oath_greenlit" ? "Publish guided proof" : oathState === "oath_guided_review" ? "Hold for source review" : oathState === "oath_redacted_review" ? "Redact before copy" : "Lock to operator vault",
        posture: actionPosture,
        reason: headline,
        safeBoundary: "Governance Oath blocks manipulative urgency and keeps customer copy tied to source origin, freshness and retention proof.",
      },
    ],
    customerMicrocopy:
      oathState === "oath_greenlit"
        ? "Proof can be shown as a guided summary because source governance lanes agree."
        : oathState === "oath_guided_review"
          ? "Proof stays guided while source, freshness or language lanes are reviewed."
          : oathState === "oath_redacted_review"
            ? "Proof needs redaction before it can become customer-facing copy."
            : "Proof is operator-only until source origin, expiry and customer language are verified.",
    operatorMicrocopy: `Governance ${governanceScore}/100 · pressure ${oathPressure}/100 · origin ${sourceOriginScore}/100 · public copy ${publicCopyScore}/100.`,
    psychologyRules: [
      "Elite status must be earned by source governance, not artificial scarcity.",
      "FOMO is converted into review friction when sources are stale, private or incomplete.",
      "Customer copy must show proof boundaries instead of absolute verdicts.",
      "Operator-only debt cannot be repackaged as a premium public claim.",
    ],
    blockedManipulationPatterns: [
      "no artificial urgency pressure",
      "no last-chance language",
      "no buy or sell command",
      "no absolute safety wording",
      "no solvency promise",
    ],
    innovation: "Source Governance Oath turns exchange-grade source freshness and luxury-grade provenance into an ethical public-copy release oath before Shield, Lens or report surfaces can display premium trust language.",
  };
}
