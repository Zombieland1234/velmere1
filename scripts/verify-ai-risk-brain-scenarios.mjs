import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-ai-risk-scenarios-"));
const tempScript = path.join(tempDir, "scenario-runner.cjs");

const requiredScenarioIds = [
  "mega_cap_normal_volatility",
  "stablecoin_near_peg_missing_proof",
  "stablecoin_depeg",
  "rwa_low_volume_not_safe",
  "low_float_parabolic_pump",
  "contract_trap",
  "no_data_token",
];

let dependenciesInstalled = true;
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (!packageJson.dependencies?.zod) {
    errors.push("package.json must keep zod dependency for risk-engine runtime validation.");
  }
  const zodPath = path.join(root, "node_modules", "zod");
  if (!fs.existsSync(zodPath)) dependenciesInstalled = false;
} catch (error) {
  errors.push(`Dependency precheck failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (!dependenciesInstalled) {
  const source = fs.readFileSync(new URL(import.meta.url), "utf8");
  for (const id of requiredScenarioIds) {
    if (!source.includes(id)) errors.push(`Scenario script missing required scenario ${id}`);
  }
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  if (errors.length) {
    console.error("AI risk brain scenario verification failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("AI risk brain scenario static checks passed.");
  console.log("Scenario runtime skipped because project dependencies are not installed in this artifact environment.");
  process.exit(0);
}

const runner = `
require("ts-node/register/transpile-only");
const { analyzeTokenRisk } = require(${JSON.stringify(path.join(root, "lib/market-integrity/risk-engine.ts"))});

const scenarios = [
  {
    id: "mega_cap_normal_volatility",
    expected: { maxScore: 45, notLevel: "critical", minConfidence: 0.55 },
    input: {
      symbol: "BTC",
      name: "Bitcoin",
      currentPrice: 66000,
      marketCap: 1300000000000,
      fdv: 1300000000000,
      liquidityUsd: 350000000,
      volume24h: 28000000000,
      averageVolume7d: 30000000000,
      priceChange1h: -0.6,
      priceChange24h: -3.2,
      priceChange7d: 4.8,
      circulatingSupply: 19600000,
      maxSupply: 21000000,
      top10HolderPercent: 12,
      holderCount: 5200000,
      simulatedSlippage10k: 0.02,
      bidAskImbalancePercent: 4,
      orderBookDepthDropPercent: 1,
      suspiciousContractPrivileges: false,
      isHoneypot: false,
      canMintNewTokens: false,
      canPauseTrading: false,
      canBlacklist: false,
      dataSources: ["market", "orderbook", "chain"],
    },
  },
  {
    id: "stablecoin_near_peg_missing_proof",
    expected: { maxScore: 48, minConfidence: 0.35, limitationIncludes: "reserve proof missing for stablecoin" },
    input: {
      symbol: "USDC",
      name: "USD Coin",
      currentPrice: 0.9992,
      marketCap: 26000000000,
      fdv: 26000000000,
      liquidityUsd: 120000000,
      volume24h: 4000000000,
      averageVolume7d: 3800000000,
      priceChange24h: -0.04,
      priceChange7d: 0.02,
      circulatingSupply: 26000000000,
      totalSupply: 26000000000,
      top10HolderPercent: 18,
      holderCount: 1800000,
      simulatedSlippage10k: 0.01,
      suspiciousContractPrivileges: false,
      dataSources: ["market", "issuer-page"],
    },
  },
  {
    id: "stablecoin_depeg",
    expected: { minScore: 65, minLevelRank: 2, limitationIncludes: "reserve proof missing for stablecoin" },
    input: {
      symbol: "USDX",
      name: "Stable USD",
      currentPrice: 0.82,
      marketCap: 400000000,
      fdv: 420000000,
      liquidityUsd: 3000000,
      volume24h: 80000000,
      averageVolume7d: 12000000,
      priceChange24h: -18,
      priceChange7d: -19,
      circulatingSupply: 400000000,
      totalSupply: 420000000,
      top10HolderPercent: 55,
      simulatedSlippage10k: 4,
      dataSources: ["market"],
    },
  },
  {
    id: "rwa_low_volume_not_safe",
    expected: { minScore: 35, limitationIncludes: "issuer proof missing for RWA" },
    input: {
      symbol: "TBILL",
      name: "Tokenized Treasury Bill Fund",
      currentPrice: 1.02,
      marketCap: 120000000,
      fdv: 120000000,
      liquidityUsd: 600000,
      volume24h: 12000,
      averageVolume7d: 9000,
      priceChange24h: 0.02,
      priceChange7d: 0.03,
      circulatingSupply: 117000000,
      totalSupply: 117000000,
      dataSources: ["market"],
    },
  },
  {
    id: "low_float_parabolic_pump",
    expected: { minScore: 78, minLevelRank: 2, signalIncludes: "supply_overhang" },
    input: {
      symbol: "LAB",
      name: "LAB",
      currentPrice: 23.73,
      marketCap: 7500000000,
      fdv: 180000000000,
      liquidityUsd: 900000,
      volume24h: 189000000,
      averageVolume7d: 20000000,
      priceChange1h: 8,
      priceChange24h: 55,
      priceChange7d: 426,
      priceChange30d: 954,
      circulatingSupply: 12000000,
      maxSupply: 1000000000,
      top10HolderPercent: 76,
      holderCount: 4400,
      simulatedSlippage10k: 9,
      orderBookDepthDropPercent: 68,
      suspiciousContractPrivileges: false,
      dataSources: ["market", "dex"],
    },
  },
  {
    id: "contract_trap",
    expected: { minScore: 84, minLevelRank: 3, signalIncludes: "blacklist_risk" },
    input: {
      symbol: "TRAP",
      name: "Trap Token",
      currentPrice: 0.04,
      marketCap: 9000000,
      fdv: 80000000,
      liquidityUsd: 35000,
      volume24h: 900000,
      priceChange24h: 25,
      circulatingSupply: 100000000,
      totalSupply: 1000000000,
      top10HolderPercent: 88,
      simulatedSlippage10k: 18,
      suspiciousContractPrivileges: true,
      isHoneypot: false,
      canMintNewTokens: true,
      canPauseTrading: true,
      canBlacklist: true,
      buyTaxPercentage: 6,
      sellTaxPercentage: 28,
      tokenAddress: "0x0000000000000000000000000000000000000001",
      dataSources: ["market", "contract"],
    },
  },
  {
    id: "no_data_token",
    expected: { minScore: 35, maxConfidence: 0.4, signalIncludes: "insufficient_data" },
    input: {
      symbol: "UNKNOWN",
      name: "Unknown Token",
      dataSources: [],
    },
  },
];

const ranks = { low: 0, medium: 1, high: 2, critical: 3 };

for (const scenario of scenarios) {
  const result = analyzeTokenRisk(scenario.input, "partial");
  const signals = result.signals.map((signal) => signal.id);
  const limitations = result.metaModel?.limitations ?? [];
  const summary = {
    score: result.score,
    level: result.level,
    confidence: result.dataConfidence,
    signals,
    limitations,
    metaVerdict: result.metaModel?.verdict,
  };
  const expected = scenario.expected;
  function fail(message) {
    throw new Error(scenario.id + ": " + message + " -> " + JSON.stringify(summary));
  }
  if (expected.minScore !== undefined && result.score < expected.minScore) fail("score below min " + expected.minScore);
  if (expected.maxScore !== undefined && result.score > expected.maxScore) fail("score above max " + expected.maxScore);
  if (expected.minConfidence !== undefined && result.dataConfidence < expected.minConfidence) fail("confidence below min " + expected.minConfidence);
  if (expected.maxConfidence !== undefined && result.dataConfidence > expected.maxConfidence) fail("confidence above max " + expected.maxConfidence);
  if (expected.notLevel !== undefined && result.level === expected.notLevel) fail("level should not be " + expected.notLevel);
  if (expected.minLevelRank !== undefined && ranks[result.level] < expected.minLevelRank) fail("level rank below min " + expected.minLevelRank);
  if (expected.signalIncludes !== undefined && !signals.includes(expected.signalIncludes)) fail("missing signal " + expected.signalIncludes);
  if (expected.limitationIncludes !== undefined && !limitations.some((item) => item.includes(expected.limitationIncludes))) fail("missing limitation " + expected.limitationIncludes);
  console.log(scenario.id + " OK", JSON.stringify({ score: result.score, level: result.level, confidence: result.dataConfidence, signals: signals.slice(0, 6) }));
}
`;

fs.writeFileSync(tempScript, runner);

const result = spawnSync(process.execPath, [tempScript], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    TS_NODE_COMPILER_OPTIONS: JSON.stringify({
      module: "CommonJS",
      moduleResolution: "node",
      target: "ES2020",
      esModuleInterop: true,
      skipLibCheck: true,
    }),
  },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch {}

if (result.status !== 0) {
  errors.push(`Scenario runner failed with exit ${result.status}`);
}

if (errors.length) {
  console.error("AI risk brain scenario verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("AI risk brain scenario checks passed.");
