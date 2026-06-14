import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { SelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";
import type { VerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";
import type { CredentialRetentionHaloGate } from "@/lib/market-integrity/credential-retention-halo-gate";
import type { SourceGovernanceOathGate } from "@/lib/market-integrity/source-governance-oath-gate";

export const PASS309_ETHICAL_SIGNAL_EVENT_TAXONOMY_GATE = true;

export type EthicalSignalEventTaxonomySurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type EthicalSignalEventTaxonomyState =
  | "taxonomy_publishable"
  | "taxonomy_guided_review"
  | "taxonomy_redacted_review"
  | "taxonomy_operator_only";

export type EthicalSignalEventTaxonomyLaneId =
  | "search_intent_event"
  | "source_open_event"
  | "proof_escalation_event"
  | "disclosure_boundary_event"
  | "retention_expiry_event"
  | "customer_copy_event";

export type EthicalSignalEventTaxonomyLane = {
  id: EthicalSignalEventTaxonomyLaneId;
  eventName: string;
  label: string;
  state: EthicalSignalEventTaxonomyState;
  score: number;
  privacyClass: "anonymous_public" | "redacted_session" | "operator_receipt" | "vault_only";
  allowedPayload: string[];
  blockedPayload: string[];
  customerBoundary: string;
  operatorBoundary: string;
};

export type EthicalSignalEventTaxonomyAction = {
  id: string;
  label: string;
  posture: "track_minimal" | "review_before_track" | "redact_payload" | "operator_only";
  reason: string;
  safeBoundary: string;
};

export type EthicalSignalEventTaxonomyGate = {
  version: "velmere_ethical_signal_event_taxonomy_gate_v1_pass309";
  surface: EthicalSignalEventTaxonomySurface;
  query: string;
  taxonomyId: string;
  taxonomyState: EthicalSignalEventTaxonomyState;
  taxonomyScore: number;
  privacyScore: number;
  consentFriction: number;
  eventCoverageScore: number;
  proofEventScore: number;
  governanceScore: number;
  headline: string;
  lanes: EthicalSignalEventTaxonomyLane[];
  actions: EthicalSignalEventTaxonomyAction[];
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

function stateFor(score: number, friction: number): EthicalSignalEventTaxonomyState {
  if (friction >= 80 || score < 35) return "taxonomy_operator_only";
  if (friction >= 62 || score < 54) return "taxonomy_redacted_review";
  if (friction >= 40 || score < 76) return "taxonomy_guided_review";
  return "taxonomy_publishable";
}

function privacyClassFor(state: EthicalSignalEventTaxonomyState): EthicalSignalEventTaxonomyLane["privacyClass"] {
  if (state === "taxonomy_publishable") return "anonymous_public";
  if (state === "taxonomy_guided_review") return "redacted_session";
  if (state === "taxonomy_redacted_review") return "operator_receipt";
  return "vault_only";
}

function postureFor(state: EthicalSignalEventTaxonomyState): EthicalSignalEventTaxonomyAction["posture"] {
  if (state === "taxonomy_publishable") return "track_minimal";
  if (state === "taxonomy_guided_review") return "review_before_track";
  if (state === "taxonomy_redacted_review") return "redact_payload";
  return "operator_only";
}

function headlineFor(state: EthicalSignalEventTaxonomyState) {
  if (state === "taxonomy_publishable") return "Ethical Signal Event Taxonomy can record minimal anonymous proof events without turning attention into pressure";
  if (state === "taxonomy_guided_review") return "Ethical Signal Event Taxonomy keeps event capture in guided review until payload and consent boundaries are checked";
  if (state === "taxonomy_redacted_review") return "Ethical Signal Event Taxonomy requires redaction before proof, search or report events can be reused";
  return "Ethical Signal Event Taxonomy locks event capture to operator-only because privacy, source or governance lanes are not ready";
}

function buildLane(input: {
  id: EthicalSignalEventTaxonomyLaneId;
  eventName: string;
  label: string;
  score: number;
  friction: number;
  allowedPayload: string[];
  blockedPayload: string[];
  customerBoundary: string;
  operatorBoundary: string;
}): EthicalSignalEventTaxonomyLane {
  const score = clampScore(input.score);
  const state = stateFor(score, input.friction);
  return {
    id: input.id,
    eventName: input.eventName,
    label: input.label,
    state,
    score,
    privacyClass: privacyClassFor(state),
    allowedPayload: input.allowedPayload,
    blockedPayload: input.blockedPayload,
    customerBoundary: input.customerBoundary,
    operatorBoundary: input.operatorBoundary,
  };
}

export function buildEthicalSignalEventTaxonomyGate(input: {
  surface: EthicalSignalEventTaxonomySurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  selectiveDisclosureVaultGate?: SelectiveDisclosureVaultGate;
  verifiableSourceCredentialGate?: VerifiableSourceCredentialGate;
  credentialRetentionHaloGate?: CredentialRetentionHaloGate;
  sourceGovernanceOathGate?: SourceGovernanceOathGate;
}): EthicalSignalEventTaxonomyGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 52));
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const suggestionCount = routerSuggestions.length;
  const resultCount = results.length;

  const freshnessScore = input.freshnessTimecodeLedgerGate?.freshnessScore ?? confidence;
  const disclosureScore = input.selectiveDisclosureVaultGate?.disclosureScore ?? confidence;
  const privacyBase = input.selectiveDisclosureVaultGate?.privacyScore ?? 72;
  const credentialScore = input.verifiableSourceCredentialGate?.credentialScore ?? confidence;
  const retentionScore = input.credentialRetentionHaloGate?.retentionScore ?? average([freshnessScore, credentialScore], 52);
  const governanceScore = input.sourceGovernanceOathGate?.governanceScore ?? average([freshnessScore, disclosureScore, credentialScore, retentionScore], 52);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - confidence + knownFaults.length * 8 + missingCount * 2);
  const redactionPressure = input.selectiveDisclosureVaultGate?.redactionPressure ?? clampScore(100 - disclosureScore + missingCount * 2);
  const oathPressure = input.sourceGovernanceOathGate?.oathPressure ?? clampScore(faultPressure * 0.45 + redactionPressure * 0.35 + knownFaults.length * 5);

  const eventCoverageScore = clampScore(average([suggestionCount ? 78 : 50, resultCount ? 76 : 52, confidence, freshnessScore], 56) - knownFaults.length * 3);
  const proofEventScore = clampScore(average([credentialScore, retentionScore, governanceScore, freshnessScore], 52) - oathPressure * 0.08);
  const privacyScore = clampScore(average([privacyBase, disclosureScore, retentionScore], 64) - redactionPressure * 0.10);
  const consentFriction = clampScore(faultPressure * 0.28 + redactionPressure * 0.30 + oathPressure * 0.25 + missingCount * 2 + knownFaults.length * 5);
  const taxonomyScore = clampScore(average([eventCoverageScore, proofEventScore, privacyScore, governanceScore], 58) - consentFriction * 0.10);

  const lanes = [
    buildLane({
      id: "search_intent_event",
      eventName: "shield.search.intent.minimal",
      label: "Search intent event",
      score: eventCoverageScore,
      friction: consentFriction,
      allowedPayload: ["surface", "queryClass", "resultCount", "timestampBucket"],
      blockedPayload: ["raw query if sensitive", "ip address", "wallet address", "private notes"],
      customerBoundary: "Customer experience can show that Lens understood the search class without exposing raw personal context.",
      operatorBoundary: "Operator receives only redacted query class and source count unless a case requires manual review.",
    }),
    buildLane({
      id: "source_open_event",
      eventName: "shield.source.open.redacted",
      label: "Source open event",
      score: freshnessScore,
      friction: Math.max(consentFriction, 100 - freshnessScore),
      allowedPayload: ["sourceType", "freshnessClass", "confidenceBucket"],
      blockedPayload: ["raw API payload", "session fingerprint", "private adapter errors"],
      customerBoundary: "Public UI can show a source class and freshness class, not raw adapter internals.",
      operatorBoundary: "Operator sees source debt, retry posture and stale reason inside the vault lane.",
    }),
    buildLane({
      id: "proof_escalation_event",
      eventName: "shield.proof.escalation.receipt",
      label: "Proof escalation event",
      score: proofEventScore,
      friction: Math.max(consentFriction, 100 - proofEventScore),
      allowedPayload: ["credentialClass", "proofTier", "governanceState", "retentionClass"],
      blockedPayload: ["absolute verdict", "financial command", "solvency promise"],
      customerBoundary: "Customer copy receives only the proof class and boundary language.",
      operatorBoundary: "Operator gets the escalation reason and unsupported lanes before any report copy moves.",
    }),
    buildLane({
      id: "disclosure_boundary_event",
      eventName: "shield.disclosure.boundary.redacted",
      label: "Disclosure boundary event",
      score: disclosureScore,
      friction: Math.max(redactionPressure, consentFriction),
      allowedPayload: ["disclosureLevel", "redactionPressure", "publicCopyClass"],
      blockedPayload: ["PII", "secret key", "raw wallet linkage", "private operator memo"],
      customerBoundary: "Customer sees why some proof is hidden, not the hidden data itself.",
      operatorBoundary: "Operator validates private fields, redaction and role boundary before export.",
    }),
    buildLane({
      id: "retention_expiry_event",
      eventName: "shield.retention.expiry.timecode",
      label: "Retention expiry event",
      score: retentionScore,
      friction: Math.max(consentFriction, 100 - retentionScore),
      allowedPayload: ["ttlBucket", "purgeClass", "replayWindow"],
      blockedPayload: ["persistent tracking id", "raw browser trace", "permanent trust label"],
      customerBoundary: "Customer copy gets expiry transparency without permanent trust language.",
      operatorBoundary: "Operator sees purge, replay and vault retention windows before reuse.",
    }),
    buildLane({
      id: "customer_copy_event",
      eventName: "shield.customer.copy.safety",
      label: "Customer copy event",
      score: governanceScore,
      friction: Math.max(oathPressure, consentFriction),
      allowedPayload: ["copyClass", "safeBoundary", "languageRiskBucket"],
      blockedPayload: ["urgency bait", "fake scarcity", "buy or sell instruction", "guarantee wording"],
      customerBoundary: "Customer text stays calm, evidence-first and no-verdict.",
      operatorBoundary: "Operator can review language risk without converting source debt into persuasion.",
    }),
  ];

  const laneScore = average(lanes.map((lane) => lane.score), taxonomyScore);
  const taxonomyState = stateFor(average([taxonomyScore, laneScore], 58), consentFriction);
  const headline = headlineFor(taxonomyState);
  const taxonomyId = `taxonomy-${slug(input.surface)}-${slug(query || "source")}-${Math.round(taxonomyScore)}`;

  return {
    version: "velmere_ethical_signal_event_taxonomy_gate_v1_pass309",
    surface: input.surface,
    query,
    taxonomyId,
    taxonomyState,
    taxonomyScore,
    privacyScore,
    consentFriction,
    eventCoverageScore,
    proofEventScore,
    governanceScore: clampScore(governanceScore),
    headline,
    lanes,
    actions: [
      {
        id: "ethical-signal-event-taxonomy-action",
        label:
          taxonomyState === "taxonomy_publishable"
            ? "Track minimal proof event"
            : taxonomyState === "taxonomy_guided_review"
              ? "Review event payload"
              : taxonomyState === "taxonomy_redacted_review"
                ? "Redact before tracking"
                : "Keep event operator-only",
        posture: postureFor(taxonomyState),
        reason: headline,
        safeBoundary: "Event Taxonomy logs only evidence, freshness and disclosure classes; it never turns engagement, hype or urgency into a customer persuasion signal.",
      },
    ],
    customerMicrocopy:
      taxonomyState === "taxonomy_publishable"
        ? "Velmère can record a minimal anonymous proof event because privacy, retention and source governance agree."
        : taxonomyState === "taxonomy_guided_review"
          ? "Event capture stays guided while payload, source or language boundaries are reviewed."
          : taxonomyState === "taxonomy_redacted_review"
            ? "Event capture needs redaction before it can support product analytics or report receipts."
            : "Event capture is operator-only until source, privacy and governance lanes are ready.",
    operatorMicrocopy: `Taxonomy ${taxonomyScore}/100 · privacy ${privacyScore}/100 · event coverage ${eventCoverageScore}/100 · friction ${consentFriction}/100.`,
    psychologyRules: [
      "Analytics must measure proof readiness, not exploit attention or urgency.",
      "High social interest increases review friction instead of pressure copy.",
      "Elite status is earned by consent-safe source events, not fake scarcity.",
      "Customer copy must reveal boundaries, not convert hidden telemetry into persuasion.",
    ],
    blockedManipulationPatterns: [
      "no engagement-only ranking",
      "no dark-pattern funnel events",
      "no countdown or last-chance triggers",
      "no buy or sell instruction",
      "no raw private payload in analytics",
    ],
    innovation: "Ethical Signal Event Taxonomy turns exchange-grade market events and luxury-grade provenance milestones into privacy-minimized proof telemetry, so Shield can learn from searches, source opens and report boundaries without creating a manipulation feed.",
  };
}
