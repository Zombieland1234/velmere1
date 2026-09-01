#!/usr/bin/env node
import { createHash, createHmac } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

const GENERATED_AT = "2026-08-20T12:00:00.000Z";
const OBSERVED_AT = "2026-08-20T11:59:00.000Z";
const ACCOUNT = "preview:p87-real-markets-owner-0001";
const OTHER_ACCOUNT = "preview:p87-real-markets-other-0002";
const TOKEN_SECRET = "p87-local-only-customer-report-token-secret-0123456789abcdef";
const PROJECTION_SECRET = "p87-local-only-source-projection-secret-0123456789abcdef";
const CHECKS = [];

const REAL_DATE = Date;
function installFixedClock(iso) {
  const fixedMs = REAL_DATE.parse(iso);
  globalThis.Date = class FixedDate extends REAL_DATE {
    constructor(...args) { super(...(args.length === 0 ? [fixedMs] : args)); }
    static now() { return fixedMs; }
  };
}

process.env.NODE_ENV = "test";
process.env.VERCEL_ENV = "preview";
process.env.VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_CURRENT = TOKEN_SECRET;
process.env.VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_KEY_ID = "p87-local-current";
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = PROJECTION_SECRET;
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "p87-local-projection";

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}
function sha256Hex(value) { return createHash("sha256").update(value).digest("hex"); }
function clone(value) { return structuredClone(value); }
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  CHECKS.push(row);
  if (!condition) throw new Error(`P87 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}
async function responseJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function capabilityForField(fieldId) {
  if (fieldId.startsWith("identity.")) return "identity";
  if (fieldId.startsWith("evidence.")) return "evidence";
  if (fieldId.startsWith("risk.")) return "price";
  if (fieldId === "market.price" || fieldId === "source.second_source_divergence_bps") return "price";
  if (fieldId.startsWith("market.change_")) return "history";
  if (fieldId === "market.volume_24h") return "volume";
  if (fieldId === "market.liquidity_usd") return "liquidity";
  throw new Error(`p87_fixture_capability_missing:${fieldId}`);
}
function receiptId(fields) {
  const canonical = {
    schemaVersion: fields.schemaVersion,
    providerId: fields.providerId,
    providerFamily: fields.providerFamily,
    surface: fields.surface,
    verification: fields.verification,
    state: fields.state,
    identity: {
      requested: fields.identity.requested,
      resolvedSymbol: fields.identity.resolvedSymbol ?? null,
      resolvedMarketId: fields.identity.resolvedMarketId ?? null,
      resolvedAddress: fields.identity.resolvedAddress ?? null,
      resolvedChainId: fields.identity.resolvedChainId ?? null,
      matched: fields.identity.matched,
    },
    capabilities: Array.from(new Set(fields.capabilities)).sort(),
    fieldEvidence: (fields.fieldEvidence ?? []).map((item) => ({
      fieldPath: item.fieldPath,
      capability: item.capability,
      valueHash: item.valueHash,
    })).sort((left, right) => left.fieldPath.localeCompare(right.fieldPath) || left.valueHash.localeCompare(right.valueHash)),
    timestampProvenance: fields.timestampProvenance,
    observedAt: fields.observedAt,
    receivedAt: fields.receivedAt,
    expiresAt: fields.expiresAt,
    freshnessMs: fields.freshnessMs,
    fresh: fields.fresh,
    httpStatus: fields.httpStatus,
    latencyMs: fields.latencyMs,
    payloadBytes: fields.payloadBytes,
    payloadHash: fields.payloadHash,
    commercialEvidenceEligible: fields.commercialEvidenceEligible,
    rejectionReasons: Array.from(new Set(fields.rejectionReasons)).sort(),
  };
  return `p4644_${sha256Hex(stableSerialize(canonical)).slice(0, 24)}`;
}

async function main() {
  installFixedClock(GENERATED_AT);
  const [
    { canonicalJson },
    { sha256Digest },
    { pass4644FieldValueHash, verifyPass4644ProviderEvidenceReceiptIntegrity },
    { buildCustomerReportPayload },
    { buildPass4825RuntimeCanonicalFieldPacket },
    { buildPass6CommercialFieldCompletenessReceipt, verifyPass6CommercialFieldCompletenessReceipt },
    { createPass4823RealMarketsPaidAccountArtifact },
    { verifyP87CustomerReportExactPdfToken, P87_CUSTOMER_REPORT_EXACT_PDF_TOKEN_ID },
    { getPass4822AccountCustomerArtifactSnapshot, getPass4824AccountCustomerArtifactPdfBlob },
    { handleP87CustomerReportPdfPost, handleP87ExactPaidPdf },
    { buildPass4818CustomerReportArtifact, buildPass4818CustomerReportAccountArtifactSnapshot, issuePass4818CustomerReportRenderToken },
  ] = await Promise.all([
    import("../../lib/security/canonical-json.ts"),
    import("../../lib/security/cryptographic-digest.ts"),
    import("../../lib/market-integrity/provider-evidence-receipt.ts"),
    import("../../lib/market-integrity/customer-report-payload.ts"),
    import("../../lib/reporting/runtime-canonical-field-adapter.ts"),
    import("../../lib/reporting/commercial-field-completeness.ts"),
    import("../../lib/market-integrity/real-markets-paid-account-artifact.ts"),
    import("../../lib/market-integrity/customer-report-exact-pdf-token.ts"),
    import("../../lib/reporting/account-customer-artifact-store.ts"),
    import("../../lib/server/market-integrity-route-modules/report-pdf.ts"),
    import("../../lib/market-integrity/customer-report-render-token.ts"),
  ]);

  const runtimeValues = {
    "risk.score": { value: 31, confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "risk.confidence": { value: 96, confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "evidence.missing": { value: [], confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "evidence.gap_count": { value: 0, confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "evidence.primary_gap": { value: "none", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "market.price": { value: 101.25, mode: "provider_observation", currency: "USD", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "market.change_24h": { value: 0.8, mode: "provider_observation", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "market.volume_24h": { value: 5_000_000, mode: "provider_observation", currency: "USD", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "market.change_1h": { value: 0.2, mode: "provider_observation", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "source.second_source_divergence_bps": { value: 4, confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
    "market.liquidity_usd": { value: 2_000_000, mode: "provider_observation", currency: "USD", confidence: 96, quality: 96, observedAt: OBSERVED_AT, receivedAt: GENERATED_AT },
  };
  const rawValues = {
    "identity.canonical_id": "equity:xnas:aapl",
    "identity.symbol": "AAPL",
    "identity.asset_class": "equity",
    ...Object.fromEntries(Object.entries(runtimeValues).map(([fieldId, configured]) => [fieldId, configured.value])),
  };
  function providerReceipt(providerId) {
    const fields = {
      schemaVersion: "pass4644_provider_evidence_receipt_v1",
      providerId,
      providerFamily: providerId,
      surface: "real_markets",
      verification: "normalized_response",
      state: "confirmed",
      identity: {
        requested: "equity:xnas:aapl",
        resolvedSymbol: "AAPL",
        resolvedMarketId: "equity:xnas:aapl",
        matched: true,
      },
      capabilities: ["identity", "evidence", "quote", "price", "history", "volume", "liquidity", "real_market_quote"],
      fieldEvidence: Object.entries(rawValues).map(([fieldPath, value]) => ({
        fieldPath,
        capability: capabilityForField(fieldPath),
        valueHash: pass4644FieldValueHash(value),
      })),
      timestampProvenance: "provider",
      observedAt: OBSERVED_AT,
      receivedAt: GENERATED_AT,
      expiresAt: "2026-08-20T12:09:00.000Z",
      freshnessMs: 60_000,
      fresh: true,
      httpStatus: 200,
      latencyMs: 15,
      payloadBytes: Buffer.byteLength(canonicalJson(rawValues), "utf8"),
      payloadHash: sha256Hex(canonicalJson({ providerId, rawValues })),
      commercialEvidenceEligible: true,
      rejectionReasons: [],
    };
    return { ...fields, receiptId: receiptId(fields) };
  }
  const providerEvidenceReceipts = [providerReceipt("yahoo"), providerReceipt("stooq")];
  check("provider_receipt_yahoo_integrity", verifyPass4644ProviderEvidenceReceiptIntegrity(providerEvidenceReceipts[0]));
  check("provider_receipt_stooq_integrity", verifyPass4644ProviderEvidenceReceiptIntegrity(providerEvidenceReceipts[1]));

  const decisions = [
    { id: "basic-current-state", title: "Current state", minimumTier: "Basic", state: "ready", summary: "Bounded fixture state.", evidence: ["price observation", "timestamp observation"], actions: ["verify freshness"] },
    { id: "pro-quorum", title: "Independent quorum", minimumTier: "Pro", state: "ready", summary: "Two independent upstream roots agree.", evidence: ["yahoo receipt", "stooq receipt"], actions: ["review divergence"] },
    { id: "pro-liquidity", title: "Liquidity context", minimumTier: "Pro", state: "watch", summary: "Liquidity and volume are evidence-bound.", evidence: ["volume receipt", "liquidity receipt"], actions: ["monitor liquidity"] },
  ];
  const base = buildCustomerReportPayload({
    locale: "en",
    tier: "Pro",
    symbol: "AAPL",
    name: "P87 REAL MARKETS EXACT PDF FIXTURE - NOT CUSTOMER FINAL",
    family: "equity",
    reportSurface: "real_markets",
    riskScore: 31,
    sourceFamilyCount: 2,
    missingEvidence: [],
    providerConflicts: [],
    chartMode: "fallback",
    providerEvidenceReceipts,
    observedSourceLabels: ["Yahoo", "Stooq"],
    expectedCanonicalIdentity: "equity:xnas:aapl",
    accountId: ACCOUNT,
    serverReceiptId: "p87-server-receipt-0001",
    reportToken: "p87-entitlement-token-0001",
    payloadHash: sha256Digest("p87-paid-pro-fixture"),
    accessVerification: {
      accountBound: true,
      serverReceiptVerified: true,
      reportTokenVerified: true,
      payloadHashBound: true,
      manualReviewVerified: false,
      source: "trusted_internal",
    },
    coverageInput: { data: 96, provider: 96, historical: 92, evidence: 96 },
    missingCriticalEvidence: 0,
    stressTestExecuted: true,
    evidenceLedgerPresent: true,
    executedTests: ["source_binding", "source_quorum", "freshness", "chart_lifecycle", "evidence_ledger"],
    unexecutedTests: ["authorized_staging", "exact_windows"],
    providerTimestamps: [OBSERVED_AT, OBSERVED_AT],
    decisionSections: decisions,
    generatedAt: GENERATED_AT,
    runtimeCanonicalValues: runtimeValues,
  });
  check("base_source_receipts_projected", base.sourceBinding.contentBoundReceiptCount === 2, base.sourceBinding);
  check("base_independent_upstreams_two", base.sourceBinding.independentContentBoundUpstreamCount === 2, base.sourceBinding.independentContentBoundUpstreams);

  const proPacketResult = buildPass4825RuntimeCanonicalFieldPacket({
    caseId: "p87-pro-real-markets-exact-pdf",
    module: "real_markets",
    tier: "pro",
    identity: { canonicalId: "equity:xnas:aapl", symbol: "AAPL", assetClass: "equity", chainId: null, contractAddress: null },
    generatedAt: GENERATED_AT,
    sourceId: "p87-local-fixture",
    sourceFamily: "p87-exact-pdf-runtime",
    sourceDigest: sha256Digest(canonicalJson(base)),
    sourceReceipts: base.sourceBinding.receipts,
    values: runtimeValues,
  });
  const proCompleteness = buildPass6CommercialFieldCompletenessReceipt({
    packet: proPacketResult.packet,
    sourceReceipts: base.sourceBinding.receipts,
    requestedTier: "pro",
  });
  check("pro_completeness_receipt_valid", verifyPass6CommercialFieldCompletenessReceipt(proCompleteness));
  check("pro_completeness_10000", proCompleteness.completenessBps === 10_000, proCompleteness);
  check("pro_paid_delivery_eligible", proCompleteness.paidDeliveryEligible === true, proCompleteness.blockers);

  const payload = {
    ...base,
    pages: [
      { page: 1, title: "Executive risk summary", requiredForTier: "Basic" },
      { page: 2, title: "Asset identity and market context", requiredForTier: "Basic" },
      { page: 3, title: "Risk drivers and evidence", requiredForTier: "Basic" },
      { page: 4, title: "Chart lifecycle and source status", requiredForTier: "Basic" },
      { page: 5, title: "Liquidity and holder intelligence", requiredForTier: "Pro" },
      { page: 6, title: "Scenario and replay analysis", requiredForTier: "Pro" },
      { page: 7, title: "Provider receipts and conflicts", requiredForTier: "Pro" },
      { page: 8, title: "Missing evidence", requiredForTier: "Basic" },
      { page: 10, title: "Methodology and source registry", requiredForTier: "Pro" },
    ],
    decisionSections: decisions,
    receipts: base.sourceBinding.receipts,
    tierBoundary: { visibleDepth: "Full automated evidence and actions", lockedDepth: "Advanced cross-control dossier" },
    deliveryPolicy: {
      schemaVersion: "velmere.customer-report-delivery-policy.v1",
      requestedTier: "Pro",
      visibleTier: "Pro",
      status: "ready_paid",
      paidEvidenceAllowed: true,
      sourceReceiptLimit: 7,
      visiblePageTierCeiling: "Pro",
      monitoringAllowed: false,
      manualReviewAppendixAllowed: false,
      blockedReasons: [],
      customerSafeRule: "LOCAL_CONTROLLED_FIXTURE_ONLY: exact paid artifact plumbing validation; not sale eligibility or customer FINAL.",
    },
    pass4824CanonicalFieldPacket: proPacketResult.packet,
    pass4825CanonicalFieldReceipt: proPacketResult.receipt,
    pass6CommercialFieldCompleteness: proCompleteness,
  };

  const nowMs = Date.parse(GENERATED_AT);
  const paidArtifact = await createPass4823RealMarketsPaidAccountArtifact({
    payload,
    accountId: ACCOUNT,
    requestedTier: "Pro",
    nowMs,
  });
  check("paid_artifact_schema", paidArtifact.schemaVersion === "pass4823-real-markets-paid-account-artifact-v1");
  check("p87_token_issued", paidArtifact.pdfToken.ok === true);
  check("p87_token_contract", paidArtifact.pdfToken.ok && paidArtifact.pdfToken.token.startsWith("p87v2."));
  check("p87_token_small", paidArtifact.pdfToken.ok && Buffer.byteLength(paidArtifact.pdfToken.token, "utf8") < 8_000, paidArtifact.pdfToken.ok ? Buffer.byteLength(paidArtifact.pdfToken.token, "utf8") : null);
  check("stored_account_artifact_exact", paidArtifact.accountArtifact.snapshotId.startsWith("artifact-real_markets-"), paidArtifact.accountArtifact);

  const verified = verifyP87CustomerReportExactPdfToken({ token: paidArtifact.pdfToken.token, accountId: ACCOUNT, nowMs });
  check("p87_token_verifies", verified.ok === true, verified);
  check("p87_token_no_payload_field", verified.ok && !("payload" in verified.envelope));
  check("p87_token_no_pdf_bytes_field", verified.ok && !("pdfBytes" in verified.envelope) && !("bytes" in verified.envelope));
  check("p87_token_schema_id", P87_CUSTOMER_REPORT_EXACT_PDF_TOKEN_ID === "p87-customer-report-exact-pdf-token-v2");

  const foundSnapshot = await getPass4822AccountCustomerArtifactSnapshot({ accountId: ACCOUNT, snapshotId: paidArtifact.accountArtifact.snapshotId, client: null });
  const foundBlob = await getPass4824AccountCustomerArtifactPdfBlob({ accountId: ACCOUNT, snapshotId: paidArtifact.accountArtifact.snapshotId, client: null });
  check("stored_snapshot_found", Boolean(foundSnapshot));
  check("stored_blob_found", Boolean(foundBlob));
  check("stored_pdf_hash_matches_token", Boolean(foundBlob && verified.ok && foundBlob.blob.pdfDigest === verified.envelope.pdfDigest));
  check("stored_pdf_length_matches_token", Boolean(foundBlob && verified.ok && foundBlob.blob.pdfByteLength === verified.envelope.pdfByteLength));

  const account = { accountId: ACCOUNT, sessionSource: "preview", provider: "preview" };
  const dependencies = {
    resolveAccount: async () => account,
    resolvePaidAccess: async () => ({ ok: true, context: { accountIdHash: "fixture" } }),
    resolveOwnerClient: async () => null,
    getSnapshot: getPass4822AccountCustomerArtifactSnapshot,
    getPdfBlob: getPass4824AccountCustomerArtifactPdfBlob,
  };
  function routeRequest(token) {
    return new Request("http://localhost/api/market-integrity/report-pdf", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `127.0.0.${CHECKS.length % 200 + 1}` },
      body: JSON.stringify({ renderToken: token }),
    });
  }

  const exactResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), dependencies);
  const exactBytes = new Uint8Array(await exactResponse.arrayBuffer());
  check("exact_route_status_200", exactResponse.status === 200, exactResponse.status);
  check("exact_route_bytes_identical", foundBlob && Buffer.from(exactBytes).equals(Buffer.from(foundBlob.blob.pdfBytes)));
  check("exact_route_content_length", exactResponse.headers.get("content-length") === String(foundBlob.blob.pdfByteLength));
  check("exact_route_pdf_digest", exactResponse.headers.get("x-velmere-pdf-sha256") === foundBlob.blob.pdfDigest);
  check("exact_route_storage_header", exactResponse.headers.get("x-velmere-pdf-storage") === "exact_immutable_blob");
  check("exact_route_parity_header", exactResponse.headers.get("x-velmere-preview-download-parity") === "byte-identical-account-blob");
  check("exact_route_token_contract_header", exactResponse.headers.get("x-velmere-token-contract") === P87_CUSTOMER_REPORT_EXACT_PDF_TOKEN_ID);

  const previousVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    const productionPreviewResponse = await handleP87ExactPaidPdf(routeRequest(paidArtifact.pdfToken.token), paidArtifact.pdfToken.token, dependencies);
    const productionPreviewBody = await responseJson(productionPreviewResponse);
    check(
      "production_preview_identity_rejected",
      productionPreviewResponse.status === 401
        && productionPreviewBody.error === "account_session_required_for_exact_paid_artifact",
      { status: productionPreviewResponse.status, body: productionPreviewBody },
    );
  } finally {
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }

  const tamperedToken = `${paidArtifact.pdfToken.token.slice(0, -1)}${paidArtifact.pdfToken.token.endsWith("A") ? "B" : "A"}`;
  const tamperedResponse = await handleP87CustomerReportPdfPost(routeRequest(tamperedToken), dependencies);
  check("tampered_token_blocked", tamperedResponse.status === 403, { status: tamperedResponse.status, body: await responseJson(tamperedResponse) });

  const wrongAccountDependencies = { ...dependencies, resolveAccount: async () => ({ ...account, accountId: OTHER_ACCOUNT }) };
  const wrongAccountResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), wrongAccountDependencies);
  check("wrong_account_blocked", wrongAccountResponse.status === 403, { status: wrongAccountResponse.status, body: await responseJson(wrongAccountResponse) });

  const missingStorageDependencies = { ...dependencies, getSnapshot: async () => null, getPdfBlob: async () => null };
  const missingStorageResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), missingStorageDependencies);
  check("missing_storage_blocked", missingStorageResponse.status === 404, { status: missingStorageResponse.status, body: await responseJson(missingStorageResponse) });

  const tamperedSnapshotDependencies = {
    ...dependencies,
    getSnapshot: async (args) => {
      const found = await getPass4822AccountCustomerArtifactSnapshot(args);
      return found ? { ...found, snapshot: { ...clone(found.snapshot), payloadDigest: `sha256:${"0".repeat(64)}` } } : null;
    },
  };
  const tamperedSnapshotResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), tamperedSnapshotDependencies);
  check("tampered_snapshot_blocked", tamperedSnapshotResponse.status === 409, { status: tamperedSnapshotResponse.status, body: await responseJson(tamperedSnapshotResponse) });

  const tamperedBlobDependencies = {
    ...dependencies,
    getPdfBlob: async (args) => {
      const found = await getPass4824AccountCustomerArtifactPdfBlob(args);
      return found ? { ...found, blob: { ...found.blob, pdfBytes: new Uint8Array(found.blob.pdfBytes).fill(0, 20, 21) } } : null;
    },
  };
  const tamperedBlobResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), tamperedBlobDependencies);
  check("tampered_blob_blocked", tamperedBlobResponse.status === 409, { status: tamperedBlobResponse.status, body: await responseJson(tamperedBlobResponse) });

  const noEntitlementResponse = await handleP87CustomerReportPdfPost(routeRequest(paidArtifact.pdfToken.token), {
    ...dependencies,
    resolvePaidAccess: async () => ({ ok: false, headers: { "x-test": "blocked" } }),
  });
  check("paid_entitlement_rechecked", noEntitlementResponse.status === 402, { status: noEntitlementResponse.status, body: await responseJson(noEntitlementResponse) });

  const preparedLegacy = buildPass4818CustomerReportArtifact({ payload, requestedTier: "Pro" });
  const legacySnapshot = buildPass4818CustomerReportAccountArtifactSnapshot({
    accountId: ACCOUNT,
    payload,
    requestedTier: "Pro",
    canonicalArtifact: preparedLegacy.canonicalArtifact,
  });
  const legacyTokenResult = issuePass4818CustomerReportRenderToken({
    payload,
    accountId: ACCOUNT,
    requestedTier: "Pro",
    preparedArtifact: preparedLegacy,
    accountArtifactSnapshot: legacySnapshot,
    nowMs,
  });
  check("legacy_paid_token_fixture_issued", legacyTokenResult.ok === true, legacyTokenResult);
  const [legacyEncoded] = legacyTokenResult.token.split(".");
  const legacyEnvelope = JSON.parse(inflateRawSync(Buffer.from(legacyEncoded, "base64url"), { maxOutputLength: 2_000_000 }).toString("utf8"));
  legacyEnvelope.payload.deliveryPolicy.status = "unavailable";
  const malformedPaidEncoded = deflateRawSync(Buffer.from(JSON.stringify(legacyEnvelope), "utf8"), { level: 9 }).toString("base64url");
  const malformedPaidSignature = createHmac("sha256", TOKEN_SECRET)
    .update(`velmere:customer-market-report-pdf:v1:${malformedPaidEncoded}`)
    .digest("base64url");
  const malformedPaidLegacyToken = `${malformedPaidEncoded}.${malformedPaidSignature}`;
  const legacyPaidResponse = await handleP87CustomerReportPdfPost(routeRequest(malformedPaidLegacyToken), dependencies);
  const legacyPaidBody = await responseJson(legacyPaidResponse);
  check("legacy_paid_token_blocked_before_rerender", legacyPaidResponse.status === 409 && legacyPaidBody.error === "customer_report_paid_exact_artifact_token_required", { status: legacyPaidResponse.status, body: legacyPaidBody });

  const basicPayload = buildCustomerReportPayload({
    locale: "en",
    tier: "Basic",
    symbol: "AAPL",
    name: "P87 BASIC DYNAMIC COMPATIBILITY FIXTURE - NOT FINAL",
    family: "equity",
    reportSurface: "real_markets",
    riskScore: 31,
    sourceFamilyCount: 2,
    missingEvidence: [],
    providerEvidenceReceipts,
    observedSourceLabels: ["Yahoo", "Stooq"],
    expectedCanonicalIdentity: "equity:xnas:aapl",
    chartMode: "fallback",
    coverageInput: { data: 90, provider: 90, historical: 85, evidence: 90 },
    decisionSections: [decisions[0]],
    generatedAt: GENERATED_AT,
    runtimeCanonicalValues: runtimeValues,
  });
  const basicToken = issuePass4818CustomerReportRenderToken({ payload: basicPayload, accountId: null, requestedTier: "Basic", nowMs });
  check("legacy_basic_token_issued", basicToken.ok === true, basicToken);
  const basicResponse = await handleP87CustomerReportPdfPost(routeRequest(basicToken.token), dependencies);
  check("legacy_basic_dynamic_still_available", basicResponse.status === 200, basicResponse.status);
  check("legacy_basic_explicitly_not_final", basicResponse.headers.get("x-velmere-pdf-storage") === "dynamic_unstored_basic_not_final");
  check("legacy_basic_no_false_parity", basicResponse.headers.get("x-velmere-preview-download-parity") === "single-response-only-not-final");

  const secondPaidArtifact = await createPass4823RealMarketsPaidAccountArtifact({
    payload,
    accountId: ACCOUNT,
    requestedTier: "Pro",
    nowMs,
  });
  check("idempotent_snapshot_identity", secondPaidArtifact.accountArtifact.snapshotId === paidArtifact.accountArtifact.snapshotId);
  check("idempotent_token_identity", secondPaidArtifact.pdfToken.token === paidArtifact.pdfToken.token);
  check("idempotent_storage_created_false", secondPaidArtifact.accountArtifact.created === false);

  const receipt = {
    schemaVersion: "velmere.p87.real-markets-exact-pdf-runtime.v1",
    generatedAt: GENERATED_AT,
    status: CHECKS.every((row) => row.status === "PASS") ? "PASS_BOUNDED" : "FAIL",
    checks: { total: CHECKS.length, passed: CHECKS.filter((row) => row.status === "PASS").length, failed: CHECKS.filter((row) => row.status === "FAIL").length, rows: CHECKS },
    fixtureBoundary: {
      classification: "LOCAL_CONTROLLED_FIXTURE_NOT_CUSTOMER_FINAL",
      customerFinalEligible: false,
      auditFinalPdfEligible: false,
      saleEligible: false,
      deployedHttpExecuted: false,
      authorizedDatabaseExecuted: false,
      currentExternalProviderEvidence: false,
    },
    exactArtifact: {
      snapshotId: paidArtifact.accountArtifact.snapshotId,
      artifactDigest: paidArtifact.accountArtifact.artifactDigest,
      pdfDigest: foundBlob.blob.pdfDigest,
      pdfByteLength: foundBlob.blob.pdfByteLength,
      tokenBytes: Buffer.byteLength(paidArtifact.pdfToken.token, "utf8"),
      previewDownloadAccountBlobByteIdentical: true,
    },
    securityBoundary: {
      externalTransactionSent: false,
      externalStateChanged: false,
      liveExploitPerformed: false,
      weaponizedPocCreated: false,
      authorizationBypassAttempted: false,
      rawProviderPayloadRedistributed: false,
    },
  };
  await mkdir("receipts/p87", { recursive: true });
  await writeFile("receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
