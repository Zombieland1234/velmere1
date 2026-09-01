import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a102r44p18-official-provider-rights-decision-matrix.json"),"utf8"));
const state=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a102r44p18-action-required-current-state.json"),"utf8"));
const registry=JSON.parse(fs.readFileSync(path.join(root,"config/pass21/provider-commercial-rights-registry.json"),"utf8"));
const canonical=(value)=>Array.isArray(value)?`[${value.map(canonical).join(",")}]`:value&&typeof value==="object"?`{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`:JSON.stringify(value);
const sha=(value)=>crypto.createHash("sha256").update(typeof value==="string"?value:canonical(value)).digest("hex");
const without=(value,key)=>Object.fromEntries(Object.entries(value??{}).filter(([candidate])=>candidate!==key));
const checks=[];const add=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
add("provider-count-2",matrix.providers.length===2);
add("source-count-5",Object.keys(matrix.sources).length===5);
add("raw-docs-not-stored",matrix.rawTermsStoredInSource===false);
add("raw-hash-unavailable",matrix.sourceDocumentHashAvailable===false);
add("rights-approved-zero",matrix.globalTruthBoundary.rightsApprovedProviders===0);
add("customer-display-zero",matrix.globalTruthBoundary.customerDisplayAllowedProviders===0);
add("paid-zero",matrix.globalTruthBoundary.paidTierAllowedProviders===0);
add("matrix-digest-valid",/^[a-f0-9]{64}$/u.test(matrix.matrixSha256));
add("matrix-digest-exact",sha(without(matrix,"matrixSha256"))===matrix.matrixSha256);
add("global-no-go",state.globalDecision==="NO_GO");
add("global-flags-false",[state.LIVE,state.saleEnabled,state.productionApproved,state.worldClassProven].every(x=>x===false));
add("state-matrix-bound",state.providerRights?.matrixSha256===matrix.matrixSha256);
add("coinpaprika-registered",registry.providers.some(x=>x.id==="coinpaprika"&&x.rightsState==="UNVERIFIED"&&!x.commercialUseAllowed));
for(const row of matrix.providers){
 add(`${row.providerId}:not-approved`,row.legalApprovalStatus==="NOT_APPROVED");
 add(`${row.providerId}:diagnostic-only`,row.internalDiagnosticAllowed===true);
 add(`${row.providerId}:all-customer-rights-false`,Object.values(row.rights).every(x=>x===false));
 add(`${row.providerId}:sources`,row.sourceIds.length>=2);
 add(`${row.providerId}:blockers`,row.blockers.length>=4);
 add(`${row.providerId}:decision-digest-valid`,/^[a-f0-9]{64}$/u.test(row.decisionSha256));
 add(`${row.providerId}:decision-digest-exact`,sha(without(row,"decisionSha256"))===row.decisionSha256);
}
for(const [id,row] of Object.entries(matrix.sources)){
 add(`${id}:https`,row.url.startsWith("https://"));
 add(`${id}:location-hash-valid`,/^[a-f0-9]{64}$/u.test(row.sourceLocationHash));
 add(`${id}:location-hash-exact`,sha(row.url)===row.sourceLocationHash);
 add(`${id}:observation-hash-valid`,/^[a-f0-9]{64}$/u.test(row.observationSha256));
 add(`${id}:observation-hash-exact`,sha(without(row,"observationSha256"))===row.observationSha256);
 add(`${id}:raw-false`,row.rawDocumentStored===false&&row.rawDocumentSha256===null);
}
const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p18.static-policy-verification.v2",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks},null,2));
process.exit(failed.length?1:0);
