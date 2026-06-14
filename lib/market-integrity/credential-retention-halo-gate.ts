import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { LiveAdapterCircuitBreakerGate } from "@/lib/market-integrity/live-adapter-circuit-breaker-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { SelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";
import type { VerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";

export const PASS307_CREDENTIAL_RETENTION_HALO_GATE = true;

export type CredentialRetentionHaloSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type CredentialRetentionHaloState =
  | "retain_public_halo"
  | "guided_retention_halo"
  | "redacted_retention_halo"
  | "purge_or_operator_only";

export type CredentialRetentionHaloLaneId =
  | "credential_expiry_window"
  | "source_freshness_ttl"
  | "browser_replay_retention"
  | "customer_copy_retention"
  | "operator_vault_retention"
  | "data_minimization_boundary";

export type CredentialRetentionHaloLane = {
  id: CredentialRetentionHaloLaneId;
  label: string;
  state: CredentialRetentionHaloState;
  score: number;
  ttlSeconds: number;
  retentionClass: "ephemeral_public" | "guided_short_lived" | "redacted_receipt" | "operator_vault_only";
  customerBoundary: string;
  operatorBoundary: string;
};

export type CredentialRetentionHaloAction = {
  id: string;
  label: string;
  posture: "show_halo" | "show_guided_halo" | "show_redacted_halo" | "purge_to_operator_vault";
  reason: string;
  safeBoundary: string;
};

export type CredentialRetentionHaloGate = {
  version: "velmere_credential_retention_halo_gate_v1_pass307";
  surface: CredentialRetentionHaloSurface;
  query: string;
  haloId: string;
  haloState: CredentialRetentionHaloState;
  retentionScore: number;
  expirySeconds: number;
  purgeAfterSeconds: number;
  replayRetentionSeconds: number;
  retentionClass: CredentialRetentionHaloLane["retentionClass"];
  retentionPressure: number;
  headline: string;
  lanes: CredentialRetentionHaloLane[];
  actions: CredentialRetentionHaloAction[];
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

function stateFor(score: number, pressure: number): CredentialRetentionHaloState {
  if (pressure >= 76 || score < 34) return "purge_or_operator_only";
  if (pressure >= 58 || score < 52) return "redacted_retention_halo";
  if (pressure >= 38 || score < 74) return "guided_retention_halo";
  return "retain_public_halo";
}

function classFor(state: CredentialRetentionHaloState): CredentialRetentionHaloLane["retentionClass"] {
  if (state === "retain_public_halo") return "ephemeral_public";
  if (state === "guided_retention_halo") return "guided_short_lived";
  if (state === "redacted_retention_halo") return "redacted_receipt";
  return "operator_vault_only";
}

function actionPostureFor(state: CredentialRetentionHaloState): CredentialRetentionHaloAction["posture"] {
  if (state === "retain_public_halo") return "show_halo";
  if (state === "guided_retention_halo") return "show_guided_halo";
  if (state === "redacted_retention_halo") return "show_redacted_halo";
  return "purge_to_operator_vault";
}

function headlineFor(state: CredentialRetentionHaloState) {
  if (state === "retain_public_halo") return "Credential Retention Halo can display a short-lived public proof because expiry, replay and disclosure windows agree";
  if (state === "guided_retention_halo") return "Credential Retention Halo keeps the proof guided because one source, replay or copy window is approaching expiry";
  if (state === "redacted_retention_halo") return "Credential Retention Halo shows only a redacted receipt until stale or private proof lanes are reviewed";
  return "Credential Retention Halo purges customer proof into the operator vault until expiry, redaction and replay lanes recover";
}

function buildLane(input: {
  id: CredentialRetentionHaloLaneId;
  label: string;
  score: number;
  pressure: number;
  ttlSeconds: number;
  customerBoundary: string;
  operatorBoundary: string;
}): CredentialRetentionHaloLane {
  const score = clampScore(input.score);
  const state = stateFor(score, input.pressure);
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    ttlSeconds: Math.max(30, Math.round(input.ttlSeconds)),
    retentionClass: classFor(state),
    customerBoundary: input.customerBoundary,
    operatorBoundary: input.operatorBoundary,
  };
}

export function buildCredentialRetentionHaloGate(input: {
  surface: CredentialRetentionHaloSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  liveAdapterCircuitBreakerGate?: LiveAdapterCircuitBreakerGate;
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  selectiveDisclosureVaultGate?: SelectiveDisclosureVaultGate;
  verifiableSourceCredentialGate?: VerifiableSourceCredentialGate;
}): CredentialRetentionHaloGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 50));
  const credentialScore = input.verifiableSourceCredentialGate?.credentialScore ?? confidence;
  const credentialPressure = input.verifiableSourceCredentialGate?.attestationPressure ?? clampScore(100 - credentialScore + missingCount * 2);
  const expirySeconds = input.verifiableSourceCredentialGate?.expirySeconds ?? input.freshnessTimecodeLedgerGate?.expirySeconds ?? 900;
  const freshness = input.freshnessTimecodeLedgerGate?.freshnessScore ?? confidence;
  const replayReadiness = input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshness;
  const liveReadiness = input.liveAdapterCircuitBreakerGate?.liveReadiness ?? average([freshness, credentialScore], 50);
  const cooldown = input.liveAdapterCircuitBreakerGate?.cooldownSeconds ?? Math.max(45, Math.round(900 - freshness * 6));
  const disclosureScore = input.selectiveDisclosureVaultGate?.disclosureScore ?? average([credentialScore, freshness], 50);
  const redactionPressure = input.selectiveDisclosureVaultGate?.redactionPressure ?? clampScore(100 - disclosureScore + missingCount * 1.5);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - confidence + knownFaults.length * 8 + missingCount * 2);

  const retentionPressure = clampScore(
    faultPressure * 0.22 +
      redactionPressure * 0.22 +
      credentialPressure * 0.2 +
      (100 - freshness) * 0.18 +
      (100 - replayReadiness) * 0.1 +
      knownFaults.length * 4,
  );

  const retentionScore = clampScore(
    average([credentialScore, freshness, replayReadiness, liveReadiness, disclosureScore], 52) - retentionPressure * 0.18,
  );

  const ttlBias = retentionScore >= 78 ? 1 : retentionScore >= 58 ? 0.72 : retentionScore >= 42 ? 0.42 : 0.18;
  const purgeAfterSeconds = Math.max(60, Math.round(expirySeconds * ttlBias));
  const replayRetentionSeconds = Math.max(45, Math.round(Math.min(expirySeconds, purgeAfterSeconds) * (replayReadiness >= 72 ? 0.9 : 0.56)));

  const lanes = [
    buildLane({
      id: "credential_expiry_window",
      label: "Credential expiry window",
      score: credentialScore,
      pressure: credentialPressure,
      ttlSeconds: expirySeconds,
      customerBoundary: "Public proof must show a short expiry window instead of permanent confidence.",
      operatorBoundary: "Operator sees issuer score, attestation pressure and expiry debt before release.",
    }),
    buildLane({
      id: "source_freshness_ttl",
      label: "Source freshness TTL",
      score: freshness,
      pressure: 100 - freshness + knownFaults.length * 4,
      ttlSeconds: input.freshnessTimecodeLedgerGate?.expirySeconds ?? expirySeconds,
      customerBoundary: "Customer copy is downgraded when source freshness approaches expiry.",
      operatorBoundary: "Operator validates source freshness, stale lanes and next refresh action.",
    }),
    buildLane({
      id: "browser_replay_retention",
      label: "Browser replay retention",
      score: replayReadiness,
      pressure: 100 - replayReadiness + faultPressure * 0.2,
      ttlSeconds: replayRetentionSeconds,
      customerBoundary: "Replay proof is shown only as a bounded receipt, not as hidden tracking.",
      operatorBoundary: "Operator vault stores replay state only inside the configured retention window.",
    }),
    buildLane({
      id: "customer_copy_retention",
      label: "Customer copy retention",
      score: disclosureScore,
      pressure: redactionPressure,
      ttlSeconds: purgeAfterSeconds,
      customerBoundary: "Customer sees only the proof fields allowed by disclosure and redaction rules.",
      operatorBoundary: "Operator receives the disclosure class, redaction pressure and purge reason.",
    }),
    buildLane({
      id: "operator_vault_retention",
      label: "Operator vault retention",
      score: average([credentialScore, disclosureScore, replayReadiness], 50),
      pressure: retentionPressure,
      ttlSeconds: Math.max(purgeAfterSeconds, cooldown),
      customerBoundary: "Private source debt is not exposed as public status or marketing copy.",
      operatorBoundary: "Operator vault keeps the richer trail while customer proof stays minimized.",
    }),
    buildLane({
      id: "data_minimization_boundary",
      label: "Data minimization boundary",
      score: clampScore(100 - redactionPressure * 0.55),
      pressure: redactionPressure,
      ttlSeconds: Math.max(60, Math.round(purgeAfterSeconds * 0.68)),
      customerBoundary: "Less proof is displayed when privacy, stale or replay boundaries get weaker.",
      operatorBoundary: "Retention halo turns privacy pressure into purge or redaction, not louder persuasion.",
    }),
  ] satisfies CredentialRetentionHaloLane[];

  const haloState = stateFor(retentionScore, retentionPressure);
  const retentionClass = classFor(haloState);
  const haloId = `crh-${slug(query)}-${retentionClass}`;
  const actions = [
    {
      id: "short_lived_halo",
      label: haloState === "retain_public_halo" ? "Show short-lived public halo" : "Keep halo bounded",
      posture: actionPostureFor(haloState),
      reason: "Proof can only live while credential, freshness and replay windows remain aligned.",
      safeBoundary: "Halo is a time-bound context receipt, not financial advice, not a safety certificate and not an urgency signal.",
    },
    {
      id: "purge_or_redact",
      label: haloState === "purge_or_operator_only" ? "Purge customer proof" : "Schedule redaction expiry",
      posture: haloState === "purge_or_operator_only" ? "purge_to_operator_vault" : actionPostureFor(haloState),
      reason: "Expired, stale or private source lanes should shrink public proof rather than amplify status.",
      safeBoundary: "Customer-visible data stays minimized; operator-only evidence remains separated by retention class.",
    },
  ] satisfies CredentialRetentionHaloAction[];

  return {
    version: "velmere_credential_retention_halo_gate_v1_pass307",
    surface: input.surface,
    query,
    haloId,
    haloState,
    retentionScore,
    expirySeconds,
    purgeAfterSeconds,
    replayRetentionSeconds,
    retentionClass,
    retentionPressure,
    headline: headlineFor(haloState),
    lanes,
    actions,
    customerMicrocopy:
      haloState === "retain_public_halo"
        ? "Credential Retention Halo can show a short-lived proof ring with visible expiry and purge limits."
        : haloState === "guided_retention_halo"
          ? "Credential Retention Halo keeps the proof guided because at least one timecode or disclosure lane is narrowing."
          : haloState === "redacted_retention_halo"
            ? "Credential Retention Halo shows only a redacted receipt until stale or private lanes are reviewed."
            : "Credential Retention Halo removes customer proof and keeps the richer trail operator-only until retention lanes recover.",
    operatorMicrocopy: `PASS307 halo: score ${retentionScore}/100 · pressure ${retentionPressure}/100 · purge ${purgeAfterSeconds}s · replay ${replayRetentionSeconds}s · class ${retentionClass}.`,
    psychologyRules: [
      "FOMO is converted into expiry transparency: weak proof reduces visibility rather than increasing urgency.",
      "Elite status is earned by fresh, short-lived credentials and visible retention limits.",
      "Customer trust comes from data minimization and purge rules, not from hidden permanence.",
      "Operator-only retention keeps richer evidence away from public persuasion copy.",
    ],
    blockedManipulationPatterns: [
      "No countdown persuasion.",
      "No trade action command.",
      "No permanent proof badge from stale sources.",
      "No public exposure of private adapter or replay payloads.",
    ],
    innovation:
      "Credential Retention Halo: a Velmère-only proof lifecycle ring that turns exchange live-source expiry, reserve snapshots, DPP-style provenance, selective disclosure and browser replay into a visible customer/operator retention boundary before proof copy can persist.",
  };
}
