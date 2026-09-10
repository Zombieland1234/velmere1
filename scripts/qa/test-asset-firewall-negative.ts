import {
  assertAssetCanAccessAnalyzer,
  AssetFirewallViolationError,
  resolveAssetClass,
  isAnalyzerPermitted,
} from "../../lib/security/asset-class-firewall";
import { buildCanonicalAuditReport } from "../../lib/security/audit-canonical-report";
import { BENCHMARK_30_CONTRACTS } from "../../lib/security/contract-audit-profiles";

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/* -------------------------------------------------------------------------- */
/* 1. NEGATIVE PATH TESTS: ASSET-CLASS HARD REJECTION                         */
/* -------------------------------------------------------------------------- */

test("Equity asset strictly blocked from executing EVM bytecode decompiler", () => {
  let caught = false;
  try {
    assertAssetCanAccessAnalyzer("equity", "evm_bytecode_decompiler");
  } catch (err) {
    caught = true;
    assert(err instanceof AssetFirewallViolationError, "Must throw AssetFirewallViolationError");
    assert((err as AssetFirewallViolationError).assetClass === "equity", "Asset class must be equity");
    assert((err as AssetFirewallViolationError).attemptedAnalyzer === "evm_bytecode_decompiler", "Attempted analyzer must match");
  }
  assert(caught, "Firewall MUST throw on equity -> EVM analyzer");
  assert(!isAnalyzerPermitted("equity", "evm_bytecode_decompiler"), "isAnalyzerPermitted must be false");
});

test("Forex (FX) asset strictly blocked from executing Solidity AST analyzer", () => {
  let caught = false;
  try {
    assertAssetCanAccessAnalyzer("fx", "solidity_ast_analyzer");
  } catch (err) {
    caught = true;
    assert(err instanceof AssetFirewallViolationError, "Must throw AssetFirewallViolationError");
    assert((err as AssetFirewallViolationError).assetClass === "fx", "Asset class must be fx");
  }
  assert(caught, "Firewall MUST throw on fx -> Solidity analyzer");
  assert(!isAnalyzerPermitted("fx", "solidity_ast_analyzer"), "isAnalyzerPermitted must be false");
});

test("Native Layer-1 Crypto (BTC UTXO) blocked from executing ERC-20 conformance", () => {
  let caught = false;
  try {
    assertAssetCanAccessAnalyzer("native_crypto", "erc20_conformance");
  } catch (err) {
    caught = true;
    assert(err instanceof AssetFirewallViolationError, "Must throw AssetFirewallViolationError");
    assert((err as AssetFirewallViolationError).assetClass === "native_crypto", "Asset class must be native_crypto");
  }
  assert(caught, "Firewall MUST throw on native_crypto -> ERC20 conformance");
  assert(!isAnalyzerPermitted("native_crypto", "erc20_conformance"), "isAnalyzerPermitted must be false");
});

test("EVM Smart Contract blocked from executing Equity SEC filings analyzer", () => {
  let caught = false;
  try {
    assertAssetCanAccessAnalyzer("evm_contract", "equity_sec_filings");
  } catch (err) {
    caught = true;
    assert(err instanceof AssetFirewallViolationError, "Must throw AssetFirewallViolationError");
    assert((err as AssetFirewallViolationError).assetClass === "evm_contract", "Asset class must be evm_contract");
  }
  assert(caught, "Firewall MUST throw on evm_contract -> equity_sec_filings");
  assert(!isAnalyzerPermitted("evm_contract", "equity_sec_filings"), "isAnalyzerPermitted must be false");
});

test("Commodity asset blocked from executing EIP-1967 proxy slot reader", () => {
  let caught = false;
  try {
    assertAssetCanAccessAnalyzer("commodity", "eip1967_slot_reader");
  } catch (err) {
    caught = true;
    assert(err instanceof AssetFirewallViolationError, "Must throw AssetFirewallViolationError");
    assert((err as AssetFirewallViolationError).assetClass === "commodity", "Asset class must be commodity");
  }
  assert(caught, "Firewall MUST throw on commodity -> eip1967_slot_reader");
  assert(!isAnalyzerPermitted("commodity", "eip1967_slot_reader"), "isAnalyzerPermitted must be false");
});

/* -------------------------------------------------------------------------- */
/* 2. ASSET RESOLUTION & SYMBOL COLLISION ISOLATION                           */
/* -------------------------------------------------------------------------- */

