import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource, slugActionReportValue } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest, sha256Metadata, sha256Token } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA =
  "velmere.pass4558.account-post-closeout-attestation-request.v1";
const RESPONSE_SCHEMA =
  "velmere.pass4558.account-post-closeout-attestation.v1";
const BOUNDARY =
  "pass4558-post-closeout-attestation-metadata-only-public-proof-index-no-paid-unlock-no-trade-execution-no-binary-pdf-no-token-material";

type PostCloseoutAttestationRequest = {
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
  closeoutStatus?: string;
  checksum?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};




function buildPostCloseoutAttestation(input: PostCloseoutAttestationRequest) {
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
  const closeoutStatus = cleanActionReportValue(input.closeoutStatus, "download-closed", 96);
  const checksum = cleanActionReportValue(
    input.checksum,
    sha256Metadata(vaultPointer),
    160,
  );
  const reviewGate = cleanActionReportValue(input.reviewGate, "post-closeout-attestation-clear", 140);
  const reviewRequired =
    closeoutStatus.includes("review") || reviewGate.includes("review");
  const pending =
    !reviewRequired &&
    (closeoutStatus.includes("pending") ||
      closeoutStatus.includes("fallback") ||
      closeoutStatus.includes("revoked") ||
      !closeoutStatus.includes("closed"));
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
      closeoutStatus,
      checksum,
      reviewGate,
    }),
  );
  const suffix = digestToken(digest);
  const attestationId = slugActionReportValue(
    `attest-${closeoutId}-${suffix}`,
    `attest-${suffix}`,
  );
  const publicProofPointer =
    `proof-index://${source}/${symbol}/${timeframe}/${attestationId}`.toLowerCase();
  const archiveRoute = `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&attestation=${encodeURIComponent(attestationId)}`;
  const retentionPolicy =
    "metadata-proof-index-retained-raw-payload-and-token-material-never-stored";
  const status = reviewRequired
    ? "operator-review-required"
    : pending
      ? "closeout-pending"
      : "post-closeout-attested";

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
    attestedAt: new Date().toISOString(),
    publicProofPointer,
    archiveRoute,
    retentionPolicy,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    checksum,
    reviewGate: reviewRequired
      ? "operator-review-required"
      : pending
        ? "download-closeout-pending"
        : "post-closeout-attestation-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      {
        lane: "download-closeout",
        state: closeoutStatus,
        proof: closeoutId,
      },
      {
        lane: "proof-index",
        state: reviewRequired || pending ? "blocked" : "attested",
        proof: publicProofPointer,
      },
      {
        lane: "archive-route",
        state: reviewRequired || pending ? "waiting" : "metadata-ready",
        proof: archiveRoute,
      },
      {
        lane: "retention-policy",
        state: "metadata-only",
        proof: retentionPolicy,
      },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      realPdfBinary: false,
      binaryDownload: false,
      accessTokenMaterial: false,
      postCloseoutReplay: false,
      publicProofContainsPayload: false,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-post-closeout-attestation");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<PostCloseoutAttestationRequest>(request, {
    keyPrefix: "pass4681-action-report-post-closeout-attestation",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildPostCloseoutAttestation(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4558-post-closeout-attestation":
        "metadata-only-public-proof-index-gate",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-post-closeout-attestation");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: RESPONSE_SCHEMA,
      requestSchema: SUPPORTED_REQUEST_SCHEMA,
      status: "prepared",
      boundary: BOUNDARY,
      lanes: [
        "download-closeout",
        "proof-index",
        "archive-route",
        "retention-policy",
      ],
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4558-post-closeout-attestation": "prepared",
      },
    },
  );
}
