import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { CredentialRetentionHaloGate } from "@/lib/market-integrity/credential-retention-halo-gate";
import type { SourceGovernanceOathGate } from "@/lib/market-integrity/source-governance-oath-gate";
import type { EthicalSignalEventTaxonomyGate } from "@/lib/market-integrity/ethical-signal-event-taxonomy-gate";
import type { ProofConsentReceiptGate } from "@/lib/market-integrity/proof-consent-receipt-gate";

export const PASS311_AUDIT_TRAIL_COVENANT_GATE = true;

export type AuditTrailCovenantSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type AuditTrailCovenantState =
  | "covenant_public_ready"
  | "covenant_guided_audit"
  | "covenant_redacted_review"
  | "covenant_operator_vault";

export type AuditTrailCovenantLaneId =
  | "event_origin_receipt"
  | "consent_chain"
  | "source_timecode"
  | "retention_purge"
  | "redacted_export"
  | "report_replay";

export type AuditTrailCovenantLane = {
  id: AuditTrailCovenantLaneId;
  label: string;
  state: AuditTrailCovenantState;
  score: number;
  custodyClass: "public_covenant" | "guided_covenant" | "redacted_covenant" | "operator_vault";
  customerLine: string;
  operatorLine: string;
  allowedTrailFields: string[];
  withheldTrailFields: string[];
};

export type AuditTrailCovenantAction = {
  id: string;
  label: string;
  posture: "append_public_receipt" | "guided_review" | "redact_before_append" | "operator_vault_only";
  reason: string;
  safeBoundary: string;
};

export type AuditTrailCovenantGate = {
  version: "velmere_audit_trail_covenant_gate_v1_pass311";
  surface: AuditTrailCovenantSurface;
  query: string;
  covenantId: string;
  covenantState: AuditTrailCovenantState;
  covenantScore: number;
  auditTrailScore: number;
  replayIntegrityScore: number;
  custodyPressure: number;
  publicLedgerReadiness: number;
  retentionWindowSeconds: number;
  headline: string;
  lanes: AuditTrailCovenantLane[];
  actions: AuditTrailCovenantAction[];
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

function stateFor(score: number, pressure: number): AuditTrailCovenantState {
  if (pressure >= 82 || score < 36) return "covenant_operator_vault";
  if (pressure >= 62 || score < 56) return "covenant_redacted_review";
  if (pressure >= 40 || score < 80) return "covenant_guided_audit";
  return "covenant_public_ready";
}

function custodyClassFor(state: AuditTrailCovenantState): AuditTrailCovenantLane["custodyClass"] {
  if (state === "covenant_public_ready") return "public_covenant";
  if (state === "covenant_guided_audit") return "guided_covenant";
  if (state === "covenant_redacted_review") return "redacted_covenant";
  return "operator_vault";
}

function postureFor(state: AuditTrailCovenantState): AuditTrailCovenantAction["posture"] {
  if (state === "covenant_public_ready") return "append_public_receipt";
  if (state === "covenant_guided_audit") return "guided_review";
  if (state === "covenant_redacted_review") return "redact_before_append";
  return "operator_vault_only";
}

function headlineFor(state: AuditTrailCovenantState) {
  if (state === "covenant_public_ready") return "Audit Trail Covenant can append a minimal public proof trail because event origin, consent and retention boundaries agree";
  if (state === "covenant_guided_audit") return "Audit Trail Covenant keeps the trail guided while replay, consent and source timecodes are checked";
  if (state === "covenant_redacted_review") return "Audit Trail Covenant requires redaction before proof trails can support report or public copy";
  return "Audit Trail Covenant keeps the trail operator-only because event origin, retention or consent custody is not ready";
}

function buildLane(input: {
  id: AuditTrailCovenantLaneId;
  label: string;
  score: number;
  pressure: number;
  customerLine: string;
  operatorLine: string;
  allowedTrailFields: string[];
  withheldTrailFields: string[];
}): AuditTrailCovenantLane {
  const score = clampScore(input.score);
  const state = stateFor(score, input.pressure);
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    custodyClass: custodyClassFor(state),
    customerLine: input.customerLine,
    operatorLine: input.operatorLine,
    allowedTrailFields: input.allowedTrailFields,
    withheldTrailFields: input.withheldTrailFields,
  };
}

