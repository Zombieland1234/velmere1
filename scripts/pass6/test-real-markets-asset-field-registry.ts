import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../../lib/security/canonical-json";
import { sha256Digest } from "../../lib/security/cryptographic-digest";
import {
  buildPass4824FieldObservation,
  getPass4824VisibleFieldDefinitions,
  type Pass4824DataTier,
  type Pass4824FieldDefinition,
  type Pass4824FieldObservation,
} from "../../lib/reporting/canonical-field-registry";
import {
  buildPass6AssetFieldCompletenessReceipt,
  buildPass6CatalogCoverageReceipt,
  buildPass6FieldEvidenceAttestation,
  getPass6RealMarketsAssetFieldRules,
  inspectPass6RealMarketsAssetFieldRegistry,
  PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY,
  PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY_DIGEST,
  verifyPass6AssetFieldCompletenessReceipt,
  verifyPass6CatalogCoverageReceipt,
  type Pass6AssetFieldValidationInput,
  type Pass6FieldEvidenceAttestation,
  type Pass6RealMarketsAssetClass,
} from "../../lib/reporting/real-markets-asset-field-registry";

const GENERATED_AT = "2026-07-18T00:01:00.000Z";
const OBSERVED_AT = "2026-07-18T00:00:30.000Z";
const RECEIVED_AT = "2026-07-18T00:00:45.000Z";
const PROVIDERS = ["upstream-a.example", "upstream-b.example", "upstream-c.example"] as const;
let assertions = 0;

function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  assertions += 1;
}

function canonicalDefinitions(tier: Pass4824DataTier) {
  const byId = new Map<string, Pass4824FieldDefinition>();
  for (const definition of getPass4824VisibleFieldDefinitions("real_markets", tier)) byId.set(definition.fieldId, definition);
  return Array.from(byId.values()).sort((left, right) => left.fieldId.localeCompare(right.fieldId));
}

function valueFor(definition: Pass4824FieldDefinition, assetClass: Pass6RealMarketsAssetClass, fieldId: string): unknown {
  const values: Record<string, unknown> = {
    "identity.canonical_id": `market:${assetClass}:test`,
    "identity.symbol": assetClass === "fx" ? "EUR/USD" : "TEST",
    "identity.asset_class": assetClass,
    "risk.score": 0,
    "risk.confidence": 92,
    "evidence.missing": [],
    "evidence.gap_count": 0,
    "evidence.primary_gap": "none",
    "market.price": 100,
    "market.change_24h": 0,
    "market.volume_24h": assetClass === "fx" ? null : 0,
    "market.change_1h": 0,
    "source.second_source_divergence_bps": 0,
    "market.liquidity_usd": 1_000_000,
    "market.impact_10k_bps": 10,
    "market.orderbook_depth_usd": 2_000_000,
    "scenario.stress_loss_percent": 0,
    "evidence.claim_ledger": { claims: [], blocked: [] },
    "fundamentals.quality_score": ["equity", "etf", "real_estate"].includes(assetClass) ? 80 : null,
    "macro.regime": assetClass === "crypto" ? null : "neutral",
  };
  if (Object.hasOwn(values, fieldId)) return values[fieldId];
  if (definition.valueKind === "record") return { state: "verified" };
  if (definition.valueKind === "string_array") return [];
  if (definition.valueKind === "number" || definition.valueKind === "integer") return 0;
  return "verified";
}

