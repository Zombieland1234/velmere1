import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { SourceAdapterContractMeshGate } from "@/lib/market-integrity/source-adapter-contract-mesh-gate";
import type { SourceProofEscrowGate } from "@/lib/market-integrity/source-proof-escrow-gate";
import type { LiveAdapterCircuitBreakerGate } from "@/lib/market-integrity/live-adapter-circuit-breaker-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import type { SelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";

export const PASS306_VERIFIABLE_SOURCE_CREDENTIAL_GATE = true;

export type VerifiableSourceCredentialSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type VerifiableSourceCredentialState =
  | "credential_ready"
  | "credential_limited"
  | "credential_redacted"
  | "operator_attestation_required";

export type VerifiableSourceCredentialLaneId =
  | "issuer_identity_credential"
  | "depth_snapshot_credential"
  | "reserve_snapshot_credential"
  | "provenance_passport_credential"
  | "freshness_expiry_credential"
  | "customer_disclosure_credential";

export type VerifiableSourceCredentialLane = {
  id: VerifiableSourceCredentialLaneId;
  label: string;
  state: VerifiableSourceCredentialState;
  score: number;
  issuer: "velmere_router" | "exchange_adapter" | "reserve_snapshot" | "dpp_provenance" | "operator_vault";
  disclosure: "public" | "guided" | "redacted" | "operator_only";
  proofField: string;
  expirySeconds: number;
  customerBoundary: string;
  operatorEvidence: string;
};

export type VerifiableSourceCredentialAction = {
  id: string;
  label: string;
  posture: "issue_public_credential" | "issue_guided_credential" | "issue_redacted_credential" | "hold_for_operator_attestation";
  reason: string;
  safeBoundary: string;
};

