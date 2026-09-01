import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA = "velmere.pass4554.account-download-manifest-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4554.account-download-manifest.v1";
const BOUNDARY = "pass4554-download-manifest-metadata-only-no-paid-unlock-no-trade-execution-no-binary-pdf";

type DownloadManifestRequest = {
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
  customerReceiptId?: string;
  customerRoute?: string;
  downloadPointer?: string;
  customerReceiptStatus?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};



function buildDownloadManifest(input: DownloadManifestRequest) {
  const source = normalizeActionReportSource(input.source);
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D", 24).toUpperCase();
  const vaultPointer = cleanActionReportValue(input.vaultPointer, `vault://${source}/${symbol}/${timeframe}`);
  const packageId = cleanActionReportValue(input.packageId, `pkg-${source}-${symbol}-${timeframe}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const pdfPointer = cleanActionReportValue(input.pdfPointer, `pdf://${source}/${symbol}/${timeframe}/${packageId}`);
  const deliveryId = cleanActionReportValue(input.deliveryId, `delivery-${packageId}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const releaseId = cleanActionReportValue(input.releaseId, `release-${deliveryId}`, 140).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const releasePointer = cleanActionReportValue(input.releasePointer, `account-release://${source}/${symbol}/${timeframe}/${releaseId}`);
  const customerReceiptId = cleanActionReportValue(input.customerReceiptId, `customer-${releaseId}`, 160).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const customerRoute = cleanActionReportValue(input.customerRoute, `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&receipt=${encodeURIComponent(customerReceiptId)}`, 260);
  const downloadPointer = cleanActionReportValue(input.downloadPointer, `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`, 260).toLowerCase();
  const receiptStatus = cleanActionReportValue(input.customerReceiptStatus, "customer-visible-ready", 96);
  const reviewGate = cleanActionReportValue(input.reviewGate, "download-manifest-clear", 96);
  const reviewRequired = receiptStatus.includes("review") || reviewGate.includes("review");
  const pending = !reviewRequired && (receiptStatus.includes("pending") || !receiptStatus.includes("ready"));
  const digest = sha256Digest(JSON.stringify({ source, symbol, timeframe, vaultPointer, packageId, pdfPointer, deliveryId, releaseId, releasePointer, customerReceiptId, customerRoute, downloadPointer, receiptStatus, reviewGate }));
  const suffix = digestToken(digest);
  const downloadManifestId = `manifest-${customerReceiptId}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const downloadRoute = `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&receipt=${encodeURIComponent(customerReceiptId)}&manifest=${encodeURIComponent(downloadManifestId)}`;
  const checksum = sha256Metadata(JSON.stringify({ digest, downloadRoute }));
  const status = reviewRequired ? "operator-review-required" : pending ? "customer-release-pending" : "download-manifest-ready";

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
    downloadManifestId,
    downloadRoute,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired ? "operator-review-required" : pending ? "customer-release-pending" : "download-manifest-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "customer-receipt", state: receiptStatus, proof: customerReceiptId },
      { lane: "review-gate", state: reviewRequired ? "blocked" : pending ? "waiting" : "clear", proof: reviewGate },
      { lane: "download-manifest", state: reviewRequired || pending ? "blocked" : "metadata-ready", proof: downloadManifestId },
      { lane: "account-route", state: reviewRequired || pending ? "waiting" : "ready", proof: downloadRoute },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      realPdfBinary: false,
      binaryDownload: false,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-download-manifest");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<DownloadManifestRequest>(request, {
    keyPrefix: "pass4681-action-report-download-manifest",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildDownloadManifest(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4554-download-manifest": "metadata-only-download-manifest",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-download-manifest");
  if (productionGuard) return productionGuard;
  return NextResponse.json({
    ok: true,
    schema: RESPONSE_SCHEMA,
    requestSchema: SUPPORTED_REQUEST_SCHEMA,
    status: "prepared",
    boundary: BOUNDARY,
    lanes: ["customer-receipt", "review-gate", "download-manifest", "account-route"],
  }, {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4554-download-manifest": "prepared",
    },
  });
}
