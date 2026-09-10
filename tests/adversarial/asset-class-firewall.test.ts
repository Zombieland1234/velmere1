import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertAssetCanAccessAnalyzer,
  isAnalyzerPermitted,
  resolveAssetClass,
  AssetFirewallViolationError,
  type AssetClass,
  type AnalyzerDomain,
} from "@/lib/security/asset-class-firewall";

test("Asset-Class Firewall: Equities must be blocked from EVM bytecode & contract analyzers", () => {
  const equityClass: AssetClass = "equity";

  const prohibitedAnalyzers: AnalyzerDomain[] = [
    "evm_bytecode_decompiler",
    "solidity_ast_analyzer",
    "erc20_conformance",
    "proxy_pattern_detector",
    "delegatecall_analyzer",
    "unicrypt_liquidity_lock",
    "eip1967_slot_reader",
  ];

  for (const analyzer of prohibitedAnalyzers) {
    assert.strictEqual(
      isAnalyzerPermitted(equityClass, analyzer),
      false,
      `Analyzer '${analyzer}' should not be permitted for equity`,
    );

    assert.throws(
      () => assertAssetCanAccessAnalyzer(equityClass, analyzer),
      (err: any) => {
        assert.ok(err instanceof AssetFirewallViolationError);
        assert.strictEqual(err.assetClass, "equity");
        assert.strictEqual(err.attemptedAnalyzer, analyzer);
        return true;
      },
      `Should throw AssetFirewallViolationError for ${analyzer}`,
    );
  }
});

test("Asset-Class Firewall: Native UTXO Crypto must be blocked from EVM contract analyzers", () => {
  const nativeCrypto: AssetClass = "native_crypto";

  const prohibitedAnalyzers: AnalyzerDomain[] = [
    "evm_bytecode_decompiler",
    "solidity_ast_analyzer",
    "erc20_conformance",
    "proxy_pattern_detector",
    "delegatecall_analyzer",
    "unicrypt_liquidity_lock",
    "eip1967_slot_reader",
  ];

  for (const analyzer of prohibitedAnalyzers) {
    assert.strictEqual(
      isAnalyzerPermitted(nativeCrypto, analyzer),
      false,
      `Analyzer '${analyzer}' should not be permitted for native crypto`,
    );

    assert.throws(
      () => assertAssetCanAccessAnalyzer(nativeCrypto, analyzer),
      (err: any) => {
        assert.ok(err instanceof AssetFirewallViolationError);
        assert.strictEqual(err.assetClass, "native_crypto");
        assert.strictEqual(err.attemptedAnalyzer, analyzer);
        return true;
      },
    );
  }
});

test("Asset-Class Firewall: Commodities and FX must be strictly isolated to market microstructure", () => {
  assert.strictEqual(isAnalyzerPermitted("commodity", "commodity_futures_curve"), true);
  assert.strictEqual(isAnalyzerPermitted("commodity", "evm_bytecode_decompiler"), false);

  assert.strictEqual(isAnalyzerPermitted("fx", "fx_macro_interest_rates"), true);
  assert.strictEqual(isAnalyzerPermitted("fx", "erc20_conformance"), false);
});

test("Asset-Class Firewall: EVM Smart Contracts are permitted for bytecode disassembly", () => {
  assert.strictEqual(isAnalyzerPermitted("evm_contract", "evm_bytecode_decompiler"), true);
  assert.strictEqual(isAnalyzerPermitted("evm_contract", "proxy_pattern_detector"), true);
  assert.strictEqual(isAnalyzerPermitted("evm_contract", "commodity_futures_curve"), false);
});

test("Asset-Class Firewall: resolveAssetClass correctly classifies diverse inputs", () => {
  assert.strictEqual(resolveAssetClass({ symbol: "AAPL" }), "equity");
  assert.strictEqual(resolveAssetClass({ symbol: "NVDA" }), "equity");
  assert.strictEqual(resolveAssetClass({ symbol: "GC=F" }), "commodity");
  assert.strictEqual(resolveAssetClass({ symbol: "EURUSD=X" }), "fx");
  assert.strictEqual(resolveAssetClass({ symbol: "BTC" }), "native_crypto");
  assert.strictEqual(resolveAssetClass({ symbol: "SOL" }), "native_crypto");
  assert.strictEqual(
    resolveAssetClass({
      symbol: "USDT",
      address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    }),
    "evm_contract",
  );
});