export type VerifiableSourceCredentialGate = {
  version: "velmere_verifiable_source_credential_gate_v1_pass306";
  surface: VerifiableSourceCredentialSurface;
  query: string;
  credentialId: string;
  credentialState: VerifiableSourceCredentialState;
  credentialScore: number;
  issuerQuorum: number;
  expirySeconds: number;
  disclosureClass: "public_vc" | "guided_vc" | "redacted_vc" | "operator_vc";
  attestationPressure: number;
  proofHashHint: string;
  headline: string;
  lanes: VerifiableSourceCredentialLane[];
  actions: VerifiableSourceCredentialAction[];
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

function hashHint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `vsc-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function hasSignal(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function stateFor(score: number, pressure: number): VerifiableSourceCredentialState {
  if (pressure >= 74 || score < 36) return "operator_attestation_required";
  if (pressure >= 58 || score < 54) return "credential_redacted";
  if (pressure >= 38 || score < 76) return "credential_limited";
  return "credential_ready";
}

function disclosureFor(state: VerifiableSourceCredentialState): VerifiableSourceCredentialLane["disclosure"] {
  if (state === "credential_ready") return "public";
  if (state === "credential_limited") return "guided";
  if (state === "credential_redacted") return "redacted";
  return "operator_only";
}

function classFor(state: VerifiableSourceCredentialState): VerifiableSourceCredentialGate["disclosureClass"] {
  if (state === "credential_ready") return "public_vc";
  if (state === "credential_limited") return "guided_vc";
  if (state === "credential_redacted") return "redacted_vc";
  return "operator_vc";
}

function headlineFor(state: VerifiableSourceCredentialState) {
  if (state === "credential_ready") return "Verifiable Source Credential can issue a public proof card because issuer quorum, timecode and disclosure boundaries agree";
  if (state === "credential_limited") return "Verifiable Source Credential issues a guided proof card while one or more adapter lanes still need a visible limitation";
  if (state === "credential_redacted") return "Verifiable Source Credential keeps the customer proof redacted until stale, private or conflicting fields are reviewed";
  return "Verifiable Source Credential holds the proof for operator attestation until source, expiry and disclosure lanes recover";
}

function buildLane(input: {
  id: VerifiableSourceCredentialLaneId;
  label: string;
  score: number;
  pressure: number;
  issuer: VerifiableSourceCredentialLane["issuer"];
  proofField: string;
  expirySeconds: number;
  customerBoundary: string;
  operatorEvidence: string;
}): VerifiableSourceCredentialLane {
  const score = clampScore(input.score);
  const state = stateFor(score, clampScore(input.pressure));
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    issuer: input.issuer,
    disclosure: disclosureFor(state),
    proofField: input.proofField,
    expirySeconds: Math.max(45, Math.round(input.expirySeconds)),
    customerBoundary: input.customerBoundary,
    operatorEvidence: input.operatorEvidence,
  };
}

export function buildVerifiableSourceCredentialGate(input: {
  surface: VerifiableSourceCredentialSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  sourceAdapterContractMeshGate?: SourceAdapterContractMeshGate;
  sourceProofEscrowGate?: SourceProofEscrowGate;
  liveAdapterCircuitBreakerGate?: LiveAdapterCircuitBreakerGate;
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
  selectiveDisclosureVaultGate?: SelectiveDisclosureVaultGate;
}): VerifiableSourceCredentialGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const joinedText = [
    query,
    ...knownFaults,
    ...results.flatMap((item) => [item.title, item.summary, item.whyItMatters, item.nextOperatorStep, ...item.missingData, ...item.chips]),
    ...routerSuggestions.flatMap((item) => [item.symbol, item.name, item.reason ?? "", item.exchangeLabel, item.sourceLabel, item.socialLabel]),
  ].join(" ");

  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 50));
  const meshScore = input.sourceAdapterContractMeshGate?.meshScore ?? confidence;
  const adapterCoverage = input.sourceAdapterContractMeshGate?.adapterCoverage ?? meshScore;
  const escrowScore = input.sourceProofEscrowGate?.escrowScore ?? average([confidence, meshScore], 50);
  const proofCompleteness = input.sourceProofEscrowGate?.proofCompleteness ?? escrowScore;
  const liveReadiness = input.liveAdapterCircuitBreakerGate?.liveReadiness ?? average([proofCompleteness, meshScore], 50);
  const freshness = input.freshnessTimecodeLedgerGate?.freshnessScore ?? average([confidence, liveReadiness], 50);
  const replayReadiness = input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshness;
  const disclosureScore = input.selectiveDisclosureVaultGate?.disclosureScore ?? average([escrowScore, freshness], 50);
  const redactionPressure = input.selectiveDisclosureVaultGate?.redactionPressure ?? clampScore(100 - disclosureScore + missingCount * 1.5);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - confidence + knownFaults.length * 9 + missingCount * 2);
  const expirySeconds = input.freshnessTimecodeLedgerGate?.expirySeconds ?? 900;

  const hasDepth = hasSignal(joinedText, /order\s?book|depth|liquidity|spread|slippage|venue|websocket|snapshot/i);
  const hasReserve = hasSignal(joinedText, /reserve|proof|wallet|merkle|custody|snapshot|asset backing/i);
  const hasProvenance = hasSignal(joinedText, /passport|provenance|traceability|authentic|aura|lvmh|dpp|lifecycle|origin/i);
  const hasCredential = hasSignal(joinedText, /credential|attestation|issuer|proof|receipt|disclosure|vault/i) || input.selectiveDisclosureVaultGate !== undefined;

  const issuerQuorum = clampScore(
    average(
      [
        confidence,
        adapterCoverage,
        hasDepth ? liveReadiness : average([liveReadiness, 45], 50),
        hasReserve ? proofCompleteness : average([proofCompleteness, 42], 48),
        hasProvenance ? average([freshness, 88], 70) : average([freshness, 48], 50),
        disclosureScore,
      ],
      52,
    ) - knownFaults.length * 3,
  );

  const attestationPressure = clampScore(
    faultPressure * 0.28 +
      redactionPressure * 0.24 +
      (100 - freshness) * 0.18 +
      (100 - proofCompleteness) * 0.14 +
      (100 - adapterCoverage) * 0.1 +
      missingCount * 0.8 +
      knownFaults.length * 5,
  );

  const credentialScore = clampScore(
    issuerQuorum * 0.26 +
      freshness * 0.18 +
      proofCompleteness * 0.18 +
      liveReadiness * 0.14 +
      replayReadiness * 0.1 +
      disclosureScore * 0.14 -
      attestationPressure * 0.18,
  );

  const credentialState = stateFor(credentialScore, attestationPressure);
  const disclosureClass = classFor(credentialState);
  const proofHashHint = hashHint(`${query}|${credentialScore}|${issuerQuorum}|${disclosureClass}|${expirySeconds}`);

  const lanes: VerifiableSourceCredentialLane[] = [
    buildLane({
      id: "issuer_identity_credential",
      label: "Issuer identity credential",
      score: average([confidence, adapterCoverage], 50),
      pressure: knownFaults.length ? faultPressure : 100 - confidence,
      issuer: "velmere_router",
      proofField: "issuer:velmere-router · subject:token-or-query · audience:customer/operator split",
      expirySeconds,
      customerBoundary: "Customer sees issuer and subject limits before any proof card.",
      operatorEvidence: "Operator checks identity mismatch, symbol alias and route source.",
    }),
    buildLane({
      id: "depth_snapshot_credential",
      label: "Depth snapshot credential",
      score: hasDepth ? liveReadiness : average([liveReadiness, 46], 50),
      pressure: hasDepth ? 100 - liveReadiness : clampScore(100 - liveReadiness + 18),
      issuer: "exchange_adapter",
      proofField: "claim:depth-snapshot · fields:venue, spread, slippage-context, timecode",
      expirySeconds: Math.min(expirySeconds, 420),
      customerBoundary: "Depth is shown as liquidity context only, never as an action instruction.",
      operatorEvidence: "Operator checks WebSocket/REST continuity and venue source debt.",
    }),
    buildLane({
      id: "reserve_snapshot_credential",
      label: "Reserve snapshot credential",
      score: hasReserve ? proofCompleteness : average([proofCompleteness, 44], 48),
      pressure: hasReserve ? 100 - proofCompleteness : clampScore(100 - proofCompleteness + 16),
      issuer: "reserve_snapshot",
      proofField: "claim:reserve-context · fields:network, wallet, snapshot, source-boundary",
      expirySeconds: Math.max(300, expirySeconds),
      customerBoundary: "Reserve context is transparent snapshot context, not broad safety language.",
      operatorEvidence: "Operator checks network, wallet address source policy and timestamp.",
    }),
    buildLane({
      id: "provenance_passport_credential",
      label: "Provenance passport credential",
      score: hasProvenance ? average([freshness, proofCompleteness, 86], 70) : average([freshness, 50], 50),
      pressure: hasProvenance ? redactionPressure : clampScore(redactionPressure + 14),
      issuer: "dpp_provenance",
      proofField: "claim:provenance-passport · fields:origin, lifecycle, traceability, owner-boundary",
      expirySeconds: Math.max(600, expirySeconds),
      customerBoundary: "DPP-style context stays traceability-focused and avoids product-wide claims.",
      operatorEvidence: "Operator checks DPP, Aura/LVMH-style provenance and data owner boundary.",
    }),
    buildLane({
      id: "freshness_expiry_credential",
      label: "Freshness expiry credential",
      score: freshness,
      pressure: clampScore(100 - freshness + (expirySeconds < 300 ? 18 : 0)),
      issuer: "operator_vault",
      proofField: "claim:freshness-expiry · fields:issuedAt, expiresAt, drift, replay-readiness",
      expirySeconds,
      customerBoundary: "Customer sees proof age and limitation text when freshness decays.",
      operatorEvidence: "Operator checks source TTL, stale lanes and browser replay trace.",
    }),
    buildLane({
      id: "customer_disclosure_credential",
      label: "Customer disclosure credential",
      score: hasCredential ? disclosureScore : average([disclosureScore, 52], 52),
      pressure: redactionPressure,
      issuer: "operator_vault",
      proofField: "claim:disclosure-class · fields:public, guided, redacted, operator-only",
      expirySeconds,
      customerBoundary: "Customer receives only the disclosure class that redaction and replay can support.",
      operatorEvidence: "Operator checks selective disclosure, export copy and receipt limits.",
    }),
  ];

  const actions: VerifiableSourceCredentialAction[] = [
    {
      id: "credential-disclosure-class",
      label: disclosureClass.replaceAll("_", " "),
      posture:
        credentialState === "credential_ready"
          ? "issue_public_credential"
          : credentialState === "credential_limited"
            ? "issue_guided_credential"
            : credentialState === "credential_redacted"
              ? "issue_redacted_credential"
              : "hold_for_operator_attestation",
      reason: headlineFor(credentialState),
      safeBoundary: "Credential class follows issuer quorum, expiry, proof completeness and selective disclosure.",
    },
    {
      id: "proof-hash-hint",
      label: proofHashHint,
      posture: credentialScore >= 76 && credentialState !== "operator_attestation_required" ? "issue_guided_credential" : "issue_redacted_credential",
      reason: "Hash hint lets the UI show proof continuity without exposing raw adapter payloads.",
      safeBoundary: "Hash hint is a local receipt marker and does not replace external verification or review.",
    },
  ];

  return {
    version: "velmere_verifiable_source_credential_gate_v1_pass306",
    surface: input.surface,
    query,
    credentialId: `vsc-${slug(query)}-${disclosureClass}`,
    credentialState,
    credentialScore,
    issuerQuorum,
    expirySeconds,
    disclosureClass,
    attestationPressure,
    proofHashHint,
    headline: headlineFor(credentialState),
    lanes,
    actions,
    customerMicrocopy:
      credentialState === "credential_ready"
        ? "Verifiable Source Credential can show a public proof card with visible issuer, expiry and disclosure limits."
        : credentialState === "credential_limited"
          ? "Verifiable Source Credential keeps the proof guided while adapter, freshness or provenance lanes are still bounded."
          : credentialState === "credential_redacted"
            ? "Verifiable Source Credential shows only a redacted proof receipt until an operator reviews source and disclosure debt."
            : "Verifiable Source Credential holds this proof for operator attestation until issuer, expiry and disclosure lanes recover.",
    operatorMicrocopy: `PASS306 credential: score ${credentialScore}/100 · quorum ${issuerQuorum}/100 · pressure ${attestationPressure}/100 · expiry ${expirySeconds}s · class ${disclosureClass}.`,
    psychologyRules: [
      "FOMO is inverted into credential friction: weak proof earns a smaller credential, not louder urgency.",
      "Elite status is tied to issuer quorum, expiry and selective disclosure rather than scarcity language.",
      "Customer trust comes from visible proof limits and hash continuity, not hidden ranking pressure.",
      "Operator attestation stays richer than customer proof until source and redaction boundaries agree.",
    ],
    blockedManipulationPatterns: [
      "No timer pressure.",
      "No trade action command.",
      "No broad safety wording from reserve, depth or provenance context.",
      "No stale-source credential promotion.",
    ],
    innovation:
      "Verifiable Source Credential: a Velmère-only proof handshake that turns exchange depth, reserve snapshots, freshness timecodes, DPP-style provenance and selective disclosure into a short-lived customer/operator credential before report or premium status can advance.",
  };
}
