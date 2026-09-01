import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { vlmSurfaceSchema } from "@/lib/ai/vlm-contract";
import { normalizePaidContext } from "@/lib/commerce/vlm-paid-access";
import { validateVlmWorkerPayload } from "@/lib/jobs/durable-computation-executor-registry";
import {
  paidSurface as paidServerSurface,
  surface as normalizeServerSurface,
} from "@/lib/market-integrity/vlm-route-analysis";
import {
  assetDetailApiSurface,
  assetDetailPaidSurface,
} from "@/components/market-integrity/asset-detail/paid-access";
import {
  runShieldProServerAnalysis,
  ShieldProServerAnalysisError,
} from "@/lib/market-integrity/shield-pro-server-analysis-client";

const issuedAt = "2026-08-21T18:00:00.000Z";
const now = Date.parse(issuedAt) + 30_000;
const requestId = "shield-pro-tier-runtime-12345678";
const asset = {
  id: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  priceLabel: "$64,000",
  sourceLabel: "field-bound source",
  sourceVerified: true,
};
const modalData = {
  ...asset,
  assetClass: "crypto" as const,
  analysisSurface: "shield-pro" as const,
};

async function main() {
assert.equal(vlmSurfaceSchema.safeParse("shield_pro").success, true, "VLM wire contract must recognize Shield Pro distinctly");
assert.equal(assetDetailPaidSurface(modalData), "shield-pro");
assert.equal(assetDetailApiSurface(modalData), "shield_pro");
assert.equal(normalizePaidContext({ surface: "shield-pro", locale: "en" }).surface, "shield-pro");
assert.equal(normalizeServerSurface("shield_pro"), "shield_pro");
assert.equal(paidServerSurface("shield_pro"), "shield-pro");
assert.deepEqual(validateVlmWorkerPayload({
  schemaVersion: "velmere.vlm-worker-payload.v1",
  query: "BTC",
  locale: "en",
  depth: "pro",
  surface: "shield_pro",
  prompt: null,
}), {
  schemaVersion: "velmere.vlm-worker-payload.v1",
  query: "BTC",
  locale: "en",
  depth: "pro",
  surface: "shield_pro",
  prompt: null,
});

let deniedCalls = 0;
await assert.rejects(
  runShieldProServerAnalysis(asset, "pro", {
    locale: "en",
    requestId,
    now,
    fetchImpl: async (_input, init) => {
      deniedCalls += 1;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.surface, "shield_pro");
      assert.equal(body.depth, "pro");
      assert.equal(body.requestId, requestId);
      assert.equal(init?.credentials, "same-origin");
      return new Response(JSON.stringify({ customerMessage: "Server entitlement required." }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    },
  }),
  (error: unknown) => error instanceof ShieldProServerAnalysisError
    && error.code === "shield_pro_entitlement_required"
    && error.status === 402,
);
assert.equal(deniedCalls, 1, "entitlement rejection must not retry or amplify provider traffic");

function paidPayload(depth: "pro" | "advanced") {
  return {
    mode: "verified",
    sourceMode: "crypto_market_integrity",
    result: {
      token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
      score: 42,
      confidence: 0.65,
      level: "review",
      badge: "review",
      signals: [],
      metrics: {},
      dataQuality: "live",
      dataSources: ["provider-a", "provider-b"],
      limitations: [],
      generatedAt: issuedAt,
      customerVerdict: "ready",
      numericVerdictPublished: true,
    },
    kernel: {
      schemaVersion: "velmere.vlm.kernel.public.v1",
      generatedAt: issuedAt,
      surface: "shield",
      depth,
      locale: "en",
      status: "ready",
      confidence: 65,
      confidenceCap: 65,
      sourceCount: 2,
      sourceFamilies: ["market_data", "dex_market"],
      headline: "Evidence-bound market review",
      summary: "Two named evidence families support a bounded review.",
      findings: [{
        id: "market-structure",
        title: "Market structure",
        body: "The evidence packet supports a review state, not a trading instruction.",
        severity: "watch",
        confidence: 65,
        evidenceIds: ["source-a", "source-b"],
      }],
      missingData: [],
      nextActions: ["Revalidate source freshness."],
      numericVerdictPublished: true,
    },
    publicEvidencePacket: {
      schemaVersion: "velmere.vlm.public-evidence.v1",
      asset: { id: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
      observedAt: issuedAt,
      depth,
      surface: "shield_pro",
      requestBinding: { requestId, query: "BTC", depth, surface: "shield_pro", issuedAt },
      confidenceCap: 65,
      sourceCount: 2,
      providerCount: 2,
      providers: ["provider-a", "provider-b"],
      factsWithValue: 12,
      missingFacts: 0,
      missingData: [],
      nextChecks: ["Revalidate source freshness."],
      sourceHealth: { evidenceQuorum: "strong", integrity: "trusted", temporal: "current" },
      claimPolicy: {
        publicRule: "Evidence-bound risk explanation only.",
        noUnsupportedLiquidityClaims: true,
        noHolderClaimsWithoutHolderData: true,
        noContractClaimsWithoutContractData: true,
      },
    },
    commercialDelivery: {
      state: "paid_delivery_ready",
      deliveryAllowed: true,
      captureAllowed: true,
      blockers: [],
    },
    access: { depth, paidRequired: true, accessMode: "server_entitlement" },
  };
}

for (const tier of ["pro", "advanced"] as const) {
  let calls = 0;
  const result = await runShieldProServerAnalysis(asset, tier, {
    locale: "en",
    requestId,
    now,
    fetchImpl: async (_input, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.surface, "shield_pro");
      assert.equal(body.depth, tier);
      return new Response(JSON.stringify(paidPayload(tier)), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.tier, tier);
  assert.equal(result.riskScore, 42);
  assert.equal(result.confidence, null, "an evidence cap is not a calibration artifact");
  assert.equal(result.sourceCount, 2);
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0]?.provenanceState, "DERIVED");
}

for (const mutate of [
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.surface = "shield"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.schemaVersion = "unknown"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.requestBinding.requestId = "other-request"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.requestBinding.issuedAt = "2026-08-21T18:02:00.000Z"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.observedAt = "2026-08-21T17:00:00.000Z"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.asset.symbol = "ETH"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.asset.id = "ethereum"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.providerCount = 1; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.providers = ["provider-a", "provider-a"]; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.sourceHealth.integrity = "degraded"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.publicEvidencePacket.claimPolicy.noUnsupportedLiquidityClaims = false; },
  (payload: ReturnType<typeof paidPayload>) => { payload.commercialDelivery.deliveryAllowed = false; },
  (payload: ReturnType<typeof paidPayload>) => { payload.commercialDelivery.blockers = ["provider_degraded"]; },
  (payload: ReturnType<typeof paidPayload>) => { payload.access.depth = "advanced"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.access.accessMode = "client_claim"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.result.numericVerdictPublished = false; },
  (payload: ReturnType<typeof paidPayload>) => { payload.result.score = Number.NaN; },
  (payload: ReturnType<typeof paidPayload>) => { payload.result.dataSources = ["provider-a"]; },
  (payload: ReturnType<typeof paidPayload>) => { payload.kernel.surface = "real_markets"; },
  (payload: ReturnType<typeof paidPayload>) => { payload.kernel.sourceCount = 1; },
  (payload: ReturnType<typeof paidPayload>) => { payload.kernel.findings = []; },
  (payload: ReturnType<typeof paidPayload>) => { payload.kernel.findings[0]!.evidenceIds = []; },
  (payload: ReturnType<typeof paidPayload>) => { payload.kernel.findings[0]!.body = "trusted\u202eattack"; },
]) {
  const payload = paidPayload("pro");
  mutate(payload);
  await assert.rejects(
    runShieldProServerAnalysis(asset, "pro", {
      locale: "en",
      requestId,
      now,
      fetchImpl: async () => new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    }),
    (error: unknown) => error instanceof ShieldProServerAnalysisError
      && error.code === "shield_pro_paid_response_invalid",
  );
}

for (const response of [
  new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } }),
  new Response(JSON.stringify(paidPayload("pro")), {
    status: 200,
    headers: { "content-type": "application/json", "content-length": "2000000" },
  }),
]) {
  await assert.rejects(
    runShieldProServerAnalysis(asset, "pro", {
      locale: "en",
      requestId,
      now,
      fetchImpl: async () => response,
    }),
    (error: unknown) => error instanceof ShieldProServerAnalysisError
      && error.code === "shield_pro_paid_response_invalid",
  );
}

