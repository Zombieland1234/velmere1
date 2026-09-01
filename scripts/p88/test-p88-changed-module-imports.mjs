#!/usr/bin/env node
const modules = [
  "../../lib/security/audit-report-exact-pdf-artifact.ts",
  "../../lib/security/audit-report-snapshot-store.ts",
  "../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
  "../../lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
  "../../lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts",
  "../../lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts",
  "../../lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts",
  "../../lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts",
  "../../lib/db/supabase-rpc-operation-registry.ts",
];
let passed = 0;
for (const modulePath of modules) {
  await import(modulePath);
  console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u, "")}`);
  passed += 1;
}
console.log(`P88 changed production module imports: PASS (${passed}/${modules.length})`);
