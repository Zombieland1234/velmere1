import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateDynamicSignals } from "@/lib/commerce/vlm-dynamic-signal-engine";

test("Dynamic Signal Engine: Full delivery when all prerequisites met", () => {
  const resultPro = evaluateDynamicSignals("pro", {
    hasBytecode: true,
    hasSourceCode: true,
    hasOnChainDeploy: true,
    hasLiquidityPool: true,
    hasOrderbookData: true,
    hasTradingHistory: true,
  });

  assert.equal(resultPro.targetSignalsCount, 14);
  assert.equal(resultPro.availableSignalsCount, 14);
  assert.equal(resultPro.deliveryState, "FULL_DELIVERY");
  assert.equal(resultPro.canPurchase, true);
  assert.equal(resultPro.discountPercent, 0);
  assert.equal(resultPro.effectivePriceEur, 14.99);
  assert.equal(resultPro.missingSignals.length, 0);

  const resultAdv = evaluateDynamicSignals("advanced", {
    hasBytecode: true,
    hasSourceCode: true,
    hasOnChainDeploy: true,
    hasLiquidityPool: true,
    hasOrderbookData: true,
    hasTradingHistory: true,
  });

  assert.equal(resultAdv.targetSignalsCount, 20);
  assert.equal(resultAdv.availableSignalsCount, 20);
  assert.equal(resultAdv.deliveryState, "FULL_DELIVERY");
  assert.equal(resultAdv.canPurchase, true);
  assert.equal(resultAdv.discountPercent, 0);
  assert.equal(resultAdv.effectivePriceEur, 149.99);
});

test("Dynamic Signal Engine: Partial delivery with dynamic discount", () => {
  // Missing trading history & liquidity pool -> orderbook & slippage missing (12/14)
  const result = evaluateDynamicSignals("pro", {
    hasBytecode: true,
    hasSourceCode: true,
    hasOnChainDeploy: true,
    hasLiquidityPool: false,
    hasOrderbookData: false,
    hasTradingHistory: false,
  });

  assert.equal(result.targetSignalsCount, 14);
  assert.equal(result.availableSignalsCount, 12);
  assert.equal(result.deliveryState, "PARTIAL_DELIVERY_DISCOUNTED");
  assert.equal(result.canPurchase, true);
  assert.equal(result.discountPercent, 20); // 2 missing * 10% = 20%
  assert.equal(result.effectivePriceEur, 11.99);
  assert.match(result.badgeTextPl, /Dynamiczny rabat -20%/);
  assert.equal(result.missingSignals.length, 2);
});

test("Dynamic Signal Engine: STOP-SELL lock when critical signals missing", () => {
  // Contract without bytecode and without deploy
  const result = evaluateDynamicSignals("pro", {
    hasBytecode: false,
    hasSourceCode: false,
    hasOnChainDeploy: false,
    hasLiquidityPool: false,
    hasOrderbookData: false,
    hasTradingHistory: false,
  });

  assert.equal(result.targetSignalsCount, 14);
  assert.ok(result.availableSignalsCount < 10, "Should have less than 10 signals");
  assert.equal(result.deliveryState, "STOP_SELL_ACTIVE");
  assert.equal(result.canPurchase, false, "Purchase MUST be blocked");
  assert.match(result.badgeTextPl, /STOP-SELL/);
  assert.match(result.rationalePl, /Zakup zablokowany/);
});
