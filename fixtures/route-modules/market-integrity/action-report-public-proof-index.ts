import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource, slugActionReportValue } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata, sha256Token } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA =
  "velmere.pass4559.account-public-proof-index-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4559.account-public-proof-index.v1";
const BOUNDARY =
  "pass4559-public-proof-index-redacted-metadata-only-no-paid-unlock-no-trade-execution-no-binary-pdf-no-token-material-no-customer-payload";

type PublicProofIndexRequest = {
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
  consumptionId?: string;
  downloadSessionId?: string;
  closeoutId?: string;
  sessionFinalizedHash?: string;
  attestationId?: string;
  publicProofPointer?: string;
  archiveRoute?: string;
  attestationStatus?: string;
  checksum?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};




function buildPublicProofIndex(input: PublicProofIndexRequest) {
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
    320,
  );
  const downloadPointer = cleanActionReportValue(
    input.downloadPointer,
    `download-manifest://${source}/${symbol}/${timeframe}/${customerReceiptId}`,
    320,
  ).toLowerCase();
  const downloadManifestId = slugActionReportValue(
    String(input.downloadManifestId || `manifest-${customerReceiptId}`),
    `manifest-${customerReceiptId}`,
  );
  const downloadRoute = cleanActionReportValue(
    input.downloadRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}`,
    340,
  );
  const accessCapsuleId = slugActionReportValue(
    String(input.accessCapsuleId || `access-${downloadManifestId}`),
    `access-${downloadManifestId}`,
  );
  const accessRoute = cleanActionReportValue(
    input.accessRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&manifest=${encodeURIComponent(downloadManifestId)}&access=${encodeURIComponent(accessCapsuleId)}`,
    360,
  );
  const accessTokenId = slugActionReportValue(
    String(input.accessTokenId || `token-${accessCapsuleId}`),
    `token-${accessCapsuleId}`,
  );
  const consumptionId = slugActionReportValue(
    String(input.consumptionId || `consume-${accessCapsuleId}`),
    `consume-${accessCapsuleId}`,
  );
  const downloadSessionId = slugActionReportValue(
    String(input.downloadSessionId || `session-${accessTokenId}`),
    `session-${accessTokenId}`,
  );
  const closeoutId = slugActionReportValue(
    String(input.closeoutId || `closeout-${consumptionId}`),
    `closeout-${consumptionId}`,
  );
  const sessionFinalizedHash = cleanActionReportValue(
    input.sessionFinalizedHash,
    `final-${sha256Token(closeoutId)}`,
    180,
  ).toLowerCase();
  const attestationId = slugActionReportValue(
    String(input.attestationId || `attest-${closeoutId}`),
    `attest-${closeoutId}`,
  );
  const publicProofPointer = cleanActionReportValue(
    input.publicProofPointer,
    `proof-index://${source}/${symbol}/${timeframe}/${attestationId}`,
    320,
  ).toLowerCase();
  const archiveRoute = cleanActionReportValue(
    input.archiveRoute,
    `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&attestation=${encodeURIComponent(attestationId)}`,
    360,
  );
  const attestationStatus = cleanActionReportValue(
    input.attestationStatus,
    "post-closeout-attested",
    96,
  );
  const checksum = cleanActionReportValue(
    input.checksum,
    sha256Metadata(vaultPointer),
    160,
  );
  const reviewGate = cleanActionReportValue(input.reviewGate, "public-proof-index-clear", 140);
  const reviewRequired =
    attestationStatus.includes("review") || reviewGate.includes("review");
  const pending =
    !reviewRequired &&
    (attestationStatus.includes("pending") ||
      attestationStatus.includes("fallback") ||
      !attestationStatus.includes("attested"));
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
      consumptionId,
      downloadSessionId,
      closeoutId,
      sessionFinalizedHash,
      attestationId,
      publicProofPointer,
      archiveRoute,
      attestationStatus,
      checksum,
      reviewGate,
    }),
  );
  const suffix = digestToken(digest);
  const publicIndexId = slugActionReportValue(
    `pubidx-${attestationId}-${suffix}`,
    `pubidx-${suffix}`,
  );
  const transparencyRoute =
    `/proof/market-integrity/${encodeURIComponent(publicIndexId)}`;
  const proofDigest = `redacted-${digestToken(digest)}`;
  const redactionPolicy =
    "public-index-exposes-only-redacted-metadata-no-customer-payload-no-token-material";
  const status = reviewRequired
    ? "operator-review-required"
    : pending
      ? "attestation-pending"
      : "public-proof-indexed";

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
    consumptionId,
    downloadSessionId,
    closeoutId,
    sessionFinalizedHash,
    attestationId,
    publicProofPointer,
    archiveRoute,
    publicIndexId,
    indexedAt: new Date().toISOString(),
    transparencyRoute,
    proofDigest,
    redactionPolicy,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired
      ? "operator-review-required"
      : pending
        ? "post-closeout-attestation-pending"
        : "public-proof-index-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "redacted-metadata-envelope-only",
    lanes: [
      {
        lane: "post-closeout-attestation",
        state: attestationStatus,
        proof: attestationId,
      },
      {
        lane: "redaction-gate",
        state: "metadata-redacted",
        proof: redactionPolicy,
      },
      {
        lane: "public-proof-index",
        state: reviewRequired || pending ? "blocked" : "indexed",
        proof: publicIndexId,
      },
      {
        lane: "transparency-route",
        state: reviewRequired || pending ? "withheld" : "metadata-ready",
        proof: transparencyRoute,
      },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      realPdfBinary: false,
      binaryDownload: false,
      accessTokenMaterial: false,
      customerPayloadExposed: false,
      publicProofContainsPayload: false,
      transparencyIndexContainsOnlyRedactedMetadata: true,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-public-proof-index");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<PublicProofIndexRequest>(request, {
    keyPrefix: "pass4681-action-report-public-proof-index",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildPublicProofIndex(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4559-public-proof-index":
        "redacted-metadata-only-transparency-index",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-public-proof-index");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: RESPONSE_SCHEMA,
      requestSchema: SUPPORTED_REQUEST_SCHEMA,
      status: "prepared",
      boundary: BOUNDARY,
      lanes: [
        "post-closeout-attestation",
        "redaction-gate",
        "public-proof-index",
        "transparency-route",
      ],
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4559-public-proof-index": "prepared",
      },
    },
  );
}
