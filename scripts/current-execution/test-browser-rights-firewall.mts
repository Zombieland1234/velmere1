import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildBrowserDeliveryPreflight,
  projectBrowserCustomerDelivery,
  type BrowserDeliverySurface,
  type BrowserDeliveryPreflight,
} from "../../lib/search/browser-delivery-policy.ts";
import { handleSearchGetWithR7TestClock } from "../../lib/search/search-route-orchestrator.ts";
import { postLensReportWithR7TestClock } from "../../lib/server/search-route-modules/lens-report.ts";
import {
  R7_BROWSER_ECB_POLICY_REVIEW_SHA256,
  buildR7BrowserEcbDeliveryBinding,
  inspectR7BrowserEcbDeliveryAuthority,
  inspectR7BrowserEcbDeliveryBinding,
} from "../../lib/search/browser-ecb-delivery-authority.ts";
import {
  issuePass4822LensSourceToken,
  verifyPass4822LensSourceToken,
} from "../../lib/search/lens-source-token.ts";
import { verifyPass4655LensRenderToken } from "../../lib/search/lens-render-token.ts";
import {
  inspectR7EcbStatisticsPolicyReceiptBytes,
  R7_ECB_POLICY_REVIEW_PATH,
} from "../../lib/compliance/ecb-statistics-policy-receipt.ts";
import {
  R7_ECB_POLICY_REVIEW_BYTE_LENGTH,
  R7_ECB_POLICY_REVIEW_BYTES_BASE64,
} from "../../lib/compliance/ecb-statistics-policy-receipt-bytes.ts";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress.ts";
import { buildPass4822LensCanonicalCustomerArtifact } from "../../lib/search/lens-canonical-customer-artifact.ts";
import {
  PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
  buildPass4822AccountCustomerArtifactSnapshot,
  verifyPass4822AccountCustomerArtifactSnapshot,
} from "../../lib/reporting/account-customer-artifact-snapshot.ts";
import { canonicalJson } from "../../lib/security/canonical-json.ts";
import { sha256Digest } from "../../lib/security/cryptographic-digest.ts";
import {
  buildCompactBrowserMarketMetrics,
  buildOfficialReferenceDisplay,
} from "../../lib/search/lens-public-report-helpers.ts";

process.env.NODE_ENV = "test";
process.env.VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT = "r7-browser-source-token-test-secret-20260824";
process.env.VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT = "r7-browser-render-token-test-secret-20260824";
delete process.env.VELMERE_ALLOW_UNSIGNED_LENS_FIXTURES;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const ecbCsv = [
  "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE",
  "EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-22,1.1734",
  "EXR.D.PLN.EUR.SP00.A,D,PLN,EUR,SP00,A,2026-08-22,4.2715",
  "EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-08-22,0.8652",
  "EXR.D.TRY.EUR.SP00.A,D,TRY,EUR,SP00,A,2026-08-22,47.925",
].join("\n");
const R7_TEST_NOW_MS = Date.parse("2026-08-24T16:30:00.000Z");
const R7_TEST_REISSUE_MS = R7_TEST_NOW_MS + 120_000;
const R7_TEST_EXPIRED_MS = R7_TEST_NOW_MS + 601_000;
const ECB_RESPONSE_SHA256 = `sha256:${createHash("sha256").update(ecbCsv, "utf8").digest("hex")}`;

