export const PASS293_SOCIAL_EXCHANGE_COMMAND_ROUTER_GATE = true;

export type SocialExchangeSurface =
  | "shield_terminal"
  | "shield_map"
  | "velmere_browser";

export type SocialExchangeSourceMode = "local" | "live" | "merged" | "watchlist" | "operator";

export type SocialExchangeSuggestionInput = {
  id?: string;
  symbol: string;
  name: string;
  image?: string;
  rank?: number | null;
  reason?: string;
  score?: number;
  sourceMode?: SocialExchangeSourceMode;
};

export type SocialExchangeCommandSuggestion = SocialExchangeSuggestionInput & {
  symbol: string;
  name: string;
  glyph: string;
  routerScore: number;
  sourceLabel: string;
  exchangeLabel: string;
  socialLabel: string;
  psychologyLabel: string;
  nextActionLabel: string;
  evidenceTags: string[];
  status: "core" | "review" | "watch" | "source_first";
};

export type SocialExchangeCommandRouterGate = {
  version: "velmere_social_exchange_command_router_gate_v1_pass293";
  surface: SocialExchangeSurface;
  query: string;
  headline: string;
  interfaceMode: "exchange_depth" | "social_signal" | "evidence_router";
  trustRail: string[];
  chips: string[];
  suggestions: SocialExchangeCommandSuggestion[];
  interfaceRules: string[];
  blockedDarkPatterns: string[];
  innovation: string;
};

const CORE_SYMBOLS = new Set(["BTC", "ETH", "SOL", "USDT", "USDC"]);
const VOLATILE_SYMBOLS = new Set(["PEPE", "DOGE", "PUMP", "OM", "LAB", "H", "HOME"]);

export function getSocialExchangeTokenGlyph(symbol: string) {
  const clean = symbol.trim().toUpperCase();
  if (clean === "BTC") return "₿";
  if (clean === "ETH") return "◆";
  if (clean === "SOL") return "◎";
  if (clean === "USDT" || clean === "USDC") return "$";
  if (clean === "DOGE") return "Ð";
  if (clean === "PEPE") return "🐸";
  if (clean === "VLM") return "◈";
  if (clean === "PUMP") return "↯";
  return clean.slice(0, 3) || "?";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.$_-]/g, "").slice(0, 16);
}

function sourceWeight(mode?: SocialExchangeSourceMode) {
  if (mode === "merged") return 18;
  if (mode === "live") return 14;
  if (mode === "operator") return 12;
  if (mode === "watchlist") return 10;
  if (mode === "local") return 8;
  return 5;
}

function sourceLabel(mode?: SocialExchangeSourceMode) {
  if (mode === "merged") return "live + table";
  if (mode === "live") return "live source";
  if (mode === "operator") return "operator queue";
  if (mode === "watchlist") return "watchlist";
  if (mode === "local") return "local table";
  return "resolver";
}

function statusFor(symbol: string, score?: number): SocialExchangeCommandSuggestion["status"] {
  if (score !== undefined && score >= 70) return "review";
  if (VOLATILE_SYMBOLS.has(symbol)) return "watch";
  if (CORE_SYMBOLS.has(symbol)) return "core";
  return "source_first";
}

function psychologyLabelFor(status: SocialExchangeCommandSuggestion["status"]) {
  if (status === "review") return "calm priority review";
  if (status === "watch") return "slow down · verify hype";
  if (status === "core") return "core market context";
  return "source trust first";
}

function exchangeLabelFor(status: SocialExchangeCommandSuggestion["status"]) {
  if (status === "review") return "depth + holder check";
  if (status === "watch") return "liquidity + social check";
  if (status === "core") return "macro/liquidity baseline";
  return "identity + source check";
}

function socialLabelFor(status: SocialExchangeCommandSuggestion["status"]) {
  if (status === "review") return "operator signal";
  if (status === "watch") return "trend context";
  if (status === "core") return "reference asset";
  return "discovery lane";
}

function nextActionFor(status: SocialExchangeCommandSuggestion["status"]) {
  if (status === "review") return "open evidence scan";
  if (status === "watch") return "inspect before hype";
  if (status === "core") return "open Shield readout";
  return "resolve identity first";
}