test("Independent resolution of colliding symbols (BTC native vs WBTC EVM vs BTC-USD FX)", () => {
  const wbtcClass = resolveAssetClass("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
  assert(wbtcClass === "evm_contract", `WBTC address must resolve to evm_contract, got: ${wbtcClass}`);

  const btcNative = resolveAssetClass({ symbol: "BTC", network: "bitcoin" });
  assert(btcNative === "native_crypto", `Native BTC must resolve to native_crypto, got: ${btcNative}`);

  const equityAapl = resolveAssetClass({ symbol: "AAPL", declaredCategory: "equity" });
  assert(equityAapl === "equity", `AAPL must resolve to equity, got: ${equityAapl}`);

  const gold = resolveAssetClass({ symbol: "XAU", declaredCategory: "commodity" });
  assert(gold === "commodity", `Gold must resolve to commodity, got: ${gold}`);
});

test("Symbol variant normalization (BRK.A / BRK-A / BRK/A / BRKA and XBT / BTC / BTC-USD)", () => {
  const { normalizeAssetSymbol } = require("../../lib/security/asset-class-firewall");
  const brkVariants = ["BRK.A", "BRK-A", "BRK/A", "BRKA"];
  for (const v of brkVariants) {
    const res = normalizeAssetSymbol(v);
    assert(res.canonicalTicker === "BRK.A", `Variant ${v} must normalize to BRK.A, got: ${res.canonicalTicker}`);
  }

  const btcVariants = ["XBT", "BTC", "BTC/USD", "BTC-USD", "BTCUSDT", "BTC-USDT"];
  for (const v of btcVariants) {
    const res = normalizeAssetSymbol(v);
    assert(res.canonicalTicker === "BTC", `Variant ${v} must normalize to BTC, got: ${res.canonicalTicker}`);
  }
});

test("Venue collision isolation (BTC/USD @ Coinbase vs Kraken vs CME)", () => {
  const { resolveVenueMarketIdentity } = require("../../lib/security/asset-class-firewall");
  const cb = resolveVenueMarketIdentity("BTC/USD", "Coinbase");
  const kr = resolveVenueMarketIdentity("XBT/USD", "Kraken");
  const cme = resolveVenueMarketIdentity("BTC", "CME");

  assert(cb.canonicalMarketId === "coinbase::BTC", `Coinbase ID must be coinbase::BTC, got ${cb.canonicalMarketId}`);
  assert(kr.canonicalMarketId === "kraken::BTC", `Kraken ID must be kraken::BTC, got ${kr.canonicalMarketId}`);
  assert(cme.canonicalMarketId === "cme::BTC", `CME ID must be cme::BTC, got ${cme.canonicalMarketId}`);

  assert(cb.assetClass === "native_crypto", "Coinbase BTC must be native_crypto");
  assert(kr.assetClass === "native_crypto", "Kraken BTC must be native_crypto");
  assert(cme.assetClass === "commodity", "CME BTC futures must be commodity");

  assert(cb.canonicalMarketId !== kr.canonicalMarketId, "Coinbase and Kraken markets must not collide");
  assert(cb.canonicalMarketId !== cme.canonicalMarketId, "Coinbase and CME markets must not collide");
});

/* -------------------------------------------------------------------------- */
/* 3. TRANSPORT-LEVEL TIER ISOLATION (ZERO LEAKAGE IN BASIC TIER)            */
/* -------------------------------------------------------------------------- */

test("Basic tier output contains zero Pro/Advanced findings or remediation diffs", () => {
  const usdtProfile = BENCHMARK_30_CONTRACTS["0xdac17f958d2ee523a2206206994597c13d831ec7"];
  assert(Boolean(usdtProfile), "USDT profile must exist");

  const basicReport = buildCanonicalAuditReport(
    {
      contractAddress: usdtProfile.contractAddress,
      contractName: usdtProfile.contractName,
      chainId: usdtProfile.chainId,
      network: usdtProfile.network,
      locale: "en",
    },
    "basic",
  );
  const basicJson = JSON.stringify(basicReport);

  // Assert Basic does not contain paid Pro / Advanced data
  const lockedSections = basicReport.sections.filter((s) => s.isLocked);
  assert(lockedSections.length > 0, "Basic report must have locked Pro/Advanced sections");
  for (const s of lockedSections) {
    assert(s.data === null, `Locked section ${s.id} must have null data payload`);
  }

  // Assert no remediationDiff in Basic report
  assert(!basicJson.includes("remediationDiff"), "Basic tier payload MUST NOT contain remediationDiff");

  // Verify clientEntitlementTier
  assert(basicReport.clientEntitlementTier === "basic", "Report clientEntitlementTier must be basic");
  assert(basicReport.sections.length > 0, "Basic report must contain valid sections");
});

async function run() {
  console.log("=== VELMÈRE ADVERSARIAL ASSET-CLASS FIREWALL & TIER ISOLATION SUITE ===");
  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  [PASS] ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${t.name}:`, err);
    }
  }

  console.log(`\nResults: ${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) {
    process.exit(1);
  }
}

run();
