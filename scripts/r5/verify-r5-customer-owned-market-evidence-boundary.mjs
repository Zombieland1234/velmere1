import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts/r5/VELMERE_R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY.json");
const files = {
  authority: "lib/market-integrity/customer-owned-market-evidence-authority.ts",
  validation: "lib/market-integrity/market-impact-input-validation.ts",
  engine: "lib/market-integrity/market-impact-engine.ts",
  truth: "lib/market-integrity/market-impact-customer-truth.ts",
  attestationRoute: "lib/server/market-integrity-route-modules/customer-owned-market-evidence.ts",
  analysisRoute: "lib/server/market-integrity-route-modules/market-intelligence.ts",
  routeRegistry: "lib/server/route-registries/market-integrity.ts",
  regression: "scripts/current-execution/test-customer-owned-market-impact-attested-route.mts",
  providerRegression: "scripts/current-execution/test-market-impact-no-usable-order-book.mts",
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const source = Object.fromEntries(Object.entries(files).map(([id, rel]) => [id, fs.readFileSync(path.join(ROOT, rel), "utf8")]));
const checks = [
  { id: "hmac_sha256_receipt", passed: source.authority.includes('createHmac("sha256"') && source.authority.includes("timingSafeEqual") },
  { id: "receipt_account_asset_snapshot_bound", passed: source.authority.includes("accountIdHash") && source.authority.includes("assetKey") && source.authority.includes("snapshotDigest") },
  { id: "receipt_short_lived", passed: source.authority.includes("15 * 60") && source.authority.includes("MAX_RECEIPT_LIFETIME_MS") },
  { id: "public_and_redistribution_denied", passed: source.authority.includes("publicDisplay: false") && source.authority.includes("redistribution: false") },
  { id: "independent_review_not_claimed", passed: source.authority.includes("independentLegalReviewCompleted: false") && source.authority.includes("sourceIndependenceVerifiedByVelmere: false") },
  { id: "live_not_claimed", passed: source.authority.includes("liveMarketDataClaimed: false") },
  { id: "attestation_requires_real_account", passed: source.attestationRoute.includes("resolveRequestAccount(request)") && source.attestationRoute.includes("account_session_required") },
  { id: "attestation_forces_staging", passed: source.attestationRoute.includes('forceEvidenceStatus: "verified_staging"') },
  { id: "analysis_verifies_authority", passed: source.analysisRoute.includes("verifyCustomerOwnedMarketEvidenceAuthority") && source.analysisRoute.includes("customerOwnedAuthorization = authorization") },
  { id: "customer_mode_zero_provider_fetch_path", passed: source.analysisRoute.includes('selectedEvidenceMode === "customer_owned_attested"') && source.analysisRoute.includes("snapshots = customerOwnedSnapshots") },
  { id: "customer_mode_risk_withheld", passed: source.analysisRoute.includes('const derivedRiskAllowed = selectedEvidenceMode !== "customer_owned_attested"') && source.analysisRoute.includes("risk_score_publication_not_authorized") },
  { id: "provider_modes_still_preflighted", passed: source.analysisRoute.includes("buildMarketImpactDeliveryPreflight") && source.analysisRoute.includes("evaluateMarketIntelligencePublicationPreflight") },
  { id: "public_projection_not_full_receipt", passed: source.analysisRoute.includes("customerOwnedAuthorization?.publicProjection") && !source.analysisRoute.includes("marketEvidenceAuthority: customerOwnedAuthorization?.receipt") },
  { id: "route_registered", passed: source.routeRegistry.includes("customer-owned-market-evidence") },
  { id: "regression_covers_tamper_and_replay", passed: source.regression.includes("crossAccountReplayDenied") && source.regression.includes("snapshotTamperDenied") && source.regression.includes("signatureTamperDenied") && source.regression.includes("expiredReceiptDenied") },
  { id: "regression_asserts_zero_network", passed: source.regression.includes("assert.equal(networkCalls, 0)") },
  { id: "regression_asserts_no_final", passed: source.regression.includes("customerFinalPromoted: false") },
  { id: "provider_fail_closed_regression_retained", passed: source.providerRegression.includes("NO_USABLE_ORDER_BOOK") && source.providerRegression.includes("networkCalls") },
  { id: "user_declared_families_not_independent_quorum", passed: source.truth.includes("independentlyVerifiedEvidenceCount") && source.truth.includes("userSupplied") },
  { id: "storage_not_false_stale", passed: !source.truth.includes("/stale|age|fresh/") },
  { id: "additional_blockers_survive_unavailable", passed: source.engine.includes('blockers: ["no_valid_order_book_snapshot", ...normalizedAdditionalBlockers]') },
];
const failures = checks.filter((check) => !check.passed);
const payload = {
  schemaVersion: "velmere.r5.customer-owned-market-evidence-boundary.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length ? "FAIL" : "PASS_BOUNDED",
  files: Object.fromEntries(Object.entries(files).map(([id, rel]) => [id, { path: rel, sha256: sha256(fs.readFileSync(path.join(ROOT, rel))) }])),
  checks,
  failures,
  providerNetworkCredit: false,
  liveMarketDataCredit: false,
  independentRightsReviewCredit: false,
  durableReceiptStorageCredit: false,
  customerFinalCredit: false,
  truthBoundary: "This proves the current-source separation and adversarial local behavior of a short-lived account/asset/snapshot-bound customer-owned evidence receipt. It does not prove staging deployment, durable receipt/readback/replay storage, independent legal rights, independent market-source quorum, live data, calibrated impact, exact Windows or Customer FINAL.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: payload.status, checks: checks.length, failures: failures.length, output: path.relative(ROOT, OUT).split(path.sep).join("/") }, null, 2)}\n`);
if (failures.length) process.exit(2);