export function buildAuditTrailCovenantGate(input: {
  surface: AuditTrailCovenantSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  credentialRetentionHaloGate?: CredentialRetentionHaloGate;
  sourceGovernanceOathGate?: SourceGovernanceOathGate;
  ethicalSignalEventTaxonomyGate?: EthicalSignalEventTaxonomyGate;
  proofConsentReceiptGate?: ProofConsentReceiptGate;
}): AuditTrailCovenantGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 54));
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);

  const freshnessScore = input.freshnessTimecodeLedgerGate?.freshnessScore ?? confidence;
  const retentionScore = input.credentialRetentionHaloGate?.retentionScore ?? average([freshnessScore, confidence], 56);
  const governanceScore = input.sourceGovernanceOathGate?.governanceScore ?? average([freshnessScore, retentionScore], 58);
  const taxonomyScore = input.ethicalSignalEventTaxonomyGate?.taxonomyScore ?? average([governanceScore, retentionScore], 58);
  const privacyScore = input.ethicalSignalEventTaxonomyGate?.privacyScore ?? 70;
  const consentScore = input.proofConsentReceiptGate?.consentScore ?? average([taxonomyScore, privacyScore, governanceScore], 60);
  const receiptScore = input.proofConsentReceiptGate?.receiptScore ?? average([consentScore, governanceScore, retentionScore], 58);
  const receiptReview = input.proofConsentReceiptGate?.operatorReviewPressure ?? clampScore(100 - receiptScore + knownFaults.length * 7 + missingCount * 2);
  const consentExpiry = input.proofConsentReceiptGate?.expirySeconds ?? 900;
  const haloExpiry = input.credentialRetentionHaloGate?.purgeAfterSeconds ?? 1800;
  const retentionWindowSeconds = Math.min(consentExpiry, haloExpiry);

  const replayIntegrityScore = clampScore(average([freshnessScore, receiptScore, governanceScore], 58) - knownFaults.length * 3 - missingCount);
  const auditTrailScore = clampScore(average([taxonomyScore, consentScore, replayIntegrityScore, retentionScore, privacyScore], 60) - knownFaults.length * 2);
  const publicLedgerReadiness = clampScore(average([auditTrailScore, receiptScore, privacyScore, governanceScore], 58) - receiptReview * 0.12 - missingCount * 1.5);
  const custodyPressure = clampScore(receiptReview * 0.30 + (100 - privacyScore) * 0.22 + (100 - replayIntegrityScore) * 0.18 + (100 - retentionScore) * 0.16 + missingCount * 2 + knownFaults.length * 7);
  const covenantScore = clampScore(average([auditTrailScore, replayIntegrityScore, publicLedgerReadiness, receiptScore], 58) - custodyPressure * 0.08);

  const lanes = [
    buildLane({
      id: "event_origin_receipt",
      label: "Event origin receipt",
      score: taxonomyScore,
      pressure: custodyPressure,
      customerLine: "Customer sees a proof-event class and origin boundary, not raw analytics payloads.",
      operatorLine: "Operator checks whether every event belongs to an approved proof/source/disclosure class.",
      allowedTrailFields: ["event class", "surface", "proof posture"],
      withheldTrailFields: ["raw clickstream", "fingerprint", "private session trace"],
    }),
    buildLane({
      id: "consent_chain",
      label: "Consent chain",
      score: consentScore,
      pressure: Math.max(custodyPressure, receiptReview),
      customerLine: "Customer copy follows the consent receipt before any proof benefit is shown.",
      operatorLine: "Operator sees consent score, receipt state and review pressure before public copy moves.",
      allowedTrailFields: ["consent class", "receipt id", "review posture"],
      withheldTrailFields: ["private operator note", "unreviewed claim", "hidden persuasion logic"],
    }),
    buildLane({
      id: "source_timecode",
      label: "Source timecode",
      score: freshnessScore,
      pressure: Math.max(custodyPressure, 100 - freshnessScore),
      customerLine: "Customer sees that live/source proof is time-bound and may need refresh.",
      operatorLine: "Operator reviews source TTL, reconnect boundary and snapshot freshness before reuse.",
      allowedTrailFields: ["freshness class", "expiry bucket", "snapshot class"],
      withheldTrailFields: ["raw API payload", "provider token", "unbounded source log"],
    }),
    buildLane({
      id: "retention_purge",
      label: "Retention purge",
      score: retentionScore,
      pressure: Math.max(custodyPressure, 100 - retentionScore),
      customerLine: "Customer sees a minimal retention promise and an expiry window, not permanent tracking.",
      operatorLine: "Operator checks purge boundary, replay retention and vault retention before report export.",
      allowedTrailFields: ["purge class", "retention window", "vault boundary"],
      withheldTrailFields: ["long-term personal trace", "raw browser replay", "unbounded vault memo"],
    }),
    buildLane({
      id: "redacted_export",
      label: "Redacted export",
      score: average([privacyScore, receiptScore, publicLedgerReadiness], 58),
      pressure: Math.max(custodyPressure, 100 - privacyScore),
      customerLine: "Customer export can include only safe receipt fields and proof classes.",
      operatorLine: "Operator blocks raw payload, PII, unsupported certainty and private source debt from export.",
      allowedTrailFields: ["redacted receipt", "safe evidence note", "source class"],
      withheldTrailFields: ["PII", "secret", "raw wallet linkage", "unsupported verdict"],
    }),
    buildLane({
      id: "report_replay",
      label: "Report replay",
      score: replayIntegrityScore,
      pressure: custodyPressure,
      customerLine: "Report replay gets a minimal proof trail only when timecode, consent and redaction agree.",
      operatorLine: "Operator sees replay integrity and source debt before PDF/browser replay can be reused.",
      allowedTrailFields: ["replay class", "covenant id", "report boundary"],
      withheldTrailFields: ["full browser trace", "raw DOM state", "private operator vault"],
    }),
  ];

  const laneScore = average(lanes.map((lane) => lane.score), covenantScore);
  const covenantState = stateFor(average([covenantScore, laneScore], 58), custodyPressure);
  const covenantId = `audit-${slug(input.surface)}-${slug(query || "source")}-${Math.round(covenantScore)}`;

  return {
    version: "velmere_audit_trail_covenant_gate_v1_pass311",
    surface: input.surface,
    query,
    covenantId,
    covenantState,
    covenantScore,
    auditTrailScore,
    replayIntegrityScore,
    custodyPressure,
    publicLedgerReadiness,
    retentionWindowSeconds,
    headline: headlineFor(covenantState),
    lanes,
    actions: [
      {
        id: "audit-trail-covenant-action",
        label:
          covenantState === "covenant_public_ready"
            ? "Append minimal audit trail"
            : covenantState === "covenant_guided_audit"
              ? "Guide audit review"
              : covenantState === "covenant_redacted_review"
                ? "Redact trail before report"
                : "Keep trail in operator vault",
        posture: postureFor(covenantState),
        reason: headlineFor(covenantState),
        safeBoundary: "Audit Trail Covenant can append only source, consent, retention and redaction classes; it must never expose raw private telemetry or turn proof debt into persuasion copy.",
      },
    ],
    customerMicrocopy:
      covenantState === "covenant_public_ready"
        ? "Velmère can append a minimal audit trail because event origin, consent, retention and redaction boundaries agree."
        : covenantState === "covenant_guided_audit"
          ? "Audit trail stays guided until source timecode, consent and replay integrity are reviewed."
          : covenantState === "covenant_redacted_review"
            ? "Audit trail needs redaction before it can support report preview or customer copy."
            : "Audit trail stays operator-only until source, consent and retention custody are ready.",
    operatorMicrocopy: `Covenant ${covenantScore}/100 · audit ${auditTrailScore}/100 · replay ${replayIntegrityScore}/100 · custody pressure ${custodyPressure}/100 · retention ${retentionWindowSeconds}s.`,
    psychologyRules: [
      "Proof trails must make custody visible before any premium status appears.",
      "High attention or social pressure increases review friction instead of urgency copy.",
      "Luxury status is attached to restraint, provenance, consent and redaction.",
      "Customer copy receives the trail boundary before the trust benefit.",
    ],
    blockedManipulationPatterns: [
      "no urgency bait",
      "no scarcity theatre",
      "no raw clickstream export",
      "no engagement-only analytics",
      "no unsupported certainty",
      "no financial instruction",
    ],
    innovation: "Audit Trail Covenant fuses exchange-grade source timecodes with luxury-grade provenance custody: every proof, report and replay path gets a minimal public trail, held-field list, consent chain and retention window before it can leave the operator-safe lane.",
  };
}
