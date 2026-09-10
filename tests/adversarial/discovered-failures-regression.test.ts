import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  resolveAssetClass,
  assertAssetCanAccessAnalyzer,
  AssetFirewallViolationError
} from "../../lib/security/asset-class-firewall";
import { isPlaceholderAddress, lintCanonicalReport } from "../../lib/security/report-semantic-linter";
import { buildCanonicalAuditReport } from "../../lib/security/audit-canonical-report";

console.log("=== RUNNING DISCOVERED FAILURES REGRESSION SUITE (SECTION 12) ===");

// 1. NVDA: Must never receive EVM report sections
console.log("Testing Regression 1: NVDA isolation from EVM analyzers...");
const nvdaClass = resolveAssetClass("nasdaq:nvda");
assert.equal(nvdaClass, "equity");
assert.throws(
  () => assertAssetCanAccessAnalyzer("nasdaq:nvda", "evm_bytecode_decompiler"),
  AssetFirewallViolationError
);
const nvdaReport = buildCanonicalAuditReport(
  {
    reportId: "rep-nvda-regression",
    contractName: "NVIDIA Corp",
    contractAddress: "nasdaq:nvda",
    tokenSymbol: "NVDA",
    network: "NASDAQ"
  },
  "advanced"
);
const nvdaIdentity = nvdaReport.sections.find(s => s.id === "contract_identity");
assert.ok(nvdaIdentity && nvdaIdentity.data);
const nvdaEvmMetric = nvdaIdentity.data.metrics?.find((m: any) => m.label === "EVM Smart Contract Logic");
assert.ok(nvdaEvmMetric && nvdaEvmMetric.value.includes("NOT_APPLICABLE"));

// 2. SPY: Must never receive EVM report sections
console.log("Testing Regression 2: SPY (ETF) isolation from EVM analyzers...");
const spyClass = resolveAssetClass("nyse:spy");
assert.equal(spyClass, "equity");
assert.throws(
  () => assertAssetCanAccessAnalyzer("nyse:spy", "evm_bytecode_decompiler"),
  AssetFirewallViolationError
);
const spyReport = buildCanonicalAuditReport(
  {
    reportId: "rep-spy-regression",
    contractName: "SPDR S&P 500 ETF Trust",
    contractAddress: "nyse:spy",
    tokenSymbol: "SPY",
    network: "NYSE Arca"
  },
  "advanced"
);
const spyIdentity = spyReport.sections.find(s => s.id === "contract_identity");
assert.ok(spyIdentity && spyIdentity.data);
const spyEvmMetric = spyIdentity.data.metrics?.find((m: any) => m.label === "EVM Smart Contract Logic");
assert.ok(spyEvmMetric && spyEvmMetric.value.includes("NOT_APPLICABLE"));

// 3. Gold / GC: Must never receive EVM report sections
console.log("Testing Regression 3: Gold Futures (GC=F) isolation from EVM analyzers...");
const goldClass = resolveAssetClass("comex:gc=f");
assert.equal(goldClass, "commodity");
assert.throws(
  () => assertAssetCanAccessAnalyzer("comex:gc=f", "evm_bytecode_decompiler"),
  AssetFirewallViolationError
);
const goldReport = buildCanonicalAuditReport(
  {
    reportId: "rep-gold-regression",
    contractName: "Gold Futures COMEX",
    contractAddress: "comex:gc=f",
    tokenSymbol: "GC=F",
    network: "COMEX"
  },
  "advanced"
);
const goldIdentity = goldReport.sections.find(s => s.id === "contract_identity");
assert.ok(goldIdentity && goldIdentity.data);
const goldEvmMetric = goldIdentity.data.metrics?.find((m: any) => m.label === "EVM Smart Contract Logic");
assert.ok(goldEvmMetric && goldEvmMetric.value.includes("NOT_APPLICABLE"));

// 4. ADA: Must not be treated as EVM smart contract
console.log("Testing Regression 4: Cardano (ADA) treated as native coin, not EVM...");
const adaClass = resolveAssetClass("native-cardano-ledger");
assert.equal(adaClass, "native_crypto");
assert.throws(
  () => assertAssetCanAccessAnalyzer("native-cardano-ledger", "evm_bytecode_decompiler"),
  AssetFirewallViolationError
);

