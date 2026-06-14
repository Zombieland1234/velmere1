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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildDurableAuditReceiptVault(result, sourcePolicyAllowlistGate)");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass278-durable-audit-receipt-vault");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass278-audit-receipt");
  mustInclude("lib/market-integrity/durable-audit-receipt-vault.ts", "velmere_durable_audit_receipt_vault_v1_pass278");
  mustInclude("lib/market-integrity/durable-audit-receipt-vault.ts", "audit ledger write blocked");
  mustInclude("lib/market-integrity/durable-audit-receipt-vault.ts", "Customer-visible surfaces may show review pending / receipt prepared only");
  mustInclude("app/globals.css", "PASS278 — K01 durable audit receipt vault");
  mustInclude("app/globals.css", "shield-pass278-audit-vault");
  mustInclude("lib/launch/master-build-areas.ts", "PASS278 marker: Durable audit receipt vault active");
  mustInclude("lib/launch/project-progress.ts", "PASS278 marker: Durable audit receipt vault active");
  mustInclude("lib/launch/master-build-progress-delta-pass278.ts", "pass278DurableAuditReceiptVaultDelta");
  mustInclude("VELMERE_PASS278_DURABLE_AUDIT_RECEIPT_VAULT_REPORT.md", "PASS278 — Durable Audit Receipt Vault");
  mustInclude("package.json", "verify:pass278-durable-audit-receipt-vault");
  mustNotInclude("lib/market-integrity/durable-audit-receipt-vault.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
  ]);
} catch (error) {
  console.error("PASS278 durable audit receipt vault guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS278 durable audit receipt vault guard passed (${checks.length} checks).`);
