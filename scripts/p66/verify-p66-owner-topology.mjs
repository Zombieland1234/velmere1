import fs from 'node:fs';
import crypto from 'node:crypto';
const p='config/p66/p66-owner-product-topology.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const fail=(m)=>{throw new Error(m)};
if(d.denominators.productFamilies!==10) fail('families');
if(d.denominators.customerFacingRows!==20) fail('rows');
if(d.denominators.tieredProductFamilies!==5) fail('tiered families');
if(d.denominators.tieredCustomerRows!==15) fail('tiered rows');
if(d.denominators.standaloneCustomerRows!==5) fail('standalone rows');
if(d.denominators.realPaidValueTransitions!==10) fail('transitions');
if(d.denominators.currentExecutionProfiles!==20) fail('execution profiles');
if(d.denominators.tieredExecutionProfiles!==15) fail('tiered execution profiles');
if(d.denominators.standaloneExecutionProfiles!==5) fail('standalone execution profiles');
if(d.denominators.legacy33ProductCompletionDenominatorRetired!==true) fail('legacy 33 retirement');
if(d.artifactModel.pdfIsProductFamily!==false) fail('pdf family');
const fams=new Map(d.productFamilies.map(x=>[x.family,x]));
for(const f of ['audit','browser','shield','shield-pro','real-markets']){
 const x=fams.get(f); if(!x||!x.tiered||x.customerRows.length!==3) fail(`tiered ${f}`);
}
for(const f of ['angel','whale-watch','market-impact','shield-map','risk-indicator']){
 const x=fams.get(f); if(!x||x.tiered||x.customerRows.length!==1) fail(`standalone ${f}`);
}
if(fams.has('pdf')) fail('pdf false family present');
const rows=d.customerFacingRows;
if(rows.length!==20||new Set(rows.map(x=>x.rowId)).size!==20) fail('row uniqueness');
if(rows.some(x=>['angel','whale-watch','market-impact','shield-map','risk-indicator'].includes(x.family)&&x.tier!==null)) fail('fake standalone tier');
if(d.legacy33Adjudication.length!==33) fail('legacy 33');
const falseTierCount=d.legacy33Adjudication.filter(x=>x.classification!=='CUSTOMER_TIER_CONTEXT_LEGACY_NAME_MATCHES_REAL_TIER').length;
if(falseTierCount!==18) fail(`legacy false/internal count ${falseTierCount}`);
const sha=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
console.log(JSON.stringify({status:'PASS_P66_OWNER_TOPOLOGY_RECONCILIATION',sha256:sha,productFamilies:10,customerFacingRows:20,realTierContexts:15,currentExecutionProfiles:20,tieredExecutionProfiles:15,standaloneExecutionProfiles:5,legacyInternalOrArtifactContexts:18,legacy33CompletionDenominatorRetired:true,pdfSeparateProductFamily:false},null,2));
