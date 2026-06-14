import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { buildShieldChatResponse } from "@/lib/market-integrity/shield-chat";
import { generateVlmBrainAnalysis } from "@/lib/ai/vlm-brain";
import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AngelPostBody = {
  query?: string;
  prompt?: string;
  locale?: "pl" | "en" | "de";
};

function isLocale(value: unknown): value is "pl" | "en" | "de" {
  return value === "pl" || value === "en" || value === "de";
}

async function resolveAngel(request: Request, body?: AngelPostBody | null) {
  const url = new URL(request.url);
  const query = (body?.query ?? url.searchParams.get("query") ?? "").trim();
  const prompt = (body?.prompt ?? url.searchParams.get("prompt") ?? "Explain the current risk.").trim();
  const localeCandidate = body?.locale ?? url.searchParams.get("locale") ?? "pl";
  const locale = isLocale(localeCandidate) ? localeCandidate : "pl";

  if (!query) {
    return securityJson({ mode: "error", error: "Missing query" }, { status: 400 });
  }

  const marketRow = await searchCoinGeckoMarket(query);
  const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
  const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
  const history = await getPersistentRiskHistory(id);
  const brain = buildRiskBrain(result, history);
  const deterministic = buildShieldChatResponse(result, history, prompt, locale);
  const vlm = await generateVlmBrainAnalysis({ result, brain, prompt, locale, depth: "pro", surface: "angel" });

  return securityJson({
    mode: "live",
    persona: "Velmère Angel",
    angel: vlm.output,
    vlm,
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
    brain,
    result,
    generatedAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "default", { keyPrefix: "market-angel", queryParam: "query", allowEmptyQuery: false });
  if (!shield.ok) return shield.response;
  try {
    const response = await resolveAngel(request);
    const payload = await response.json();
    return securityJson({ ...payload, ...abuseShieldResponseMeta(shield) }, { status: response.status });
  } catch (error) {
    return securityJson({ mode: "error", error: error instanceof Error ? error.message : "Angel request failed" }, { status: 502 });
  }
}


export async function POST(request: Request) {
  const shield = await applyApiAbuseShield(request, "default", { keyPrefix: "market-angel", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;
  try {
    const body = (await request.json().catch(() => null)) as AngelPostBody | null;
    const response = await resolveAngel(request, body);
    const payload = await response.json();
    return securityJson({ ...payload, ...abuseShieldResponseMeta(shield) }, { status: response.status });
  } catch (error) {
    return securityJson({ mode: "error", error: error instanceof Error ? error.message : "Angel request failed" }, { status: 502 });
  }
}
