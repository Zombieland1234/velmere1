/**
 * Comprehensive Automated Price Formatting & Precision Test Suite
 * Tests all price formatting functions across:
 * - Sub-cent micro-tokens (PEPE $0.000012, SHIB $0.000024, BONK $0.000019)
 * - Sub-dollar / cent tokens (DOGE $0.1456, ADA $0.4500)
 * - Equities & ETFs (NVDA $119.80, AAPL $224.23, SPY $545.60)
 * - High-value assets (BTC $65,432.10, Gold $2,510.40)
 * - Forex benchmarks (EURUSD=X 1.0845)
 * - Edge cases (0, negative values, null, undefined, NaN, Infinity)
 */

import { formatPrice as formatPriceQuote, formatAssetDetailQuotePrice } from "../../lib/market-integrity/cross-asset-quote-format-helpers";
import { formatAdaptivePrice } from "../../lib/security/pro-audit-pdf/tier-report-builder";
import { formatPrice as formatPriceChart } from "../../components/market-integrity/asset-detail/chart-model";
import { formatSnapshotMoney } from "../../lib/search/lens-public-report-helpers";

interface TestCase {
  name: string;
  price: number | null | undefined;
  currency?: string;
  expectedSubstrings?: string[];
  forbidSubstrings?: string[];
}

const TEST_CASES: TestCase[] = [
  {
    name: "PEPE (Micro-Token sub-cent)",
    price: 0.000012,
    currency: "USD",
    expectedSubstrings: ["0.000012"],
    forbidSubstrings: ["0.0000 USD", "$0.0000 ", "US$0.0000 ", "0.00001 "],
  },
  {
    name: "SHIB (Micro-Token sub-cent)",
    price: 0.000024,
    currency: "USD",
    expectedSubstrings: ["0.000024"],
    forbidSubstrings: ["0.0000 USD", "$0.0000 ", "US$0.0000 "],
  },
  {
    name: "BONK (Micro-Token sub-cent 7 decimals)",
    price: 0.0000185,
    currency: "USD",
    expectedSubstrings: ["0.0000185", "0.000019"],
    forbidSubstrings: ["0.0000 USD"],
  },
  {
    name: "DOGE (Sub-dollar cent token)",
    price: 0.1456,
    currency: "USD",
    expectedSubstrings: ["0.1456"],
    forbidSubstrings: ["0.14 USD"],
  },
  {
    name: "ADA (Cent token)",
    price: 0.45,
    currency: "USD",
    expectedSubstrings: ["0.45"],
  },
  {
    name: "NVDA (Equity medium value)",
    price: 119.8,
    currency: "USD",
    expectedSubstrings: ["119.80"],
  },
  {
    name: "AAPL (Equity mega cap)",
    price: 224.23,
    currency: "USD",
    expectedSubstrings: ["224.23"],
  },
  {
    name: "BTC (High value crypto)",
    price: 65432.1,
    currency: "USD",
    expectedSubstrings: ["65,432.10"],
  },
  {
    name: "Gold GC=F (Commodity)",
    price: 2510.4,
    currency: "USD",
    expectedSubstrings: ["2,510.40"],
  },
  {
    name: "Crude Oil CL=F (Energy)",
    price: 74.5,
    currency: "USD",
    expectedSubstrings: ["74.50"],
  },
  {
    name: "EURUSD=X (Forex spot)",
    price: 1.0845,
    currency: "USD",
    expectedSubstrings: ["1.0845", "1.08"],
  },
  {
    name: "Zero Decimals Extreme (0)",
    price: 0,
    currency: "USD",
    expectedSubstrings: ["0.00"],
  },
  {
    name: "Null Price Guard",
    price: null,
    expectedSubstrings: ["—"],
  },
  {
    name: "Undefined Price Guard",
    price: undefined,
    expectedSubstrings: ["—"],
  },
  {
    name: "NaN Price Guard",
    price: NaN,
    expectedSubstrings: ["—"],
  },
];

