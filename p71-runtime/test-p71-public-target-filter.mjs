import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root=process.env.P71_SOURCE_ROOT||process.cwd();
const out=process.env.P71_RESULT_DIR||path.resolve(root,'../p71-out');
fs.mkdirSync(out,{recursive:true});
const u=(p)=>pathToFileURL(path.join(root,p)).href;
const {isCustomerSafeProAuditPdfLine,planCustomerSafePdf}=await import(u('lib/security/pro-audit-pdf/customer-safe-renderer.ts'));
const address='0xca11bde05977b3631167028862be2a173976ca11';
const positive=[
 `Target: ${address}`,
 `1. Target: ${address}`,
 `2. Contract address: ${address}`,
 `3. Audited address: ${address}`,
];
const negative=[
 `Wallet: ${address}`,
 `1. Wallet: ${address}`,
 `Finding mentions ${address}`,
 `Address: ${address}`,
 `Target: ${address} trailing`,
];
for(const line of positive) if(!isCustomerSafeProAuditPdfLine(line)) throw new Error(`positive_target_filtered:${line}`);
for(const line of negative) if(isCustomerSafeProAuditPdfLine(line)) throw new Error(`unsafe_address_admitted:${line}`);
const plan=planCustomerSafePdf([
 `1. Target: ${address}`,
 '2. Network: Ethereum mainnet',
 '3. Source-bound real reference evidence.',
]);
const rows=plan.pages.flatMap(p=>p.rows).map(r=>r.text);
if(!rows.some(line=>line.toLowerCase().includes(address))) throw new Error(`numbered_target_missing_from_render_plan:${JSON.stringify(rows)}`);
if(!rows.some(line=>line.includes('Network: Ethereum mainnet'))) throw new Error('non_address_customer_line_missing');
const receipt={
 schemaVersion:'velmere.p71.numbered-public-target-filter.v2',
 status:'PASS_P71_NUMBERED_PUBLIC_TARGET_FILTER_FAIL_CLOSED',
 target:address,
 positiveCases:positive.length,
 negativeCases:negative.length,
 malformedShortAddressOutsideEvmLeakDetector:true,
 renderPlanTargetRetained:true,
 pageCount:plan.pages.length,
 renderPlanDigest:plan.renderPlanDigest,
 securityBoundary:'Only the pre-existing Target/Contract address/Audited address full-EVM-address allow-list gains an optional decimal list prefix. Full EVM addresses under arbitrary labels or prose remain rejected. Short non-address hex strings are outside the EVM-address leak detector by design.',
 customerFinalOutputCredit:0,
 auditFinalCustomerPdfCredit:0,
 rightsCredit:0,
 saleCredit:0,
 live:false,
};
fs.writeFileSync(path.join(out,'P71_NUMBERED_PUBLIC_TARGET_FILTER.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
