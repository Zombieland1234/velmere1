import { BENCHMARK_30_CONTRACTS } from "../lib/security/contract-audit-profiles";

const entries = Object.entries(BENCHMARK_30_CONTRACTS);
console.log(`Total contracts in BENCHMARK_30_CONTRACTS: ${entries.length}`);
entries.forEach(([addr, p], idx) => {
  console.log(`${idx + 1}. [${p.tokenSymbol || p.contractName}] ${addr} (${p.contractName}) - hasSnapshot: ${Boolean(p.snapshotProvenance)}`);
});
