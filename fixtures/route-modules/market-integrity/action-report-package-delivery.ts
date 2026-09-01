import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { cleanActionReportValue, normalizeActionReportSource } from "@/lib/market-integrity/action-report-envelope-core";
import { sha256Digest, sha256Token } from "@/lib/security/cryptographic-digest";

const SUPPORTED_REQUEST_SCHEMA = "velmere.pass4551.account-report-package-delivery-request.v1";
const RESPONSE_SCHEMA = "velmere.pass4551.account-report-package-delivery.v1";
const BOUNDARY = "pass4551-delivery-checkpoint-metadata-only-no-paid-unlock-no-trade-execution";

type PackageDeliveryRequest = {
  schema?: string;
  source?: string;
  symbol?: string;
  timeframe?: string;
  vaultPointer?: string;
  packageId?: string;
  pdfPointer?: string;
  operatorQueue?: string;
  packageStatus?: string;
  digest?: string;
  boundary?: string;
};



function buildDeliveryEnvelope(input: PackageDeliveryRequest) {
  const symbol = cleanActionReportValue(input.symbol, "UNKNOWN").toUpperCase();
  const timeframe = cleanActionReportValue(input.timeframe, "1D").toUpperCase();
  const source = normalizeActionReportSource(input.source);
  const vaultPointer = cleanActionReportValue(input.vaultPointer, `vault://${source}/${symbol}/${timeframe}`);
  const packageId = cleanActionReportValue(input.packageId, `pkg-${source}-${symbol}-${timeframe}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const pdfPointer = cleanActionReportValue(input.pdfPointer, `pdf://${source}/${symbol}/${timeframe}/${packageId}`);
  const packageStatus = cleanActionReportValue(input.packageStatus, "metadata-only-fallback");
  const reviewRequired = packageStatus.includes("review") || cleanActionReportValue(input.operatorQueue, "").includes("review");
  const deliveryId = `delivery-${packageId}-${sha256Token(`${vaultPointer}:${pdfPointer}`)}`;
  const releaseRoute = `/account?tab=reports&vault=${encodeURIComponent(vaultPointer)}&package=${encodeURIComponent(packageId)}&delivery=${encodeURIComponent(deliveryId)}`;
  const status = reviewRequired ? "operator-review-required" : "package-ready";
  const reviewGate = reviewRequired ? "operator-review-required" : "metadata-package-clear";
  const digest = sha256Digest(JSON.stringify({ source, symbol, timeframe, vaultPointer, packageId, pdfPointer, packageStatus, reviewGate }));

  return {
    schema: RESPONSE_SCHEMA,
    acceptedRequestSchema: input.schema === SUPPORTED_REQUEST_SCHEMA ? SUPPORTED_REQUEST_SCHEMA : "schema-normalized",
    source,
    symbol,
    timeframe,
    vaultPointer,
    packageId,
    pdfPointer,
    deliveryId,
    releaseRoute,
    status,
    generatedAt: new Date().toISOString(),
    digest,
    reviewGate,
    boundary: BOUNDARY,
    serverStored: false,
    storageMode: "metadata-envelope-only",
    lanes: [
      { lane: "package-intake", state: "accepted", proof: packageId },
      { lane: "pdf-pointer", state: reviewRequired ? "blocked" : "ready", proof: pdfPointer },
      { lane: "operator-review", state: reviewRequired ? "required" : "clear", proof: cleanActionReportValue(input.operatorQueue, "account-pdf-ready") },
      { lane: "account-release", state: reviewRequired ? "waiting" : "ready", proof: releaseRoute },
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
  const productionGuard = blockProductionFixtureRoute("action-report-package-delivery");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<PackageDeliveryRequest>(request, {
    keyPrefix: "pass4681-action-report-package-delivery",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.value;
  return NextResponse.json(buildDeliveryEnvelope(payload));
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-package-delivery");
  if (productionGuard) return productionGuard;
  return NextResponse.json({
    schema: RESPONSE_SCHEMA,
    requestSchema: SUPPORTED_REQUEST_SCHEMA,
    status: "ready",
    boundary: BOUNDARY,
    lanes: ["package-intake", "pdf-pointer", "operator-review", "account-release"],
  });
}
