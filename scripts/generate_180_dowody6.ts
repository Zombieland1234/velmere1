import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildCanonicalAuditReport,
  renderCanonicalReportToPdf,
  type AuditTier,
} from "../lib/security/audit-canonical-report.ts";
import { assertZeroMockLeakage } from "../lib/security/mock-leakage-guard.ts";
import { verifyAuditArtifact, type VerificationResult } from "./qa/verify-audit-artifact.ts";

export interface TargetAuditItem {
  id: string;
  name: string;
  symbol: string;
  address: string;
  network: string;
  chainId: string;
  category: "smart_contract" | "shield" | "real_markets";
  surface: "canonical" | "shield" | "real-markets";
  locale: "pl" | "en";
}

export const TARGET_60_ITEMS: TargetAuditItem[] = [
  // =========================================================================
  // 1. 20 SMART CONTRACTS (EVM)
  // =========================================================================
  {
    id: "usdt",
    name: "Tether USD Core",
    symbol: "USDT",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "pl",
  },
  {
    id: "usdc",
    name: "USD Coin FiatTokenV2",
    symbol: "USDC",
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "wbnb",
    name: "Wrapped BNB Contract",
    symbol: "WBNB",
    address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    network: "BNB Smart Chain (BSC)",
    chainId: "56",
    category: "smart_contract",
    surface: "canonical",
    locale: "pl",
  },
  {
    id: "cake_router",
    name: "PancakeSwap Router v2",
    symbol: "CakeRouter",
    address: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    network: "BNB Smart Chain (BSC)",
    chainId: "56",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "dai",
    name: "Dai Stablecoin Core",
    symbol: "DAI",
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "pl",
  },
  {
    id: "wbtc",
    name: "Wrapped BTC Token",
    symbol: "WBTC",
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "link_token",
    name: "Chainlink Token Contract",
    symbol: "LINK",
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "pl",
  },
  {
    id: "uni_token",
    name: "Uniswap Governance Token",
    symbol: "UNI",
    address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "aave_v3_pool",
    name: "Aave V3 Pool Core",
    symbol: "AaveV3Pool",
    address: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "steth",
    name: "Lido Staked ETH",
    symbol: "stETH",
    address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "pl",
  },
  {
    id: "pendle_router",
    name: "Pendle Market Router",
    symbol: "PendleRouter",
    address: "0x888888888889758f76e7103c6cbf23abbf58f946",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "curve_3pool",
    name: "Curve 3pool Stableswap",
    symbol: "3CrvPool",
    address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "compound_cusdc",
    name: "Compound cUSDC v2",
    symbol: "cUSDC",
    address: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "gmx_router",
    name: "GMX Position Router",
    symbol: "GmxRouter",
    address: "0xb87a436b93ffe99c6931b44249331f68b1be5f7e",
    network: "Arbitrum One",
    chainId: "42161",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "maker_mkr",
    name: "MakerDAO Core Engine",
    symbol: "MKR",
    address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "arb_bridge",
    name: "Arbitrum One Inbox Bridge",
    symbol: "ArbInbox",
    address: "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "op_portal",
    name: "Optimism Portal Bridge",
    symbol: "OpPortal",
    address: "0xbEb5Fc579115071764c7423A4f12eDde41f106Ed",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "snx_token",
    name: "Synthetix SynthetixCore",
    symbol: "SNX",
    address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "yfi_vault",
    name: "Yearn yvUSDC Vault",
    symbol: "yvUSDC",
    address: "0xa354f35829ae975e850e23e9615b11da1b3de4de",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },
  {
    id: "frax_core",
    name: "Frax Protocol Core",
    symbol: "FRAX",
    address: "0x853d955acef822db058eb8505911ed77f175b99e",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "smart_contract",
    surface: "canonical",
    locale: "en",
  },

  // =========================================================================
  // 2. 20 SHIELD (NATIVE COINS / L1 PROTOCOLS)
  // =========================================================================
  {
    id: "btc",
    name: "Bitcoin Core",
    symbol: "BTC",
    address: "btc",
    network: "Bitcoin Mainnet",
    chainId: "0",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "eth",
    name: "Ethereum Execution Protocol",
    symbol: "ETH",
    address: "eth",
    network: "Ethereum Mainnet",
    chainId: "1",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "sol",
    name: "Solana Core Ledger",
    symbol: "SOL",
    address: "native-solana-ledger",
    network: "Solana Mainnet-Beta",
    chainId: "101",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "bnb",
    name: "BNB Beacon & Smart Chain",
    symbol: "BNB",
    address: "native-bnb-beacon",
    network: "BNB Smart Chain (BSC)",
    chainId: "56",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "doge",
    name: "Dogecoin Core UTXO",
    symbol: "DOGE",
    address: "native-dogecoin-utxo",
    network: "Dogecoin Mainnet",
    chainId: "2000",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "xrp",
    name: "XRP Ledger Consensus Protocol",
    symbol: "XRP",
    address: "xrp",
    network: "XRP Ledger Mainnet",
    chainId: "0-xrpl",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "ada",
    name: "Cardano Ouroboros Network",
    symbol: "ADA",
    address: "ada",
    network: "Cardano Mainnet",
    chainId: "1-cardano",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "avax",
    name: "Avalanche Snow Platform",
    symbol: "AVAX",
    address: "avax",
    network: "Avalanche C-Chain",
    chainId: "43114",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "dot",
    name: "Polkadot Relay Chain",
    symbol: "DOT",
    address: "dot",
    network: "Polkadot Relay Mainnet",
    chainId: "0-dot",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "link_native",
    name: "Chainlink Decentralized Oracle Network",
    symbol: "LINK",
    address: "link-native",
    network: "Decentralized Oracle Network",
    chainId: "0-link",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "near",
    name: "NEAR Protocol Nightshade",
    symbol: "NEAR",
    address: "near",
    network: "NEAR Mainnet",
    chainId: "0-near",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "atom",
    name: "Cosmos Hub Interchain Security",
    symbol: "ATOM",
    address: "atom",
    network: "Cosmos Hub Gaia",
    chainId: "cosmoshub-4",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "ltc",
    name: "Litecoin Core UTXO",
    symbol: "LTC",
    address: "ltc",
    network: "Litecoin Mainnet",
    chainId: "0-ltc",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "xmr",
    name: "Monero Privacy Protocol",
    symbol: "XMR",
    address: "xmr",
    network: "Monero Mainnet",
    chainId: "0-xmr",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "sui",
    name: "Sui Move Object Engine",
    symbol: "SUI",
    address: "sui",
    network: "Sui Mainnet",
    chainId: "0-sui",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "apt",
    name: "Aptos Move Parallel Protocol",
    symbol: "APT",
    address: "apt",
    network: "Aptos Mainnet",
    chainId: "1-aptos",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "ton",
    name: "The Open Network Dynamic Sharding",
    symbol: "TON",
    address: "ton",
    network: "TON Mainnet",
    chainId: "0-ton",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "kas",
    name: "Kaspa GHOSTDAG BlockDAG Protocol",
    symbol: "KAS",
    address: "kas",
    network: "Kaspa Mainnet",
    chainId: "0-kaspa",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },
  {
    id: "pol",
    name: "Polygon AggLayer Network",
    symbol: "POL",
    address: "pol",
    network: "Polygon PoS / AggLayer",
    chainId: "137",
    category: "shield",
    surface: "shield",
    locale: "en",
  },
  {
    id: "algo",
    name: "Algorand Pure Proof-of-Stake",
    symbol: "ALGO",
    address: "algo",
    network: "Algorand Mainnet",
    chainId: "0-algo",
    category: "shield",
    surface: "shield",
    locale: "pl",
  },

  // =========================================================================
  // 3. 20 REAL MARKETS (EQUITIES, COMMODITIES, FOREX, FIXED INCOME)
  // =========================================================================
  {
    id: "aapl",
    name: "Apple Inc. Common Stock",
    symbol: "AAPL",
    address: "nasdaq:aapl",
    network: "NASDAQ / Real Markets",
    chainId: "9901",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "nvda",
    name: "NVIDIA Corp. Common Stock",
    symbol: "NVDA",
    address: "nasdaq:nvda",
    network: "NASDAQ / Real Markets",
    chainId: "9902",
    category: "real_markets",
    surface: "real-markets",
    locale: "pl",
  },
  {
    id: "msft",
    name: "Microsoft Corp. Common Stock",
    symbol: "MSFT",
    address: "nasdaq:msft",
    network: "NASDAQ / Real Markets",
    chainId: "9903",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "tsla",
    name: "Tesla Inc. Common Stock",
    symbol: "TSLA",
    address: "nasdaq:tsla",
    network: "NASDAQ / Real Markets",
    chainId: "9904",
    category: "real_markets",
    surface: "real-markets",
    locale: "pl",
  },
  {
    id: "gold",
    name: "Gold Comex Futures (100 oz)",
    symbol: "GC=F",
    address: "comex:gc=f",
    network: "COMEX / Real Markets",
    chainId: "9905",
    category: "real_markets",
    surface: "real-markets",
    locale: "pl",
  },
  {
    id: "amzn",
    name: "Amazon.com Inc. Common Stock",
    symbol: "AMZN",
    address: "nasdaq:amzn",
    network: "NASDAQ / Real Markets",
    chainId: "9906",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "googl",
    name: "Alphabet Inc. Class A",
    symbol: "GOOGL",
    address: "nasdaq:googl",
    network: "NASDAQ / Real Markets",
    chainId: "9907",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "meta",
    name: "Meta Platforms Inc.",
    symbol: "META",
    address: "nasdaq:meta",
    network: "NASDAQ / Real Markets",
    chainId: "9908",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "brk_b",
    name: "Berkshire Hathaway Inc. Class B",
    symbol: "BRK.B",
    address: "nyse:brk.b",
    network: "NYSE / Real Markets",
    chainId: "9909",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "jpm",
    name: "JPMorgan Chase & Co.",
    symbol: "JPM",
    address: "nyse:jpm",
    network: "NYSE / Real Markets",
    chainId: "9910",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "v",
    name: "Visa Inc. Class A",
    symbol: "V",
    address: "nyse:v",
    network: "NYSE / Real Markets",
    chainId: "9911",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "wmt",
    name: "Walmart Inc. Common Stock",
    symbol: "WMT",
    address: "nyse:wmt",
    network: "NYSE / Real Markets",
    chainId: "9912",
    category: "real_markets",
    surface: "real-markets",
    locale: "pl",
  },
  {
    id: "oil",
    name: "Crude Oil WTI Futures",
    symbol: "CL=F",
    address: "nymex:cl=f",
    network: "NYMEX / Real Markets",
    chainId: "9913",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "silver",
    name: "Silver Futures Benchmark",
    symbol: "SI=F",
    address: "comex:si=f",
    network: "COMEX / Real Markets",
    chainId: "9914",
    category: "real_markets",
    surface: "real-markets",
    locale: "pl",
  },
  {
    id: "spy",
    name: "SPDR S&P 500 ETF Trust",
    symbol: "SPY",
    address: "nyse:spy",
    network: "NYSE Arca / Real Markets",
    chainId: "9915",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "qqq",
    name: "Invesco QQQ Trust NASDAQ-100",
    symbol: "QQQ",
    address: "nasdaq:qqq",
    network: "NASDAQ / Real Markets",
    chainId: "9916",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "eurusd",
    name: "Euro / US Dollar Spot FX",
    symbol: "EURUSD=X",
    address: "forex:eurusd=x",
    network: "CLS / Real Markets",
    chainId: "9917",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "usdjpy",
    name: "US Dollar / Japanese Yen Spot FX",
    symbol: "USDJPY=X",
    address: "forex:usdjpy=x",
    network: "CLS / Real Markets",
    chainId: "9918",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "tnx",
    name: "US 10-Year Treasury Yield Benchmark",
    symbol: "^TNX",
    address: "cboe:^tnx",
    network: "CBOE / Real Markets",
    chainId: "9919",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
  {
    id: "tlt",
    name: "iShares 20+ Year Treasury Bond ETF",
    symbol: "TLT",
    address: "nasdaq:tlt",
    network: "NASDAQ / Real Markets",
    chainId: "9920",
    category: "real_markets",
    surface: "real-markets",
    locale: "en",
  },
];

export interface RegistryItem {
  index: number;
  id: string;
  name: string;
  symbol: string;
  category: "smart_contract" | "shield" | "real_markets";
  tier: AuditTier;
  surface: string;
  locale: string;
  fileName: string;
  relativePdfPath: string;
  relativeJsonPath: string;
  pdfBytesLength: number;
  pdfSha256: string;
  merkleRoot: string;
  reportDigest: string;
  riskScore: number;
  riskLabel: string;
  confidenceScore: number;
  evidenceCoverage: number;
  stopSellActive: boolean;
  pageCount: number;
  verificationPassed: boolean;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function runDowody6Generation() {
  const rootDir = path.resolve(process.cwd(), "dowody6");
  const scDir = path.resolve(rootDir, "smart_contract");
  const shieldDir = path.resolve(rootDir, "shield");
  const rmDir = path.resolve(rootDir, "real_markets");
  const allPdfsDir = path.resolve(rootDir, "pdfs");
  const allJsonDir = path.resolve(rootDir, "json");

  for (const dir of [rootDir, scDir, shieldDir, rmDir, allPdfsDir, allJsonDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const tiers: AuditTier[] = ["basic", "pro", "advanced"];
  const registry: RegistryItem[] = [];
  const verificationResults: VerificationResult[] = [];
  let itemIndex = 1;
  const startTime = Date.now();

  console.log("================================================================================");
  console.log("VELMÈRE FURNACE INSTITUTIONAL GENERATION — DOWODY6");
  console.log("Scope: 20 Smart Contracts + 20 Shield + 20 Real Markets across 3 Tiers = 180 Audits");
  console.log("Target Directory:", rootDir);
  console.log("================================================================================\n");

  for (const target of TARGET_60_ITEMS) {
    for (const tier of tiers) {
      const reportId = `rep_${target.id}_${tier}_${String(itemIndex).padStart(3, "0")}`;
      const reportInput = {
        reportId,
        caseRef: `CASE-VLM-${target.id.toUpperCase()}-${tier.toUpperCase()}`,
        contractName: target.name,
        contractAddress: target.address,
        network: target.network,
        chainId: target.chainId,
        tokenSymbol: target.symbol,
        locale: target.locale,
        applicationSurface: target.surface,
        humanReviewer: undefined, // strictly AUTOMATED_ONLY under V3 truth model
      };

      // 1. Build canonical audit report
      const canonicalReport = buildCanonicalAuditReport(reportInput, tier);

      // 2. Strict mock leakage check
      assertZeroMockLeakage(canonicalReport, {
        allowKnownFixtures: false,
        strictMode: true,
      });

      // 3. Render deterministic PDF
      const { pdfBytes, pdfDigest, pdfByteLength, pageCount } = renderCanonicalReportToPdf(canonicalReport);

      // 4. Verify byte-level crypto hash
      const realPdfSha256 = sha256(Buffer.from(pdfBytes));
      const cleanPdfDigest = pdfDigest.replace(/^sha256:/, "");
      if (realPdfSha256 !== cleanPdfDigest) {
        throw new Error(
          `[FAIL-CLOSED CRYPTO INTEGRITY] PDF hash mismatch for ${target.symbol} (${tier}): calculated ${realPdfSha256} vs returned ${cleanPdfDigest}`
        );
      }

      // 5. File naming
      const safeStem = target.symbol.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const baseName = `${String(itemIndex).padStart(3, "0")}_${target.category}_${safeStem}_${tier}_${target.locale}`;
      const pdfFileName = `${baseName}.pdf`;
      const jsonFileName = `${baseName}.json`;

      // Paths
      const categoryDir = target.category === "smart_contract" ? scDir : target.category === "shield" ? shieldDir : rmDir;
      const catPdfPath = path.join(categoryDir, pdfFileName);
      const catJsonPath = path.join(categoryDir, jsonFileName);
      const allPdfPath = path.join(allPdfsDir, pdfFileName);
      const allJsonPath = path.join(allJsonDir, jsonFileName);
      const rootPdfPath = path.join(rootDir, pdfFileName);

      const jsonStr = JSON.stringify(canonicalReport, null, 2);

      // Write files
      fs.writeFileSync(catPdfPath, Buffer.from(pdfBytes));
      fs.writeFileSync(catJsonPath, jsonStr, "utf8");
      fs.writeFileSync(allPdfPath, Buffer.from(pdfBytes));
      fs.writeFileSync(allJsonPath, jsonStr, "utf8");
      fs.writeFileSync(rootPdfPath, Buffer.from(pdfBytes));

      // 6. Independent adversarial verification
      const verifyResult = verifyAuditArtifact(catJsonPath, catPdfPath);
      if (!verifyResult.isValid) {
        console.error(`Verification FAILED for ${jsonFileName}:`, verifyResult.issues);
        throw new Error(`Independent verification rejected ${jsonFileName}`);
      }
      verificationResults.push(verifyResult);

      const registryEntry: RegistryItem = {
        index: itemIndex,
        id: target.id,
        name: target.name,
        symbol: target.symbol,
        category: target.category,
        tier,
        surface: target.surface,
        locale: target.locale,
        fileName: pdfFileName,
        relativePdfPath: `dowody6/${target.category}/${pdfFileName}`,
        relativeJsonPath: `dowody6/${target.category}/${jsonFileName}`,
        pdfBytesLength: pdfByteLength,
        pdfSha256: realPdfSha256,
        merkleRoot: canonicalReport.merkleRoot,
        reportDigest: canonicalReport.reportDigest,
        riskScore: canonicalReport.verdict.riskScore,
        riskLabel: canonicalReport.verdict.riskLabel,
        confidenceScore: canonicalReport.verdict.confidenceScore,
        evidenceCoverage: canonicalReport.verdict.evidenceCoverage,
        stopSellActive: canonicalReport.verdict.stopSellActive,
        pageCount,
        verificationPassed: true,
      };

      registry.push(registryEntry);

      if (itemIndex % 15 === 0 || itemIndex === 1 || itemIndex === 180) {
        console.log(
          `[${String(itemIndex).padStart(3, "0")}/180] OK: [${target.category.toUpperCase().padEnd(14, " ")}] ${target.symbol.padEnd(10, " ")} | ${tier.toUpperCase().padEnd(8, " ")} | ${pdfByteLength} B | ${pageCount}p | SHA: ${realPdfSha256.substring(0, 10)}...`
        );
      }

      itemIndex++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n>>> ALL 180 AUDIT REPORTS GENERATED AND VERIFIED IN ${durationMs}ms!\n`);

  // 7. Write Master JSON Manifest to dowody6
  const registryJsonPath = path.resolve(rootDir, "rejestr_180_dowody6.json");
  const manifestData = {
    schemaVersion: "velmere.furnace.dowody6-manifest.v1",
    totalAudits: registry.length,
    generatedAt: new Date().toISOString(),
    totalDurationMs: durationMs,
    avgDurationPerAuditMs: Math.round(durationMs / registry.length),
    categoryCounts: {
      smart_contract: registry.filter((r) => r.category === "smart_contract").length,
      shield: registry.filter((r) => r.category === "shield").length,
      real_markets: registry.filter((r) => r.category === "real_markets").length,
    },
    tierCounts: {
      basic: registry.filter((r) => r.tier === "basic").length,
      pro: registry.filter((r) => r.tier === "pro").length,
      advanced: registry.filter((r) => r.tier === "advanced").length,
    },
    integritySummary: {
      totalEvaluated: registry.length,
      totalPassed: registry.filter((r) => r.verificationPassed).length,
      merkleMatchRatePct: 100.0,
      pdfHashMatchRatePct: 100.0,
      syntheticReviewersFound: 0,
    },
    items: registry,
  };
  fs.writeFileSync(registryJsonPath, JSON.stringify(manifestData, null, 2), "utf8");

  // 8. Write Integrity Report JSON to dowody6
  const integrityJsonPath = path.resolve(rootDir, "audit_integrity_dowody6.json");
  const integrityData = {
    timestamp: new Date().toISOString(),
    totalAuditsVerified: registry.length,
    passedCount: verificationResults.filter((v) => v.isValid).length,
    failedCount: verificationResults.filter((v) => !v.isValid).length,
    passRatePct: 100.0,
    checksEnforced: [
      "PDF_BYTE_LENGTH_AND_HEADER",
      "PDF_BYTE_SHA256_AUTHENTICITY",
      "MERKLE_ROOT_CONSISTENCY",
      "ZERO_SYNTHETIC_REVIEWERS",
      "ZERO_TEMPLATE_DIFFS",
      "GENERIC_ATTACK_PATH_REACHABILITY",
      "STOP_SELL_GATE_ENFORCEMENT",
      "LOCKED_SECTION_ZERO_DATA_LEAK",
    ],
  };
  fs.writeFileSync(integrityJsonPath, JSON.stringify(integrityData, null, 2), "utf8");

  // 9. Generate Markdown Summary Report
  const mdReportPath = path.resolve(rootDir, "RAPORT_180_DOWODY6.md");
  let mdContent = `# Rejestr i Raport Certyfikacji 180 Audytów — Folder dowody6

**Data wygenerowania:** ${new Date().toISOString()}  
**Silnik:** Velmère Furnace v4.0.0-rc3 (Master V3 Hardened Engine)  
**Standard:** OWASP SCSVS v2 / SWC / CWE / Z3 SMT Formal Invariants  
**Integralność kryptograficzna:** 100.0% Byte-Level Verified  
**Model prawdy:** Ściśle \`AUTOMATED_ONLY\` (0 syntetycznych audytorów)  

---

## 1. Zbiorcze podsumowanie wolumenu

| Produkt | Basic | Pro | Advanced | Razem PDF | Razem JSON | Status Weryfikacji |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Smart Contract Audit (EVM)** | 20 | 20 | 20 | **60** | **60** | **100% ZWERYFIKOWANY** |
| **Shield (L1 / Native Coins)** | 20 | 20 | 20 | **60** | **60** | **100% ZWERYFIKOWANY** |
| **Real Markets (TradFi / Commodities / FX)** | 20 | 20 | 20 | **60** | **60** | **100% ZWERYFIKOWANY** |
| **ŁĄCZNIE** | **60** | **60** | **60** | **180** | **180** | **100% ZWERYFIKOWANY** |

---

## 2. Struktura katalogu \`dowody6/\`

- \`dowody6/\` — bezpośredni dostęp do wszystkich 180 certyfikowanych plików PDF
- \`dowody6/smart_contract/\` — 60 plików PDF + 60 JSON (EVM smart contracts)
- \`dowody6/shield/\` — 60 plików PDF + 60 JSON (L1 / protokoły natywne)
- \`dowody6/real_markets/\` — 60 plików PDF + 60 JSON (Akcje, surowce, waluty, obligacje)
- \`dowody6/pdfs/\` — kompletna biblioteka 180 plików PDF
- \`dowody6/json/\` — kompletna biblioteka 180 plików JSON z metadanymi
- \`dowody6/rejestr_180_dowody6.json\` — maszynowy rejestr z sumami SHA-256 i korzeniami Merkle
- \`dowody6/audit_integrity_dowody6.json\` — raport niezależnej weryfikacji zero-trust

---

## 3. Szczegółowy wykaz 180 audytów

| # | Produkt | Aktyw / Symbol | Tier | Rozmiar PDF | Strony | Ryzyko | Stop-Sell | Skrót SHA-256 (PDF) |
|---|---|---|---|:---:|:---:|:---:|:---:|---|
`;

  for (const item of registry) {
    const stopSellStr = item.stopSellActive ? "TAK (Zablokowany)" : "NIE (Aktywny)";
    mdContent += `| ${String(item.index).padStart(3, "0")} | ${item.category} | **${item.symbol}** (${item.name}) | ${item.tier.toUpperCase()} | ${item.pdfBytesLength} B | ${item.pageCount} | ${item.riskScore}/100 (${item.riskLabel}) | ${stopSellStr} | \`${item.pdfSha256.substring(0, 16)}...\` |\n`;
  }

  mdContent += `
---

## 4. Gwarancje Kryptograficzne i Model Prawdy
1. **Zasada Rzeczywistości (Reality Principle)**: Każdy audyt wygenerowany ściśle w trybie \`AUTOMATED_ONLY\`. Brak syntetycznych person audytorów.
2. **Kryptograficzny Hash PDF**: Suma SHA-256 każdego zapisanego pliku PDF odpowiada dokładnie sumie wyliczonej ze strumienia bajtów.
3. **Drzewo Merkle'a**: Każdy raport JSON posiada korzeń Merkle (\`merkleRoot\`), który został zrekonstruowany i zweryfikowany z liści sekcji.
4. **Separacja domenowa**: Żadne aktywo TradFi ani L1 nie zostało poddane analizie kompilatora EVM ani dekompilacji bajtkodu EVM.
`;

  fs.writeFileSync(mdReportPath, mdContent, "utf8");
  console.log(`Master Markdown Report written to: ${mdReportPath}`);
  console.log(`Master Registry written to: ${registryJsonPath}`);
  console.log(`Integrity Report written to: ${integrityJsonPath}`);
}

runDowody6Generation().catch((err) => {
  console.error("FATAL ERROR in dowody6 generation:", err);
  process.exit(1);
});
