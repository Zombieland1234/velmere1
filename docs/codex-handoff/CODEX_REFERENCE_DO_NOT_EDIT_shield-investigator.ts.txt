import type { TokenRiskResult, RiskSignalId } from "./risk-types";
import { lossPreventionPlaybook } from "./loss-prevention-playbook";

export type InvestigatorEvidenceStatus = "confirmed" | "likely" | "unverified" | "red_flag" | "unknown";

export type InvestigatorRiskLaneId =
  | "supply"
  | "unlock"
  | "liquidity"
  | "insider"
  | "social"
  | "contract";

export type InvestigatorRiskLane = {
  id: InvestigatorRiskLaneId;
  label: string;
  score: number;
  status: InvestigatorEvidenceStatus;
  headline: string;
  body: string;
  nextStep: string;
};

export type InvestigatorEvidenceRow = {
  label: string;
  status: InvestigatorEvidenceStatus;
  value: string;
  body: string;
};

export type InvestigatorCaseFrame = {
  caseId: string;
  asset: string;
  sourceState: string;
  primaryConcern: string;
  missingData: string[];
  operatorMode: "monitor" | "review" | "escalate" | "block_verdict";
};

export type InvestigatorNextAction = {
  id: string;
  label: string;
  priority: "low" | "medium" | "high" | "critical";
  body: string;
  command: string;
};

export type InvestigatorAnswerStep = {
  label: string;
  body: string;
};

export type InvestigatorBehavioralTrap = {
  label: string;
  trigger: string;
  risk: string;
  counterMove: string;
};

export type InvestigatorLossPrevention = {
  thesis: string;
  caseStudy: string;
  caseLesson: string;
  behavioralTrap: InvestigatorBehavioralTrap;
  stableRiskReminder: string;
  whyThisMatters: string;
};

