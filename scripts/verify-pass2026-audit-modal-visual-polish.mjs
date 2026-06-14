import fs from "node:fs";

const checks = [
  ["components/security/VlmAuditCommandClient.tsx", "velmere-audit-typing-line", "Audit Watch typing line"],
  ["components/security/VlmAuditCommandClient.tsx", "velmere-audit-search-label", "Audit Watch clean search label"],
  ["lib/security/pass2023-vlm-audit-product.ts", "Advanced łączy VLM Brain", "PL audit subtitle without price"],
  ["lib/commerce/pass2024-vlm-paid-access.ts", 'checkoutCta: "Zamów Advanced Audit"', "Audit CTA without price text"],
  ["components/market-integrity/UnifiedAssetAnalysisControls.tsx", "identity-plus-metrics-window", "Unified modal header identity + metrics"],
  ["components/market-integrity/UnifiedAssetAnalysisControls.tsx", "chart-window-with-timeframes", "Unified chart window contains timeframe row"],
  ["app/globals.css", "PASS2026 — real UI polish", "PASS2026 CSS lock"],
  ["app/globals.css", "grid-template-rows: repeat(3, minmax(0, 1fr))", "Three equal Basic/Pro/Advanced cards"],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: ${file} missing ${needle}`);
    failed = true;
  } else {
    console.log(`[PASS] ${label}`);
  }
}

if (failed) process.exit(1);
console.log("PASS2026 Audit Watch + unified asset modal visual polish verifier complete");
