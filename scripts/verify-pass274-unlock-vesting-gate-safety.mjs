import { readFileSync } from "node:fs";

const checks = [];
function mustInclude(file, needle) {
  const body = readFileSync(file, "utf8");
  if (!body.includes(needle)) {
    throw new Error(`${file} is missing ${needle}`);
  }
  checks.push(`${file} -> ${needle}`);
}

function mustNotInclude(file, forbidden) {
  const body = readFileSync(file, "utf8").toLowerCase();
  for (const item of forbidden) {
    if (body.includes(item.toLowerCase())) {
      throw new Error(`${file} contains forbidden wording: ${item}`);
    }
  }
  checks.push(`${file} -> forbidden wording clean`);
}

try {
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS274 guard compatibility");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildUnlockVestingGate(result)");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass274-unlock-vesting-gate");
  mustInclude("lib/market-integrity/unlock-vesting-gate.ts", "velmere_unlock_vesting_gate_v1_pass274");
  mustInclude("lib/market-integrity/unlock-vesting-gate.ts", "cliff radar gate");
  mustInclude("lib/market-integrity/unlock-vesting-gate.ts", "Missing vesting data is uncertainty, not trust");
  mustInclude("lib/market-integrity/unlock-vesting-gate.ts", "not a trade signal");
  mustInclude("app/globals.css", "PASS274 — L04 unlock / vesting cliff radar gate");
  mustInclude("app/globals.css", "shield-pass274-unlock-gate");
  mustInclude("lib/launch/master-build-areas.ts", "PASS274 marker: Unlock vesting cliff radar gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS274 marker: Unlock vesting cliff radar gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass274.ts", "pass274UnlockVestingGateDelta");
  mustInclude("VELMERE_PASS274_UNLOCK_VESTING_GATE_REPORT.md", "PASS274 — Unlock / Vesting Cliff Radar Gate");
  mustInclude("package.json", "verify:pass274-unlock-vesting-gate");
  mustNotInclude("lib/market-integrity/unlock-vesting-gate.ts", [
    "buy now",
    "sell now",
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
  ]);
} catch (error) {
  console.error("PASS274 unlock vesting gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS274 unlock vesting gate guard passed (${checks.length} checks).`);
