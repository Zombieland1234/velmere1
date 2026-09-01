import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA = "velmere.pass4553.account-customer-release-receipt-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4553.account-customer-release-receipt.v1";
const BOUNDARY = "pass4553-customer-release-receipt-metadata-only-no-paid-unlock-no-trade-execution";

type CustomerReceiptRequest = {
  schema?: string;
  source?: string;
  symbol?: string;
  timeframe?: string;
  vaultPointer?: string;
  packageId?: string;
  pdfPointer?: string;
  deliveryId?: string;
  releaseId?: string;
  releasePointer?: string;
  releaseStatus?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};



function buildCustomerReceiptEnvelope(input: CustomerReceiptRequest) {
  const source = normalizeActionReportSource(input.source);
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D", 24).toUpperCase();
  const vaultPointer = cleanActionReportValue(input.vaultPointer, `vault://${source}/${symbol}/${timeframe}`);
  const packageId = cleanActionReportValue(input.packageId, `pkg-${source}-${symbol}-${timeframe}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const pdfPointer = cleanActionReportValue(input.pdfPointer, `pdf://${source}/${symbol}/${timeframe}/${packageId}`);
  const deliveryId = cleanActionReportValue(input.deliveryId, `delivery-${packageId}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const releaseId = cleanActionReportValue(input.releaseId, `release-${deliveryId}`, 140).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const releasePointer = cleanActionReportValue(input.releasePointer, `account-release://${source}/${symbol}/${timeframe}/${releaseId}`);
  const releaseStatus = cleanActionReportValue(input.releaseStatus, "account-release-queued", 80);
  const reviewGate = cleanActionReportValue(input.reviewGate, "customer-release-clear", 80);
  const reviewRequired = releaseStatus.includes("review") || reviewGate.includes("review");
  const releasePending = !reviewRequired && !(releaseStatus.includes("queued") || releaseStatus.includes("ready"));
  const digest = sha256Digest(JSON.stringify({ source, symbol, timeframe, vaultPointer, packageId, pdfPointer, deliveryId, releaseId, releasePointer, releaseStatus, reviewGate }));
  const customerReceiptId = `customer-${releaseId}-${digestToken(digest)}`;
  const customerRoute = `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&release=${encodeURIComponent(releaseId)}&receipt=${encodeURIComponent(customerReceiptId)}`;
  const downloadPointer = `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`.toLowerCase();
  const status = reviewRequired ? "operator-review-required" : releasePending ? "release-pending" : "customer-visible-ready";

  return {
    ok: true,
    schema: RESPONSE_SCHEMA,
    acceptedRequestSchema: input.schema === SUPPORTED_REQUEST_SCHEMA ? SUPPORTED_REQUEST_SCHEMA : "schema-normalized",
    source,
    symbol,
    timeframe,
    vaultPointer,
    packageId,
    pdfPointer,
    deliveryId,
    releaseId,
    releasePointer,
    customerReceiptId,
    customerRoute,
    downloadPointer,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    reviewGate: reviewRequired ? "operator-review-required" : "customer-release-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "account-release", state: releaseStatus, proof: releasePointer },
      { lane: "review-gate", state: reviewRequired ? "blocked" : "clear", proof: reviewGate },
      { lane: "customer-route", state: reviewRequired ? "waiting" : "ready", proof: customerRoute },
      { lane: "download-manifest", state: reviewRequired ? "blocked" : "metadata-ready", proof: downloadPointer },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      privateKeyOrSeedPhrase: false,
      realPdfBinary: false,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-customer-receipt");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<CustomerReceiptRequest>(request, {
    keyPrefix: "pass4681-action-report-customer-receipt",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildCustomerReceiptEnvelope(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4553-customer-receipt": "metadata-only-customer-release-receipt",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-customer-receipt");
  if (productionGuard) return productionGuard;
  return NextResponse.json({
    ok: true,
    schema: RESPONSE_SCHEMA,
    requestSchema: SUPPORTED_REQUEST_SCHEMA,
    status: "prepared",
    boundary: BOUNDARY,
    lanes: ["account-release", "review-gate", "customer-route", "download-manifest"],
  }, {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4553-customer-receipt": "prepared",
    },
  });
}
