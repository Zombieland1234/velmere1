import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource, slugActionReportValue } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata, sha256Token } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA =
  "velmere.pass4557.account-download-closeout-receipt-request.v1";
const RESPONSE_SCHEMA =
  "velmere.pass4557.account-download-closeout-receipt.v1";
const BOUNDARY =
  "pass4557-download-closeout-receipt-metadata-only-session-finalized-no-paid-unlock-no-trade-execution-no-binary-pdf-no-token-material";

type DownloadCloseoutRequest = {
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
  accessCapsuleId?: string;
  accessRoute?: string;
  accessTokenId?: string;
  expiresAt?: string;
  consumptionPolicy?: string;
  consumptionId?: string;
  consumedAt?: string;
  downloadSessionId?: string;
  downloadAuditHash?: string;
  consumptionStatus?: string;
  checksum?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};




function buildDownloadCloseout(input: DownloadCloseoutRequest) {
  const source = normalizeActionReportSource(input.source);
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D", 24).toUpperCase();
  const vaultPointer = cleanActionReportValue(
    input.vaultPointer,
    `vault://${source}/${symbol}/${timeframe}`,
  );
  const packageId = slugActionReportValue(
    String(input.packageId || `pkg-${source}-${symbol}-${timeframe}`),
    `pkg-${source}-${symbol}-${timeframe}`,
  );
  const pdfPointer = cleanActionReportValue(
    input.pdfPointer,
    `pdf://${source}/${symbol}/${timeframe}/${packageId}`,
  );
  const deliveryId = slugActionReportValue(
    String(input.deliveryId || `delivery-${packageId}`),
    `delivery-${packageId}`,
  );
  const releaseId = slugActionReportValue(
    String(input.releaseId || `release-${deliveryId}`),
    `release-${deliveryId}`,
  );
  const releasePointer = cleanActionReportValue(
    input.releasePointer,
    `account-release://${source}/${symbol}/${timeframe}/${releaseId}`,
  );
  const customerReceiptId = slugActionReportValue(
    String(input.customerReceiptId || `customer-${releaseId}`),
    `customer-${releaseId}`,
  );
  const customerRoute = cleanActionReportValue(
    input.customerRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&receipt=${encodeURIComponent(customerReceiptId)}`,
    300,
  );
  const downloadPointer = cleanActionReportValue(
    input.downloadPointer,
    `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`,
    300,
  ).toLowerCase();
  const downloadManifestId = slugActionReportValue(
    String(input.downloadManifestId || `manifest-${customerReceiptId}`),
    `manifest-${customerReceiptId}`,
  );
  const downloadRoute = cleanActionReportValue(
    input.downloadRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}`,
    320,
  );
  const accessCapsuleId = slugActionReportValue(
    String(input.accessCapsuleId || `access-${downloadManifestId}`),
    `access-${downloadManifestId}`,
  );
  const accessRoute = cleanActionReportValue(
    input.accessRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}&access=${encodeURIComponent(accessCapsuleId)}`,
    340,
  );
  const accessTokenId = slugActionReportValue(
    String(input.accessTokenId || `token-${accessCapsuleId}`),
    `token-${accessCapsuleId}`,
  );
  const expiresAt = cleanActionReportValue(
    input.expiresAt,
    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    64,
  );
  const consumptionPolicy = cleanActionReportValue(
    input.consumptionPolicy,
    "one-manifest-one-short-lived-access-capsule-metadata-only",
    160,
  );
  const consumptionId = slugActionReportValue(
    String(input.consumptionId || `consume-${accessCapsuleId}`),
    `consume-${accessCapsuleId}`,
  );
  const consumedAt = cleanActionReportValue(input.consumedAt, new Date().toISOString(), 64);
  const downloadSessionId = slugActionReportValue(
    String(input.downloadSessionId || `session-${accessTokenId}`),
    `session-${accessTokenId}`,
  );
  const downloadAuditHash = cleanActionReportValue(
    input.downloadAuditHash,
    `audit-${sha256Token(vaultPointer)}`,
    160,
  ).toLowerCase();
  const consumptionStatus = cleanActionReportValue(input.consumptionStatus, "download-consumed", 96);
  const checksum = cleanActionReportValue(
    input.checksum,
    sha256Metadata(vaultPointer),
    140,
  );
  const reviewGate = cleanActionReportValue(input.reviewGate, "download-closeout-clear", 120);
  const reviewRequired =
    consumptionStatus.includes("review") || reviewGate.includes("review");
  const pending =
    !reviewRequired &&
    (consumptionStatus.includes("pending") ||
      consumptionStatus.includes("expired") ||
      consumptionStatus.includes("fallback") ||
      !consumptionStatus.includes("consumed"));
  const digest = sha256Digest(
    JSON.stringify({
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
      consumptionId,
      consumedAt,
      downloadSessionId,
      downloadAuditHash,
      consumptionStatus,
      checksum,
      reviewGate,
    }),
  );
  const suffix = digestToken(digest);
  const closeoutId = slugActionReportValue(
    `closeout-${consumptionId}-${suffix}`,
    `closeout-${suffix}`,
  );
  const sessionFinalizedHash =
    `final-${downloadAuditHash.replace(/[^a-z0-9]/gi, "").slice(0, 28)}-${suffix}`.toLowerCase();
  const revokePolicy =
    "one-time-download-session-closed-replay-blocked-token-material-never-exposed";
  const status = reviewRequired
    ? "operator-review-required"
    : pending
      ? "consumption-pending"
      : "download-closed";

  return {
    ok: true,
    schema: RESPONSE_SCHEMA,
    acceptedRequestSchema:
      input.schema === SUPPORTED_REQUEST_SCHEMA
        ? SUPPORTED_REQUEST_SCHEMA
        : "schema-normalized",
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
    consumptionId,
    consumedAt,
    downloadSessionId,
    downloadAuditHash,
    closeoutId,
    closedAt: new Date().toISOString(),
    sessionFinalizedHash,
    revokePolicy,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired
      ? "operator-review-required"
      : pending
        ? "consumption-pending"
        : "download-closeout-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      {
        lane: "consumption-ledger",
        state: consumptionStatus,
        proof: consumptionId,
      },
      {
        lane: "session-finalization",
        state: reviewRequired || pending ? "blocked" : "closed",
        proof: sessionFinalizedHash,
      },
      {
        lane: "replay-revocation",
        state: reviewRequired || pending ? "waiting" : "revoked",
        proof: revokePolicy,
      },
      {
        lane: "account-audit-trail",
        state: reviewRequired || pending ? "withheld" : "metadata-ready",
        proof: closeoutId,
      },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      realPdfBinary: false,
      binaryDownload: false,
      accessTokenMaterial: false,
      oneTimeConsumptionOnly: true,
      replayRevoked: !reviewRequired && !pending,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-download-closeout");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<DownloadCloseoutRequest>(request, {
    keyPrefix: "pass4681-action-report-download-closeout",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildDownloadCloseout(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4557-download-closeout-receipt":
        "metadata-only-session-finalization-gate",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-download-closeout");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: RESPONSE_SCHEMA,
      requestSchema: SUPPORTED_REQUEST_SCHEMA,
      status: "prepared",
      boundary: BOUNDARY,
      lanes: [
        "consumption-ledger",
        "session-finalization",
        "replay-revocation",
        "account-audit-trail",
      ],
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4557-download-closeout-receipt": "prepared",
      },
    },
  );
}
