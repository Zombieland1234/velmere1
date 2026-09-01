#!/usr/bin/env node
const modules = [
  "../../lib/security/audit-provider-evidence-dimensions.ts",
  "../../lib/security/audit-paid-evidence-readiness.ts",
  "../../lib/security/audit-evidence-receipt-packet.ts",
  "../../lib/security/audit-provider-runtime-client.ts",
  "../../lib/security/audit-runtime-confidence.ts",
  "../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
  "../../lib/security/audit-customer-report-pipeline.ts",
  "../../lib/server/security-route-modules/audit-report-assembler.ts",
  "../../lib/security/audit-report-exact-pdf-artifact.ts",
  "../../lib/security/audit-report-snapshot-store.ts",
  "../../lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
  "../../lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts",
];
let passed = 0;
for (const modulePath of modules) {
  await import(modulePath);
  console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u, "")}`);
  passed += 1;
}
console.log(`P89 changed and customer-path production module imports: PASS (${passed}/${modules.length})`);
