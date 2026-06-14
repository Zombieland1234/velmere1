import fs from "node:fs";

const checks = [];
const errors = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function mustInclude(path, needle) {
  const haystack = read(path);
  if (!haystack.includes(needle)) {
    errors.push(`${path} missing ${needle}`);
  }
  checks.push(`${path}:${needle}`);
}

mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS271 guard compatibility");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildContractTrapRegime");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass271-contract-trap-gate");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "contractTrapRegime.rails.map");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "velmere_contract_trap_v1_pass271");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "contract_trap_gate");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "owner/proxy");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "mint/pause");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "blacklist");
mustInclude("lib/market-integrity/contract-trap-regime.ts", "sell path");
mustInclude("app/globals.css", "PASS271 — C11 contract trap gate");
mustInclude("app/globals.css", "shield-pass271-contract-trap");
mustInclude("lib/launch/master-build-areas.ts", "PASS271 marker: Contract trap gate active");
mustInclude("lib/launch/master-build-areas.ts", "progress: 43");
mustInclude("lib/launch/project-progress.ts", "PASS271 marker: Contract trap gate active");
mustInclude("lib/launch/master-build-progress-delta-pass271.ts", "pass271ContractTrapGateDelta");
mustInclude("VELMERE_PASS271_CONTRACT_TRAP_GATE_REPORT.md", "PASS271 — Contract Trap Gate");
mustInclude("package.json", "verify:pass271-contract-trap-gate");

if (errors.length) {
  console.error("PASS271 contract trap gate guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS271 contract trap gate guard passed (${checks.length} checks).`);