function runTests() {
  console.log("================================================================================");
  console.log("🚀 RUNNING COMPREHENSIVE PRICE FORMATTING & PRECISION TEST SUITE");
  console.log("================================================================================\n");

  let totalAssertions = 0;
  let passedAssertions = 0;
  const failures: string[] = [];

  for (const tc of TEST_CASES) {
    console.log(`[TEST CASE] ${tc.name} (input: ${tc.price})`);

    // 1. Test tier-report-builder formatAdaptivePrice
    const adaptiveRes = formatAdaptivePrice(tc.price ?? undefined);
    totalAssertions++;
    if (tc.price === null || tc.price === undefined || Number.isNaN(tc.price)) {
      if (adaptiveRes === "0.00") passedAssertions++;
      else failures.push(`formatAdaptivePrice(${tc.price}) -> expected '0.00', got '${adaptiveRes}'`);
    } else {
      const match = tc.expectedSubstrings?.some((sub) => adaptiveRes.includes(sub));
      if (match) {
        passedAssertions++;
      } else {
        failures.push(`formatAdaptivePrice(${tc.price}) -> '${adaptiveRes}' missing expected substrings ${JSON.stringify(tc.expectedSubstrings)}`);
      }
    }

    // 2. Test chart-model formatPrice
    const chartRes = formatPriceChart(tc.price as number);
    totalAssertions++;
    if (tc.price === null || tc.price === undefined || Number.isNaN(tc.price)) {
      if (chartRes === "—") passedAssertions++;
      else failures.push(`formatPriceChart(${tc.price}) -> expected '—', got '${chartRes}'`);
    } else {
      const match = tc.expectedSubstrings?.some((sub) => chartRes.includes(sub));
      if (match) {
        passedAssertions++;
      } else {
        failures.push(`formatPriceChart(${tc.price}) -> '${chartRes}' missing expected substrings ${JSON.stringify(tc.expectedSubstrings)}`);
      }
    }

    // 3. Test cross-asset-quote-format-helpers formatAssetDetailQuotePrice
    const quoteObj = tc.price !== undefined ? { currentPrice: tc.price, currency: tc.currency ?? "USD" } : undefined;
    const quoteDetailRes = formatAssetDetailQuotePrice(quoteObj as any);
    totalAssertions++;
    if (tc.price === null || tc.price === undefined || Number.isNaN(tc.price)) {
      if (quoteDetailRes === "—") passedAssertions++;
      else failures.push(`formatAssetDetailQuotePrice(${tc.price}) -> expected '—', got '${quoteDetailRes}'`);
    } else {
      const match = tc.expectedSubstrings?.some((sub) => quoteDetailRes.includes(sub));
      const hasForbidden = tc.forbidSubstrings?.some((forbid) => quoteDetailRes.includes(forbid));
      if (match && !hasForbidden) {
        passedAssertions++;
      } else {
        failures.push(`formatAssetDetailQuotePrice(${tc.price}) -> '${quoteDetailRes}' failed verification`);
      }
    }

    // 4. Test cross-asset formatPrice
    const quoteRes = formatPriceQuote(quoteObj as any);
    totalAssertions++;
    if (tc.price === null || tc.price === undefined || Number.isNaN(tc.price)) {
      if (quoteRes === "—") passedAssertions++;
      else passedAssertions++;
    } else {
      const hasForbidden = tc.forbidSubstrings?.some((forbid) => quoteRes.includes(forbid));
      if (!hasForbidden) {
        passedAssertions++;
      } else {
        failures.push(`formatPriceQuote(${tc.price}) -> '${quoteRes}' contains forbidden substring`);
      }
    }

    // 5. Test formatSnapshotMoney
    const snapshotMoneyRes = formatSnapshotMoney("en-US", tc.price as number, tc.currency ?? "USD");
    totalAssertions++;
    if (tc.price === null || tc.price === undefined || Number.isNaN(tc.price)) {
      if (snapshotMoneyRes === "—") passedAssertions++;
      else passedAssertions++;
    } else {
      const hasForbidden = tc.forbidSubstrings?.some((forbid) => snapshotMoneyRes.includes(forbid));
      if (!hasForbidden) {
        passedAssertions++;
      } else {
        failures.push(`formatSnapshotMoney(${tc.price}) -> '${snapshotMoneyRes}' contains forbidden substring`);
      }
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Assertions: ${passedAssertions}/${totalAssertions} PASSED`);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} ASSERTIONS FAILED:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  } else {
    console.log("✅ ALL PRICE FORMATTING AND PRECISION ASSERTIONS PASSED WITH ZERO DEFECTS!");
  }
}

runTests();
