import assert from "node:assert/strict";
import {
  buildVelmereAccountCookie,
  buildVelmereAccountSession,
} from "../../lib/auth/account-session.ts";
import {
  createCustomerOwnedMarketEvidenceAuthority,
  verifyCustomerOwnedMarketEvidenceAuthority,
} from "../../lib/market-integrity/customer-owned-market-evidence-authority.ts";
import { normalizeMarketImpactSnapshots } from "../../lib/market-integrity/market-impact-input-validation.ts";
import { POST as attestCustomerEvidence } from "../../lib/server/market-integrity-route-modules/customer-owned-market-evidence.ts";
import { POST as analyzeMarketIntelligence } from "../../lib/server/market-integrity-route-modules/market-intelligence.ts";

process.env.NODE_ENV = "test";
delete process.env.VERCEL_ENV;
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.VELMERE_ACCOUNT_SESSION_SECRET_CURRENT = "r5-account-session-secret-0123456789abcdef0123456789abcdef";
process.env.VELMERE_CUSTOMER_OWNED_MARKET_EVIDENCE_SECRET_CURRENT = "r5-customer-market-evidence-secret-0123456789abcdef0123456789abcdef";

const now = new Date();
const observedAt = now.toISOString();
const rawSnapshots = [
  {
    venueId: "customer-venue-a",
    providerFamily: "customer-source-family-a",
    assetKey: "BTC",
    quoteCurrency: "USD",
    observedAt,
    status: "verified_live",
    feeBps: 8,
    sourceDigest: `sha256:${"a".repeat(64)}`,
    bids: [
      { price: 59_990, baseQuantity: 8 },
      { price: 59_970, baseQuantity: 8 },
      { price: 59_950, baseQuantity: 8 },
    ],
    asks: [
      { price: 60_010, baseQuantity: 8 },
      { price: 60_030, baseQuantity: 8 },
      { price: 60_050, baseQuantity: 8 },
    ],
  },
  {
    venueId: "customer-venue-b",
    providerFamily: "customer-source-family-b",
    assetKey: "BTC",
    quoteCurrency: "USD",
    observedAt,
    status: "verified_live",
    feeBps: 10,
    sourceDigest: `sha256:${"b".repeat(64)}`,
    bids: [
      { price: 59_985, baseQuantity: 7 },
      { price: 59_965, baseQuantity: 7 },
      { price: 59_945, baseQuantity: 7 },
    ],
    asks: [
      { price: 60_015, baseQuantity: 7 },
      { price: 60_035, baseQuantity: 7 },
      { price: 60_055, baseQuantity: 7 },
    ],
  },
];

const completeAttestation = {
  ownershipOrAuthorityConfirmed: true,
  privateCustomerDisplayConfirmed: true,
  derivedAnalyticsConfirmed: true,
  cacheConfirmed: true,
  retentionConfirmed: true,
  noPublicRedistributionConfirmed: true,
};

function cookieFor(email: string, accountId: string) {
  const session = buildVelmereAccountSession({
    email,
    displayName: email.split("@")[0],
    provider: "preview",
    accountId,
  });
  const setCookie = buildVelmereAccountCookie(session);
  return { session, cookie: setCookie.split(";", 1)[0] };
}

const accountA = cookieFor("r5-owner-a@example.test", "preview:r5-owner-a");
const accountB = cookieFor("r5-owner-b@example.test", "preview:r5-owner-b");

function attestationRequest(cookie: string | null, body: unknown) {
  return new Request("http://localhost/api/market-integrity/customer-owned-market-evidence", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function analysisRequest(cookie: string, snapshots: unknown, receipt: unknown) {
  return new Request("http://localhost/api/market-integrity/market-intelligence", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      assetKey: "BTC",
      depth: "basic",
      locale: "en",
      surface: "shield",
      evidenceMode: "customer_owned_attested",
      marketImpactSnapshots: snapshots,
      marketEvidenceAuthority: receipt,
    }),
  });
}

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls += 1;
  throw new Error("customer-owned market evidence route attempted provider network");
};

