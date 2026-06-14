import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { ReserveProvenanceTwinGate } from "@/lib/market-integrity/reserve-provenance-twin-gate";
import type { VerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";
import type { AuditTrailCovenantGate } from "@/lib/market-integrity/audit-trail-covenant-gate";

export const PASS312_PRESTIGE_PROOF_COMPASS_GATE = true;

export type PrestigeProofCompassSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type PrestigeProofCompassState =
  | "compass_atelier_ready"
  | "compass_private_preview"
  | "compass_redacted_review"
  | "compass_operator_lock";

export type PrestigeProofCompassLaneId =
  | "exchange_live_window"
  | "reserve_wallet_snapshot"
  | "passport_provenance"
  | "credential_status"
  | "audit_covenant"
  | "anti_fomo_status_gate";

export type PrestigeProofCompassLane = {
  id: PrestigeProofCompassLaneId;
  label: string;
  state: PrestigeProofCompassState;
  score: number;
  prestigeClass: "atelier_badge" | "private_badge" | "redacted_badge" | "operator_badge";
  publicSignal: string;
  operatorSignal: string;
  withheldReason: string;
};

export type PrestigeProofCompassAction = {
  id: string;
  label: string;
  posture: "show_atelier_badge" | "show_private_preview" | "show_redacted_review" | "operator_only";
  reason: string;
  safeBoundary: string;
};

export type PrestigeProofCompassGate = {
  version: "velmere_prestige_proof_compass_gate_v1_pass312";
  surface: PrestigeProofCompassSurface;
  query: string;
  compassId: string;
  compassState: PrestigeProofCompassState;
  prestigeScore: number;
  proofMaturity: number;
  exclusivityFriction: number;
  statusSafetyScore: number;
  sourceExpiryHours: 24;
  dppTraceabilityScore: number;
  headline: string;
  lanes: PrestigeProofCompassLane[];
  actions: PrestigeProofCompassAction[];
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

function stateFor(score: number, friction: number): PrestigeProofCompassState {
  if (friction >= 82 || score < 36) return "compass_operator_lock";
  if (friction >= 63 || score < 56) return "compass_redacted_review";
  if (friction >= 40 || score < 82) return "compass_private_preview";
  return "compass_atelier_ready";
}

function prestigeClassFor(state: PrestigeProofCompassState): PrestigeProofCompassLane["prestigeClass"] {
  if (state === "compass_atelier_ready") return "atelier_badge";
  if (state === "compass_private_preview") return "private_badge";
  if (state === "compass_redacted_review") return "redacted_badge";
  return "operator_badge";
}

function postureFor(state: PrestigeProofCompassState): PrestigeProofCompassAction["posture"] {
  if (state === "compass_atelier_ready") return "show_atelier_badge";
  if (state === "compass_private_preview") return "show_private_preview";
  if (state === "compass_redacted_review") return "show_redacted_review";
  return "operator_only";
}

function headlineFor(state: PrestigeProofCompassState) {
  if (state === "compass_atelier_ready") return "Prestige Proof Compass can show an atelier status badge because live window, reserve snapshot, passport provenance, credential and audit lanes agree";
  if (state === "compass_private_preview") return "Prestige Proof Compass keeps status in a private preview while one proof lane still needs review";
  if (state === "compass_redacted_review") return "Prestige Proof Compass redacts prestige language until proof maturity, custody and source freshness recover";
  return "Prestige Proof Compass locks status to operator review because proof, provenance or audit custody is not mature enough";
}

function buildLane(input: {
  id: PrestigeProofCompassLaneId;
  label: string;
  score: number;
  friction: number;
  publicSignal: string;
  operatorSignal: string;
  withheldReason: string;
}): PrestigeProofCompassLane {
  const score = clampScore(input.score);
  const state = stateFor(score, clampScore(input.friction));
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    prestigeClass: prestigeClassFor(state),
    publicSignal: input.publicSignal,
    operatorSignal: input.operatorSignal,
    withheldReason: input.withheldReason,
  };
}

export function buildPrestigeProofCompassGate(input: {
  surface: PrestigeProofCompassSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  reserveProvenanceTwinGate?: ReserveProvenanceTwinGate;
  verifiableSourceCredentialGate?: VerifiableSourceCredentialGate;
  auditTrailCovenantGate?: AuditTrailCovenantGate;
}): PrestigeProofCompassGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 56));

  const freshnessScore = input.freshnessTimecodeLedgerGate?.freshnessScore ?? sourceConfidence;
  const replayReadiness = input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshnessScore;
  const expirySeconds = input.freshnessTimecodeLedgerGate?.expirySeconds ?? 900;
  const reserveScore = input.reserveProvenanceTwinGate?.reserveScore ?? sourceConfidence;
  const provenanceScore = input.reserveProvenanceTwinGate?.provenanceScore ?? average([sourceConfidence, freshnessScore], 56);
  const reserveGap = input.reserveProvenanceTwinGate?.liquidityReserveGap ?? clampScore(100 - reserveScore + missingCount * 2);
  const credentialScore = input.verifiableSourceCredentialGate?.credentialScore ?? average([freshnessScore, reserveScore, provenanceScore], 56);
  const issuerQuorum = input.verifiableSourceCredentialGate?.issuerQuorum ?? credentialScore;
  const attestationPressure = input.verifiableSourceCredentialGate?.attestationPressure ?? clampScore(100 - credentialScore + knownFaults.length * 7 + missingCount * 2);
  const covenantScore = input.auditTrailCovenantGate?.covenantScore ?? average([credentialScore, provenanceScore], 58);
  const auditTrailScore = input.auditTrailCovenantGate?.auditTrailScore ?? covenantScore;
  const custodyPressure = input.auditTrailCovenantGate?.custodyPressure ?? clampScore(100 - covenantScore + knownFaults.length * 7 + missingCount * 2);
  const publicLedgerReadiness = input.auditTrailCovenantGate?.publicLedgerReadiness ?? average([covenantScore, credentialScore], 58);

  const sourceExpiryHours = 24 as const;
  const dppTraceabilityScore = clampScore(average([provenanceScore, publicLedgerReadiness, auditTrailScore], 58) - missingCount * 0.8);
  const proofMaturity = clampScore(
    average([freshnessScore, replayReadiness, reserveScore, provenanceScore, credentialScore, issuerQuorum, covenantScore, publicLedgerReadiness], 58) -
      knownFaults.length * 2 -
      missingCount * 0.9,
  );
  const statusSafetyScore = clampScore(average([proofMaturity, dppTraceabilityScore, 100 - custodyPressure, 100 - attestationPressure, 100 - reserveGap], 58));
  const exclusivityFriction = clampScore(
    (100 - proofMaturity) * 0.32 +
      custodyPressure * 0.22 +
      attestationPressure * 0.18 +
      reserveGap * 0.14 +
      Math.max(0, 900 - expirySeconds) * 0.018 +
      knownFaults.length * 7 +
      missingCount * 2.1,
  );
  const prestigeScore = clampScore(proofMaturity * 0.52 + statusSafetyScore * 0.34 + (100 - exclusivityFriction) * 0.14);
  const compassState = stateFor(prestigeScore, exclusivityFriction);
  const compassId = `prestige-${slug(input.surface)}-${slug(query || "source")}-${prestigeScore}`;

  const lanes = [
    buildLane({
      id: "exchange_live_window",
      label: "Exchange live window",
      score: freshnessScore,
      friction: Math.max(100 - freshnessScore, expirySeconds < 240 ? 66 : 24),
      publicSignal: `Live proof is time-boxed; exchange-style streams must be refreshed before the ${sourceExpiryHours}h outer window.` ,
      operatorSignal: `Freshness ${freshnessScore}/100 · replay ${replayReadiness}/100 · ttl ${expirySeconds}s.`,
      withheldReason: "Raw stream payload, provider token and stale replay state stay out of customer copy.",
    }),
    buildLane({
      id: "reserve_wallet_snapshot",
      label: "Reserve wallet snapshot",
      score: reserveScore,
      friction: Math.max(reserveGap, 100 - reserveScore),
      publicSignal: "Reserve proof can be shown only as a transparency snapshot, never as a safety promise.",
      operatorSignal: `Reserve ${reserveScore}/100 · liquidity/reserve gap ${reserveGap}/100.`,
      withheldReason: "Wallet/source debt and unverified reserve context remain operator-only.",
    }),
    buildLane({
      id: "passport_provenance",
      label: "Passport provenance",
      score: dppTraceabilityScore,
      friction: 100 - dppTraceabilityScore + missingCount * 2,
      publicSignal: "DPP-style provenance can support elite status only when authenticity, traceability and lifecycle context are visible.",
      operatorSignal: `Provenance ${provenanceScore}/100 · DPP traceability ${dppTraceabilityScore}/100.`,
      withheldReason: "Missing traceability or authenticity fields block premium copy.",
    }),
    buildLane({
      id: "credential_status",
      label: "Credential status",
      score: credentialScore,
      friction: Math.max(attestationPressure, 100 - issuerQuorum),
      publicSignal: "Credential class is short-lived and must reveal limitations before any badge appears.",
      operatorSignal: `Credential ${credentialScore}/100 · issuer quorum ${issuerQuorum}/100 · attestation ${attestationPressure}/100.`,
      withheldReason: "Issuer quorum details and unsupported attestation lanes stay private.",
    }),
    buildLane({
      id: "audit_covenant",
      label: "Audit covenant",
      score: covenantScore,
      friction: custodyPressure,
      publicSignal: "Prestige badge needs a minimal audit covenant before report/replay copy can use it.",
      operatorSignal: `Covenant ${covenantScore}/100 · custody pressure ${custodyPressure}/100 · public ledger ${publicLedgerReadiness}/100.`,
      withheldReason: "Raw telemetry, full browser replay and private operator notes stay in the vault.",
    }),
    buildLane({
      id: "anti_fomo_status_gate",
      label: "Anti-FOMO status gate",
      score: statusSafetyScore,
      friction: exclusivityFriction,
      publicSignal: "Status is earned by proof maturity; weak proof reduces status instead of creating urgency.",
      operatorSignal: `Prestige ${prestigeScore}/100 · safety ${statusSafetyScore}/100 · friction ${exclusivityFriction}/100.`,
      withheldReason: "Countdowns, fake scarcity, urgency bait and trading commands are blocked.",
    }),
  ];

  return {
    version: "velmere_prestige_proof_compass_gate_v1_pass312",
    surface: input.surface,
    query,
    compassId,
    compassState,
    prestigeScore,
    proofMaturity,
    exclusivityFriction,
    statusSafetyScore,
    sourceExpiryHours,
    dppTraceabilityScore,
    headline: headlineFor(compassState),
    lanes,
    actions: [
      {
        id: "prestige-proof-compass-action",
        label:
          compassState === "compass_atelier_ready"
            ? "Show atelier proof badge"
            : compassState === "compass_private_preview"
              ? "Keep badge in private preview"
              : compassState === "compass_redacted_review"
                ? "Show redacted proof review"
                : "Lock badge to operator vault",
        posture: postureFor(compassState),
        reason: headlineFor(compassState),
        safeBoundary: "Prestige Proof Compass can express elite status only as evidence maturity; it must never create urgency, financial instruction, fake scarcity or safety guarantees.",
      },
    ],
    customerMicrocopy:
      compassState === "compass_atelier_ready"
        ? "Atelier proof badge can be shown because live-window, reserve, passport, credential and audit lanes agree. It is still context, not advice."
        : compassState === "compass_private_preview"
          ? "Prestige badge stays in private preview until one proof lane is refreshed or reviewed."
          : compassState === "compass_redacted_review"
            ? "Prestige language is redacted until proof maturity, custody and source limits are clear."
            : "Prestige badge remains operator-only until source, provenance, credential and audit custody are ready.",
    operatorMicrocopy: `Prestige ${prestigeScore}/100 · proof maturity ${proofMaturity}/100 · DPP traceability ${dppTraceabilityScore}/100 · friction ${exclusivityFriction}/100 · MEXC-style outer live window ${sourceExpiryHours}h.`,
    psychologyRules: [
      "Elite status is proof-maturity feedback, not investment persuasion.",
      "Scarcity language is replaced with source friction and redacted review states.",
      "A weak reserve, DPP, credential or audit lane lowers the badge instead of adding urgency.",
      "Customer copy sees limits before prestige, and operator copy sees the held fields.",
    ],
    blockedManipulationPatterns: [
      "no countdowns",
      "no last-chance copy",
      "no fake scarcity",
      "no buy or sell instruction",
      "no guaranteed safety",
      "no profit promise",
    ],
    innovation: "Prestige Proof Compass is a radial status gate for Shield/Lens: MEXC-style live-source expiry, reserve snapshots and LVMH/Aura-style product passport provenance are fused with credential and audit covenant scores, turning FOMO into visible proof friction and elite status into evidence maturity.",
  };
}
