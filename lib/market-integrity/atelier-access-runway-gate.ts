import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { ProofConsentReceiptGate } from "@/lib/market-integrity/proof-consent-receipt-gate";
import type { AuditTrailCovenantGate } from "@/lib/market-integrity/audit-trail-covenant-gate";
import type { PrestigeProofCompassGate } from "@/lib/market-integrity/prestige-proof-compass-gate";

export const PASS313_ATELIER_ACCESS_RUNWAY_GATE = true;

export type AtelierAccessRunwaySurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type AtelierAccessRunwayState =
  | "runway_atelier_open"
  | "runway_private_salon"
  | "runway_redacted_lobby"
  | "runway_operator_hold";

export type AtelierAccessRunwayLaneId =
  | "live_epoch_ticket"
  | "passport_status_lane"
  | "proof_compass_lane"
  | "consent_entry_lane"
  | "audit_receipt_lane"
  | "scarcity_firewall_lane";

export type AtelierAccessRunwayLane = {
  id: AtelierAccessRunwayLaneId;
  label: string;
  state: AtelierAccessRunwayState;
  score: number;
  gateClass: "atelier_access" | "private_salon" | "redacted_lobby" | "operator_hold";
  publicCue: string;
  operatorCue: string;
  unlockCondition: string;
};

export type AtelierAccessRunwayAction = {
  id: string;
  label: string;
  posture: "show_silent_drop" | "show_private_salon_preview" | "redact_access_teaser" | "operator_hold";
  reason: string;
  safeBoundary: string;
};

export type AtelierAccessRunwayGate = {
  version: "velmere_atelier_access_runway_gate_v1_pass313";
  surface: AtelierAccessRunwaySurface;
  query: string;
  runwayId: string;
  runwayState: AtelierAccessRunwayState;
  salonAccessScore: number;
  accessReadiness: number;
  statusDropRisk: number;
  urgencySuppressionScore: number;
  liveEpochHours: 24;
  passportContinuityScore: number;
  headline: string;
  lanes: AtelierAccessRunwayLane[];
  actions: AtelierAccessRunwayAction[];
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

function stateFor(score: number, pressure: number): AtelierAccessRunwayState {
  if (pressure >= 84 || score < 36) return "runway_operator_hold";
  if (pressure >= 64 || score < 56) return "runway_redacted_lobby";
  if (pressure >= 38 || score < 82) return "runway_private_salon";
  return "runway_atelier_open";
}

function gateClassFor(state: AtelierAccessRunwayState): AtelierAccessRunwayLane["gateClass"] {
  if (state === "runway_atelier_open") return "atelier_access";
  if (state === "runway_private_salon") return "private_salon";
  if (state === "runway_redacted_lobby") return "redacted_lobby";
  return "operator_hold";
}

function postureFor(state: AtelierAccessRunwayState): AtelierAccessRunwayAction["posture"] {
  if (state === "runway_atelier_open") return "show_silent_drop";
  if (state === "runway_private_salon") return "show_private_salon_preview";
  if (state === "runway_redacted_lobby") return "redact_access_teaser";
  return "operator_hold";
}

function headlineFor(state: AtelierAccessRunwayState) {
  if (state === "runway_atelier_open") return "Atelier Access Runway can open a silent elite proof drop because live epoch, passport, consent, audit and anti-FOMO lanes agree";
  if (state === "runway_private_salon") return "Atelier Access Runway keeps the drop as a private salon preview until one proof or consent lane is refreshed";
  if (state === "runway_redacted_lobby") return "Atelier Access Runway redacts access teasing because proof maturity, consent or source custody needs review";
  return "Atelier Access Runway holds the drop operator-only because proof, passport, audit or scarcity boundaries are not safe";
}

function buildLane(input: {
  id: AtelierAccessRunwayLaneId;
  label: string;
  score: number;
  pressure: number;
  publicCue: string;
  operatorCue: string;
  unlockCondition: string;
}): AtelierAccessRunwayLane {
  const score = clampScore(input.score);
  const state = stateFor(score, clampScore(input.pressure));
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    gateClass: gateClassFor(state),
    publicCue: input.publicCue,
    operatorCue: input.operatorCue,
    unlockCondition: input.unlockCondition,
  };
}

