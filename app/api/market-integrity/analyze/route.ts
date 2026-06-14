import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { marketIntegrityDemoResults } from "@/lib/market-integrity/demo-tokens";
import { recordSingleResult } from "@/lib/market-integrity/market-memory";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { getPersistentRiskHistory, persistRiskSnapshots } from "@/lib/market-integrity/risk-ledger";
import { abuseShieldResponseHeaders, abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { createClientFingerprint } from "@/lib/security/security-event-ledger";
import { recordPass633AuditEvent } from "@/lib/security/pass633-audit-event-schema";
import { runPass636FailureDrill, type Pass636FailureKind } from "@/lib/security/pass636-provider-failure-drills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "analyze", { keyPrefix: "market-analyze", providerId: "market-analysis", queryParam: "query", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  const query = shield.query ?? "";

  if (!query) {
    return securityJson({ mode: "demo", results: marketIntegrityDemoResults, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  }

  const demoHit = marketIntegrityDemoResults.find((result) =>
    [result.token.symbol, result.token.name].some((value) => value?.toLowerCase().includes(query.toLowerCase())),
  );

  if (demoHit && ["om", "mantra"].includes(query.toLowerCase())) {
    return securityJson({ mode: "demo", result: demoHit, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  }

  try {
    const marketHit = await searchCoinGeckoMarket(query);
    if (marketHit) {
      const memory = recordSingleResult(marketHit.result);
      const ledger = memory?.lastSnapshot ? await persistRiskSnapshots([memory.lastSnapshot]) : undefined;
      const id = marketHit.result.token.marketId ?? marketHit.result.token.tokenAddress ?? marketHit.result.token.symbol;
      const history = await getPersistentRiskHistory(id);
      const brain = buildRiskBrain(marketHit.result, history);
      const audit = recordPass633AuditEvent({
        route: new URL(request.url).pathname,
        method: request.method,
        actorFingerprint: createClientFingerprint(request),
        providerIds: ["coingecko-market"],
        sourceIds: ["market-snapshot", "risk-history"],
        claimIds: ["risk-score", "market-state", "source-confidence"],
        decision: `analysis_${marketHit.result.level}`,
        state: shield.rateLimit.degraded ? "degraded" : "accepted",
        modelVersion: "velmere-risk-brain",
        promptSchemaVersion: "query-v1",
      });
      return securityJson({
        mode: shield.rateLimit.degraded ? "degraded_live" : "live",
        result: marketHit.result,
        marketRow: { ...marketHit, memory },
        memory,
        ledger,
        history,
        brain,
        auditReceipt: audit.publicReceipt,
        pass422: brain.pass422,
        pass425: brain.pass425,
        pass427: brain.pass427,
        pass428: brain.pass428,
        pass429: brain.pass429,
        pass430: brain.pass430,
        pass431: brain.pass431,
        pass432: brain.pass432,
        pass433: brain.pass433,
        pass434: brain.pass434,
        pass435: brain.pass435,
        pass436: brain.pass436,
        pass437: brain.pass437,
        pass438: brain.pass438,
        pass439: brain.pass439,
        pass440: brain.pass440,
        pass441: brain.pass441,
        pass442: brain.pass442,
        ...abuseShieldResponseMeta(shield),
      }, { headers: abuseShieldResponseHeaders(shield) });
    }

    const result = await analyzeDexScreenerToken(query);
    const memory = recordSingleResult(result);
    const ledger = memory?.lastSnapshot ? await persistRiskSnapshots([memory.lastSnapshot]) : undefined;
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id);
    const brain = buildRiskBrain(result, history);
    const audit = recordPass633AuditEvent({
      route: new URL(request.url).pathname,
      method: request.method,
      actorFingerprint: createClientFingerprint(request),
      providerIds: ["dexscreener-market"],
      sourceIds: ["pair-snapshot", "risk-history"],
      claimIds: ["risk-score", "liquidity-state", "source-confidence"],
      decision: `analysis_${result.level}`,
      state: shield.rateLimit.degraded ? "degraded" : "accepted",
      modelVersion: "velmere-risk-brain",
      promptSchemaVersion: "query-v1",
    });
    return securityJson({
      mode: shield.rateLimit.degraded ? "degraded_live" : "live",
      result,
      memory,
      ledger,
      history,
      brain,
      auditReceipt: audit.publicReceipt,
      pass422: brain.pass422,
      pass425: brain.pass425,
        pass427: brain.pass427,
        pass428: brain.pass428,
        pass429: brain.pass429,
        pass430: brain.pass430,
        pass431: brain.pass431,
        pass432: brain.pass432,
        pass433: brain.pass433,
        pass434: brain.pass434,
        pass435: brain.pass435,
        pass436: brain.pass436,
        pass437: brain.pass437,
        pass438: brain.pass438,
        pass439: brain.pass439,
        pass440: brain.pass440,
        pass441: brain.pass441,
        pass442: brain.pass442,
      ...abuseShieldResponseMeta(shield),
    }, { headers: abuseShieldResponseHeaders(shield) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market scan failed";
    const normalized = message.toLowerCase();
    const failureKind: Pass636FailureKind = normalized.includes("429") || normalized.includes("rate limit")
      ? "rate_limit"
      : normalized.includes("timeout") || normalized.includes("abort")
        ? "timeout"
        : normalized.includes("json") || normalized.includes("parse")
          ? "malformed_json"
          : "offline";
    const failure = runPass636FailureDrill("market-analysis", failureKind);
    const audit = recordPass633AuditEvent({
      route: new URL(request.url).pathname,
      method: request.method,
      actorFingerprint: createClientFingerprint(request),
      providerIds: ["market-analysis"],
      decision: `provider_${failureKind}`,
      state: "degraded",
      modelVersion: "velmere-risk-brain",
      promptSchemaVersion: "query-v1",
    });
    return securityJson(
      {
        mode: "degraded",
        error: failure.userMessage,
        sourceState: failure.sourceState,
        confidenceCap: failure.confidenceCap,
        retryAllowed: failure.retryAllowed,
        retryAfterMs: failure.retryAfterMs,
        recoveryPath: failure.recoveryPath,
        auditReceipt: audit.publicReceipt,
        ...abuseShieldResponseMeta(shield),
      },
      { status: failureKind === "rate_limit" ? 429 : 502, headers: abuseShieldResponseHeaders(shield) },
    );
  }
}
