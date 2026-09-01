import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Pass4550PackageRequest = {
  schema?: unknown;
  source?: unknown;
  symbol?: unknown;
  timeframe?: unknown;
  vaultPointer?: unknown;
  digest?: unknown;
  deliveryState?: unknown;
  draftState?: unknown;
  reviewStatus?: unknown;
  boundary?: unknown;
};

type Pass4550PackageLane = {
  lane: "detail-review" | "vault-pointer" | "pdf-package" | "operator-queue";
  state: "ready" | "review-required" | "metadata-only" | "blocked";
  proof: string;
};

function cleanText(value: unknown, fallback: string, max = 180) {
  const text = String(value ?? fallback).replace(/[<>{}\r\n]/g, " ").trim();
  return (text || fallback).slice(0, max);
}

function makeDigest(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function isSupportedSchema(schema: string) {
  return schema === "velmere.pass4550.account-report-package-request.v1";
}

function normalizeSource(source: unknown) {
  const cleaned = cleanText(source, "asset-detail", 48).toLowerCase();
  return cleaned.includes("shield-pro") ? "shield-pro" : "asset-detail";
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-package");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<Pass4550PackageRequest>(request, {
    keyPrefix: "pass4681-action-report-package",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.value;

  const schema = cleanText(body.schema, "unknown", 96);
  if (!isSupportedSchema(schema)) {
    return NextResponse.json(
      {
        ok: false,
        schema: "velmere.pass4550.account-report-pdf-package.v1",
        error: "unsupported_schema",
        expected: "velmere.pass4550.account-report-package-request.v1",
        received: schema,
        boundary: "metadata-only-no-paid-unlock-no-trade-execution",
      },
      { status: 422, headers: { "cache-control": "no-store", "x-velmere-pass4550-report-package": "unsupported-schema" } },
    );
  }

  const source = normalizeSource(body.source);
  const symbol = cleanText(body.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanText(body.timeframe, "CONTEXT", 24).toUpperCase();
  const vaultPointer = cleanText(body.vaultPointer, `vault-${source}-${symbol}-${timeframe}`, 180).toLowerCase();
  const digest = cleanText(body.digest, "digest-pending", 96);
  const deliveryState = cleanText(body.deliveryState, "not-queued", 72);
  const draftState = cleanText(body.draftState, "draft-missing", 72);
  const reviewStatus = cleanText(body.reviewStatus, "not-reviewed", 72);
  const reviewRequired = deliveryState.includes("review") || draftState.includes("review") || reviewStatus.includes("operator") || reviewStatus.includes("review");
  const packageDigest = makeDigest({ schema, source, symbol, timeframe, vaultPointer, digest, deliveryState, draftState, reviewStatus });
  const packageId = `pkg-${source}-${symbol}-${timeframe}-${packageDigest.slice(0, 14)}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const pdfPointer = `pdf://velmere/account/${source}/${symbol}/${timeframe}/${packageDigest.slice(0, 16)}`.toLowerCase();
  const operatorQueue = reviewRequired ? "operator-review-required" : "account-pdf-export-ready";
  const lanes: Pass4550PackageLane[] = [
    { lane: "detail-review", state: reviewRequired ? "review-required" : "ready", proof: reviewStatus },
    { lane: "vault-pointer", state: vaultPointer ? "metadata-only" : "blocked", proof: vaultPointer || "missing" },
    { lane: "pdf-package", state: reviewRequired ? "blocked" : "ready", proof: packageId },
    { lane: "operator-queue", state: reviewRequired ? "review-required" : "metadata-only", proof: operatorQueue },
  ];

  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4550.account-report-pdf-package.v1",
      source,
      symbol,
      timeframe,
      vaultPointer,
      packageId,
      pdfPointer,
      operatorQueue,
      status: reviewRequired ? "operator-review-required" : "pdf-ready",
      digest: packageDigest,
      lanes,
      generatedAt: new Date().toISOString(),
      boundary: "account-pdf-package-metadata-only-no-paid-unlock-no-trade-execution",
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4550-report-package": "metadata-only-pdf-package",
        "x-velmere-report-package-id": packageId,
      },
    },
  );
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-package");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4550.account-report-pdf-package.v1",
      status: "prepared",
      accepts: ["velmere.pass4550.account-report-package-request.v1"],
      boundary: "metadata-only PDF/operator package; this route does not unlock paid access, persist raw payloads or execute trades",
    },
    { headers: { "cache-control": "no-store", "x-velmere-pass4550-report-package": "prepared" } },
  );
}
