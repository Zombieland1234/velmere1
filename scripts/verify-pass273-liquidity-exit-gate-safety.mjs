import { readFileSync } from "node:fs";

const checks = [];
function mustInclude(file, needle) {
  const body = readFileSync(file, "utf8");
  if (!body.includes(needle)) {
    throw new Error(`${file} is missing ${needle}`);
  }
  checks.push(`${file} -> ${needle}`);
}

try {
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS273 guard compatibility");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass273-liquidity-exit-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildLiquidityExitGate(result, orderbook)");
  mustInclude("lib/market-integrity/liquidity-exit-gate.ts", "velmere_liquidity_exit_gate_v1_pass273");
  mustInclude("lib/market-integrity/liquidity-exit-gate.ts", "exit route gate");
  mustInclude("lib/market-integrity/liquidity-exit-gate.ts", "bid-side exit depth");
  mustInclude("lib/market-integrity/liquidity-exit-gate.ts", "sell-route stress");
  mustInclude("lib/market-integrity/liquidity-exit-gate.ts", "Missing order-book data is uncertainty, not confidence");
  mustInclude("app/globals.css", "PASS273 — L02 liquidity exit route gate");
  mustInclude("app/globals.css", "shield-pass273-exit-gate");
  mustInclude("lib/launch/master-build-areas.ts", "PASS273 marker: Liquidity exit route gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS273 marker: Liquidity exit route gate active");
  mustInclude("VELMERE_PASS273_LIQUIDITY_EXIT_GATE_REPORT.md", "PASS273 — Liquidity Exit Route Gate");
  mustInclude("package.json", "verify:pass273-liquidity-exit-gate");
} catch (error) {
  console.error("PASS273 liquidity exit gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS273 liquidity exit gate guard passed (${checks.length} checks).`);