export type InvestigatorProtocol = {
  title: string;
  subtitle: string;
  caseFrame: InvestigatorCaseFrame;
  answerContract: InvestigatorAnswerStep[];
  nextActions: InvestigatorNextAction[];
  lossPrevention: InvestigatorLossPrevention;
  quickVerdict: string;
  finalVerdict:
    | "Likely organic growth"
    | "Mixed: growth may include engineered pressure"
    | "High manipulation risk"
    | "Insufficient transparency — treat as high risk until proven otherwise";
  overallRisk: number;
  confidence: "Low" | "Medium" | "High";
  confidenceScore: number;
  redFlags: string[];
  lanes: InvestigatorRiskLane[];
  evidence: InvestigatorEvidenceRow[];
  webRequired: boolean;
  webQueries: string[];
  systemPrompt: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function n(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function compact(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "unknown";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function pct(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "unknown";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
}

function ratioPercent(part?: number, total?: number) {
  if (!part || !total || part <= 0 || total <= 0) return undefined;
  return (part / total) * 100;
}

function hasSignal(result: TokenRiskResult, ids: RiskSignalId[]) {
  return result.signals.some((signal) => ids.includes(signal.id));
}

function evidenceStatus(score: number, missing: boolean): InvestigatorEvidenceStatus {
  if (missing) return "red_flag";
  if (score >= 78) return "red_flag";
  if (score >= 58) return "likely";
  return "confirmed";
}

function confidenceLevel(score: number): InvestigatorProtocol["confidence"] {
  if (score >= 72) return "High";
  if (score >= 48) return "Medium";
  return "Low";
}

export function buildVlmShieldInvestigator(result: TokenRiskResult): InvestigatorProtocol {
  const token = result.token;
  const symbol = token.symbol || "TOKEN";
  const totalSupply = result.metrics.totalSupply ?? result.metrics.maxSupply;
  const circulatingSupply = result.metrics.circulatingSupply;
  const circulatingPercent = ratioPercent(circulatingSupply, totalSupply);
  const fdv = n(result.metrics.fdv);
  const marketCap = n(result.metrics.marketCap);
  const fdvRatio = result.metrics.fdvToMarketCapRatio ?? (marketCap > 0 && fdv > 0 ? fdv / marketCap : undefined);
  const liquidity = n(result.metrics.liquidityUsd);
  const liquidityCoverage = result.metrics.liquidityToMarketCapPercent ?? (marketCap > 0 && liquidity > 0 ? (liquidity / marketCap) * 100 : undefined);
  const holderTop10 = result.metrics.top10HolderPercent;
  const volumeToLiquidity = result.metrics.volumeToLiquidityRatio;
  const volumeToMarketCap = result.metrics.volumeToMarketCapRatio;
  const pump24 = n(result.metrics.priceChange24h);
  const pump7 = n(result.metrics.priceChange7d);
  const contractSignal = hasSignal(result, ["contract_privileges", "honeypot_risk", "high_sell_tax", "mint_risk", "blacklist_risk"]);
  const lowFloat = circulatingPercent !== undefined && circulatingPercent < 18;
  const missingSupply = circulatingPercent === undefined && (fdv > 0 || marketCap > 0);
  const missingVesting = true;

  const supplyRisk = clamp(
    (lowFloat ? 42 : 0) +
      (missingSupply ? 26 : 0) +
      (fdvRatio && fdvRatio > 8 ? 28 : fdvRatio && fdvRatio > 3 ? 18 : 0) +
      (hasSignal(result, ["fdv_marketcap_gap", "supply_overhang"]) ? 24 : 0),
  );

  const unlockRisk = clamp(
    (missingVesting ? 38 : 0) +
      (hasSignal(result, ["supply_overhang", "fdv_marketcap_gap"]) ? 30 : 0) +
      (fdvRatio && fdvRatio > 6 ? 24 : fdvRatio && fdvRatio > 2.5 ? 14 : 0) +
      (lowFloat ? 12 : 0),
  );

  const liquidityRisk = clamp(
    (liquidityCoverage === undefined ? 20 : liquidityCoverage < 0.8 ? 42 : liquidityCoverage < 2 ? 30 : liquidityCoverage < 5 ? 18 : 4) +
      (volumeToLiquidity && volumeToLiquidity > 25 ? 34 : volumeToLiquidity && volumeToLiquidity > 8 ? 20 : 0) +
      (result.metrics.simulatedSlippage10k && result.metrics.simulatedSlippage10k > 4 ? 18 : 0) +
      (hasSignal(result, ["thin_liquidity", "very_thin_liquidity", "low_dex_liquidity", "orderbook_slippage_risk", "orderbook_depth_collapse"]) ? 25 : 0),
  );

  const insiderRisk = clamp(
    (holderTop10 === undefined ? 24 : holderTop10 > 65 ? 44 : holderTop10 > 45 ? 30 : holderTop10 > 30 ? 15 : 4) +
      (hasSignal(result, ["holder_concentration", "exchange_deposit_anomaly"]) ? 28 : 0) +
      (lowFloat ? 10 : 0),
  );

  const socialManipulationRisk = clamp(
    (pump24 > 40 ? 32 : pump24 > 18 ? 20 : 0) +
      (pump7 > 120 ? 30 : pump7 > 55 ? 18 : 0) +
      (volumeToMarketCap && volumeToMarketCap > 1.2 ? 22 : volumeToMarketCap && volumeToMarketCap > 0.45 ? 12 : 0) +
      (hasSignal(result, ["parabolic_24h_gain", "parabolic_7d_gain", "multi_timeframe_pump", "volume_spike", "wash_trading_risk"]) ? 30 : 0),
  );

  const contractRisk = clamp(
    (contractSignal ? 56 : 10) +
      (result.dataQuality !== "live" ? 16 : 0) +
      (token.tokenAddress ? 0 : 10),
  );

  const lanes: InvestigatorRiskLane[] = [
    {
      id: "supply",
      label: "Supply / float",
      score: supplyRisk,
      status: evidenceStatus(supplyRisk, missingSupply),
      headline: lowFloat ? "LOW FLOAT RISK" : missingSupply ? "Supply transparency incomplete" : "Supply data usable",
      body: circulatingPercent === undefined
        ? `Circulating float is not fully confirmed. FDV ${compact(fdv)} vs market cap ${compact(marketCap)} stays as an uncertainty penalty.`
        : `${circulatingPercent.toFixed(2)}% of total/max supply appears circulating. Low float makes price easier to move with less capital.`,
      nextStep: "Verify supply from explorer, token contract and independent market-data source.",
    },
    {
      id: "unlock",
      label: "Vesting / unlocks",
      score: unlockRisk,
      status: "red_flag",
      headline: "Unlock transparency must be proven",
      body: "No local source confirms team, investor, advisor, OTC or hidden whale unlocks. Missing vesting transparency is treated as risk, not safety.",
      nextStep: `Search: ${symbol} token unlock schedule, vesting, OTC allocation, cliff extension.`,
    },
    {
      id: "liquidity",
      label: "Liquidity / exits",
      score: liquidityRisk,
      status: evidenceStatus(liquidityRisk, liquidityCoverage === undefined),
      headline: liquidityCoverage !== undefined ? `${liquidityCoverage.toFixed(2)}% liquidity coverage` : "Liquidity depth incomplete",
      body: `Visible liquidity ${compact(liquidity)}. Volume/liquidity ${volumeToLiquidity ? volumeToLiquidity.toFixed(2) : "unknown"}. Exit depth must be checked before trusting the move.`,
      nextStep: "Compare DEX pool depth, CEX orderbook, slippage simulation and volume quality.",
    },
    {
      id: "insider",
      label: "Whales / insiders",
      score: insiderRisk,
      status: evidenceStatus(insiderRisk, holderTop10 === undefined),
      headline: holderTop10 !== undefined ? `Top 10 holders proxy ${holderTop10.toFixed(1)}%` : "Holder concentration missing",
      body: "Unknown wallets, team wallets and CEX custody must be separated before calling distribution healthy.",
      nextStep: "Cluster holders into team, CEX, LP, treasury, whales, retail and unknown.",
    },
    {
      id: "social",
      label: "Social / KOL hype",
      score: socialManipulationRisk,
      status: socialManipulationRisk >= 62 ? "red_flag" : socialManipulationRisk >= 35 ? "likely" : "unknown",
      headline: pump24 > 18 || pump7 > 55 ? "Pump requires OSINT review" : "No strong pump signal locally",
      body: `24h ${pct(result.metrics.priceChange24h)}, 7d ${pct(result.metrics.priceChange7d)}. Check KOL disclosures, sponsored threads and coordinated hype before trusting sentiment.`,
      nextStep: `Search X/news/forums for ${symbol} shill, paid KOL, controversy, manipulation, buyback, short squeeze.`,
    },
    {
      id: "contract",
      label: "Contract / governance",
      score: contractRisk,
      status: contractSignal ? "red_flag" : token.tokenAddress ? "likely" : "unknown",
      headline: contractSignal ? "Contract privilege signal present" : "Contract risk not fully cleared",
      body: "Audit, owner privileges, upgradeability, mint, blacklist, taxes and pause functions need direct explorer verification.",
      nextStep: "Verify contract source, owner, proxy/admin, tax settings, mint authority and audit status.",
    },
  ];

  const overallRisk = clamp(
    supplyRisk * 0.16 +
      unlockRisk * 0.18 +
      liquidityRisk * 0.20 +
      insiderRisk * 0.17 +
      socialManipulationRisk * 0.15 +
      contractRisk * 0.14,
  );

  const missingPenalty = [missingSupply, missingVesting, holderTop10 === undefined, liquidityCoverage === undefined, token.tokenAddress === undefined].filter(Boolean).length * 8;
  const confidenceScore = clamp(n(result.confidence, 0.42) * 100 - missingPenalty + (result.dataQuality === "live" ? 12 : result.dataQuality === "partial" ? 2 : -10));
  const redFlags = lanes
    .filter((lane) => lane.status === "red_flag" || lane.score >= 70)
    .map((lane) => `${lane.label}: ${lane.headline}`)
    .slice(0, 8);

  const finalVerdict: InvestigatorProtocol["finalVerdict"] =
    confidenceScore < 38 || redFlags.length >= 4
      ? "Insufficient transparency — treat as high risk until proven otherwise"
      : overallRisk >= 72
        ? "High manipulation risk"
        : overallRisk >= 45
          ? "Mixed: growth may include engineered pressure"
          : "Likely organic growth";

  const quickVerdict = `${symbol}: ${finalVerdict}. Overall VLM Shield Investigator risk ${overallRisk}/100, confidence ${confidenceLevel(confidenceScore)}.`;

  const webQueries = [
    `${symbol} token circulating supply total supply FDV market cap`,
    `${symbol} token unlock schedule vesting team investors advisors OTC`,
    `${symbol} buyback short squeeze market maker volume spike`,
    `${symbol} KOL paid promotion shill controversy scam allegations`,
    token.tokenAddress ? `${token.tokenAddress} contract audit owner mint blacklist tax honeypot` : `${symbol} contract audit owner mint blacklist tax honeypot`,
  ];

  const evidence: InvestigatorEvidenceRow[] = [
    {
      label: "Float",
      status: missingSupply ? "red_flag" : lowFloat ? "red_flag" : "confirmed",
      value: circulatingPercent === undefined ? "unknown" : `${circulatingPercent.toFixed(2)}%`,
      body: "Compare circulating supply to total/max supply. Low float can make aggressive price moves easier.",
    },
    {
      label: "FDV gap",
      status: fdvRatio === undefined ? "unknown" : fdvRatio > 3 ? "red_flag" : "confirmed",
      value: fdvRatio === undefined ? "unknown" : `${fdvRatio.toFixed(2)}x`,
      body: "Large FDV/market-cap gaps can indicate future supply overhang and unlock pressure.",
    },
    {
      label: "Vesting",
      status: "red_flag",
      value: "needs web OSINT",
      body: "No local cache proves team/investor/advisor unlock schedule. Missing unlock data increases risk.",
    },
    {
      label: "Liquidity",
      status: liquidityCoverage === undefined ? "unknown" : liquidityRisk > 60 ? "red_flag" : "likely",
      value: liquidityCoverage === undefined ? "unknown" : `${liquidityCoverage.toFixed(2)}%`,
      body: "Coverage and slippage determine whether holders can exit without severe price impact.",
    },
    {
      label: "KOL / social",
      status: socialManipulationRisk > 55 ? "likely" : "unknown",
      value: `${socialManipulationRisk}/100`,
      body: "Requires current search across X, forums and articles. Treat undisclosed promotions as KOL disclosure risk.",
    },
    {
      label: "Contract",
      status: contractSignal ? "red_flag" : "unknown",
      value: token.tokenAddress ? "address present" : "missing address",
      body: "Contract privileges must be verified directly from explorer/audit sources.",
    },
  ];

  const missingData = [
    missingSupply ? "circulating / total supply confirmation" : null,
    missingVesting ? "team / investor / advisor unlock schedule" : null,
    holderTop10 === undefined ? "holder concentration and wallet clustering" : null,
    liquidityCoverage === undefined ? "exit liquidity and slippage depth" : null,
    token.tokenAddress ? null : "contract address / explorer verification",
  ].filter((item): item is string => Boolean(item));

  const primaryConcern = lanes.slice().sort((a, b) => b.score - a.score)[0]?.label ?? "source uncertainty";
  const operatorMode: InvestigatorCaseFrame["operatorMode"] =
    finalVerdict === "Insufficient transparency — treat as high risk until proven otherwise"
      ? "block_verdict"
      : overallRisk >= 72
        ? "escalate"
        : overallRisk >= 45
          ? "review"
          : "monitor";

  const caseFrame: InvestigatorCaseFrame = {
    caseId: `${symbol.toLowerCase()}-${String(result.generatedAt ?? Date.now()).slice(0, 10)}`,
    asset: `${token.name ?? symbol} (${symbol})`,
    sourceState: result.dataQuality,
    primaryConcern,
    missingData,
    operatorMode,
  };

  const nextActions: InvestigatorNextAction[] = [
    {
      id: "verify-supply",
      label: "Verify supply",
      priority: missingSupply || lowFloat ? "high" : "medium",
      body: "Confirm circulating, total and max supply against explorer and at least one market-data source.",
      command: `Search ${symbol} circulating supply total supply FDV market cap explorer`,
    },
    {
      id: "inspect-unlocks",
      label: "Inspect unlocks",
      priority: "critical",
      body: "Find team, investor, advisor, ecosystem, OTC and whale unlock schedules before trusting any pump.",
      command: `Search ${symbol} unlock schedule vesting team investors OTC cliff`,
    },
    {
      id: "check-liquidity",
      label: "Check liquidity",
      priority: liquidityRisk >= 65 ? "high" : "medium",
      body: "Compare DEX depth, CEX order book, spread and slippage so the move is not just thin liquidity.",
      command: `Review ${symbol} DEX liquidity CEX orderbook slippage volume quality`,
    },
    {
      id: "review-kol",
      label: "Review KOL/social",
      priority: socialManipulationRisk >= 55 ? "high" : "medium",
      body: "Search for paid promotions, undisclosed allocations, coordinated hype and controversy.",
      command: `Search ${symbol} KOL paid promotion shill controversy manipulation allegations`,
    },
    {
      id: "audit-contract",
      label: "Audit contract",
      priority: contractRisk >= 60 ? "high" : "medium",
      body: "Verify owner, proxy, mint, blacklist, pause, taxes and audit status from explorer/audit sources.",
      command: token.tokenAddress ? `Inspect ${token.tokenAddress} contract owner proxy mint blacklist tax audit` : `Find ${symbol} contract address and audit`,
    },
  ].sort((a, b) => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    return rank[b.priority] - rank[a.priority];
  });

  const behavioralTrap =
    socialManipulationRisk >= 55 || pump24 > 18 || pump7 > 55
      ? lossPreventionPlaybook.behavioralTraps[0]
      : overallRisk >= 60
        ? lossPreventionPlaybook.behavioralTraps[2]
        : lossPreventionPlaybook.behavioralTraps[1];
  const caseStudy =
    lowFloat || unlockRisk >= 60
      ? lossPreventionPlaybook.caseStudies[1]
      : socialManipulationRisk >= 55
        ? lossPreventionPlaybook.caseStudies[2]
        : lossPreventionPlaybook.caseStudies[0];
  const stableHabit = lossPreventionPlaybook.riskHabits[0];

  const lossPrevention: InvestigatorLossPrevention = {
    thesis: lossPreventionPlaybook.thesis,
    caseStudy: caseStudy.title,
    caseLesson: caseStudy.lesson,
    behavioralTrap: {
      label: behavioralTrap.label,
      trigger: behavioralTrap.trigger,
      risk: behavioralTrap.risk,
      counterMove: behavioralTrap.counterMove,
    },
    stableRiskReminder: stableHabit.body,
    whyThisMatters:
      "Most catastrophic crypto losses happen when a user mistakes momentum for proof. Shield slows the decision down, exposes missing data and forces the thesis to survive supply, unlock, liquidity, social and contract checks.",
  };

  const answerContract: InvestigatorAnswerStep[] = [
    { label: "Quick verdict", body: quickVerdict },
    { label: "Key red flags", body: redFlags.length ? redFlags.slice(0, 3).join(" · ") : "No hard local red flag, but final verdict still needs live OSINT." },
    { label: "Evidence status", body: evidence.map((item) => `${item.label}: ${item.status}`).join(" · ") },
    { label: "Missing data", body: missingData.length ? missingData.join(" · ") : "No core missing-data blocker in local model." },
    { label: "Psychology trap", body: `${behavioralTrap.label}: ${behavioralTrap.risk}` },
    { label: "Loss-prevention note", body: lossPrevention.whyThisMatters },
    { label: "Next action", body: nextActions[0]?.command ?? `Run full OSINT for ${symbol}.` },
  ];

  const systemPrompt = `You are VLM Shield Investigator, an OSINT-style crypto risk analyst and loss-prevention assistant. You must use current web sources for token-specific analysis. Do not hype. Do not call something a scam or manipulation unless evidence supports it. Classify every major claim as Confirmed, Likely, Unverified, Red Flag, or Unknown. Analyze supply/float, vesting/unlocks, buybacks/short squeeze, liquidity, KOL/social hype, contract/governance and evidence quality. Missing transparency is a red flag, not neutral. Token: ${symbol}. Case mode: ${operatorMode}. Primary concern: ${primaryConcern}. Missing data: ${missingData.join(", ") || "none in local model"}. Required web searches: ${webQueries.join(" | ")}. Explain why the checks matter for preventing avoidable losses. Explain the behavioral trap when users chase parabolic tokens. Prefer risk control, position limits, stable compounding and evidence over lottery thinking. Do not give buy/sell instructions. Return concise sections: Quick Verdict, Key Red Flags, Supply/Float, Vesting/Unlocks, Liquidity/Market Structure, Social/KOL Risk, Contract/Governance Risk, Psychology Trap, VLM Shield Score, Final Verdict and one next action.`;

  return {
    title: "VLM Shield Investigator",
    subtitle: "OSINT-style on-chain risk protocol · web-search required for final token verdict",
    caseFrame,
    answerContract,
    nextActions,
    lossPrevention,
    quickVerdict,
    finalVerdict,
    overallRisk,
    confidence: confidenceLevel(confidenceScore),
    confidenceScore,
    redFlags: redFlags.length ? redFlags : ["No hard red flag confirmed locally — still require live web OSINT before final verdict."],
    lanes,
    evidence,
    webRequired: true,
    webQueries,
    systemPrompt,
  };
}