try {
  const unauthenticated = await attestCustomerEvidence(attestationRequest(null, {
    assetKey: "BTC",
    marketImpactSnapshots: rawSnapshots,
    attestation: completeAttestation,
  }));
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error, "account_session_required");

  const incomplete = await attestCustomerEvidence(attestationRequest(accountA.cookie, {
    assetKey: "BTC",
    marketImpactSnapshots: rawSnapshots,
    attestation: { ...completeAttestation, retentionConfirmed: false },
  }));
  assert.equal(incomplete.status, 400);
  assert.equal((await incomplete.json()).error, "customer_market_evidence_attestation_incomplete");

  const attestationResponse = await attestCustomerEvidence(attestationRequest(accountA.cookie, {
    assetKey: "BTC",
    marketImpactSnapshots: rawSnapshots,
    sourceClass: "CUSTOMER_OWNED",
    exportAllowed: false,
    attestation: completeAttestation,
  }));
  assert.equal(attestationResponse.status, 201);
  assert.equal(attestationResponse.headers.get("cache-control"), "no-store");
  const attestationPayload = await attestationResponse.json();
  assert.equal(attestationPayload.ok, true);
  assert.equal(attestationPayload.mode, "customer_owned_attested");
  assert.equal(attestationPayload.boundary.accountBound, true);
  assert.equal(attestationPayload.boundary.snapshotBound, true);
  assert.equal(attestationPayload.boundary.publicDisplayAuthorized, false);
  assert.equal(attestationPayload.boundary.redistributionAuthorized, false);
  assert.equal(attestationPayload.boundary.independentLegalReviewCompleted, false);
  assert.equal(attestationPayload.boundary.liveMarketDataClaimed, false);
  assert.equal(attestationPayload.boundary.customerFinalEligible, false);
  const receipt = attestationPayload.receipt;
  assert.match(receipt.signature, /^[a-f0-9]{64}$/);
  assert.equal(receipt.rights.publicDisplay, false);
  assert.equal(receipt.rights.redistribution, false);
  assert.equal(receipt.rights.exportAllowed, false);
  assert.equal(receipt.attestation.liveMarketDataClaimed, false);

  const success = await analyzeMarketIntelligence(analysisRequest(accountA.cookie, rawSnapshots, receipt));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
  assert.equal(success.headers.get("x-velmere-evidence-mode"), "customer_owned_attested");
  const payload = await success.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "partial");
  assert.equal(payload.publication.evidenceState, "customer_attested");
  assert.equal(payload.publication.liveClaimed, false);
  assert.equal(payload.publication.scorePublished, false);
  assert(payload.publication.blockers.includes("customer_attestation_not_independent_legal_review"));
  assert(payload.publication.blockers.includes("risk_score_publication_not_authorized"));
  assert.equal(payload.providerRuntime.boundary, "account_bound_customer_attestation");
  assert.equal(payload.providerRuntime.market, null);
  assert.equal(payload.providerRuntime.whale, null);
  assert.equal(payload.trustedIngress, null);
  assert.equal(payload.marketEvidenceAuthority.accountBound, true);
  assert.equal(payload.marketEvidenceAuthority.signatureVerified, true);
  assert.equal(payload.marketEvidenceAuthority.liveClaimed, false);
  assert.equal(payload.marketEvidenceAuthority.customerFinalEligible, false);
  assert.equal(payload.marketEvidenceAuthority.sourceIndependenceVerifiedByVelmere, false);
  assert.equal(payload.marketImpact.evidenceStatus, "verified_staging");
  assert(payload.marketImpact.referenceMidPrice > 0);
  assert(payload.marketImpact.representativeExecutions.length >= 2);
  assert(payload.marketImpact.blockers.includes("customer_attested_source_independence_not_verified"));
  assert(payload.marketImpact.blockers.includes("customer_attestation_legal_review_not_completed"));
  assert(payload.marketImpact.blockers.includes("durable_rights_receipt_storage_not_proven"));
  assert.equal(payload.marketImpactTruth.truthState, "LIMITED");
  assert(payload.marketImpactTruth.evidenceOrigins.includes("USER_SUPPLIED"));
  assert(payload.marketImpactTruth.evidenceOrigins.includes("VELMERE_DERIVED"));
  assert(payload.marketImpactTruth.evidenceOrigins.includes("SIMULATION"));
  assert(!payload.marketImpactTruth.evidenceOrigins.includes("PROVIDER"));
  assert.equal(payload.marketImpactTruth.commercialRightsStatus, "NOT_EVALUATED_BY_MODEL");
  assert.equal(payload.risk.state, "unavailable");
  assert.equal(payload.risk.score, null);
  assert.equal(payload.integrity.customerOwnedMarketEvidenceAuthority, true);
  assert(payload.evidenceLedger.every((row: { ok: boolean }) => row.ok));

  const serializedCustomerPayload = JSON.stringify(payload);
  assert(!serializedCustomerPayload.includes(receipt.signature));
  assert(!serializedCustomerPayload.includes(receipt.accountIdHash));
  assert(!serializedCustomerPayload.includes(process.env.VELMERE_CUSTOMER_OWNED_MARKET_EVIDENCE_SECRET_CURRENT));

  const tamperedSnapshots = structuredClone(rawSnapshots);
  tamperedSnapshots[0].asks[0].price += 125;
  const tampered = await analyzeMarketIntelligence(analysisRequest(accountA.cookie, tamperedSnapshots, receipt));
  assert.equal(tampered.status, 409);
  assert.equal((await tampered.json()).error, "customer_market_evidence_snapshot_mismatch");

  const crossAccount = await analyzeMarketIntelligence(analysisRequest(accountB.cookie, rawSnapshots, receipt));
  assert.equal(crossAccount.status, 403);
  assert.equal((await crossAccount.json()).error, "customer_market_evidence_account_mismatch");

  const signatureTamper = { ...receipt, signature: `${receipt.signature.slice(0, -1)}${receipt.signature.endsWith("0") ? "1" : "0"}` };
  const invalidSignature = await analyzeMarketIntelligence(analysisRequest(accountA.cookie, rawSnapshots, signatureTamper));
  assert.equal(invalidSignature.status, 401);
  assert.equal((await invalidSignature.json()).error, "customer_market_evidence_signature_invalid");

  const normalizedSnapshots = normalizeMarketImpactSnapshots(rawSnapshots, {
    expectedAssetKey: "BTC",
    forceEvidenceStatus: "verified_staging",
  });
  assert(normalizedSnapshots);
  assert(normalizedSnapshots.every((snapshot) => snapshot.status === "verified_staging"));

  const expiredReceipt = createCustomerOwnedMarketEvidenceAuthority({
    receiptId: "customer-market:expired-receipt-r5-0001",
    accountId: accountA.session.accountId,
    assetKey: "BTC",
    snapshots: normalizedSnapshots,
    sourceClass: "OWNER_AUTHORIZED_NON_PRODUCTION",
    now: new Date(now.getTime() - 10 * 60_000),
    ttlSeconds: 60,
    secret: process.env.VELMERE_CUSTOMER_OWNED_MARKET_EVIDENCE_SECRET_CURRENT,
  });
  const expired = verifyCustomerOwnedMarketEvidenceAuthority({
    receipt: expiredReceipt,
    accountId: accountA.session.accountId,
    assetKey: "BTC",
    snapshots: normalizedSnapshots,
    now,
    secrets: { current: process.env.VELMERE_CUSTOMER_OWNED_MARKET_EVIDENCE_SECRET_CURRENT },
  });
  assert.equal(expired.authorized, false);
  if (!expired.authorized) assert.equal(expired.error, "customer_market_evidence_expired");

  const wrongAsset = verifyCustomerOwnedMarketEvidenceAuthority({
    receipt,
    accountId: accountA.session.accountId,
    assetKey: "ETH",
    snapshots: normalizedSnapshots,
    now,
    secrets: { current: process.env.VELMERE_CUSTOMER_OWNED_MARKET_EVIDENCE_SECRET_CURRENT },
  });
  assert.equal(wrongAsset.authorized, false);
  if (!wrongAsset.authorized) assert.equal(wrongAsset.error, "customer_market_evidence_asset_mismatch");

  assert.equal(networkCalls, 0);
  process.stdout.write(`${JSON.stringify({
    status: "PASS_CUSTOMER_OWNED_MARKET_IMPACT_ATTESTED_ROUTE",
    successfulCustomerFlow: true,
    accountBound: true,
    snapshotBound: true,
    signatureBound: true,
    forcedStagingStatus: true,
    riskScoreWithheld: true,
    publicRedistributionDenied: true,
    crossAccountReplayDenied: true,
    snapshotTamperDenied: true,
    signatureTamperDenied: true,
    expiredReceiptDenied: true,
    liveClaimed: false,
    networkCalls,
    customerFinalPromoted: false,
  }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
}
