#!/usr/bin/env node
const modules = [
  "../../lib/account/audit-account-messages.ts",
  "../../lib/reporting/audit-exact-artifact-owner-readable-publisher.ts",
  "../../lib/security/audit-watch-post-handler.ts",
  "../../lib/server/lazy-route-modules/account--customer-artifact.ts",
];
let passed = 0;
for (const modulePath of modules) {
  await import(modulePath);
  console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u, "")}`);
  passed += 1;
}
console.log(`P84 changed production module imports: PASS (${passed}/${modules.length})`);