function makeObservation(args: {
  definition: Pass4824FieldDefinition;
  assetClass: Pass6RealMarketsAssetClass;
  canonicalId: string;
  value?: unknown;
  currency?: string | null;
  observedAt?: string;
}) {
  const value = typeof args.value === "undefined" ? valueFor(args.definition, args.assetClass, args.definition.fieldId) : args.value;
  const missing = value === null;
  return buildPass4824FieldObservation({
    fieldId: args.definition.fieldId,
    value,
    unit: args.definition.unit,
    currency: typeof args.currency === "undefined" ? args.definition.currencyPolicy === "required_iso_4217" ? "USD" : null : args.currency,
    missingReason: missing ? "Field is not applicable for this asset-class contract." : null,
    evidenceRefs: missing
      ? [`missing:${args.definition.fieldId}`]
      : PROVIDERS.map((provider) => `receipt:${provider}:${args.definition.fieldId}`),
    provenance: {
      mode: missing ? "explicit_missing" : "provider_observation",
      sourceId: missing ? `missing:${args.definition.fieldId}` : `aggregate:${args.definition.fieldId}`,
      sourceFamily: missing ? "explicit_missing" : "verified_provider_aggregate",
      adapterId: "pass6-asset-field-test-adapter-v1",
      fixtureId: null,
      requestedIdentity: args.canonicalId,
      resolvedIdentity: args.canonicalId,
      identityMatch: "exact",
      observedAt: args.observedAt ?? OBSERVED_AT,
      receivedAt: RECEIVED_AT,
      derivationDigest: null,
    },
  });
}

function numericValue(observation: Pass4824FieldObservation) {
  return typeof observation.value === "number" ? observation.value : null;
}

function attestationsForObservation(observation: Pass4824FieldObservation): Pass6FieldEvidenceAttestation[] {
  if (observation.value === null) return [];
  return PROVIDERS.map((provider, index) => buildPass6FieldEvidenceAttestation({
    fieldId: observation.fieldId,
    evidenceRef: `receipt:${provider}:${observation.fieldId}`,
    sourceId: `provider-${index + 1}`,
    sourceFamily: `provider-family-${index + 1}`,
    upstreamRoot: provider,
    commercialEligible: true,
    contentBound: true,
    identityMatch: "exact",
    observedAt: OBSERVED_AT,
    receivedAt: RECEIVED_AT,
    bindingDigest: observation.evidenceDigest,
    contentDigest: sha256Digest(canonicalJson({ provider, fieldId: observation.fieldId, value: observation.value })),
    currency: observation.currency,
    numericValue: numericValue(observation),
  }));
}

function extensionAttestations(fieldId: string, value: string): Pass6FieldEvidenceAttestation[] {
  return PROVIDERS.map((provider, index) => buildPass6FieldEvidenceAttestation({
    fieldId,
    evidenceRef: `receipt:${provider}:${fieldId}`,
    sourceId: `provider-${index + 1}`,
    sourceFamily: `provider-family-${index + 1}`,
    upstreamRoot: provider,
    commercialEligible: true,
    contentBound: true,
    identityMatch: "exact",
    observedAt: OBSERVED_AT,
    receivedAt: RECEIVED_AT,
    bindingDigest: sha256Digest(canonicalJson(value)),
    contentDigest: sha256Digest(canonicalJson({ provider, fieldId, value })),
    currency: null,
    numericValue: null,
  }));
}

function completeInput(assetClass: Pass6RealMarketsAssetClass, tier: Pass4824DataTier = "pro"): Pass6AssetFieldValidationInput {
  const canonicalId = `market:${assetClass}:test`;
  const observations = canonicalDefinitions(tier).map((definition) => makeObservation({ definition, assetClass, canonicalId }));
  const venue = assetClass === "fx" ? "provider:institutional-fx" : "exchange:XTEST";
  const instrumentContract = assetClass === "fx" ? "spot:EUR/USD" : assetClass === "commodity" ? "future:TEST:2026-12" : null;
  return {
    packet: {
      schemaVersion: "pass4824-canonical-field-packet-v1",
      caseId: `pass6-${assetClass}-${tier}`,
      module: "real_markets",
      tier,
      identity: {
        canonicalId,
        symbol: assetClass === "fx" ? "EUR/USD" : "TEST",
        assetClass,
        chainId: null,
        contractAddress: null,
      },
      generatedAt: GENERATED_AT,
      observations,
    },
    assetClass,
    tier,
    identityResolution: {
      venue: { state: "exact", value: venue },
      instrumentContract: instrumentContract
        ? { state: "exact", value: instrumentContract }
        : { state: "not_applicable", value: null },
    },
    evidence: [
      ...observations.flatMap(attestationsForObservation),
      ...extensionAttestations("identity.venue", venue),
      ...(instrumentContract ? extensionAttestations("identity.instrument_contract", instrumentContract) : []),
    ],
    evaluatedAt: GENERATED_AT,
  };
}

