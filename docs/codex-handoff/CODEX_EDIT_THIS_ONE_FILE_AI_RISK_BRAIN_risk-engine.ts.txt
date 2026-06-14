import type {
  RiskAgentAssessment,
  RiskAgentId,
  RiskLevel,
  RiskMetaModel,
  RiskSignalId,
  TokenRiskInput,
  TokenRiskResult,
  TokenRiskSignal,
} from "./risk-types";
import { validateTokenRiskInput } from "./data-backbone";

export function levelFromScore(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function badgeFromLevel(level: RiskLevel): TokenRiskResult["badge"] {
  if (level === "critical") return "critical_market_integrity_risk";
  if (level === "high") return "possible_manipulation_risk";
  if (level === "medium") return "elevated_risk";
  return "low_detected_risk";
}

function addSignal(signals: TokenRiskSignal[], signal: TokenRiskSignal) {
  const existing = signals.find((item) => item.id === signal.id);
  if (!existing) {
    signals.push(signal);
    return;
  }
  if (signal.points > existing.points) {
    existing.points = signal.points;
    existing.severity = signal.severity;
    existing.metrics = {
      ...(existing.metrics ?? {}),
      ...(signal.metrics ?? {}),
    };
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}


function computeDataConfidence(input: TokenRiskInput, evidenceCount: number, dataQuality: TokenRiskResult["dataQuality"]) {
  const observed = [
    input.currentPrice,
    input.marketCap,
    input.volume24h,
    input.priceChange24h,
    input.priceChange7d,
    input.priceChange30d,
    input.liquidityUsd,
    input.simulatedSlippage10k,
    input.top10HolderPercent,
    input.sellTaxPercentage,
  ].filter((value) => value !== undefined && value !== null).length;
  const base = dataQuality === "live" ? 0.46 : dataQuality === "partial" ? 0.32 : 0.18;
  const metricBoost = Math.min(0.38, observed * 0.045);
  const evidenceBoost = Math.min(0.16, evidenceCount * 0.025);
  return rounded(Math.min(0.96, base + metricBoost + evidenceBoost), 2);
}


function statusFromAgentScore(score: number): RiskLevel {
  return levelFromScore(Math.min(100, Math.max(0, score)));
}

function verdictFromAgentScore(
  score: number,
  confidence: number,
): RiskAgentAssessment["verdict"] {
  if (confidence < 0.35) return "insufficient_data";
  if (score >= 85) return "critical";
  if (score >= 65) return "warning";
  if (score >= 35) return "watch";
  return "clear";
}

function buildAgentAssessments(
  signals: TokenRiskSignal[],
  input: TokenRiskInput,
  globalConfidence: number,
): RiskAgentAssessment[] {
  const idsFor = (ids: RiskSignalId[]) =>
    signals.filter((signal) => ids.includes(signal.id)).map((signal) => signal.id);
  const scoreFor = (ids: RiskSignalId[]) =>
    Math.min(
      100,
      signals
        .filter((signal) => ids.includes(signal.id))
        .reduce((sum, signal) => sum + signal.points, 0),
    );
  const countObserved = (values: Array<unknown>) =>
    values.filter((value) => value !== undefined && value !== null).length;
  const agentConfidence = (observed: number, required: number, evidence: number) =>
    rounded(
      Math.min(
        0.98,
        Math.max(0.12, 0.18 + (observed / Math.max(1, required)) * 0.52 + evidence * 0.06 + globalConfidence * 0.22),
      ),
      2,
    );

  const definitions: Array<{
    id: RiskAgentId;
    label: string;
    weight: number;
    ids: RiskSignalId[];
    observed: number;
    required: number;
    reasoning: string;
    nextAction: string;
  }> = [
    {
      id: "velocity",
      label: "Velocity / pump agent",
      weight: 0.27,
      ids: [
        "rapid_intraday_move",
        "parabolic_24h_gain",
        "parabolic_7d_gain",
        "parabolic_30d_gain",
        "multi_timeframe_pump",
        "new_ath_repricing",
        "extreme_drawdown",
        "major_drawdown",
        "severe_24h_drop",
        "high_24h_drop",
      ],
      observed: countObserved([
        input.priceChange1h,
        input.priceChange6h,
        input.priceChange24h,
        input.priceChange7d,
        input.priceChange14d,
        input.priceChange30d,
        input.athPrice,
        input.currentPrice,
      ]),
      required: 8,
      reasoning:
        "Analizuje prędkość ruchu ceny w wielu oknach czasowych i szuka parabolicznych wzrostów, gwałtownych spadków oraz repricingu blisko ATH.",
      nextAction:
        "Porównać momentum z płynnością i wolumenem; szybki wzrost bez głębokości rynku wymaga ręcznego review.",
    },
    {
      id: "liquidity",
      label: "Liquidity / volume agent",
      weight: 0.22,
      ids: [
        "thin_liquidity",
        "very_thin_liquidity",
        "low_dex_liquidity",
        "market_volume_stress",
        "wash_trading_risk",
        "volume_spike",
      ],
      observed: countObserved([
        input.liquidityUsd,
        input.marketCap,
        input.fdv,
        input.volume24h,
        input.averageVolume7d,
      ]),
      required: 5,
      reasoning:
        "Łączy market cap, FDV, wolumen i płynność, żeby wykrywać iluzję płynności oraz podejrzenie sztucznego obrotu.",
      nextAction:
        "Sprawdzić, czy sprzedaż średniego zlecenia realnie przesuwa cenę i czy wolumen nie jest oderwany od płynności.",
    },
    {
      id: "microstructure",
      label: "Order book microstructure agent",
      weight: 0.18,
      ids: [
        "orderbook_depth_collapse",
        "orderbook_slippage_risk",
        "orderbook_imbalance",
        "sell_pressure_imbalance",
      ],
      observed: countObserved([
        input.simulatedSlippage10k,
        input.bidAskImbalancePercent,
        input.orderBookDepthDropPercent,
        input.buys24h,
        input.sells24h,
      ]),
      required: 5,
      reasoning:
        "Symuluje poślizg, imbalance i zachowanie książki zleceń; szuka sytuacji, gdzie cena wygląda stabilnie, ale rynek jest pusty.",
      nextAction:
        "Dodać pełne snapshoty order booka i metrykę anulowanych zleceń, gdy źródło danych to umożliwi.",
    },
    {
      id: "holders",
      label: "Holders / supply agent",
      weight: 0.16,
      ids: [
        "holder_concentration",
        "supply_overhang",
        "fdv_marketcap_gap",
        "rebrand_after_crash",
        "exchange_deposit_anomaly",
      ],
      observed: countObserved([
        input.top10HolderPercent,
        input.holderCount,
        input.circulatingSupply,
        input.totalSupply,
        input.maxSupply,
        input.fdv,
        input.marketCap,
      ]),
      required: 7,
      reasoning:
        "Bada koncentrację podaży, różnicę FDV/market cap i potencjalny nawis tokenów, który może trafić na rynek.",
      nextAction:
        "Podpiąć skaner holderów per chain i klastrowanie portfeli, żeby rozróżnić niezależnych holderów od sybil clusterów.",
    },
    {
      id: "contract",
      label: "Smart contract security agent",
      weight: 0.13,
      ids: [
        "contract_privileges",
        "honeypot_risk",
        "high_sell_tax",
        "mint_risk",
        "blacklist_risk",
      ],
      observed: countObserved([
        input.tokenAddress,
        input.buyTaxPercentage,
        input.sellTaxPercentage,
        input.isHoneypot,
        input.canMintNewTokens,
        input.canPauseTrading,
        input.canBlacklist,
      ]),
      required: 7,
      reasoning:
        "Skanuje podstawowe flagi kontraktu: honeypot, podatki, mint, pause i blacklist, jeżeli źródło zwraca adres kontraktu.",
      nextAction:
        "Dodać dynamiczny honeypot simulation i static bytecode audit dla EVM, gdy dostępne będą klucze/API produkcyjne.",
    },
    {
      id: "data",
      label: "Data quality agent",
      weight: 0.04,
      ids: ["insufficient_data"],
      observed: countObserved([
        input.currentPrice,
        input.marketCap,
        input.volume24h,
        input.priceChange24h,
        input.priceChange7d,
        input.liquidityUsd,
        input.tokenAddress,
        input.simulatedSlippage10k,
      ]),
      required: 8,
      reasoning:
        "Pilnuje, żeby brak danych nie wyglądał jak bezpieczeństwo; niższa jakość danych obniża pewność wniosku.",
      nextAction:
        "Rozszerzyć źródła o cache historyczny, holder snapshots i social/on-chain correlation.",
    },
  ];

  return definitions.map((definition) => {
    const evidenceSignalIds = idsFor(definition.ids);
    const rawScore = definition.id === "data"
      ? Math.max(scoreFor(definition.ids), Math.round((1 - globalConfidence) * 42))
      : scoreFor(definition.ids);
    const confidence = agentConfidence(definition.observed, definition.required, evidenceSignalIds.length);
    const status = statusFromAgentScore(rawScore);
    return {
      id: definition.id,
      label: definition.label,
      score: rawScore,
      weight: definition.weight,
      confidence,
      evidenceCount: evidenceSignalIds.length,
      status,
      verdict: verdictFromAgentScore(rawScore, confidence),
      evidenceSignalIds,
      reasoning: definition.reasoning,
      nextAction: definition.nextAction,
    };
  });
}

function buildMetaModel(
  symbol: string,
  score: number,
  level: RiskLevel,
  confidence: number,
  agents: RiskAgentAssessment[],
  signals: TokenRiskSignal[],
): RiskMetaModel {
  const dominant = agents
    .filter((agent) => agent.id !== "data")
    .sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const highAgents = agents.filter((agent) => agent.score >= 65 && agent.id !== "data").length;
  const cleanAgents = agents.filter((agent) => agent.score < 20 && agent.confidence >= 0.55 && agent.id !== "data").length;
  const conflictLevel: RiskMetaModel["conflictLevel"] =
    highAgents >= 2 && cleanAgents >= 2
      ? "high"
      : highAgents >= 1 && cleanAgents >= 2
        ? "medium"
        : highAgents >= 1
          ? "low"
          : "none";
  const dataAgent = agents.find((agent) => agent.id === "data");
  const verdict: RiskMetaModel["verdict"] =
    confidence < 0.34 || dataAgent?.verdict === "insufficient_data"
      ? "insufficient_data"
      : level === "critical"
        ? "critical"
        : level === "high"
          ? "warning"
          : level === "medium"
            ? "watch"
            : "clear";
  const requiredReview = verdict !== "clear" || conflictLevel !== "none" || signals.length > 0;
  const dominantText = dominant ? ` Dominujący agent: ${dominant.label} (${dominant.score}/100).` : "";
  return {
    version: "velmere-shield-multi-agent-fusion-v2",
    verdict,
    dominantAgent: dominant?.id,
    dataFusionScore: score,
    conflictLevel,
    requiredReview,
    summary:
      verdict === "critical"
        ? `${symbol}: meta-model łączy sygnały w krytyczny profil ryzyka.${dominantText} Wymagany ręczny review danych i źródeł.`
        : verdict === "warning"
          ? `${symbol}: meta-model widzi możliwy profil manipulacji lub kruchej płynności.${dominantText}`
          : verdict === "watch"
            ? `${symbol}: wykryto sygnały do obserwacji, ale aktualna fuzja danych nie wskazuje poziomu krytycznego.${dominantText}`
            : verdict === "insufficient_data"
              ? `${symbol}: wynik ma ograniczoną pewność, bo część kluczowych źródeł jest niedostępna. Brak danych nie oznacza bezpieczeństwa.`
              : `${symbol}: aktualnie podłączone źródła nie pokazują dużych anomalii.${dominantText}`,
    escalation:
      score >= 85
        ? "Escalate: manual forensic review + order book + holder clusters + contract audit."
        : score >= 65
          ? "Review: verify liquidity, market depth and supply distribution before trusting the market."
          : score >= 35
            ? "Watch: monitor next snapshots and compare changes in score."
            : "Monitor: keep automated scan active.",
    limitations: [
      "Nie jest to dowód prawny ani oskarżenie.",
      "Wynik zależy od dostępności publicznych API i jakości danych w danym momencie.",
      "Pełna warstwa AI wymaga cache historii, social/on-chain correlation, wallet clustering i mempool telemetry.",
    ],
  };
}

function buildScoreBreakdown(signals: TokenRiskSignal[], confidence: number) {
  const scoreFor = (ids: string[]) =>
    Math.min(100, signals.filter((signal) => ids.includes(signal.id)).reduce((sum, signal) => sum + signal.points, 0));
  const countFor = (ids: string[]) => signals.filter((signal) => ids.includes(signal.id)).length;
  const groups = [
    {
      id: "velocity" as const,
      label: "Velocity / pump",
      weight: 0.28,
      ids: ["rapid_intraday_move", "parabolic_24h_gain", "parabolic_7d_gain", "parabolic_30d_gain", "multi_timeframe_pump", "new_ath_repricing", "extreme_drawdown", "major_drawdown", "severe_24h_drop", "high_24h_drop"],
    },
    {
      id: "liquidity" as const,
      label: "Liquidity / volume",
      weight: 0.22,
      ids: ["thin_liquidity", "very_thin_liquidity", "low_dex_liquidity", "market_volume_stress", "wash_trading_risk", "volume_spike"],
    },
    {
      id: "microstructure" as const,
      label: "Order book / microstructure",
      weight: 0.18,
      ids: ["orderbook_depth_collapse", "orderbook_slippage_risk", "orderbook_imbalance", "sell_pressure_imbalance"],
    },
    {
      id: "holders" as const,
      label: "Holders / supply",
      weight: 0.17,
      ids: ["holder_concentration", "supply_overhang", "fdv_marketcap_gap", "rebrand_after_crash", "exchange_deposit_anomaly"],
    },
    {
      id: "contract" as const,
      label: "Smart contract",
      weight: 0.15,
      ids: ["contract_privileges", "honeypot_risk", "high_sell_tax", "mint_risk", "blacklist_risk"],
    },
  ];
  const rows = groups.map((group) => ({
    id: group.id,
    label: group.label,
    score: scoreFor(group.ids),
    weight: group.weight,
    confidence,
    evidenceCount: countFor(group.ids),
  }));
  rows.push({
    id: "data",
    label: "Data quality",
    score: Math.round(confidence * 100),
    weight: 0,
    confidence,
    evidenceCount: signals.length,
  });
  return rows;
}

function buildAiSummary(
  symbol: string,
  level: RiskLevel,
  signals: TokenRiskSignal[],
) {
  const ids = new Set(signals.map((signal) => signal.id));
  const reasons: string[] = [];
  if (
    ids.has("multi_timeframe_pump") ||
    ids.has("parabolic_30d_gain") ||
    ids.has("parabolic_7d_gain")
  )
    reasons.push("paraboliczny wzrost ceny");
  if (
    ids.has("very_thin_liquidity") ||
    ids.has("thin_liquidity") ||
    ids.has("low_dex_liquidity")
  )
    reasons.push("krucha płynność");
  if (
    ids.has("wash_trading_risk") ||
    ids.has("volume_spike") ||
    ids.has("market_volume_stress")
  )
    reasons.push("nietypowa struktura wolumenu");
  if (ids.has("holder_concentration")) reasons.push("koncentracja holderów");
  if (
    ids.has("honeypot_risk") ||
    ids.has("contract_privileges") ||
    ids.has("high_sell_tax")
  )
    reasons.push("ryzyka smart kontraktu");
  if (ids.has("orderbook_slippage_risk") || ids.has("orderbook_imbalance"))
    reasons.push("słaba mikrostruktura order booka");
  const reasonText = reasons.length
    ? ` Najważniejsze flagi: ${reasons.join(", ")}.`
    : "";
  if (level === "critical")
    return `${symbol} ma krytyczny profil market-integrity.${reasonText} To wymaga ręcznej weryfikacji źródeł, order booka i przepływów on-chain — to nie jest oskarżenie ani wyrok.`;
  if (level === "high")
    return `${symbol} pokazuje podwyższone wzorce ryzyka manipulacji lub kruchej płynności.${reasonText} System rekomenduje analizę płynności, wolumenu i holderów przed zaufaniem temu rynkowi.`;
  if (level === "medium")
    return `${symbol} ma wykryte anomalie, ale połączone dane nie wystarczają do klasyfikacji krytycznej.${reasonText}`;
  return `${symbol} w aktualnie podłączonych źródłach pokazuje niski poziom wykrytych anomalii. Wynik może się szybko zmienić, szczególnie przy niskiej płynności.`;
}

export function analyzeTokenRisk(
  input: TokenRiskInput,
  dataQuality: TokenRiskResult["dataQuality"] = "partial",
): TokenRiskResult {
  const validation = validateTokenRiskInput(input);
  const validationWarnings = validation.ok ? validation.warnings : validation.warnings;
  const safeInput = validation.ok ? validation.data : input;
  const signals: TokenRiskSignal[] = [];

  if (!validation.ok) {
    addSignal(signals, {
      id: "insufficient_data",
      severity: "high",
      points: 18,
      metrics: { validation: "failed" },
    });
  } else if (validationWarnings.length) {
    addSignal(signals, {
      id: "insufficient_data",
      severity: "medium",
      points: Math.min(14, 4 + validationWarnings.length * 3),
      metrics: { warnings: validationWarnings.length },
    });
  }

  const marketCap = finiteNumber(safeInput.marketCap) ?? finiteNumber(safeInput.fdv);
  const fdv = finiteNumber(safeInput.fdv);
  const liquidityUsd = finiteNumber(safeInput.liquidityUsd);
  const currentPrice = finiteNumber(safeInput.currentPrice);
  const athPrice = finiteNumber(safeInput.athPrice);
  const volume24h = finiteNumber(safeInput.volume24h);
  const averageVolume7d = finiteNumber(safeInput.averageVolume7d);
  const priceChange1h = finiteNumber(safeInput.priceChange1h);
  const priceChange6h = finiteNumber(safeInput.priceChange6h);
  const priceChange24h = finiteNumber(safeInput.priceChange24h);
  const priceChange7d = finiteNumber(safeInput.priceChange7d);
  const priceChange14d = finiteNumber(safeInput.priceChange14d);
  const priceChange30d = finiteNumber(safeInput.priceChange30d);
  const buys24h = finiteNumber(safeInput.buys24h);
  const sells24h = finiteNumber(safeInput.sells24h);

  let drawdownPercent: number | undefined;
  if (athPrice && currentPrice && athPrice > 0 && currentPrice > 0) {
    drawdownPercent = ((athPrice - currentPrice) / athPrice) * 100;
    if (drawdownPercent >= 90)
      addSignal(signals, {
        id: "extreme_drawdown",
        severity: "critical",
        points: 30,
        metrics: { drawdownPercent: rounded(drawdownPercent) },
      });
    else if (drawdownPercent >= 70)
      addSignal(signals, {
        id: "major_drawdown",
        severity: "high",
        points: 20,
        metrics: { drawdownPercent: rounded(drawdownPercent) },
      });
  }

  if (typeof priceChange1h === "number" && Math.abs(priceChange1h) >= 18) {
    addSignal(signals, {
      id: "rapid_intraday_move",
      severity: Math.abs(priceChange1h) >= 35 ? "high" : "medium",
      points: Math.abs(priceChange1h) >= 35 ? 18 : 10,
      metrics: { priceChange1h: rounded(priceChange1h) },
    });
  }
  if (typeof priceChange24h === "number") {
    if (priceChange24h <= -80)
      addSignal(signals, {
        id: "severe_24h_drop",
        severity: "critical",
        points: 26,
        metrics: { priceChange24h: rounded(priceChange24h) },
      });
    else if (priceChange24h <= -45)
      addSignal(signals, {
        id: "high_24h_drop",
        severity: "high",
        points: 16,
        metrics: { priceChange24h: rounded(priceChange24h) },
      });
    else if (priceChange24h >= 120)
      addSignal(signals, {
        id: "parabolic_24h_gain",
        severity: "critical",
        points: 40,
        metrics: { priceChange24h: rounded(priceChange24h) },
      });
    else if (priceChange24h >= 80)
      addSignal(signals, {
        id: "parabolic_24h_gain",
        severity: "critical",
        points: 34,
        metrics: { priceChange24h: rounded(priceChange24h) },
      });
    else if (priceChange24h >= 45)
      addSignal(signals, {
        id: "parabolic_24h_gain",
        severity: "high",
        points: 24,
        metrics: { priceChange24h: rounded(priceChange24h) },
      });
  }
  if (typeof priceChange7d === "number") {
    if (priceChange7d <= -80)
      addSignal(signals, {
        id: "extreme_drawdown",
        severity: "critical",
        points: 18,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
    else if (priceChange7d <= -50)
      addSignal(signals, {
        id: "major_drawdown",
        severity: "high",
        points: 12,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
    else if (priceChange7d >= 300)
      addSignal(signals, {
        id: "parabolic_7d_gain",
        severity: "critical",
        points: 44,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
    else if (priceChange7d >= 200)
      addSignal(signals, {
        id: "parabolic_7d_gain",
        severity: "critical",
        points: 38,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
    else if (priceChange7d >= 100)
      addSignal(signals, {
        id: "parabolic_7d_gain",
        severity: "high",
        points: 28,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
    else if (priceChange7d >= 55)
      addSignal(signals, {
        id: "parabolic_7d_gain",
        severity: "medium",
        points: 16,
        metrics: { priceChange7d: rounded(priceChange7d) },
      });
  }
  if (typeof priceChange30d === "number") {
    if (priceChange30d >= 1000)
      addSignal(signals, {
        id: "parabolic_30d_gain",
        severity: "critical",
        points: 45,
        metrics: { priceChange30d: rounded(priceChange30d) },
      });
    else if (priceChange30d >= 300)
      addSignal(signals, {
        id: "parabolic_30d_gain",
        severity: "critical",
        points: 34,
        metrics: { priceChange30d: rounded(priceChange30d) },
      });
    else if (priceChange30d >= 150)
      addSignal(signals, {
        id: "parabolic_30d_gain",
        severity: "high",
        points: 24,
        metrics: { priceChange30d: rounded(priceChange30d) },
      });
    else if (priceChange30d <= -80)
      addSignal(signals, {
        id: "extreme_drawdown",
        severity: "critical",
        points: 20,
        metrics: { priceChange30d: rounded(priceChange30d) },
      });
  }
  if ((priceChange24h ?? 0) >= 45 && (priceChange7d ?? 0) >= 150) {
    addSignal(signals, {
      id: "multi_timeframe_pump",
      severity: "critical",
      points: 36,
      metrics: {
        priceChange24h: rounded(priceChange24h ?? 0),
        priceChange7d: rounded(priceChange7d ?? 0),
      },
    });
  }
  if ((priceChange7d ?? 0) >= 180 && (priceChange30d ?? 0) >= 250) {
    addSignal(signals, {
      id: "multi_timeframe_pump",
      severity: "critical",
      points: 42,
      metrics: {
        priceChange7d: rounded(priceChange7d ?? 0),
        priceChange30d: rounded(priceChange30d ?? 0),
      },
    });
  }
  if (
    (priceChange7d ?? 0) >= 180 &&
    (drawdownPercent === undefined || drawdownPercent < 15)
  ) {
    addSignal(signals, {
      id: "new_ath_repricing",
      severity: "high",
      points: 18,
      metrics: {
        priceChange7d: rounded(priceChange7d ?? 0),
        drawdownPercent:
          drawdownPercent !== undefined ? rounded(drawdownPercent) : null,
      },
    });
  }

  let liquidityToMarketCapPercent: number | undefined;
  if (marketCap && liquidityUsd && marketCap > 0) {
    liquidityToMarketCapPercent = (liquidityUsd / marketCap) * 100;
    if (liquidityToMarketCapPercent < 0.25)
      addSignal(signals, {
        id: "very_thin_liquidity",
        severity: "critical",
        points: 24,
        metrics: {
          liquidityToMarketCapPercent: rounded(liquidityToMarketCapPercent, 4),
        },
      });
    else if (liquidityToMarketCapPercent < 1)
      addSignal(signals, {
        id: "thin_liquidity",
        severity: "high",
        points: 18,
        metrics: {
          liquidityToMarketCapPercent: rounded(liquidityToMarketCapPercent, 4),
        },
      });
  } else if (liquidityUsd !== undefined && liquidityUsd < 100_000) {
    addSignal(signals, {
      id: "low_dex_liquidity",
      severity: "medium",
      points: 10,
      metrics: { liquidityUsd: Math.round(liquidityUsd) },
    });
  }

  let volumeToLiquidityRatio: number | undefined;
  if (volume24h && liquidityUsd && liquidityUsd > 0) {
    volumeToLiquidityRatio = volume24h / liquidityUsd;
    if (volumeToLiquidityRatio >= 20)
      addSignal(signals, {
        id: "volume_spike",
        severity: "high",
        points: 16,
        metrics: { volumeToLiquidityRatio: rounded(volumeToLiquidityRatio) },
      });
  }
  let volumeToMarketCapRatio: number | undefined;
  if (marketCap && volume24h && marketCap > 0) {
    volumeToMarketCapRatio = volume24h / marketCap;
    if (volumeToMarketCapRatio >= 2)
      addSignal(signals, {
        id: "wash_trading_risk",
        severity: "critical",
        points: 25,
        metrics: { volumeToMarketCapRatio: rounded(volumeToMarketCapRatio) },
      });
    else if (volumeToMarketCapRatio >= 0.75)
      addSignal(signals, {
        id: "market_volume_stress",
        severity: "medium",
        points: 12,
        metrics: { volumeToMarketCapRatio: rounded(volumeToMarketCapRatio) },
      });
  }
  if (volume24h && averageVolume7d && averageVolume7d > 0) {
    const ratio = volume24h / averageVolume7d;
    if (ratio >= 10)
      addSignal(signals, {
        id: "volume_spike",
        severity: "high",
        points: 15,
        metrics: { volumeToAverageRatio: rounded(ratio) },
      });
  }

  let fdvToMarketCapRatio: number | undefined;
  if (fdv && marketCap && marketCap > 0 && fdv > marketCap) {
    fdvToMarketCapRatio = fdv / marketCap;
    if (fdvToMarketCapRatio >= 8)
      addSignal(signals, {
        id: "fdv_marketcap_gap",
        severity: "high",
        points: 16,
        metrics: { fdvToMarketCapRatio: rounded(fdvToMarketCapRatio) },
      });
    else if (fdvToMarketCapRatio >= 3)
      addSignal(signals, {
        id: "fdv_marketcap_gap",
        severity: "medium",
        points: 8,
        metrics: { fdvToMarketCapRatio: rounded(fdvToMarketCapRatio) },
      });
  }
  if (
    safeInput.totalSupply &&
    safeInput.circulatingSupply &&
    safeInput.totalSupply > safeInput.circulatingSupply
  ) {
    const lockedOrUncirculating =
      ((safeInput.totalSupply - safeInput.circulatingSupply) / safeInput.totalSupply) * 100;
    if (lockedOrUncirculating >= 60)
      addSignal(signals, {
        id: "supply_overhang",
        severity: "medium",
        points: 8,
        metrics: { lockedOrUncirculating: rounded(lockedOrUncirculating) },
      });
  }

  if (safeInput.orderBookDepthDropPercent && safeInput.orderBookDepthDropPercent >= 60)
    addSignal(signals, {
      id: "orderbook_depth_collapse",
      severity: "high",
      points: 20,
      metrics: {
        orderBookDepthDropPercent: rounded(safeInput.orderBookDepthDropPercent),
      },
    });
  if (safeInput.simulatedSlippage10k && safeInput.simulatedSlippage10k >= 15)
    addSignal(signals, {
      id: "orderbook_slippage_risk",
      severity: safeInput.simulatedSlippage10k >= 35 ? "critical" : "high",
      points: safeInput.simulatedSlippage10k >= 35 ? 30 : 18,
      metrics: { simulatedSlippage10k: rounded(safeInput.simulatedSlippage10k) },
    });
  if (
    safeInput.bidAskImbalancePercent &&
    Math.abs(safeInput.bidAskImbalancePercent) >= 55
  )
    addSignal(signals, {
      id: "orderbook_imbalance",
      severity: "medium",
      points: 10,
      metrics: {
        bidAskImbalancePercent: rounded(safeInput.bidAskImbalancePercent),
      },
    });

  if (safeInput.top10HolderPercent && safeInput.top10HolderPercent >= 50)
    addSignal(signals, {
      id: "holder_concentration",
      severity: safeInput.top10HolderPercent >= 70 ? "critical" : "high",
      points: safeInput.top10HolderPercent >= 70 ? 24 : 15,
      metrics: { top10HolderPercent: rounded(safeInput.top10HolderPercent) },
    });
  if (safeInput.hadRebrandAfterCrash)
    addSignal(signals, {
      id: "rebrand_after_crash",
      severity: "medium",
      points: 10,
      metrics: { rebrandAfterCrash: true },
    });
  if (safeInput.abnormalExchangeDeposits)
    addSignal(signals, {
      id: "exchange_deposit_anomaly",
      severity: "high",
      points: 20,
      metrics: { exchangeDepositAnomaly: true },
    });
  if (safeInput.suspiciousContractPrivileges || safeInput.canPauseTrading)
    addSignal(signals, {
      id: "contract_privileges",
      severity: "critical",
      points: 25,
      metrics: { suspiciousContractPrivileges: true },
    });
  if (safeInput.isHoneypot)
    addSignal(signals, {
      id: "honeypot_risk",
      severity: "critical",
      points: 45,
      metrics: { isHoneypot: true },
    });
  if (safeInput.sellTaxPercentage !== undefined && safeInput.sellTaxPercentage >= 15)
    addSignal(signals, {
      id: "high_sell_tax",
      severity: safeInput.sellTaxPercentage >= 50 ? "critical" : "high",
      points: safeInput.sellTaxPercentage >= 50 ? 35 : 20,
      metrics: { sellTaxPercentage: rounded(safeInput.sellTaxPercentage) },
    });
  if (safeInput.canMintNewTokens)
    addSignal(signals, {
      id: "mint_risk",
      severity: "high",
      points: 18,
      metrics: { canMintNewTokens: true },
    });
  if (safeInput.canBlacklist)
    addSignal(signals, {
      id: "blacklist_risk",
      severity: "high",
      points: 18,
      metrics: { canBlacklist: true },
    });

  let buySellImbalancePercent: number | undefined;
  if (
    buys24h !== undefined &&
    sells24h !== undefined &&
    buys24h + sells24h > 0
  ) {
    buySellImbalancePercent =
      (Math.abs(buys24h - sells24h) / (buys24h + sells24h)) * 100;
    if (buySellImbalancePercent >= 70 && buys24h + sells24h >= 50)
      addSignal(signals, {
        id: "sell_pressure_imbalance",
        severity: "medium",
        points: 10,
        metrics: {
          buys24h,
          sells24h,
          buySellImbalancePercent: rounded(buySellImbalancePercent),
        },
      });
  }
  if (!currentPrice && !marketCap && !liquidityUsd && !volume24h)
    addSignal(signals, {
      id: "insufficient_data",
      severity: "medium",
      points: 8,
      metrics: { hasMarketData: false },
    });

  const score = Math.min(
    100,
    signals.reduce((sum, signal) => sum + signal.points, 0),
  );
  const confidence = computeDataConfidence(input, signals.length, dataQuality);
  const scoreBreakdown = buildScoreBreakdown(signals, confidence);
  const agentAssessments = buildAgentAssessments(signals, input, confidence);
  const level = levelFromScore(score);
  const metaModel = buildMetaModel(safeInput.symbol, score, level, confidence, agentAssessments, signals);

  return {
    token: {
      marketId: safeInput.marketId,
      symbol: safeInput.symbol,
      name: safeInput.name,
      image: safeInput.image,
      rank: safeInput.rank,
      chainId: safeInput.chainId,
      tokenAddress: safeInput.tokenAddress,
      pairAddress: safeInput.pairAddress,
      dexId: safeInput.dexId,
      url: safeInput.url,
    },
    score,
    scoreFormula: "multi_agent_fusion_v2_weighted_signal_matrix",
    confidence,
    scoreBreakdown,
    agentAssessments,
    metaModel,
    level,
    badge: badgeFromLevel(level),
    signals,
    metrics: {
      currentPrice,
      athPrice,
      drawdownPercent:
        drawdownPercent !== undefined ? rounded(drawdownPercent) : undefined,
      marketCap,
      fdv,
      fdvToMarketCapRatio:
        fdvToMarketCapRatio !== undefined
          ? rounded(fdvToMarketCapRatio)
          : undefined,
      liquidityUsd,
      liquidityToMarketCapPercent:
        liquidityToMarketCapPercent !== undefined
          ? rounded(liquidityToMarketCapPercent, 4)
          : undefined,
      volume24h,
      volumeToLiquidityRatio:
        volumeToLiquidityRatio !== undefined
          ? rounded(volumeToLiquidityRatio)
          : undefined,
      volumeToMarketCapRatio:
        volumeToMarketCapRatio !== undefined
          ? rounded(volumeToMarketCapRatio)
          : undefined,
      priceChange1h,
      priceChange6h,
      priceChange24h,
      priceChange7d,
      priceChange14d,
      priceChange30d,
      buySellImbalancePercent:
        buySellImbalancePercent !== undefined
          ? rounded(buySellImbalancePercent)
          : undefined,
      top10HolderPercent: finiteNumber(safeInput.top10HolderPercent),
      holderCount: finiteNumber(safeInput.holderCount),
      buyTaxPercentage: finiteNumber(safeInput.buyTaxPercentage),
      sellTaxPercentage: finiteNumber(safeInput.sellTaxPercentage),
      simulatedSlippage10k: finiteNumber(safeInput.simulatedSlippage10k),
      bidAskImbalancePercent: finiteNumber(safeInput.bidAskImbalancePercent),
      circulatingSupply: finiteNumber(safeInput.circulatingSupply),
      totalSupply: finiteNumber(safeInput.totalSupply),
      maxSupply: finiteNumber(safeInput.maxSupply),
    },
    dataQuality,
    chart: { sevenDay: safeInput.sparkline7d },
    aiSummary: metaModel.summary || buildAiSummary(safeInput.symbol, level, signals),
    dataSources: safeInput.dataSources ?? [],
    generatedAt: new Date().toISOString(),
  };
}
