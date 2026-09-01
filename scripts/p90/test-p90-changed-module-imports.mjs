#!/usr/bin/env node
const modules=[
"../../lib/network/brokered-egress.ts",
"../../lib/security/audit-provider-budget.ts",
"../../lib/security/audit-provider-evidence-dimensions.ts",
"../../lib/security/audit-provider-runtime-client.ts",
"../../lib/security/audit-provider-rights-currentness.ts",
"../../lib/security/audit-paid-evidence-readiness.ts",
"../../lib/security/audit-tier-value-proof.ts",
"../../lib/security/audit-evidence-receipt-packet.ts",
"../../lib/security/audit-report-customer-projection.ts",
"../../lib/security/audit-customer-report-pipeline.ts",
"../../lib/security/audit-watch-post-handler.ts",
"../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
"../../lib/server/security-route-modules/audit-report-assembler.ts",
];
let passed=0;for(const path of modules){await import(path);console.log(`PASS ${path.replace(/^\.\.\/\.\.\//u,"./")}`);passed++;}console.log(`P90 changed production module imports: PASS (${passed}/${modules.length})`);
