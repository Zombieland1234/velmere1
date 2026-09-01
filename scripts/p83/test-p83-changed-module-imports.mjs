#!/usr/bin/env node
const modules = [
  "../../lib/account/audit-account-messages.ts",
  "../../lib/reporting/account-customer-artifact-store.ts",
  "../../lib/reporting/audit-exact-artifact-atomic-publisher.ts",
  "../../lib/security/audit-watch-post-handler.ts",
];
let passed = 0;
for (const modulePath of modules) {
  await import(modulePath);
  console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u, "")}`);
  passed += 1;
}
console.log(`P83 changed production module imports: PASS (${passed}/${modules.length})`);
