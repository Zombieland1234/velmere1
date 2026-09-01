import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource, slugActionReportValue } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA =
  "velmere.pass4556.account-download-consumption-ledger-request.v1";
const RESPONSE_SCHEMA =
  "velmere.pass4556.account-download-consumption-ledger.v1";
const BOUNDARY =
  "pass4556-download-consumption-ledger-metadata-only-one-time-no-paid-unlock-no-trade-execution-no-binary-pdf";

type DownloadConsumptionRequest = {
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
  accessStatus?: string;
  consumptionPolicy?: string;
  checksum?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};




function buildDownloadConsumption(input: DownloadConsumptionRequest) {
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
    280,
  );
  const downloadPointer = cleanActionReportValue(
    input.downloadPointer,
    `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`,
    280,
  ).toLowerCase();
  const downloadManifestId = slugActionReportValue(
    String(input.downloadManifestId || `manifest-${customerReceiptId}`),
    `manifest-${customerReceiptId}`,
  );
  const downloadRoute = cleanActionReportValue(
    input.downloadRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}`,
    280,
  );
  const accessCapsuleId = slugActionReportValue(
    String(input.accessCapsuleId || `access-${downloadManifestId}`),
    `access-${downloadManifestId}`,
  );
  const accessRoute = cleanActionReportValue(
    input.accessRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}&access=${encodeURIComponent(accessCapsuleId)}`,
    300,
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
  const accessStatus = cleanActionReportValue(input.accessStatus, "access-token-ready", 96);
  const consumptionPolicy = cleanActionReportValue(
    input.consumptionPolicy,
    "one-manifest-one-short-lived-access-capsule-metadata-only",
    140,
  );
  const checksum = cleanActionReportValue(
    input.checksum,
    sha256Metadata(vaultPointer),
    120,
  );
  const reviewGate = cleanActionReportValue(input.reviewGate, "consumption-clear", 96);
  const expiresAtMs = Date.parse(expiresAt);
  const expired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  const reviewRequired =
    accessStatus.includes("review") || reviewGate.includes("review");
  const pending =
    !reviewRequired &&
    !expired &&
    (accessStatus.includes("pending") || !accessStatus.includes("ready"));
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
      accessStatus,
      consumptionPolicy,
      checksum,
      reviewGate,
    }),
  );
  const suffix = digestToken(digest);
  const consumptionId = slugActionReportValue(
    `consume-${accessCapsuleId}-${suffix}`,
    `consume-${suffix}`,
  );
  const downloadSessionId = slugActionReportValue(
    `session-${accessTokenId}-${suffix.slice(0, 8)}`,
    `session-${suffix}`,
  );
  const downloadAuditHash =
    `audit-${checksum.replace(/[^a-z0-9]/gi, "").slice(0, 28)}-${suffix}`.toLowerCase();
  const status = reviewRequired
    ? "operator-review-required"
    : expired
      ? "access-expired"
      : pending
        ? "access-pending"
        : "download-consumed";

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
    consumedAt: new Date().toISOString(),
    downloadSessionId,
    downloadAuditHash,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired
      ? "operator-review-required"
      : expired
        ? "access-expired"
        : pending
          ? "access-pending"
          : "consumption-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "access-capsule", state: accessStatus, proof: accessCapsuleId },
      {
        lane: "expiry-gate",
        state: expired ? "expired" : "valid",
        proof: expiresAt,
      },
      {
        lane: "consumption-ledger",
        state: reviewRequired || expired || pending ? "blocked" : "consumed",
        proof: consumptionId,
      },
      {
        lane: "download-session",
        state:
          reviewRequired || expired || pending
            ? "withheld"
            : "metadata-session-ready",
        proof: downloadSessionId,
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
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-download-consumption");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<DownloadConsumptionRequest>(request, {
    keyPrefix: "pass4681-action-report-download-consumption",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildDownloadConsumption(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4556-download-consumption-ledger":
        "metadata-only-one-time-consumption-gate",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-download-consumption");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: RESPONSE_SCHEMA,
      requestSchema: SUPPORTED_REQUEST_SCHEMA,
      status: "prepared",
      boundary: BOUNDARY,
      lanes: [
        "access-capsule",
        "expiry-gate",
        "consumption-ledger",
        "download-session",
      ],
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4556-download-consumption-ledger": "prepared",
      },
    },
  );
}