function tamperTokenSignature(token: string) {
  const [payload, signature] = token.split(".");
  assert(payload && signature);
  return `${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
}

const surfaces: readonly BrowserDeliverySurface[] = [
  "search",
  "lens_preview",
  "lens_pdf_basic",
  "lens_pdf_paid",
];
const forbiddenTopology = [
  "coingecko",
  "defillama",
  "alpha_vantage",
  "binance",
  "mexc",
  "coinbase",
  "provideruses",
  "decisionsha",
  "blockers",
];

function assertMinimalWithheld(response: Response) {
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json().then((payload) => {
    assert.deepEqual(Object.keys(payload).sort(), [
      "artifact",
      "availability",
      "error",
      "liveClaimed",
      "mode",
      "ok",
      "reason",
      "renderToken",
      "report",
      "results",
      "retryAfter",
      "schemaVersion",
    ].sort());
    assert.equal(payload.ok, false);
    assert.equal(payload.mode, "withheld");
    assert.equal(payload.availability, "WITHHELD");
    assert.equal(payload.liveClaimed, false);
    assert.deepEqual(payload.results, []);
    assert.equal(payload.report, null);
    assert.equal(payload.renderToken, null);
    assert.equal(payload.artifact, null);
    const serialized = JSON.stringify(payload).toLowerCase();
    for (const forbidden of forbiddenTopology) assert(!serialized.includes(forbidden));
  });
}

let fetchCalls = 0;
let ecbProviderCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("browser rights firewall permitted network");
};

try {
  const receiptBytes = readFileSync(new URL(`../../${R7_ECB_POLICY_REVIEW_PATH}`, import.meta.url));
  assert.equal(receiptBytes.byteLength, R7_ECB_POLICY_REVIEW_BYTE_LENGTH);
  assert.equal(createHash("sha256").update(receiptBytes).digest("hex"), R7_BROWSER_ECB_POLICY_REVIEW_SHA256);
  assert.equal(receiptBytes.toString("base64"), R7_ECB_POLICY_REVIEW_BYTES_BASE64);
  const receiptInspection = inspectR7EcbStatisticsPolicyReceiptBytes();
  assert.equal(receiptInspection.valid, true);
  assert.equal(receiptInspection.importedJsonMatches, true);
  assert.equal(receiptInspection.sha256, R7_BROWSER_ECB_POLICY_REVIEW_SHA256);
  const compactClientSource = readFileSync(
    new URL("../../components/search/VelmereIntelligenceSearchClient.tsx", import.meta.url),
    "utf8",
  );
  for (const marker of [
    'data-browser-official-reference={officialReference ? "true" : undefined}',
    'data-reference-only={officialReference ? "true" : undefined}',
    'data-executable-quote={officialReference ? "false" : undefined}',
    'data-market-price-field-eligible={officialReference ? "false" : undefined}',
    'data-browser-official-reference-boundary="true"',
    "buildCompactBrowserMarketMetrics(locale, result)",
  ]) assert(compactClientSource.includes(marker), `missing customer-visible official-reference marker: ${marker}`);

  for (const surface of surfaces) {
    const decision = buildBrowserDeliveryPreflight(surface);
    assert.equal(decision.state, "WITHHELD_RIGHTS_UNVERIFIED");
    assert.equal(decision.providerNetworkAllowed, false);
    assert.equal(decision.customerDeliveryAllowed, false);
    assert.equal(decision.liveClaimed, false);
    assert(decision.providerUses.length > 0);

    const tampered = {
      ...structuredClone(decision),
      providerNetworkAllowed: true,
      customerDeliveryAllowed: true,
    } as BrowserDeliveryPreflight;
    const projected = projectBrowserCustomerDelivery({
      decision: tampered,
      payload: { ok: true, results: [{ secretProviderTopology: true }] },
    });
    assert.equal(projected.allowed, false);
    assert.equal(projected.status, 503);
    assert(!JSON.stringify(projected.payload).includes("secretProviderTopology"));
  }

  for (const [query, mode] of [["BTC", "all"], ["AAPL", "market"], ["uni", "token"], ["curve", "osint"]]) {
    const response = await handleSearchGetWithR7TestClock(new Request(
      `http://localhost/api/search?q=${encodeURIComponent(query)}&mode=${mode}&locale=en`,
    ), R7_TEST_NOW_MS);
    await assertMinimalWithheld(response);
  }

  const lensRequests = [
    "format=json&tier=basic",
    "format=pdf&tier=basic",
    "format=pdf&tier=pro",
    "format=pdf&tier=advanced",
  ];
  for (const search of lensRequests) {
    const response = await postLensReportWithR7TestClock(new Request(
      `http://localhost/api/search/lens-report?${search}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maliciousUnsignedReport: true }),
      },
    ), R7_TEST_NOW_MS);
    await assertMinimalWithheld(response);
  }

  const binding = buildR7BrowserEcbDeliveryBinding({
    referenceDate: "2026-08-22",
    responseSha256: ECB_RESPONSE_SHA256,
    nowMs: R7_TEST_NOW_MS,
  });
  const authority = inspectR7BrowserEcbDeliveryAuthority(R7_TEST_NOW_MS);
  assert.equal(authority.ready, true);
  assert.equal(authority.rightsReceiptSha256, R7_BROWSER_ECB_POLICY_REVIEW_SHA256);
  assert.equal(binding.referenceDate, "2026-08-22");
  assert.equal(binding.responseSha256, ECB_RESPONSE_SHA256);
  assert.equal(binding.authorityValidUntil, "2026-08-31T23:59:59.999Z");
  assert.equal(inspectR7BrowserEcbDeliveryBinding({ binding, nowMs: R7_TEST_NOW_MS }).ready, true);
  assert.throws(() => buildR7BrowserEcbDeliveryBinding({
    referenceDate: "2026-08-19",
    responseSha256: ECB_RESPONSE_SHA256,
    nowMs: R7_TEST_NOW_MS,
  }), /ecb_reference_not_current/u);
  const tamperedBinding = { ...binding, responseSha256: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" };
  for (const surface of ["search", "lens_preview", "lens_pdf_basic"] as const) {
    const decision = buildBrowserDeliveryPreflight(surface, binding, R7_TEST_NOW_MS);
    assert.equal(decision.state, "READY");
    assert.equal(decision.providerNetworkAllowed, true);
    assert.equal(decision.customerDeliveryAllowed, true);
    assert.equal(decision.liveClaimed, false);
    assert.deepEqual(decision.deliveryBinding, binding);
    assert.deepEqual(decision.providerUses.map((use) => use.providerId), ["ecb_statistics"]);
  }
  const paidDecision = buildBrowserDeliveryPreflight("lens_pdf_paid", binding, R7_TEST_NOW_MS);
  assert.equal(paidDecision.state, "WITHHELD_RIGHTS_UNVERIFIED");
  assert.equal(paidDecision.providerNetworkAllowed, false);

  let sourceToken = "";
  let renderToken = "";
  let actualRouteDigest = "";
  await withPass4825BrokeredEgressTestTransport(async (url, init, context) => {
    ecbProviderCalls += 1;
    assert.equal(url.hostname, "data-api.ecb.europa.eu");
    assert.equal((init.method ?? "GET").toUpperCase(), "GET");
    assert.equal(init.cache, "no-store");
    assert.equal(context.operation, "pass4825-brokered-egress-v1:ecb_statistics:pass69_ecb_reference_fx");
    return new Response(ecbCsv, {
      status: 200,
      headers: { "content-type": "text/csv", "content-length": String(Buffer.byteLength(ecbCsv)) },
    });
  }, async () => {
    for (const locale of ["pl", "en", "de"] as const) {
      const searchResponse = await handleSearchGetWithR7TestClock(new Request(
        `http://localhost/api/search?q=EUR%2FUSD&mode=market&intent=detail&locale=${locale}`,
      ), R7_TEST_NOW_MS);
      assert.equal(searchResponse.status, 200);
      assert.equal(searchResponse.headers.get("cache-control"), "no-store");
      const searchBody = await searchResponse.json();
      assert.equal(searchBody.ok, true);
      assert.equal(searchBody.liveClaimed, false);
      assert.equal(searchBody.deliveryClass, "ECB_OFFICIAL_REFERENCE_BASIC");
      assert.equal(searchBody.attribution, "Source: ECB statistics.");
      assert.equal(searchBody.results.length, 1);
      const result = searchBody.results[0];
      assert.equal(result.sourceMode, "table");
      assert.equal(result.sourceConfidence, 0);
      assert.equal(result.sourceConfidenceCalibrated, false);
      assert.equal(result.sourceCoverage, 100);
      assert.equal(result.marketSnapshot.assetClass, "fx");
      assert.equal(result.marketSnapshot.price, undefined);
      assert.equal(result.marketSnapshot.venueReferencePrice, undefined);
      assert.equal(result.officialReferenceSnapshot.referenceRate, 1.1734);
      assert.equal(result.officialReferenceSnapshot.referenceDate, "2026-08-22");
      assert.equal(result.officialReferenceSnapshot.referenceOnly, true);
      assert.equal(result.officialReferenceSnapshot.executableQuote, false);
      assert.equal(result.officialReferenceSnapshot.marketPriceFieldEligible, false);
      assert.equal(result.officialReferenceSnapshot.paidValueEligible, false);
      assert.equal(result.officialReferenceSnapshot.responseSha256, ECB_RESPONSE_SHA256);
      const tamperedBindingInspection = inspectR7BrowserEcbDeliveryBinding({
        binding: tamperedBinding,
        nowMs: R7_TEST_NOW_MS,
        result,
      });
      assert.equal(tamperedBindingInspection.ready, false);
      assert(tamperedBindingInspection.blockers.includes("ecb_delivery_result_binding_mismatch"));
      const display = buildOfficialReferenceDisplay(locale, result.officialReferenceSnapshot);
      const metrics = buildCompactBrowserMarketMetrics(locale, result);
      const expectedRate = locale === "en" ? "1 EUR = 1.1734 USD" : "1 EUR = 1,1734 USD";
      const expectedWarning = locale === "pl"
        ? "Oficjalna statystyka datowana; nie jest bieżącą ceną ani kursem wykonawczym."
        : locale === "de"
          ? "Offizielle datierte Statistik; kein Live-Preis und kein ausführbarer Kurs."
          : "Official dated statistic; not a live price or executable quote.";
      assert.equal(display.rate, expectedRate);
      assert.equal(display.referenceDate, "2026-08-22");
      assert.equal(display.source, "Source: ECB statistics.");
      assert.equal(display.warning, expectedWarning);
      assert.equal(display.referenceOnly, true);
      assert.equal(display.executableQuote, false);
      assert.equal(display.marketPriceFieldEligible, false);
      assert.deepEqual(metrics.map((metric) => metric.id), [
        "reference-rate",
        "reference-date",
        "reference-classification",
        "reference-source",
      ]);
      assert.equal(metrics[0]?.value, expectedRate);
      assert.equal(metrics[1]?.value, "2026-08-22");
      assert.equal(metrics[3]?.value, "Source: ECB statistics.");
      assert(metrics.every((metric) => metric.value !== "—"));
      assert.equal(result.sources[0].id, "ecb-statistics");
      assert.equal(result.sources[0].mode, "table");
      assert.equal(result.sources[0].freshness, "2026-08-22");
      assert.equal(typeof result.lensSourceToken, "string");
      const sourceVerification = verifyPass4822LensSourceToken({ token: result.lensSourceToken, nowMs: R7_TEST_NOW_MS });
      assert.equal(sourceVerification.ok, true);
      if (!sourceVerification.ok) throw new Error(sourceVerification.error);
      assert.deepEqual(sourceVerification.deliveryBinding, binding);
      assert.equal(sourceVerification.result.officialReferenceSnapshot?.responseSha256, result.officialReferenceSnapshot.responseSha256);
      const mismatchedResult = structuredClone(sourceVerification.result);
      if (!mismatchedResult.officialReferenceSnapshot) throw new Error("expected_ecb_reference_snapshot");
      mismatchedResult.officialReferenceSnapshot.responseSha256 = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const mismatchedIssue = issuePass4822LensSourceToken({
        result: mismatchedResult,
        locale,
        deliveryBinding: binding,
        nowMs: R7_TEST_NOW_MS,
      });
      assert.equal(mismatchedIssue.ok, false);
      if (!mismatchedIssue.ok) assert.equal(mismatchedIssue.error, "lens_source_token_delivery_result_mismatch");
      if (locale === "en") sourceToken = result.lensSourceToken;
    }

    const previewResponse = await postLensReportWithR7TestClock(new Request(
      "http://localhost/api/search/lens-report?format=json&tier=basic&transport=token",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceToken }),
      },
    ), R7_TEST_NOW_MS);
    assert.equal(previewResponse.status, 200);
    const preview = await previewResponse.json();
    assert.equal(preview.ok, true);
    assert.equal(preview.transport, "signed_render_token");
    assert.equal(preview.report.deliveryAuthority.rightsReceiptSha256, R7_BROWSER_ECB_POLICY_REVIEW_SHA256);
    assert.deepEqual(preview.report.deliveryAuthority.fieldIds, ["market.reference_rate", "market.reference_date"]);
    renderToken = preview.renderToken;
    const renderVerification = verifyPass4655LensRenderToken({
      token: renderToken,
      expectedDepth: "basic",
      nowMs: R7_TEST_NOW_MS,
    });
    assert.equal(renderVerification.ok, true);
    if (!renderVerification.ok) throw new Error(renderVerification.error);
    assert.deepEqual(renderVerification.frozen.deliveryBinding, binding);
    assert.deepEqual(renderVerification.report.deliveryAuthority, binding);
    assert.equal(renderVerification.identity.reportDigest, sha256Digest(canonicalJson(renderVerification.report)));
    const reportWithoutAuthority = { ...renderVerification.report };
    delete reportWithoutAuthority.deliveryAuthority;
    assert.notEqual(renderVerification.identity.reportDigest, sha256Digest(canonicalJson(reportWithoutAuthority)));

    const paidPreviewResponse = await postLensReportWithR7TestClock(new Request(
      "http://localhost/api/search/lens-report?format=json&tier=pro&transport=token",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceToken }),
      },
    ), R7_TEST_NOW_MS);
    await assertMinimalWithheld(paidPreviewResponse);

    const pdfResponse = await postLensReportWithR7TestClock(new Request(
      "http://localhost/api/search/lens-report?format=pdf&tier=basic",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ renderToken }),
      },
    ), R7_TEST_NOW_MS);
    assert.equal(pdfResponse.status, 200);
    assert.equal(pdfResponse.headers.get("content-type"), "application/pdf");
    assert.equal(pdfResponse.headers.get("cache-control"), "no-store");
    assert.equal(pdfResponse.headers.get("x-velmere-report-digest"), renderVerification.identity.reportDigest);
    assert.equal(pdfResponse.headers.get("x-velmere-canonical-payload-digest"), renderVerification.identity.reportDigest);
    const pdfBytes = Buffer.from(await pdfResponse.arrayBuffer());
    assert(pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-")));

    const canonicalArtifact = buildPass4822LensCanonicalCustomerArtifact({
      report: renderVerification.report,
      depth: "basic",
      pdf: pdfBytes,
      reportId: renderVerification.identity.reportId,
    });
    assert.equal(canonicalArtifact.payloadDigest, renderVerification.identity.reportDigest);
    const accountSnapshot = buildPass4822AccountCustomerArtifactSnapshot({
      accountId: "browser-green-lane-account-a",
      surface: "lens",
      payloadKind: "lens_report_v1",
      reportId: renderVerification.identity.reportId,
      requestedTier: "basic",
      deliveredTier: "basic",
      locale: renderVerification.report.locale,
      title: renderVerification.report.title,
      subject: renderVerification.report.symbol,
      generatedAt: renderVerification.report.generatedAt,
      payload: renderVerification.report,
      canonicalArtifact,
      pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
    });
    assert.equal(verifyPass4822AccountCustomerArtifactSnapshot(accountSnapshot), true);
    assert.equal(accountSnapshot.payloadDigest, renderVerification.identity.reportDigest);
    assert.equal(
      (accountSnapshot.payload as typeof renderVerification.report).deliveryAuthority?.rightsReceiptSha256,
      R7_BROWSER_ECB_POLICY_REVIEW_SHA256,
    );
    const reissuedPreviewResponse = await postLensReportWithR7TestClock(new Request(
      "http://localhost/api/search/lens-report?format=json&tier=basic&transport=token",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceToken }),
      },
    ), R7_TEST_REISSUE_MS);
    assert.equal(reissuedPreviewResponse.status, 200);
    const reissuedPreview = await reissuedPreviewResponse.json();
    assert(Date.parse(reissuedPreview.renderTokenExpiresAt) <= Date.parse(binding.deliveryExpiresAt));
    const reissuedRenderVerification = verifyPass4655LensRenderToken({
      token: reissuedPreview.renderToken,
      expectedDepth: "basic",
      nowMs: R7_TEST_REISSUE_MS,
    });
    assert.equal(reissuedRenderVerification.ok, true);
    if (!reissuedRenderVerification.ok) throw new Error(reissuedRenderVerification.error);
    assert(Date.parse(reissuedRenderVerification.expiresAt) <= Date.parse(binding.deliveryExpiresAt));
    actualRouteDigest = canonicalArtifact.artifactDigest;
  });

  assert(sourceToken.length > 0 && renderToken.length > 0 && actualRouteDigest.length > 0);
  const tamperedSourceToken = tamperTokenSignature(sourceToken);
  const tamperedSourceResponse = await postLensReportWithR7TestClock(new Request(
    "http://localhost/api/search/lens-report?format=json&tier=basic",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceToken: tamperedSourceToken }),
    },
  ), R7_TEST_NOW_MS);
  assert.equal(tamperedSourceResponse.status, 403);
  const tamperedRenderToken = tamperTokenSignature(renderToken);
  const tamperedRenderResponse = await postLensReportWithR7TestClock(new Request(
    "http://localhost/api/search/lens-report?format=pdf&tier=basic",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ renderToken: tamperedRenderToken }),
    },
  ), R7_TEST_NOW_MS);
  assert.equal(tamperedRenderResponse.status, 403);

  const stalePreviewResponse = await postLensReportWithR7TestClock(new Request(
    "http://localhost/api/search/lens-report?format=json&tier=basic&transport=token",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceToken }),
    },
  ), R7_TEST_EXPIRED_MS);
  assert.equal(stalePreviewResponse.status, 410);
  const stalePdfResponse = await postLensReportWithR7TestClock(new Request(
    "http://localhost/api/search/lens-report?format=pdf&tier=basic",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ renderToken }),
    },
  ), R7_TEST_EXPIRED_MS);
  assert.equal(stalePdfResponse.status, 410);

  assert.equal(ecbProviderCalls, 3, "PL/EN/DE must each use one request-time ECB response");
  assert.equal(fetchCalls, 0, "rights denial and ECB lane must not use unbrokered network");
  process.stdout.write(`${JSON.stringify({
    status: "PASS_BROWSER_RIGHTS_FIREWALL_AND_ECB_BASIC_ACTUAL_ROUTE",
    surfaces: surfaces.length,
    searchRequests: 4,
    lensRequests: lensRequests.length,
    providerAndStorageFetchCalls: fetchCalls,
    ecbRequestTimeProviderCalls: ecbProviderCalls,
    plEnDeActualSearch: true,
    plEnDeCustomerVisibleOfficialReference: true,
    officialReferenceNeverInflatedToMarketPrice: true,
    searchPreviewPdfBasic: true,
    signedResultAndFrozenReportAuthority: true,
    local_snapshot_builder_only: true,
    canonicalArtifactAndAccountSnapshotAuthority: false,
    paidEcbLaneWithheld: true,
    tamperCollapsed: true,
    topologyDisclosure: false,
    customerFinalPromoted: false,
  }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
}
