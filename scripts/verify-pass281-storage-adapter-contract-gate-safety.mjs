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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildStorageAdapterContractGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass281-storage-adapter-contract-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass281-storage-lane");
  mustInclude("lib/market-integrity/storage-adapter-contract-gate.ts", "velmere_storage_adapter_contract_gate_v1_pass281");
  mustInclude("lib/market-integrity/storage-adapter-contract-gate.ts", "Quiet Storage Covenant");
  mustInclude("lib/market-integrity/storage-adapter-contract-gate.ts", "no browser/localStorage proof may pretend to be durable storage");
  mustInclude("lib/market-integrity/storage-adapter-contract-gate.ts", "Customer-facing copy may mention privacy-preserving audit history only after server storage");
  mustInclude("app/globals.css", "PASS281 — K04 storage adapter contract gate");
  mustInclude("app/globals.css", "shield-pass281-storage-adapter-contract");
  mustInclude("lib/launch/master-build-areas.ts", "PASS281 marker: Storage adapter contract gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS281 marker: Storage adapter contract gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass281.ts", "pass281StorageAdapterContractGateDelta");
  mustInclude("VELMERE_PASS281_STORAGE_ADAPTER_CONTRACT_GATE_REPORT.md", "PASS281 — Storage Adapter Contract Gate");
  mustInclude("package.json", "verify:pass281-storage-adapter-contract-gate");
  mustInclude("package.json", "verify:pass279-source-freshness-registry-gate");
  mustInclude("package.json", "verify:pass280-analytics-event-taxonomy-gate");
  mustNotInclude("lib/market-integrity/storage-adapter-contract-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
    "countdown pressure",
  ]);
} catch (error) {
  console.error("PASS281 storage adapter contract gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS281 storage adapter contract gate guard passed (${checks.length} checks).`);
