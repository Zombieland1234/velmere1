import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource, slugActionReportValue } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA = "velmere.pass4555.account-download-access-capsule-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4555.account-download-access-capsule.v1";
const BOUNDARY = "pass4555-download-access-capsule-metadata-only-short-lived-no-paid-unlock-no-trade-execution-no-binary-pdf";

type DownloadAccessRequest = {
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
  downloadManifestId?: string;
  downloadRoute?: string;
  downloadManifestStatus?: string;
  checksum?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};




function buildDownloadAccess(input: DownloadAccessRequest) {
  const source = normalizeActionReportSource(input.source);
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D", 24).toUpperCase();
  const vaultPointer = cleanActionReportValue(input.vaultPointer, `vault://${source}/${symbol}/${timeframe}`);
  const packageId = slugActionReportValue(String(input.packageId || `pkg-${source}-${symbol}-${timeframe}`), `pkg-${source}-${symbol}-${timeframe}`);
  const pdfPointer = cleanActionReportValue(input.pdfPointer, `pdf://${source}/${symbol}/${timeframe}/${packageId}`);
  const deliveryId = slugActionReportValue(String(input.deliveryId || `delivery-${packageId}`), `delivery-${packageId}`);
  const releaseId = slugActionReportValue(String(input.releaseId || `release-${deliveryId}`), `release-${deliveryId}`);
  const releasePointer = cleanActionReportValue(input.releasePointer, `account-release://${source}/${symbol}/${timeframe}/${releaseId}`);
  const customerReceiptId = slugActionReportValue(String(input.customerReceiptId || `customer-${releaseId}`), `customer-${releaseId}`);
  const customerRoute = cleanActionReportValue(input.customerRoute, `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&receipt=${encodeURIComponent(customerReceiptId)}`, 280);
  const downloadPointer = cleanActionReportValue(input.downloadPointer, `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`, 280).toLowerCase();
  const downloadManifestId = slugActionReportValue(String(input.downloadManifestId || `manifest-${customerReceiptId}`), `manifest-${customerReceiptId}`);
  const downloadRoute = cleanActionReportValue(input.downloadRoute, `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}`, 280);
  const manifestStatus = cleanActionReportValue(input.downloadManifestStatus, "download-manifest-ready", 96);
  const checksum = cleanActionReportValue(input.checksum, sha256Metadata(vaultPointer), 120);
  const reviewGate = cleanActionReportValue(input.reviewGate, "access-capsule-clear", 96);
  const reviewRequired = manifestStatus.includes("review") || reviewGate.includes("review");
  const pending = !reviewRequired && (manifestStatus.includes("pending") || !manifestStatus.includes("ready"));
  const digest = sha256Digest(JSON.stringify({ source, symbol, timeframe, vaultPointer, packageId, pdfPointer, deliveryId, releaseId, releasePointer, customerReceiptId, customerRoute, downloadPointer, downloadManifestId, downloadRoute, manifestStatus, checksum, reviewGate }));
  const suffix = digestToken(digest);
  const accessCapsuleId = slugActionReportValue(`access-${downloadManifestId}-${suffix}`, `access-${suffix}`);
  const accessTokenId = slugActionReportValue(`token-${checksum.replace(/[^a-z0-9]/gi, "").slice(0, 24)}-${suffix.slice(0, 6)}`, `token-${suffix}`);
  const accessRoute = `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}&access=${encodeURIComponent(accessCapsuleId)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const consumptionPolicy = "one-manifest-one-short-lived-access-capsule-metadata-only";
  const status = reviewRequired ? "operator-review-required" : pending ? "download-manifest-pending" : "access-token-ready";

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
    accessCapsuleId,
    accessRoute,
    accessTokenId,
    expiresAt,
    consumptionPolicy,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired ? "operator-review-required" : pending ? "download-manifest-pending" : "access-capsule-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "download-manifest", state: manifestStatus, proof: downloadManifestId },
      { lane: "review-gate", state: reviewRequired ? "blocked" : pending ? "waiting" : "clear", proof: reviewGate },
      { lane: "access-capsule", state: reviewRequired || pending ? "blocked" : "short-lived-ready", proof: accessCapsuleId },
      { lane: "consumption-policy", state: reviewRequired || pending ? "waiting" : "armed", proof: consumptionPolicy },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      realPdfBinary: false,
      binaryDownload: false,
      accessTokenMaterial: false,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-download-access");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<DownloadAccessRequest>(request, {
    keyPrefix: "pass4681-action-report-download-access",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildDownloadAccess(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4555-download-access-capsule": "metadata-only-short-lived-access-gate",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-download-access");
  if (productionGuard) return productionGuard;
  return NextResponse.json({
    ok: true,
    schema: RESPONSE_SCHEMA,
    requestSchema: SUPPORTED_REQUEST_SCHEMA,
    status: "prepared",
    boundary: BOUNDARY,
    lanes: ["download-manifest", "review-gate", "access-capsule", "consumption-policy"],
  }, {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4555-download-access-capsule": "prepared",
    },
  });
}