function replaceObservation(input: Pass6AssetFieldValidationInput, fieldId: string, replacement: Pass4824FieldObservation) {
  return {
    ...input,
    packet: {
      ...input.packet,
      observations: input.packet.observations.map((observation) => observation.fieldId === fieldId ? replacement : observation),
    },
  } satisfies Pass6AssetFieldValidationInput;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function main() {
  const registryInspection = inspectPass6RealMarketsAssetFieldRegistry();
  check(registryInspection.status === "passed", `registry inspection must pass: ${registryInspection.errors.join(",")}`);
  check(PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY.length === 300, "registry must cover all 300 asset-class/tier/field cells");
  check(Object.isFrozen(PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY) && PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY.every(Object.isFrozen), "registry and rule rows must be immutable");
  check(getPass6RealMarketsAssetFieldRules("equity", "basic").length === 12, "Basic matrix must contain ten canonical fields plus two identity dimensions");
  check(getPass6RealMarketsAssetFieldRules("equity", "pro").length === 16, "Pro matrix must contain fourteen canonical fields plus two identity dimensions");
  check(getPass6RealMarketsAssetFieldRules("equity", "advanced").length === 22, "Advanced matrix must preserve the canonical matrix and identity extensions without duplicate semantics");
  check(/^sha256:[a-f0-9]{64}$/.test(PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY_DIGEST), "registry digest must be content-bound");

  const equity = completeInput("equity");
  const complete = buildPass6AssetFieldCompletenessReceipt(equity);
  check(complete.canonicalValidationStatus === "passed", `canonical packet must pass: ${complete.canonicalValidationErrors.join(",")}`);
  check(complete.completenessBps === 10_000, "complete Pro packet must reach exact critical-field completeness");
  check(complete.paidDeliveryEligible, `complete Pro packet must be paid eligible: ${complete.blockers.join(",")}`);
  check(verifyPass6AssetFieldCompletenessReceipt(complete), "field completeness receipt must verify");
  check(complete.fieldRows.find((row) => row.fieldId === "risk.score")?.state === "available", "numeric zero risk score must remain valid");
  check(complete.fieldRows.find((row) => row.fieldId === "market.change_24h")?.state === "available", "numeric zero change must remain valid");
  check(complete.fieldRows.find((row) => row.fieldId === "market.volume_24h")?.state === "available", "numeric zero volume must remain valid");

  const completeAdvanced = buildPass6AssetFieldCompletenessReceipt(completeInput("equity", "advanced"));
  check(completeAdvanced.completenessBps === 10_000 && completeAdvanced.paidDeliveryEligible, `complete three-upstream Advanced packet must pass: ${completeAdvanced.blockers.join(",")}`);

  const fx = buildPass6AssetFieldCompletenessReceipt(completeInput("fx"));
  check(fx.notApplicableFields.includes("market.volume_24h"), "FX consolidated volume must be explicitly N/A");
  check(!fx.missingCriticalFields.includes("market.volume_24h"), "N/A volume must not enter the missing denominator");
  check(fx.fieldRows.find((row) => row.fieldId === "market.volume_24h")?.state === "not_applicable", "N/A field state must be exact");
  check(fx.paidDeliveryEligible, `N/A must not block otherwise complete Pro delivery: ${fx.blockers.join(",")}`);

  const falseFxVolumeInput = completeInput("fx");
  const falseFxVolumeIndex = falseFxVolumeInput.packet.observations.findIndex((row) => row.fieldId === "market.volume_24h");
  falseFxVolumeInput.packet.observations[falseFxVolumeIndex] = makeObservation({
    definition: canonicalDefinitions("pro").find((row) => row.fieldId === "market.volume_24h")!,
    assetClass: "fx",
    canonicalId: falseFxVolumeInput.packet.identity.canonicalId,
    value: 500,
  });
  falseFxVolumeInput.evidence.push(...attestationsForObservation(falseFxVolumeInput.packet.observations[falseFxVolumeIndex]));
  const falseFxVolume = buildPass6AssetFieldCompletenessReceipt(falseFxVolumeInput);
  check(falseFxVolume.blockers.includes("market.volume_24h:not_applicable_field_has_value"), "a value claimed for an N/A field must be a semantic contradiction");
  check(!falseFxVolume.paidDeliveryEligible, "an N/A semantic contradiction must block paid delivery");

  const ambiguousVenueInput = clone(equity);
  ambiguousVenueInput.identityResolution.venue = { state: "ambiguous", value: null };
  const ambiguousVenue = buildPass6AssetFieldCompletenessReceipt(ambiguousVenueInput);
  check(ambiguousVenue.identityState === "blocked" && ambiguousVenue.blockers.includes("identity_venue_ambiguous"), "ambiguous venue must block identity");
  check(!ambiguousVenue.paidDeliveryEligible, "ambiguous venue must block paid delivery");

  const ambiguousContractInput = clone(equity);
  ambiguousContractInput.identityResolution.instrumentContract = { state: "ambiguous", value: null };
  const ambiguousContract = buildPass6AssetFieldCompletenessReceipt(ambiguousContractInput);
  check(ambiguousContract.identityState === "blocked" && ambiguousContract.blockers.includes("identity_instrument_contract_ambiguous"), "ambiguous contract must block identity even when normally N/A");

  const missingVenueInput = clone(equity);
  missingVenueInput.identityResolution.venue = { state: "missing", value: null };
  missingVenueInput.evidence = missingVenueInput.evidence.filter((item) => item.fieldId !== "identity.venue");
  const missingVenue = buildPass6AssetFieldCompletenessReceipt(missingVenueInput);
  check(missingVenue.missingCriticalFields.includes("identity.venue"), "missing exchange/venue must be visible");

  const priceObservation = equity.packet.observations.find((row) => row.fieldId === "market.price")!;
  const missingCurrencyInput = clone(equity);
  const priceIndex = missingCurrencyInput.packet.observations.findIndex((row) => row.fieldId === "market.price");
  missingCurrencyInput.packet.observations[priceIndex] = { ...priceObservation, currency: null };
  const missingCurrency = buildPass6AssetFieldCompletenessReceipt(missingCurrencyInput);
  check(missingCurrency.fieldRows.find((row) => row.fieldId === "market.price")?.blockers.includes("observation_currency_required"), "missing quote currency must be visible");

  const invalidTimestampInput = clone(equity);
  const timestampIndex = invalidTimestampInput.packet.observations.findIndex((row) => row.fieldId === "market.price");
  invalidTimestampInput.packet.observations[timestampIndex] = {
    ...invalidTimestampInput.packet.observations[timestampIndex],
    provenance: { ...invalidTimestampInput.packet.observations[timestampIndex].provenance, observedAt: "not-a-timestamp" },
  };
  const invalidTimestamp = buildPass6AssetFieldCompletenessReceipt(invalidTimestampInput);
  check(invalidTimestamp.fieldRows.find((row) => row.fieldId === "market.price")?.blockers.includes("observation_timestamp_invalid"), "invalid observation timestamp must be visible");

  const changeDefinition = canonicalDefinitions("pro").find((row) => row.fieldId === "market.change_24h")!;
  const missingChangeObservation = makeObservation({ definition: changeDefinition, assetClass: "equity", canonicalId: equity.packet.identity.canonicalId, value: null });
  const missingChange = buildPass6AssetFieldCompletenessReceipt(replaceObservation(equity, "market.change_24h", missingChangeObservation));
  check(missingChange.missingCriticalFields.includes("market.change_24h"), "missing change must be visible");

  const volumeDefinition = canonicalDefinitions("pro").find((row) => row.fieldId === "market.volume_24h")!;
  const missingVolumeObservation = makeObservation({ definition: volumeDefinition, assetClass: "equity", canonicalId: equity.packet.identity.canonicalId, value: null });
  const missingVolume = buildPass6AssetFieldCompletenessReceipt(replaceObservation(equity, "market.volume_24h", missingVolumeObservation));
  check(missingVolume.missingCriticalFields.includes("market.volume_24h"), "missing volume must be visible for equity");

  const quorumInput = clone(equity);
  quorumInput.evidence = quorumInput.evidence.filter((item) => item.fieldId !== "market.price" || item.upstreamRoot === PROVIDERS[0]);
  const quorum = buildPass6AssetFieldCompletenessReceipt(quorumInput);
  check(quorum.fieldRows.find((row) => row.fieldId === "market.price")?.blockers.some((blocker) => blocker === "independent_quorum_shortfall:1/2"), "per-field independent quorum must block one-source price");
  check(!quorum.paidDeliveryEligible, "quorum shortfall must block paid Pro delivery");

  const divergenceInput = clone(equity);
  for (let index = 0; index < divergenceInput.evidence.length; index += 1) {
    const item = divergenceInput.evidence[index];
    if (item.fieldId === "market.price" && item.upstreamRoot === PROVIDERS[1]) {
      const { schemaVersion: _schemaVersion, attestationDigest: _attestationDigest, ...unsigned } = item;
      divergenceInput.evidence[index] = buildPass6FieldEvidenceAttestation({
        ...unsigned,
        numericValue: 120,
        contentDigest: sha256Digest(canonicalJson({ provider: PROVIDERS[1], fieldId: item.fieldId, value: 120 })),
      });
    }
  }
  const divergence = buildPass6AssetFieldCompletenessReceipt(divergenceInput);
  check(divergence.fieldRows.find((row) => row.fieldId === "market.price")?.blockers.some((blocker) => blocker.startsWith("source_divergence_exceeded:")), "field divergence tolerance must fail closed");

  const attestationTamperInput = clone(equity);
  const tamperedPriceEvidence = attestationTamperInput.evidence.find((item) => item.fieldId === "market.price")!;
  tamperedPriceEvidence.numericValue = 101;
  const attestationTamper = buildPass6AssetFieldCompletenessReceipt(attestationTamperInput);
  check(attestationTamper.fieldRows.find((row) => row.fieldId === "market.price")?.blockers.includes("source_attestation_integrity_invalid"), "mutated source attestation must be rejected");

  const coverage = buildPass6CatalogCoverageReceipt({ tier: "pro", generatedAt: GENERATED_AT });
  check(coverage.catalogAssetDenominator === 553, "catalog asset denominator must be exactly 553");
  check(coverage.catalogUniqueSymbolDenominator === 553, "catalog unique-symbol denominator must be exactly 553");
  check(coverage.providerRequiredAssetCount === 480, "provider_required denominator must be exactly 480");
  check(coverage.providerRequiredExplicitMissingCount === 480, "every provider_required item must remain explicitly missing");
  check(coverage.providerRequiredPaidBlockedCount === 480, "every provider_required Pro item must be paid-blocked");
  check(coverage.providerAvailabilityClaimedCount === 0, "offline coverage must claim no provider availability");
  check(coverage.paidDeliveryEligibleAssetCount === 0, "offline coverage must claim no paid-ready catalog item");
  check(coverage.availableCriticalFieldCellNumerator === 0 && coverage.completenessBps === 0, "no observations means exact zero measured coverage");
  check(coverage.assetClassCounts.equity === 263 && coverage.assetClassCounts.fx === 80 && coverage.assetClassCounts.etf === 86, "catalog equity/FX/ETF counts must match source catalog");
  check(coverage.assetClassCounts.commodity === 68 && coverage.assetClassCounts.real_estate === 53 && coverage.assetClassCounts.crypto === 3, "catalog commodity/real-estate/crypto counts must match source catalog");
  check(verifyPass6CatalogCoverageReceipt(coverage), "catalog coverage receipt must verify");

  const providerRequiredInputIgnored = buildPass6CatalogCoverageReceipt({
    tier: "pro",
    generatedAt: GENERATED_AT,
    observationsByCatalogId: { "pass371-aapl": equity },
  });
  const providerRequiredAapl = providerRequiredInputIgnored.rows.find((row) => row.catalogId === "pass371-aapl")!;
  check(providerRequiredAapl.state === "explicit_missing_provider_required" && !providerRequiredAapl.providerAvailabilityClaimed, "runtime input cannot override provider_required catalog truth");

  const advancedCoverage = buildPass6CatalogCoverageReceipt({ tier: "advanced", generatedAt: GENERATED_AT });
  check(advancedCoverage.providerRequiredPaidBlockedCount === 480, "every provider_required Advanced item must be paid-blocked");
  check(advancedCoverage.availableCriticalFieldCellNumerator === 0 && advancedCoverage.completenessBps === 0, "Advanced offline coverage must remain exact zero without provider observations");

  const tampered = clone(coverage);
  tampered.providerAvailabilityClaimedCount = 1;
  check(!verifyPass6CatalogCoverageReceipt(tampered), "tampered coverage receipt must fail verification");

  const outDir = path.resolve(process.cwd(), "artifacts/pass6");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "real-markets-553-catalog-coverage-pro-offline.json"), `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "real-markets-asset-field-registry-summary.json"), `${JSON.stringify({
    schemaVersion: "pass6-real-markets-asset-field-registry-test-summary-v1",
    status: "passed",
    assertions,
    registryEntryCount: PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY.length,
    registryDigest: PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY_DIGEST,
    catalog: {
      assets: coverage.catalogAssetDenominator,
      criticalFieldCellDenominator: coverage.criticalFieldCellDenominator,
      availableCriticalFieldCellNumerator: coverage.availableCriticalFieldCellNumerator,
      completenessBps: coverage.completenessBps,
      providerRequired: coverage.providerRequiredAssetCount,
      providerRequiredExplicitMissing: coverage.providerRequiredExplicitMissingCount,
      providerRequiredPaidBlocked: coverage.providerRequiredPaidBlockedCount,
      providerAvailabilityClaimed: coverage.providerAvailabilityClaimedCount,
      paidDeliveryEligible: coverage.paidDeliveryEligibleAssetCount,
      advancedCriticalFieldCellDenominator: advancedCoverage.criticalFieldCellDenominator,
      advancedProviderRequiredPaidBlocked: advancedCoverage.providerRequiredPaidBlockedCount,
      openBlockers: coverage.openBlockers,
    },
  }, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    assertions,
    registryEntryCount: PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY.length,
    registryDigest: PASS6_REAL_MARKETS_ASSET_FIELD_REGISTRY_DIGEST,
    catalogAssetDenominator: coverage.catalogAssetDenominator,
    criticalFieldCellDenominator: coverage.criticalFieldCellDenominator,
    availableCriticalFieldCellNumerator: coverage.availableCriticalFieldCellNumerator,
    completenessBps: coverage.completenessBps,
    providerRequiredExplicitMissingCount: coverage.providerRequiredExplicitMissingCount,
    providerRequiredPaidBlockedCount: coverage.providerRequiredPaidBlockedCount,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
