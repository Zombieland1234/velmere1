#!/usr/bin/env node
const modules = [
  "../../lib/market-integrity/customer-report-exact-pdf-token.ts",
  "../../lib/market-integrity/real-markets-paid-account-artifact.ts",
  "../../lib/server/market-integrity-route-modules/report-pdf.ts",
];
let passed = 0;
for (const modulePath of modules) {
  await import(modulePath);
  console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u, "")}`);
  passed += 1;
}
console.log(`P87 changed production module imports: PASS (${passed}/${modules.length})`);