await assert.rejects(
  runShieldProServerAnalysis(asset, "pro", {
    locale: "en",
    requestId,
    now,
    fetchImpl: async () => { throw new Error("raw socket detail must not escape"); },
  }),
  (error: unknown) => error instanceof ShieldProServerAnalysisError
    && error.code === "shield_pro_server_unavailable"
    && !error.message.includes("socket"),
);

const analysisTab = fs.readFileSync(
  path.join(process.cwd(), "components/market-integrity/analysis/AnalysisTab.tsx"),
  "utf8",
);
assert.doesNotMatch(analysisTab, /if \(tier !== "basic"\)/u, "active AnalysisTab still hard-blocks both paid tiers");
assert.match(analysisTab, /serverSurface === "shield_pro"/u);
assert.match(analysisTab, /runShieldProServerAnalysis/u);

const modal = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/AssetDetailModal.tsx"), "utf8");
assert.match(modal, /serverSurface=\{data\.analysisSurface === "shield-pro" \? "shield_pro" : undefined\}/u);

const shieldPro = fs.readFileSync(
  path.join(process.cwd(), "components/market-integrity/ShieldProCleanTerminalClient.tsx"),
  "utf8",
);
assert.match(shieldPro, /analysisSurface: "shield-pro"/u);

console.log("Shield Pro distinct Basic/Pro/Advanced server topology: PASS");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