function tagsFor(status: SocialExchangeCommandSuggestion["status"], mode?: SocialExchangeSourceMode) {
  const base = ["source state", "no buy/sell call"];
  if (status === "review") return ["depth", "holders", "contract", ...base];
  if (status === "watch") return ["social", "liquidity", "anti-FOMO", ...base];
  if (status === "core") return ["market core", "order book", ...base];
  return [sourceLabel(mode), "identity", ...base];
}

export function buildSocialExchangeCommandRouterGate(input: {
  surface: SocialExchangeSurface;
  query?: string;
  suggestions: SocialExchangeSuggestionInput[];
  watchlist?: string[];
  max?: number;
}): SocialExchangeCommandRouterGate {
  const query = (input.query ?? "").trim().toLowerCase();
  const watchlist = new Set((input.watchlist ?? []).map((item) => normalizeSymbol(item)));
  const seen = new Set<string>();

  const suggestions = input.suggestions
    .map((item) => ({ ...item, symbol: normalizeSymbol(item.symbol), name: item.name?.trim() || item.symbol }))
    .filter((item) => item.symbol)
    .filter((item) => {
      if (seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    })
    .map<SocialExchangeCommandSuggestion>((item) => {
      const symbolLower = item.symbol.toLowerCase();
      const nameLower = item.name.toLowerCase();
      const status = statusFor(item.symbol, item.score);
      const queryBoost = !query
        ? 3
        : symbolLower === query
          ? 30
          : symbolLower.startsWith(query)
            ? 22
            : nameLower.includes(query)
              ? 12
              : 0;
      const rankBoost = item.rank ? Math.max(0, 16 - Math.min(16, Math.floor(item.rank / 60))) : 4;
      const scoreBoost = item.score !== undefined ? Math.min(18, Math.max(0, item.score / 6)) : 0;
      const watchBoost = watchlist.has(item.symbol) ? 8 : 0;
      const coreBoost = CORE_SYMBOLS.has(item.symbol) ? 6 : 0;
      const routerScore = clampScore(28 + queryBoost + sourceWeight(item.sourceMode) + rankBoost + scoreBoost + watchBoost + coreBoost);
      return {
        ...item,
        glyph: getSocialExchangeTokenGlyph(item.symbol),
        routerScore,
        sourceLabel: sourceLabel(item.sourceMode),
        exchangeLabel: exchangeLabelFor(status),
        socialLabel: socialLabelFor(status),
        psychologyLabel: psychologyLabelFor(status),
        nextActionLabel: nextActionFor(status),
        evidenceTags: tagsFor(status, item.sourceMode),
        status,
      };
    })
    .sort((a, b) => b.routerScore - a.routerScore || (a.rank ?? 999999) - (b.rank ?? 999999))
    .slice(0, input.max ?? 8);

  const topStatus = suggestions[0]?.status ?? "source_first";
  return {
    version: "velmere_social_exchange_command_router_gate_v1_pass293",
    surface: input.surface,
    query: input.query ?? "",
    headline:
      topStatus === "review"
        ? "Social-Exchange Command Router is prioritizing evidence before action"
        : "Unified Shield search is ranking by source, depth and calm review",
    interfaceMode:
      input.surface === "shield_terminal"
        ? "exchange_depth"
        : input.surface === "shield_map"
          ? "evidence_router"
          : "social_signal",
    trustRail: [
      "MEXC-style depth/orderbook context stays near the token decision surface.",
      "Meta/Instagram/X-style ranking is used as a transparent signal router, not as addictive infinite feed.",
      "Every search suggestion shows why it is ranked: source state, risk/review context and next safe action.",
    ],
    chips: ["depth near decision", "source confidence", "social context", "anti-FOMO", "one next action"],
    suggestions,
    interfaceRules: [
      "One search contract must serve Shield, Shield Map and VLM Browser.",
      "High-risk or hype-heavy tokens get calmer copy and stronger evidence prompts.",
      "Missing source data increases review pressure instead of becoming a clean verdict.",
      "Search suggestions must be scrollable, logo/glyph-aware and portal-safe.",
    ],
    blockedDarkPatterns: [
      "no countdown pressure",
      "no guaranteed profit/safety language",
      "no fake scarcity",
      "no buy/sell command",
    ],
    innovation:
      "Velmère Social-Exchange Command Router: exchange-grade search + social-feed ranking + evidence-first anti-FOMO psychology in one reusable UI contract.",
  };
}
