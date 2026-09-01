#!/usr/bin/env node
const modules=["../../lib/reporting/account-customer-artifact-store.ts","../../lib/reporting/account-customer-artifact-owner-visible-read.ts","../../lib/server/lazy-route-modules/account--customer-artifact.ts"];
let passed=0; for(const modulePath of modules){await import(modulePath);console.log(`PASS ./${modulePath.replace(/^\.\.\/\.\.\//u,"")}`);passed+=1;} console.log(`P85 changed production module imports: PASS (${passed}/${modules.length})`);