export function buildAtelierAccessRunwayGate(input: {
  surface: AtelierAccessRunwaySurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  proofConsentReceiptGate?: ProofConsentReceiptGate;
  auditTrailCovenantGate?: AuditTrailCovenantGate;
  prestigeProofCompassGate?: PrestigeProofCompassGate;
}): AtelierAccessRunwayGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 56));

  const freshnessScore = input.freshnessTimecodeLedgerGate?.freshnessScore ?? sourceConfidence;
  const replayReadiness = input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshnessScore;
  const expirySeconds = input.freshnessTimecodeLedgerGate?.expirySeconds ?? 900;
  const consentScore = input.proofConsentReceiptGate?.consentScore ?? average([freshnessScore, sourceConfidence], 58);
  const receiptScore = input.proofConsentReceiptGate?.receiptScore ?? average([consentScore, freshnessScore], 58);
  const receiptPressure = input.proofConsentReceiptGate?.operatorReviewPressure ?? clampScore(100 - receiptScore + knownFaults.length * 7 + missingCount * 2);
  const covenantScore = input.auditTrailCovenantGate?.covenantScore ?? average([receiptScore, consentScore], 58);
  const auditTrailScore = input.auditTrailCovenantGate?.auditTrailScore ?? covenantScore;
  const custodyPressure = input.auditTrailCovenantGate?.custodyPressure ?? clampScore(100 - covenantScore + knownFaults.length * 7 + missingCount * 2);
  const prestigeScore = input.prestigeProofCompassGate?.prestigeScore ?? average([sourceConfidence, covenantScore, receiptScore], 58);
  const proofMaturity = input.prestigeProofCompassGate?.proofMaturity ?? average([prestigeScore, freshnessScore, covenantScore], 58);
  const dppTraceabilityScore = input.prestigeProofCompassGate?.dppTraceabilityScore ?? average([proofMaturity, covenantScore], 58);
  const exclusivityFriction = input.prestigeProofCompassGate?.exclusivityFriction ?? clampScore(100 - prestigeScore + knownFaults.length * 6 + missingCount * 2);
  const statusSafetyScore = input.prestigeProofCompassGate?.statusSafetyScore ?? average([prestigeScore, consentScore, 100 - custodyPressure], 58);

  const liveEpochHours = 24 as const;
  const liveEpochScore = clampScore(average([freshnessScore, replayReadiness], 58) - (expirySeconds < 240 ? 10 : 0));
  const passportContinuityScore = clampScore(average([dppTraceabilityScore, proofMaturity, covenantScore], 58) - missingCount);
  const urgencySuppressionScore = clampScore(
    average([100 - exclusivityFriction, statusSafetyScore, consentScore, 100 - receiptPressure, 100 - custodyPressure], 58) - knownFaults.length * 2,
  );
  const accessReadiness = clampScore(
    average([liveEpochScore, passportContinuityScore, prestigeScore, proofMaturity, consentScore, receiptScore, auditTrailScore], 58) -
      missingCount * 0.9 -
      knownFaults.length * 2,
  );
  const statusDropRisk = clampScore(
    exclusivityFriction * 0.30 +
      receiptPressure * 0.21 +
      custodyPressure * 0.18 +
      (100 - liveEpochScore) * 0.14 +
      (100 - passportContinuityScore) * 0.11 +
      Math.max(0, 600 - expirySeconds) * 0.018 +
      missingCount * 2.3 +
      knownFaults.length * 7,
  );
  const salonAccessScore = clampScore(accessReadiness * 0.58 + urgencySuppressionScore * 0.25 + (100 - statusDropRisk) * 0.17);
  const runwayState = stateFor(salonAccessScore, statusDropRisk);
  const runwayId = `runway-${slug(input.surface)}-${slug(query || "source")}-${salonAccessScore}`;

  const lanes = [
    buildLane({
      id: "live_epoch_ticket",
      label: "Live epoch ticket",
      score: liveEpochScore,
      pressure: Math.max(100 - liveEpochScore, expirySeconds < 240 ? 68 : 24),
      publicCue: `Live access is time-boxed; exchange-style proof must be refreshed inside the ${liveEpochHours}h outer window.`,
      operatorCue: `Freshness ${freshnessScore}/100 · replay ${replayReadiness}/100 · ttl ${expirySeconds}s.`,
      unlockCondition: "Refresh stale live proof before any premium access cue is shown.",
    }),
    buildLane({
      id: "passport_status_lane",
      label: "Passport status lane",
      score: passportContinuityScore,
      pressure: 100 - passportContinuityScore + missingCount * 2,
      publicCue: "Luxury-style status needs a traceability/passport lane before it becomes a customer-facing cue.",
      operatorCue: `DPP ${dppTraceabilityScore}/100 · passport continuity ${passportContinuityScore}/100 · missing ${missingCount}.`,
      unlockCondition: "Add provenance/traceability context or keep the salon copy redacted.",
    }),
    buildLane({
      id: "proof_compass_lane",
      label: "Proof compass lane",
      score: prestigeScore,
      pressure: exclusivityFriction,
      publicCue: "Elite status is earned by proof maturity and is downgraded when evidence is weak.",
      operatorCue: `Prestige ${prestigeScore}/100 · proof ${proofMaturity}/100 · friction ${exclusivityFriction}/100.`,
      unlockCondition: "Raise proof maturity instead of adding urgency or fake scarcity.",
    }),
    buildLane({
      id: "consent_entry_lane",
      label: "Consent entry lane",
      score: consentScore,
      pressure: Math.max(receiptPressure, 100 - consentScore),
      publicCue: "Customer-facing access copy follows consent and disclosure scope before prestige language.",
      operatorCue: `Consent ${consentScore}/100 · receipt ${receiptScore}/100 · review ${receiptPressure}/100.`,
      unlockCondition: "Collect safe disclosure/consent receipt before report or access copy moves.",
    }),
    buildLane({
      id: "audit_receipt_lane",
      label: "Audit receipt lane",
      score: covenantScore,
      pressure: custodyPressure,
      publicCue: "Access runway needs a minimal audit receipt before PDF/replay/status copy can use it.",
      operatorCue: `Covenant ${covenantScore}/100 · audit ${auditTrailScore}/100 · custody ${custodyPressure}/100.`,
      unlockCondition: "Append a redacted covenant receipt or keep the drop operator-only.",
    }),
    buildLane({
      id: "scarcity_firewall_lane",
      label: "Scarcity firewall lane",
      score: urgencySuppressionScore,
      pressure: Math.max(statusDropRisk, 100 - urgencySuppressionScore),
      publicCue: "Runway copy can create exclusivity only through evidence levels, never through countdowns or pressure.",
      operatorCue: `Urgency suppression ${urgencySuppressionScore}/100 · status drop risk ${statusDropRisk}/100.`,
      unlockCondition: "Replace urgency bait with visible proof limits and review state.",
    }),
  ];

  return {
    version: "velmere_atelier_access_runway_gate_v1_pass313",
    surface: input.surface,
    query,
    runwayId,
    runwayState,
    salonAccessScore,
    accessReadiness,
    statusDropRisk,
    urgencySuppressionScore,
    liveEpochHours,
    passportContinuityScore,
    headline: headlineFor(runwayState),
    lanes,
    actions: [
      {
        id: "atelier-access-runway-action",
        label:
          runwayState === "runway_atelier_open"
            ? "Open silent atelier drop"
            : runwayState === "runway_private_salon"
              ? "Keep private salon preview"
              : runwayState === "runway_redacted_lobby"
                ? "Redact access teaser"
                : "Hold access operator-only",
        posture: postureFor(runwayState),
        reason: headlineFor(runwayState),
        safeBoundary: "Atelier Access Runway may signal exclusivity only as proof-gated access. It must not create financial urgency, fake scarcity, countdown pressure or trading instruction.",
      },
    ],
    customerMicrocopy:
      runwayState === "runway_atelier_open"
        ? "Silent atelier access can open because live epoch, passport, consent, audit and anti-FOMO lanes agree. It is still context, not advice."
        : runwayState === "runway_private_salon"
          ? "Access stays in a private salon preview until the next proof, consent or source lane is refreshed."
          : runwayState === "runway_redacted_lobby"
            ? "Access teaser is redacted until proof maturity, consent and source custody are clear."
            : "Access runway remains operator-only until proof, passport, audit and scarcity boundaries are safe.",
    operatorMicrocopy: `Salon access ${salonAccessScore}/100 · readiness ${accessReadiness}/100 · passport ${passportContinuityScore}/100 · urgency suppression ${urgencySuppressionScore}/100 · drop risk ${statusDropRisk}/100.`,
    psychologyRules: [
      "FOMO becomes proof-gated progression, not pressure to act.",
      "Elite status appears only after live epoch, passport, consent and audit lanes agree.",
      "Weak proof creates private/redacted/operator states, never stronger urgency.",
      "Customer copy shows limitations before access status; operator copy keeps withheld fields visible.",
    ],
    blockedManipulationPatterns: [
      "no countdown timers",
      "no limited-time trading pressure",
      "no guaranteed safety",
      "no buy or sell instruction",
      "no fake scarcity",
      "no hidden persuasion ladder",
    ],
    innovation: "Atelier Access Runway turns exchange-like live proof, MEXC-style reserve transparency and LVMH/Aura-style passport traceability into a luxury access runway: the UI shows how close a token/proof capsule is to a private atelier drop while anti-FOMO logic downgrades status whenever evidence is weak.",
  };
}
