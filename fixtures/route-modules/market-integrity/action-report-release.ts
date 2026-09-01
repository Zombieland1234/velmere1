import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource } from "@/lib/market-integrity/action-report-envelope-core";
import { digestToken, sha256Digest } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA = "velmere.pass4552.account-report-release-gate-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4552.account-report-release-gate.v1";
const BOUNDARY = "pass4552-account-release-metadata-only-no-paid-unlock-no-trade-execution";

type ReleaseGateRequest = {
  schema?: string;
  source?: string;
  symbol?: string;
  timeframe?: string;
  vaultPointer?: string;
  packageId?: string;
  pdfPointer?: string;
  deliveryId?: string;
  deliveryStatus?: string;
  releaseRoute?: string;
  reviewGate?: string;
  digest?: string;
  boundary?: string;
};



function buildReleaseEnvelope(input: ReleaseGateRequest) {
  const source = normalizeActionReportSource(input.source);
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D", 24).toUpperCase();
  const vaultPointer = cleanActionReportValue(input.vaultPointer, `vault://${source}/${symbol}/${timeframe}`);
  const packageId = cleanActionReportValue(input.packageId, `pkg-${source}-${symbol}-${timeframe}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const pdfPointer = cleanActionReportValue(input.pdfPointer, `pdf://${source}/${symbol}/${timeframe}/${packageId}`);
  const deliveryId = cleanActionReportValue(input.deliveryId, `delivery-${packageId}`, 128).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const deliveryStatus = cleanActionReportValue(input.deliveryStatus, "package-ready", 80);
  const reviewGate = cleanActionReportValue(input.reviewGate, "metadata-package-clear", 80);
  const reviewRequired = deliveryStatus.includes("review") || reviewGate.includes("review");
  const releaseDigest = sha256Digest(JSON.stringify({ source, symbol, timeframe, vaultPointer, packageId, pdfPointer, deliveryId, deliveryStatus, reviewGate }));
  const releaseId = `release-${deliveryId}-${digestToken(releaseDigest)}`;
  const releasePointer = `account-release://${source}/${symbol}/${timeframe}/${releaseId}`.toLowerCase();
  const status = reviewRequired ? "operator-review-required" : "account-release-queued";

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
    status,
    generatedAt: new Date().toISOString(),
    digest: releaseDigest,
    reviewGate: reviewRequired ? "operator-review-required" : "account-release-clear",
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "delivery-checkpoint", state: deliveryStatus, proof: deliveryId },
      { lane: "review-gate", state: reviewRequired ? "blocked" : "clear", proof: reviewGate },
      { lane: "account-release", state: reviewRequired ? "waiting" : "queued", proof: releasePointer },
      { lane: "customer-visible", state: reviewRequired ? "blocked" : "metadata-ready", proof: cleanActionReportValue(input.releaseRoute, `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}`) },
    ],
    guardrail: {
      paidUnlock: false,
      tradeExecution: false,
      rawPayloadPersistence: false,
      privateKeyOrSeedPhrase: false,
      boundary: BOUNDARY,
    },
  } as const;
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-release");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<ReleaseGateRequest>(request, {
    keyPrefix: "pass4681-action-report-release",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildReleaseEnvelope(payload), {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4552-report-release": "metadata-only-release-gate",
    },
  });
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-release");
  if (productionGuard) return productionGuard;
  return NextResponse.json({
    ok: true,
    schema: RESPONSE_SCHEMA,
    requestSchema: SUPPORTED_REQUEST_SCHEMA,
    status: "prepared",
    boundary: BOUNDARY,
    lanes: ["delivery-checkpoint", "review-gate", "account-release", "customer-visible"],
  }, {
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass4552-report-release": "prepared",
    },
  });
}
