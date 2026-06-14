import type { TokenRiskResult } from "./risk-types";
import { buildHolderIntelligence } from "./holder-intelligence";
import { buildLiquidityIntelligence } from "./liquidity-intelligence";
import { normalizeConfidencePercent } from "./confidence-calibration";

type HistoryLike = Array<{ score?: number; timestamp?: string; price?: number; volume24h?: number }>;

type BotCommand = {
  id: string;
  label: string;
  body: string;
  priority: number;
  layer: "chart" | "liquidity" | "holders" | "evidence" | "data" | "legal";
  operatorPrompt: string;
};

function n(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pct(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "source required";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
}

function money(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "source required";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function dominantAgent(result: TokenRiskResult) {
  const agents = [...(result.agentAssessments ?? [])].sort((a, b) => b.score - a.score);
  return agents[0];
}

function topSignals(result: TokenRiskResult) {
  return [...result.signals].sort((a, b) => b.points - a.points).slice(0, 6);
}

function dataMissing(result: TokenRiskResult) {
  return [
    result.metrics.top10HolderPercent === undefined ? "top-holder distribution" : null,
    result.metrics.holderCount === undefined ? "holder count" : null,
    result.metrics.liquidityUsd === undefined ? "visible liquidity" : null,
    result.token.tokenAddress ? null : "contract address / chain id",
    result.metrics.simulatedSlippage10k === undefined ? "sell-impact simulation" : null,
  ].filter((item): item is string => Boolean(item));
}

export function buildAiRiskBotBrief(result: TokenRiskResult, history: HistoryLike = []) {
  const agent = dominantAgent(result);
  const signals = topSignals(result);
  const firstScore = n(history[0]?.score, result.score);
  const lastScore = n(history.at(-1)?.score, result.score);
  const riskDelta = lastScore - firstScore;
  const confidence = normalizeConfidencePercent(result.confidence, 42);
  const liquidity = n(result.metrics.liquidityUsd);
  const marketCap = n(result.metrics.marketCap);
  const liqCoverage = marketCap > 0 && liquidity > 0 ? (liquidity / marketCap) * 100 : undefined;
  const volumePressure = result.metrics.volumeToMarketCapRatio ?? result.metrics.volumeToLiquidityRatio;
  const missing = dataMissing(result);
  const holder = buildHolderIntelligence(result);
  const liquidityBrief = buildLiquidityIntelligence(result);
  const dataUncertaintyPercent = Math.max(holder.dataUncertaintyPercent, Math.round(liquidityBrief.uncertaintyPercent * 0.72));

  const commands: BotCommand[] = [
    {
      id: "scan_candles",
      label: "Scan candles",
      body: `Compare 1m/15m/1h/4h/1d/7d candles with volume and VWAP. 1h=${pct(result.metrics.priceChange1h)}, 24h=${pct(result.metrics.priceChange24h)}, 7d=${pct(result.metrics.priceChange7d)}.`,
      priority: Math.max(24, Math.abs(n(result.metrics.priceChange24h)) > 15 ? 86 : Math.abs(n(result.metrics.priceChange1h)) > 4 ? 78 : 48),
      layer: "chart",
      operatorPrompt: "Czy ruch ceny ma potwierdzenie w wolumenie/VWAP, czy wygląda jak anomalia wymagająca review?",
    },
    {
      id: "verify_exit",
      label: "Verify exit depth",
      body: liqCoverage === undefined
        ? "Liquidity coverage requires a source. Treat the score as incomplete until DEX/CEX depth is connected."
        : `Liquidity coverage is ~${liqCoverage.toFixed(2)}% of market cap (${money(liquidity)} visible). Compare with sell shock, liquidity intelligence and order-book heatmap.`,
      priority: liqCoverage === undefined ? 76 : liqCoverage < 1 ? 92 : liqCoverage < 3 ? 82 : 56,
      layer: "liquidity",
      operatorPrompt: "Czy użytkownik może wyjść z pozycji bez dużego slippage przy stresie 10k/50k USD?",
    },
    {
      id: "inspect_holders",
      label: "Inspect holders",
      body: result.metrics.top10HolderPercent
        ? `Top-holder concentration proxy is ${result.metrics.top10HolderPercent.toFixed(1)}%. Validate whale clusters, team wallets and CEX/custody exclusions. Data uncertainty is ${dataUncertaintyPercent}%.`
        : `Holder distribution is not confirmed. Keep uncertainty penalty (${dataUncertaintyPercent}%) and connect holder API before strong verdict.`,
      priority: result.metrics.top10HolderPercent && result.metrics.top10HolderPercent > 45 ? 90 : 68,
      layer: "holders",
      operatorPrompt: "Rozdziel whales, CEX, DEX/LP, team, retail i portfele nieklasyfikowane. Braku klasyfikacji nie traktuj jako bezpieczeństwa.",
    },
    {
      id: "open_evidence",
      label: "Open evidence report",
      body: `Score=${result.score}/100, confidence=${confidence}%, dominant=${agent?.label ?? "data quality"}. Export PASS62 evidence workflow before making claims.`,
      priority: result.score >= 65 ? 94 : 58,
      layer: "evidence",
      operatorPrompt: "Zbuduj raport evidence z sygnałami, brakami danych i językiem anomaly/review, bez oskarżeń.",
    },
    {
      id: "data_gap_review",
      label: "Review missing data",
      body: missing.length ? `Missing: ${missing.join(", ")}. Data uncertainty is ${dataUncertaintyPercent}%. These are uncertainty inputs, not proof of safety or danger.` : `Core data inputs are present, but source freshness still requires review. Data uncertainty is ${dataUncertaintyPercent}%.`,
      priority: missing.length ? 74 : 38,
      layer: "data",
      operatorPrompt: "Jakie dane trzeba podłączyć przed mocniejszym wnioskiem?",
    },
    {
      id: "legal_tone_guard",
      label: "Keep legal tone safe",
      body: "Use anomaly / requires review / low-medium-high data uncertainty. Never call a token fraud and never give investment advice.",
      priority: 70,
      layer: "legal",
      operatorPrompt: "Przeredaguj wniosek tak, żeby był zgodny z RegTech guardrails.",
    },
  ];
  commands.sort((a, b) => b.priority - a.priority);

  const verdict =
    result.score >= 85
      ? "Critical review queue"
      : result.score >= 65
        ? "High-risk investigation"
        : result.score >= 35
          ? "Watchlist review"
          : "Low detected risk";

  const narrative = [
    `${result.token.symbol} is in ${verdict.toLowerCase()} mode.`,
    agent ? `Dominant layer: ${agent.label} (${agent.score}/100).` : "Dominant layer: data fusion is still limited.",
    `Risk delta from available history: ${riskDelta > 0 ? "+" : ""}${riskDelta}.`,
    volumePressure !== undefined ? `Volume pressure proxy: ${pct(volumePressure)}.` : "Volume pressure proxy is missing.",
    signals.length ? `Top evidence: ${signals.map((signal) => signal.id).join(", ")}.` : "No strong evidence signals are available yet.",
    "Tone rule: keep the UI calm, concrete and review-focused; never create panic or hype.",
  ].join(" ");

  return {
    version: "VELMERE_AI_RISK_BOT_V7_PASS62_CONTROL_PLANE",
    symbol: result.token.symbol,
    verdict,
    score: result.score,
    confidence,
    dataUncertaintyPercent,
    riskDelta,
    dominantLayer: agent?.label ?? "Data quality",
    narrative,
    commands,
    missingData: missing,
    promptExamples: [
      "Explain the risk without hype.",
      "Which layer should I verify first?",
      "What data is missing before evidence report?",
      "Read holders as whales/CEX/DEX/team/retail/unclassified.",
    ],
    analystResponseTemplate: {
      first: "State the anomaly, confidence and data uncertainty percent.",
      second: "Name the strongest evidence layer and the missing sources.",
      third: "Give operator commands, not investment advice.",
      fourth: "Use calm SOC wording: requires review, uncertainty, evidence, next verification.",
    },
    visualPsychology: {
      density: "Short command blocks, visible uncertainty and no giant empty states.",
      trust: "Show what is known, what is missing and what should be manually reviewed.",
      antiFud: "Do not accuse projects; describe anomalies and verification steps.",
    },
    socRunbook: [
      "Freeze language at anomaly/requires manual review until sources are verified.",
      "Check candles across 1m, 15m, 1h, 4h, 1d and 7d before escalating.",
      "Separate whales from CEX/custody/team wallets before interpreting holder concentration.",
      "Use the PASS62 terminal command palette to move from chart -> holders -> liquidity -> source audit -> evidence -> product ops audit.",
      "Export evidence JSON before any external handoff.",
      "Keep every operator message compact enough to scan in a terminal panel.",
    ],
    buildTo100Backlog: [
      { module: "Live data spine", status: result.dataQuality === "live" ? "watch" : "blocked", next: "Add source freshness, retries and provenance labels for every market/holder/orderbook call." },
      { module: "PASS62 evidence workflow", status: "watch", next: "Turn source ledger, timeline, missing data and legal guardrails into a one-click case export with ops audit." },
      { module: "Liquidity intelligence", status: liquidityBrief.sourceMode === "live_orderbook" ? "watch" : "blocked", next: "Connect multi-exchange depth and DEX pool events to reduce liquidity uncertainty." },
      { module: "Executable commands", status: "watch", next: "Turn bot commands into UI actions that open the right terminal block and evidence endpoint." },
      { module: "Holder graph", status: holder.dataCompleteness >= 70 ? "watch" : "blocked", next: "Connect real on-chain holder API, CEX labels, team wallets and LP event streams." },
      { module: "VLM utility gating", status: "watch", next: "Add wallet/session verification, usage limits and member access copy without ROI language." },
      { module: "Legal launch pack", status: "blocked", next: "Add ToS, privacy, data-source policy, acceptable-use rules and token utility disclaimer." },
    ],
    warnings: [
      result.dataQuality !== "live" ? "Data is not fully live; do not over-trust the score." : null,
      result.metrics.top10HolderPercent === undefined ? "Holder clusters are missing or proxy-only." : null,
      liquidity <= 0 ? "Liquidity source is missing or too thin to simulate safely." : null,
    ].filter(Boolean),
    nextQuestion: result.score >= 65
      ? "Which layer explains the risk: velocity, holders, exit liquidity or missing data?"
      : "Is there enough depth, holder data and chart density to keep this token in low-risk mode?",
    guardrail: "Not financial advice. Algorithmic risk flag only. This is automated anomaly triage, not legal proof or an accusation.",
    generatedAt: new Date().toISOString(),
  };
}
