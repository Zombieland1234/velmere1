import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Pass4549ReviewRequest = {
  schema?: unknown;
  status?: unknown;
  pointer?: unknown;
  source?: unknown;
  symbol?: unknown;
  timeframe?: unknown;
  digest?: unknown;
  deliveryState?: unknown;
  draftState?: unknown;
};

type Pass4549ReviewLane = {
  lane: "account-inbox" | "vault-pointer" | "review-policy" | "pdf-operator-export";
  state: "ready" | "review-required" | "metadata-only" | "blocked";
  proof: string;
};

function cleanText(value: unknown, fallback: string, max = 160) {
  const text = String(value ?? fallback).replace(/[<>{}\r\n]/g, " ").trim();
  return (text || fallback).slice(0, max);
}

function makeDigest(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function isSupportedSchema(schema: string) {
  return schema === "velmere.pass4549.account-report-review-request.v1";
}

function normalizeStatus(value: unknown) {
  const status = cleanText(value, "operator-review", 48).toLowerCase();
  if (status === "acknowledged" || status === "operator-review" || status === "export-ready") return status;
  return "operator-review";
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-review");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<Pass4549ReviewRequest>(request, {
    keyPrefix: "pass4681-action-report-review",
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
        schema: "velmere.pass4549.account-report-review-ack.v1",
        error: "unsupported_schema",
        expected: "velmere.pass4549.account-report-review-request.v1",
        received: schema,
        boundary: "metadata-only-no-paid-unlock-no-trade-execution",
      },
      { status: 422, headers: { "cache-control": "no-store", "x-velmere-pass4549-report-review": "unsupported-schema" } },
    );
  }

  const source = cleanText(body.source, "asset-detail", 48);
  const symbol = cleanText(body.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanText(body.timeframe, "context", 24).toUpperCase();
  const pointer = cleanText(body.pointer, `vlm-${source}-${symbol}-${timeframe}`, 180).toLowerCase();
  const status = normalizeStatus(body.status);
  const digest = cleanText(body.digest, "digest-pending", 96);
  const deliveryState = cleanText(body.deliveryState, "not-queued", 72);
  const draftState = cleanText(body.draftState, "draft-missing", 72);
  const reviewRequired = status === "operator-review" || deliveryState.includes("review") || draftState.includes("review");
  const ackDigest = makeDigest({ schema, source, symbol, timeframe, pointer, status, digest, deliveryState, draftState });
  const ackId = `ack-${source}-${symbol}-${timeframe}-${ackDigest.slice(0, 14)}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const lanes: Pass4549ReviewLane[] = [
    { lane: "account-inbox", state: "ready", proof: `${source}:${symbol}:${timeframe}` },
    { lane: "vault-pointer", state: pointer ? "metadata-only" : "blocked", proof: pointer || "pointer-missing" },
    { lane: "review-policy", state: reviewRequired ? "review-required" : "ready", proof: `${deliveryState} · ${draftState}` },
    { lane: "pdf-operator-export", state: reviewRequired ? "review-required" : "ready", proof: status },
  ];

  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4549.account-report-review-ack.v1",
      ackId,
      source,
      symbol,
      timeframe,
      pointer,
      status: reviewRequired ? "operator-review" : status,
      lanes,
      generatedAt: new Date().toISOString(),
      boundary: "account-review-ack-metadata-only-no-paid-unlock-no-trade-execution",
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4549-report-review": "metadata-only-review-ack",
        "x-velmere-report-review-ack": ackId,
      },
    },
  );
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-review");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4549.account-report-review-ack.v1",
      status: "prepared",
      accepts: ["velmere.pass4549.account-report-review-request.v1"],
      boundary: "metadata-only acknowledgement; this route does not unlock paid access or execute trades",
    },
    { headers: { "cache-control": "no-store", "x-velmere-pass4549-report-review": "prepared" } },
  );
}
