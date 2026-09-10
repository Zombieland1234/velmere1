import { analyzeTokenRisk } from "../lib/market-integrity/risk-engine";

const coins = [
  { symbol: "BTC", name: "Bitcoin", price: 65400, cap: 1300000000000, vol: 28000000000, liq: 450000000, ch24: -1.2, top10: 11, priv: false, sources: ["binance", "coinbase", "kraken", "chain"] },
  { symbol: "ETH", name: "Ethereum", price: 3450, cap: 415000000000, vol: 15000000000, liq: 320000000, ch24: 2.1, top10: 22, priv: false, sources: ["binance", "coinbase", "kraken", "chain"] },
  { symbol: "SOL", name: "Solana", price: 142, cap: 66000000000, vol: 3800000000, liq: 95000000, ch24: 6.8, top10: 31, priv: false, sources: ["binance", "coinbase", "chain"] },
  { symbol: "BNB", name: "BNB", price: 580, cap: 88000000000, vol: 1100000000, liq: 85000000, ch24: 0.4, top10: 45, priv: false, sources: ["binance", "chain"] },
  { symbol: "XRP", name: "XRP", price: 0.58, cap: 32000000000, vol: 950000000, liq: 60000000, ch24: -0.8, top10: 52, priv: false, sources: ["binance", "kraken"] },
  { symbol: "ADA", name: "Cardano", price: 0.36, cap: 13000000000, vol: 280000000, liq: 35000000, ch24: -2.4, top10: 28, priv: false, sources: ["binance", "coingecko"] },
  { symbol: "DOGE", name: "Dogecoin", price: 0.105, cap: 15300000000, vol: 620000000, liq: 42000000, ch24: 4.1, top10: 43, priv: false, sources: ["binance", "coinbase"] },
  { symbol: "AVAX", name: "Avalanche", price: 24.5, cap: 9800000000, vol: 310000000, liq: 28000000, ch24: 1.8, top10: 34, priv: false, sources: ["binance", "coingecko"] },
  { symbol: "DOT", name: "Polkadot", price: 4.25, cap: 6100000000, vol: 140000000, liq: 19000000, ch24: -3.1, top10: 30, priv: false, sources: ["binance"] },
  { symbol: "LINK", name: "Chainlink", price: 11.2, cap: 6800000000, vol: 210000000, liq: 25000000, ch24: 0.9, top10: 26, priv: false, sources: ["binance", "coinbase", "chain"] }
];

console.log("=== ANALIZA RYZYKA 10 MONET (VELMERE SHIELD & RISK ENGINE) ===");
const coinRiskMap: Record<string, ReturnType<typeof analyzeTokenRisk>> = {};

for (const c of coins) {
  const res = analyzeTokenRisk({
    symbol: c.symbol,
    name: c.name,
    currentPrice: c.price,
    marketCap: c.cap,
    liquidityUsd: c.liq,
    volume24h: c.vol,
    priceChange24h: c.ch24,
    top10HolderPercent: c.top10,
    suspiciousContractPrivileges: c.priv,
    dataSources: c.sources
  }, "complete");
  coinRiskMap[c.symbol] = res;
  const confPercent = Math.round(res.confidence * 100);
  console.log(`[${c.symbol.padEnd(4)}] Score: ${res.score.toFixed(1)}/100 | Level: ${res.level.padEnd(8)} | Conf: ${confPercent}% | Precision: ${res.uncertainty.precision.padEnd(6)} | Badge: ${res.badge}`);
}

const clientProfiles = [
  { name: "Ultra-Conservative Treasury AI", minConf: 60, maxRisk: 24, allowedTiers: ["pro", "advanced"] },
  { name: "Tier-1 Multi-Strategy Fund AI", minConf: 50, maxRisk: 30, allowedTiers: ["pro", "advanced"] },
  { name: "Arbitrage & Spread Sentinel AI", minConf: 45, maxRisk: 35, allowedTiers: ["basic", "pro", "advanced"] },
  { name: "Momentum Scalper AI", minConf: 40, maxRisk: 50, allowedTiers: ["basic", "pro"] },
  { name: "Pool Rebalancer Sentinel AI", minConf: 42, maxRisk: 40, allowedTiers: ["basic", "pro", "advanced"] }
];

console.log("\n=== SYMULACJA 50 KLIENTOW AI W SHIELD / SHIELD PRO ===");
let approvedCount = 0;
let rejectedRiskCount = 0;
let escalatedMissingProofCount = 0;

for (let i = 1; i <= 50; i++) {
  const profile = clientProfiles[(i - 1) % clientProfiles.length];
  const assignedCoin = coins[(i - 1) % coins.length];
  const assignedTier = profile.allowedTiers[(i - 1) % profile.allowedTiers.length];
  const riskRes = coinRiskMap[assignedCoin.symbol];
  const confPct = Math.round(riskRes.confidence * 100);

  let decision = "APPROVED_BY_SHIELD";
  let reason = "";

  if (confPct < profile.minConf) {
    decision = "ESCALATED_MISSING_PROOF";
    reason = `Pewnosc (${confPct}%) < wymagana (${profile.minConf}%)`;
    escalatedMissingProofCount++;
  } else if (riskRes.score > profile.maxRisk) {
    decision = "REJECTED_HIGH_RISK";
    reason = `Score (${riskRes.score.toFixed(1)}) > max dopuszczalny (${profile.maxRisk})`;
    rejectedRiskCount++;
  } else {
    reason = `Zgodnosc z modelem Shield dla tieru [${assignedTier.toUpperCase()}]`;
    approvedCount++;
  }

  const clientId = `AI_CLIENT_${String(i).padStart(3, "0")}`;
  console.log(`${clientId} | ${profile.name.padEnd(34)} | ${assignedCoin.symbol.padEnd(4)} [${assignedTier.toUpperCase().padEnd(8)}] -> ${decision.padEnd(23)} | ${reason}`);
}

console.log("\n======================================================");
console.log(`PODSUMOWANIE 50 AGENTOW AI:`);
console.log(`  APPROVED (Shield zaakceptowal):             ${approvedCount} / 50`);
console.log(`  REJECTED (Shield zablokowal z powodu ryzyka): ${rejectedRiskCount} / 50`);
console.log(`  ESCALATED/MISSING_PROOF (Brak dowodow/danych): ${escalatedMissingProofCount} / 50`);
console.log("======================================================\n");
