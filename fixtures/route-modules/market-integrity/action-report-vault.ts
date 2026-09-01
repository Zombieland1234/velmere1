import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { readPublicMutationJsonBody } from "@/lib/security/mutation-request-boundary";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Pass4547ReportDraftInput = {
  schema?: unknown;
  symbol?: unknown;
  timeframe?: unknown;
  tier?: unknown;
  actionCount?: unknown;
  readyCount?: unknown;
  reviewCount?: unknown;
  draftState?: unknown;
  manifestHandoff?: unknown;
  lanes?: unknown;
  generatedAt?: unknown;
  boundary?: unknown;
};

type Pass4547VaultLane = {
  lane: "api-received" | "vault-pointer" | "account-console" | "operator-review";
  state: "ready" | "review-required" | "waiting" | "redacted";
  proof: string;
};

function cleanText(value: unknown, fallback: string, max = 120) {
  const text = String(value ?? fallback).replace(/[<>{}\r\n]/g, " ").trim();
  return (text || fallback).slice(0, max);
}

function cleanCount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 999) : 0;
}

function isSupportedDraftSchema(schema: string) {
  return schema === "velmere.pass4546.asset-report-composer.v1" || schema === "velmere.pass4546.shield-pro-terminal-report-composer.v1";
}

function buildDigest(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function POST(request: Request) {
  const productionGuard = blockProductionFixtureRoute("action-report-vault");
  if (productionGuard) return productionGuard;
  const parsedBody = await readPublicMutationJsonBody<{ source?: unknown; draft?: Pass4547ReportDraftInput }>(request, {
    keyPrefix: "pass4681-action-report-vault",
    maxBytes: 64_000,
    maxDepth: 16,
    rateLimit: 30,
  });
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.value;

  const draft = body.draft ?? {};
  const draftSchema = cleanText(draft.schema, "unknown", 96);
  if (!isSupportedDraftSchema(draftSchema)) {
    return NextResponse.json(
      {
        ok: false,
        schema: "velmere.pass4547.report-composer-vault-bridge.v1",
        error: "unsupported_draft_schema",
        expected: ["velmere.pass4546.asset-report-composer.v1", "velmere.pass4546.shield-pro-terminal-report-composer.v1"],
        received: draftSchema,
        boundary: "no-raw-payload-persistence",
      },
      { status: 422, headers: { "cache-control": "no-store", "x-velmere-pass4547-report-vault-bridge": "unsupported-schema" } },
    );
  }

  const source = cleanText(body.source, draftSchema.includes("shield-pro") ? "shield-pro" : "asset-detail", 48);
  const symbol = cleanText(draft.symbol, "UNKNOWN", 32).toUpperCase();
  const timeframe = cleanText(draft.timeframe, "context", 24);
  const tier = cleanText(draft.tier, source === "shield-pro" ? "advanced" : "context", 32);
  const draftState = cleanText(draft.draftState, "waiting-for-action", 56);
  const manifestHandoff = cleanText(draft.manifestHandoff, "waiting-for-action", 64);
  const actionCount = cleanCount(draft.actionCount);
  const reviewCount = cleanCount(draft.reviewCount);
  const readyCount = cleanCount(draft.readyCount);
  const digest = buildDigest({ draftSchema, source, symbol, timeframe, tier, draftState, manifestHandoff, actionCount, reviewCount, readyCount });
  const vaultPointer = `vlm-${source}-${symbol}-${timeframe}-${digest.slice(0, 16)}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const waiting = actionCount === 0 || draftState === "waiting-for-action";
  const review = draftState.includes("review") || manifestHandoff.includes("review") || reviewCount > 0;
  const deliveryState = waiting ? "waiting-for-action" : review ? "operator-review-required" : "account-vault-ready";
  const lanes: Pass4547VaultLane[] = [
    { lane: "api-received", state: waiting ? "waiting" : "ready", proof: `${draftSchema} · actions=${actionCount}` },
    { lane: "vault-pointer", state: waiting ? "waiting" : "ready", proof: vaultPointer },
    { lane: "account-console", state: waiting ? "waiting" : "ready", proof: `/account?tab=reports&vault=${vaultPointer}` },
    { lane: "operator-review", state: review ? "review-required" : "redacted", proof: review ? `review=${reviewCount} · handoff=${manifestHandoff}` : "not required for this draft" },
  ];

  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4547.report-composer-vault-bridge.v1",
      source,
      symbol,
      timeframe,
      tier,
      deliveryState,
      vaultPointer,
      accountRoute: `/account?tab=reports&vault=${vaultPointer}`,
      digest,
      lanes,
      serverStored: false,
      generatedAt: new Date().toISOString(),
      redaction: "draft metadata only; no raw chart payload, payment data, wallet signatures or trade execution",
      boundary: "api-bridge-only-no-paid-unlock-no-trade-execution",
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-velmere-pass4547-report-vault-bridge": "metadata-only-no-server-persistence",
        "x-velmere-report-vault-pointer": vaultPointer,
      },
    },
  );
}

export async function GET() {
  const productionGuard = blockProductionFixtureRoute("action-report-vault");
  if (productionGuard) return productionGuard;
  return NextResponse.json(
    {
      ok: true,
      schema: "velmere.pass4547.report-composer-vault-bridge.v1",
      status: "prepared",
      accepts: ["velmere.pass4546.asset-report-composer.v1", "velmere.pass4546.shield-pro-terminal-report-composer.v1"],
      boundary: "POST draft metadata to receive vault pointer; this route does not unlock paid access or execute trades",
    },
    { headers: { "cache-control": "no-store", "x-velmere-pass4547-report-vault-bridge": "prepared" } },
  );
}