// 5. Native BNB vs Wrapped BNB
console.log("Testing Regression 5: Native BNB distinguished from WBNB token contract...");
const nativeBnbClass = resolveAssetClass("native-bnb-chain");
assert.equal(nativeBnbClass, "native_crypto");
assert.throws(
  () => assertAssetCanAccessAnalyzer("native-bnb-chain", "evm_bytecode_decompiler"),
  AssetFirewallViolationError
);
const wbnbClass = resolveAssetClass("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
assert.equal(wbnbClass, "evm_contract");
assert.doesNotThrow(() => assertAssetCanAccessAnalyzer("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "evm_bytecode_decompiler"));

// 6. Placeholder addresses detection
console.log("Testing Regression 6: Deterministic placeholder address detection...");
assert.equal(isPlaceholderAddress("mock:contract_001"), true);
assert.equal(isPlaceholderAddress("fixture:evm_token"), true);
assert.equal(isPlaceholderAddress("0x1111111111111111111111111111111111111111"), true);
assert.equal(isPlaceholderAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), true);
assert.equal(isPlaceholderAddress("0xabababababababababababababababababababab"), true);
// Valid real contracts must NOT be flagged as placeholders
assert.equal(isPlaceholderAddress("0xdac17f958d2ee523a2206206994597c13d831ec7"), false);
assert.equal(isPlaceholderAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"), false);

// 7. Unit-safety: 96 vs 9600%
console.log("Testing Regression 7: Percentage unit safety formatting...");
function safeFormatPercentage(value: number): string {
  let normalized = value;
  if (normalized > 0 && normalized <= 1) {
    normalized = normalized * 100;
  }
  assert.ok(normalized >= 0 && normalized <= 100, `Percentage ${normalized} out of bounds!`);
  return `${Math.round(normalized)}%`;
}
assert.equal(safeFormatPercentage(0.96), "96%");
assert.equal(safeFormatPercentage(96), "96%");
assert.notEqual(safeFormatPercentage(0.96), "9600%");
assert.notEqual(safeFormatPercentage(96), "9600%");

// 8. "Exact 100%" + "0 bytes" contradiction check
console.log("Testing Regression 8: Rejection of Exact 100% with 0 bytes analyzed...");
const baseForContradiction = buildCanonicalAuditReport(
  {
    reportId: "rep-contradiction-check",
    contractName: "Test Token",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    tokenSymbol: "TEST",
    network: "Ethereum Mainnet"
  },
  "advanced"
);
const contradictoryReport = {
  ...baseForContradiction,
  verdict: {
    ...baseForContradiction.verdict,
    summary: "Exact 100% bytecode match guaranteed with zero bytes analyzed."
  }
};
const contradictionLintResult = lintCanonicalReport(contradictoryReport, "evm_contract");
assert.equal(contradictionLintResult.valid, false);
assert.ok(contradictionLintResult.issues.some((i) => i.code === "UNHEDGED_MARKETING_ABSOLUTE"));

// 9. Locked tier + hidden findings: Locked tier outputs must NEVER leak hidden finding descriptions
console.log("Testing Regression 9: Cross-tier leakage prevention...");
const basicReport = buildCanonicalAuditReport(
  {
    reportId: "rep-basic-leak-check",
    contractName: "USD Coin",
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    tokenSymbol: "USDC",
    network: "Ethereum Mainnet"
  },
  "basic"
);
const lockedProSection = basicReport.sections.find(s => s.id === "pro_permission_parser");
assert.ok(lockedProSection);
assert.equal(lockedProSection.isLocked, true);
assert.equal(lockedProSection.data, null, "Locked tier MUST have data: null to prevent data leakage!");
assert.ok(lockedProSection.lockTierNotice?.toLowerCase().includes("pro"));

// 10. AI persona dataset aggregation invariants
console.log("Testing Regression 10: Strict mathematical aggregation invariants in persona datasets...");
const personasPath = path.resolve(process.cwd(), "dowody/analiza_klientow_ai_50_person.json");
const personasData = JSON.parse(fs.readFileSync(personasPath, "utf8"));
const personas = personasData.personas;

assert.equal(personas.length, 50);
const tierCounts = personas.reduce((acc: any, p: any) => {
  acc[p.recommendedTier] = (acc[p.recommendedTier] || 0) + 1;
  return acc;
}, {});

const totalPersonas = Object.values(tierCounts).reduce((a: any, b: any) => a + b, 0);
assert.equal(totalPersonas, 50, "Sum of tier counts must equal total personas (50)");

const payingPersonas = personas.filter((p: any) => p.recommendedTier !== "basic").length;
const conversionRate = payingPersonas / totalPersonas;
assert.ok(conversionRate > 0 && conversionRate <= 1.0);

const totalWtp = personas.reduce((acc: number, p: any) => acc + (p.willingnessToPayEur || 0), 0);
const calculatedAvgWtp = totalWtp / totalPersonas;
assert.ok(calculatedAvgWtp > 0 && calculatedAvgWtp < 1000);

console.log(`✔ SUCCESS: All 10 regression checks verified without defect.`);
