import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { SelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";
import type { VerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";
import type { CredentialRetentionHaloGate } from "@/lib/market-integrity/credential-retention-halo-gate";
import type { SourceGovernanceOathGate } from "@/lib/market-integrity/source-governance-oath-gate";
import type { EthicalSignalEventTaxonomyGate } from "@/lib/market-integrity/ethical-signal-event-taxonomy-gate";

export const PASS310_PROOF_CONSENT_RECEIPT_GATE = true;

export type ProofConsentReceiptSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type ProofConsentReceiptState =
  | "receipt_public_ready"
  | "receipt_guided_consent"
  | "receipt_redacted_review"
  | "receipt_operator_vault";

export type ProofConsentReceiptLaneId =
  | "consent_language"
  | "source_proof"
  | "disclosure_scope"
  | "credential_expiry"
  | "retention_boundary"
  | "report_copy";

export type ProofConsentReceiptLane = {
  id: ProofConsentReceiptLaneId;
  label: string;
  state: ProofConsentReceiptState;
  score: number;
  receiptClass: "public_receipt" | "guided_receipt" | "redacted_receipt" | "operator_vault";
  customerLine: string;
  operatorLine: string;
  visibleFields: string[];
  heldFields: string[];
};

export type ProofConsentReceiptAction = {
  id: string;
  label: string;
  posture: "publish_minimal" | "ask_review" | "redact_then_publish" | "vault_only";
  reason: string;
  safeBoundary: string;
};

export type ProofConsentReceiptGate = {
  version: "velmere_proof_consent_receipt_gate_v1_pass310";
  surface: ProofConsentReceiptSurface;
  query: string;
  receiptId: string;
  receiptState: ProofConsentReceiptState;
  receiptScore: number;
  consentScore: number;
  publicCopyReadiness: number;
  operatorReviewPressure: number;
  redactionNeed: number;
  expirySeconds: number;
  headline: string;
  lanes: ProofConsentReceiptLane[];
  actions: ProofConsentReceiptAction[];
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

function stateFor(score: number, pressure: number): ProofConsentReceiptState {
  if (pressure >= 78 || score < 38) return "receipt_operator_vault";
  if (pressure >= 60 || score < 56) return "receipt_redacted_review";
  if (pressure >= 38 || score < 78) return "receipt_guided_consent";
  return "receipt_public_ready";
}

function receiptClassFor(state: ProofConsentReceiptState): ProofConsentReceiptLane["receiptClass"] {
  if (state === "receipt_public_ready") return "public_receipt";
  if (state === "receipt_guided_consent") return "guided_receipt";
  if (state === "receipt_redacted_review") return "redacted_receipt";
  return "operator_vault";
}

function postureFor(state: ProofConsentReceiptState): ProofConsentReceiptAction["posture"] {
  if (state === "receipt_public_ready") return "publish_minimal";
  if (state === "receipt_guided_consent") return "ask_review";
  if (state === "receipt_redacted_review") return "redact_then_publish";
  return "vault_only";
}

function headlineFor(state: ProofConsentReceiptState) {
  if (state === "receipt_public_ready") return "Proof Consent Receipt can show a minimal public receipt because consent, source proof and disclosure boundaries agree";
  if (state === "receipt_guided_consent") return "Proof Consent Receipt keeps the next step guided while consent language and proof fields are checked";
  if (state === "receipt_redacted_review") return "Proof Consent Receipt requires redaction before report, source or premium proof copy can move";
  return "Proof Consent Receipt keeps the proof inside operator vault because consent, source or retention lanes are not ready";
}

function buildLane(input: {
  id: ProofConsentReceiptLaneId;
  label: string;
  score: number;
  pressure: number;
  customerLine: string;
  operatorLine: string;
  visibleFields: string[];
  heldFields: string[];
}): ProofConsentReceiptLane {
  const score = clampScore(input.score);
  const state = stateFor(score, input.pressure);
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    receiptClass: receiptClassFor(state),
    customerLine: input.customerLine,
    operatorLine: input.operatorLine,
    visibleFields: input.visibleFields,
    heldFields: input.heldFields,
  };
}

export function buildProofConsentReceiptGate(input: {
  surface: ProofConsentReceiptSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  selectiveDisclosureVaultGate?: SelectiveDisclosureVaultGate;
  verifiableSourceCredentialGate?: VerifiableSourceCredentialGate;
  credentialRetentionHaloGate?: CredentialRetentionHaloGate;
  sourceGovernanceOathGate?: SourceGovernanceOathGate;
  ethicalSignalEventTaxonomyGate?: EthicalSignalEventTaxonomyGate;
}): ProofConsentReceiptGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 54));
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);

  const disclosureScore = input.selectiveDisclosureVaultGate?.disclosureScore ?? confidence;
  const privacyScore = input.selectiveDisclosureVaultGate?.privacyScore ?? input.ethicalSignalEventTaxonomyGate?.privacyScore ?? 70;
  const credentialScore = input.verifiableSourceCredentialGate?.credentialScore ?? confidence;
  const retentionScore = input.credentialRetentionHaloGate?.retentionScore ?? average([credentialScore, privacyScore], 56);
  const governanceScore = input.sourceGovernanceOathGate?.governanceScore ?? average([disclosureScore, credentialScore, retentionScore], 56);
  const eventTaxonomyScore = input.ethicalSignalEventTaxonomyGate?.taxonomyScore ?? average([privacyScore, governanceScore], 58);
  const eventFriction = input.ethicalSignalEventTaxonomyGate?.consentFriction ?? clampScore(100 - eventTaxonomyScore + knownFaults.length * 8 + missingCount * 2);
  const redactionNeed = input.selectiveDisclosureVaultGate?.redactionPressure ?? clampScore(100 - disclosureScore + missingCount * 2);
  const expirySeconds = Math.min(
    input.verifiableSourceCredentialGate?.expirySeconds ?? 900,
    input.credentialRetentionHaloGate?.purgeAfterSeconds ?? 1800,
  );

  const consentScore = clampScore(average([privacyScore, eventTaxonomyScore, governanceScore], 60) - eventFriction * 0.10);
  const publicCopyReadiness = clampScore(average([consentScore, disclosureScore, credentialScore, retentionScore, governanceScore], 58) - redactionNeed * 0.12 - knownFaults.length * 3);
  const operatorReviewPressure = clampScore(eventFriction * 0.30 + redactionNeed * 0.28 + (100 - credentialScore) * 0.18 + (100 - retentionScore) * 0.12 + missingCount * 2 + knownFaults.length * 6);
  const receiptScore = clampScore(average([publicCopyReadiness, consentScore, credentialScore, governanceScore, retentionScore], 58) - operatorReviewPressure * 0.08);

  const lanes = [
    buildLane({
      id: "consent_language",
      label: "Consent language",
      score: consentScore,
      pressure: operatorReviewPressure,
      customerLine: "Public copy explains what is known, what is withheld and why the next step stays evidence-first.",
      operatorLine: "Operator reviews whether customer text is calm, boundary-aware and free from pressure mechanics.",
      visibleFields: ["receipt class", "boundary language", "review state"],
      heldFields: ["private notes", "raw session context", "unreviewed operator memo"],
    }),
    buildLane({
      id: "source_proof",
      label: "Source proof",
      score: credentialScore,
      pressure: Math.max(operatorReviewPressure, 100 - credentialScore),
      customerLine: "Customer sees a proof class, not raw adapter data or private source logs.",
      operatorLine: "Operator sees issuer quorum, source debt and unsupported proof lanes before public movement.",
      visibleFields: ["credential class", "proof tier", "source freshness class"],
      heldFields: ["raw API payload", "adapter stack detail", "private failure trace"],
    }),
    buildLane({
      id: "disclosure_scope",
      label: "Disclosure scope",
      score: disclosureScore,
      pressure: Math.max(operatorReviewPressure, redactionNeed),
      customerLine: "Customer sees why a field is public, guided, redacted or vault-only.",
      operatorLine: "Operator validates selective disclosure before report export or proof receipt reuse.",
      visibleFields: ["disclosure level", "redaction class", "public summary"],
      heldFields: ["PII", "secret material", "private wallet linkage"],
    }),
    buildLane({
      id: "credential_expiry",
      label: "Credential expiry",
      score: retentionScore,
      pressure: Math.max(operatorReviewPressure, 100 - retentionScore),
      customerLine: "Customer copy receives a visible freshness window instead of a permanent trust label.",
      operatorLine: "Operator reviews expiry, refresh and replay windows before receipt reuse.",
      visibleFields: ["expiry bucket", "refresh state", "receipt timecode"],
      heldFields: ["persistent tracking id", "raw browser trace", "unbounded replay data"],
    }),
    buildLane({
      id: "retention_boundary",
      label: "Retention boundary",
      score: average([retentionScore, privacyScore], 58),
      pressure: Math.max(operatorReviewPressure, 100 - privacyScore),
      customerLine: "Customer copy states that proof is minimal and time-bound.",
      operatorLine: "Operator sees purge policy, vault boundary and replay limits.",
      visibleFields: ["purge class", "minimal receipt", "vault boundary"],
      heldFields: ["long-term personal trace", "raw telemetry", "unreviewed source memo"],
    }),
    buildLane({
      id: "report_copy",
      label: "Report copy",
      score: publicCopyReadiness,
      pressure: operatorReviewPressure,
      customerLine: "Report text stays cautious: evidence note, source state and missing-data boundary only.",
      operatorLine: "Operator must approve any stronger wording when source or disclosure debt remains.",
      visibleFields: ["evidence note", "missing-data boundary", "receipt id"],
      heldFields: ["absolute verdict", "financial instruction", "unsupported certainty"],
    }),
  ];

  const laneScore = average(lanes.map((lane) => lane.score), receiptScore);
  const receiptState = stateFor(average([receiptScore, laneScore], 58), operatorReviewPressure);
  const receiptId = `consent-${slug(input.surface)}-${slug(query || "source")}-${Math.round(receiptScore)}`;

  return {
    version: "velmere_proof_consent_receipt_gate_v1_pass310",
    surface: input.surface,
    query,
    receiptId,
    receiptState,
    receiptScore,
    consentScore,
    publicCopyReadiness,
    operatorReviewPressure,
    redactionNeed: clampScore(redactionNeed),
    expirySeconds,
    headline: headlineFor(receiptState),
    lanes,
    actions: [
      {
        id: "proof-consent-receipt-action",
        label:
          receiptState === "receipt_public_ready"
            ? "Publish minimal receipt"
            : receiptState === "receipt_guided_consent"
              ? "Ask for guided review"
              : receiptState === "receipt_redacted_review"
                ? "Redact receipt before public copy"
                : "Keep receipt in operator vault",
        posture: postureFor(receiptState),
        reason: headlineFor(receiptState),
        safeBoundary: "Proof Consent Receipt can show only source, consent, expiry and redaction classes; it must not transform private proof debt into persuasion copy.",
      },
    ],
    customerMicrocopy:
      receiptState === "receipt_public_ready"
        ? "Velmère can show a minimal proof receipt because source, consent, disclosure and expiry boundaries agree."
        : receiptState === "receipt_guided_consent"
          ? "Proof receipt stays guided until consent language and source fields are reviewed."
          : receiptState === "receipt_redacted_review"
            ? "Proof receipt needs redaction before it can support customer copy or report preview."
            : "Proof receipt stays operator-only until consent, source and retention lanes are ready.",
    operatorMicrocopy: `Receipt ${receiptScore}/100 · consent ${consentScore}/100 · public copy ${publicCopyReadiness}/100 · review pressure ${operatorReviewPressure}/100 · expiry ${expirySeconds}s.`,
    psychologyRules: [
      "Proof visibility must be earned by consent, source and expiry alignment.",
      "High attention increases review friction instead of urgency copy.",
      "Luxury status is attached to restraint, provenance and selective disclosure.",
      "Customer copy must show boundaries before benefits.",
    ],
    blockedManipulationPatterns: [
      "no urgency bait",
      "no scarcity theatre",
      "no engagement-pressure receipt",
      "no financial instruction",
      "no unsupported certainty",
    ],
    innovation: "Proof Consent Receipt turns exchange-grade source freshness and luxury-grade provenance into a visible consent handshake: every proof badge has a public field list, held field list, expiry window and operator review posture before it can appear in Shield copy or reports.",
  };
}
