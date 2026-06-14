export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskSignalId =
  | "extreme_drawdown"
  | "major_drawdown"
  | "severe_24h_drop"
  | "high_24h_drop"
  | "rapid_intraday_move"
  | "parabolic_24h_gain"
  | "parabolic_7d_gain"
  | "parabolic_30d_gain"
  | "multi_timeframe_pump"
  | "new_ath_repricing"
  | "thin_liquidity"
  | "very_thin_liquidity"
  | "volume_spike"
  | "wash_trading_risk"
  | "holder_concentration"
  | "orderbook_depth_collapse"
  | "orderbook_slippage_risk"
  | "orderbook_imbalance"
  | "rebrand_after_crash"
  | "exchange_deposit_anomaly"
  | "contract_privileges"
  | "honeypot_risk"
  | "high_sell_tax"
  | "mint_risk"
  | "blacklist_risk"
  | "sell_pressure_imbalance"
  | "low_dex_liquidity"
  | "market_volume_stress"
  | "fdv_marketcap_gap"
  | "supply_overhang"
  | "insufficient_data";

export type TokenRiskInput = {
  marketId?: string;
  symbol: string;
  name: string;
  image?: string;
  rank?: number;
  chainId?: string;
  tokenAddress?: string;
  pairAddress?: string;
  dexId?: string;
  url?: string;
  currentPrice?: number;
  athPrice?: number;
  marketCap?: number;
  fdv?: number;
  liquidityUsd?: number;
  volume24h?: number;
  averageVolume7d?: number;
  priceChange1h?: number;
  priceChange6h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  priceChange14d?: number;
  priceChange30d?: number;
  buys24h?: number;
  sells24h?: number;
  top10HolderPercent?: number;
  holderCount?: number;
  hadRebrandAfterCrash?: boolean;
  abnormalExchangeDeposits?: boolean;
  suspiciousContractPrivileges?: boolean;
  orderBookDepthDropPercent?: number;
  simulatedSlippage10k?: number;
  bidAskImbalancePercent?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  buyTaxPercentage?: number;
  sellTaxPercentage?: number;
  isHoneypot?: boolean;
  canMintNewTokens?: boolean;
  canPauseTrading?: boolean;
  canBlacklist?: boolean;
  sparkline7d?: number[];
  dataSources?: string[];
};


export type RiskAgentId =
  | "velocity"
  | "liquidity"
  | "microstructure"
  | "holders"
  | "contract"
  | "data";

export type RiskAgentScore = {
  id: RiskAgentId;
  label: string;
  score: number;
  weight: number;
  confidence: number;
  evidenceCount: number;
};

export type RiskAgentAssessment = RiskAgentScore & {
  status: RiskLevel;
  verdict: "clear" | "watch" | "warning" | "critical" | "insufficient_data";
  evidenceSignalIds: RiskSignalId[];
  reasoning: string;
  nextAction: string;
};

export type RiskMetaModel = {
  version: string;
  verdict: "clear" | "watch" | "warning" | "critical" | "insufficient_data";
  dominantAgent?: RiskAgentId;
  dataFusionScore: number;
  conflictLevel: "none" | "low" | "medium" | "high";
  requiredReview: boolean;
  summary: string;
  escalation: string;
  limitations: string[];
};

export type TokenRiskSignal = {
  id: RiskSignalId;
  severity: RiskLevel;
  points: number;
  metrics?: Record<string, number | string | boolean | null>;
};

export type TokenRiskResult = {
  token: {
    marketId?: string;
    symbol: string;
    name: string;
    image?: string;
    rank?: number;
    chainId?: string;
    tokenAddress?: string;
    pairAddress?: string;
    dexId?: string;
    url?: string;
  };
  score: number;
  scoreFormula?: string;
  confidence?: number;
  scoreBreakdown?: RiskAgentScore[];
  agentAssessments?: RiskAgentAssessment[];
  metaModel?: RiskMetaModel;
  level: RiskLevel;
  badge: "low_detected_risk" | "elevated_risk" | "possible_manipulation_risk" | "critical_market_integrity_risk";
  signals: TokenRiskSignal[];
  metrics: {
    currentPrice?: number;
    athPrice?: number;
    drawdownPercent?: number;
    marketCap?: number;
    fdv?: number;
    fdvToMarketCapRatio?: number;
    liquidityUsd?: number;
    liquidityToMarketCapPercent?: number;
    volume24h?: number;
    volumeToLiquidityRatio?: number;
    volumeToMarketCapRatio?: number;
    priceChange1h?: number;
    priceChange6h?: number;
    priceChange24h?: number;
    priceChange7d?: number;
    priceChange14d?: number;
    priceChange30d?: number;
    buySellImbalancePercent?: number;
    top10HolderPercent?: number;
    holderCount?: number;
    buyTaxPercentage?: number;
    sellTaxPercentage?: number;
    simulatedSlippage10k?: number;
    bidAskImbalancePercent?: number;
    circulatingSupply?: number;
    totalSupply?: number;
    maxSupply?: number;
  };
  dataQuality: "demo" | "partial" | "live";
  chart?: { sevenDay?: number[] };
  aiSummary?: string;
  dataSources: string[];
  generatedAt: string;
};
