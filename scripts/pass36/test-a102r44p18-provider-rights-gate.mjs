import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildProviderRightsProjection, resolveProviderDeliveryRights } from "../../lib/compliance/provider-delivery-rights-gate.mjs";
const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a102r44p18-official-provider-rights-decision-matrix.json"),"utf8"));
const canonical=(value)=>Array.isArray(value)?`[${value.map(canonical).join(",")}]`:value&&typeof value==="object"?`{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`:JSON.stringify(value);
const sha=(value)=>crypto.createHash("sha256").update(typeof value==="string"?value:canonical(value)).digest("hex");
const clone=(value)=>structuredClone(value);
const rebindSource=(source)=>{source.sourceLocationHash=sha(source.url);source.observationSha256=sha(Object.fromEntries(Object.entries(source).filter(([key])=>key!=="observationSha256")));};
const rebindProvider=(row)=>{row.decisionSha256=sha(Object.fromEntries(Object.entries(row).filter(([key])=>key!=="decisionSha256")));};
const rebindMatrix=(value)=>{value.matrixSha256=sha(Object.fromEntries(Object.entries(value).filter(([key])=>key!=="matrixSha256")));};
const checks=[]; const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error.message});}};
for(const providerId of ["coinpaprika","coinbase"]){
 check(`${providerId}:internal-diagnostic-allowed`,()=>assert.equal(resolveProviderDeliveryRights({providerId,purpose:"internal_diagnostic",matrix}).allowed,true));
 for(const purpose of ["public_display","commercial_product","customer_delivery","caching","retention","redistribution","pdf_export","ai_rag","derived_analytics_external","paid_tier"]){
  check(`${providerId}:${purpose}-blocked`,()=>{const row=resolveProviderDeliveryRights({providerId,purpose,matrix});assert.equal(row.allowed,false);assert.ok(row.blockers.length>=1);});
 }
 check(`${providerId}:projection`,()=>{const p=buildProviderRightsProjection({providerId,matrix});assert.equal(p.customerDeliveryAllowed,false);assert.equal(p.paidTierAllowed,false);assert.equal(p.internalDiagnosticAllowed,true);});
}
check("unknown-provider-fail-closed",()=>assert.equal(resolveProviderDeliveryRights({providerId:"missing",purpose:"customer_delivery",matrix}).allowed,false));
check("unsupported-purpose-throws",()=>assert.throws(()=>resolveProviderDeliveryRights({providerId:"coinbase",purpose:"magic",matrix})));
check("matrix-tamper-blocked",()=>{const x=clone(matrix);x.globalTruthBoundary.rightsApprovedProviders=2;const r=resolveProviderDeliveryRights({providerId:"coinbase",purpose:"internal_diagnostic",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("matrix_digest_mismatch"));});
check("provider-row-tamper-blocked",()=>{const x=clone(matrix);x.providers[0].rights.publicDisplayAllowed=true;rebindMatrix(x);const r=resolveProviderDeliveryRights({providerId:"coinpaprika",purpose:"internal_diagnostic",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("provider_decision_digest_mismatch"));});
check("source-fact-tamper-blocked",()=>{const x=clone(matrix);x.sources.coinbase_terms.facts.push("tampered");for(const p of x.providers)rebindProvider(p);rebindMatrix(x);const r=resolveProviderDeliveryRights({providerId:"coinbase",purpose:"internal_diagnostic",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("source_observation_hash_mismatch:coinbase_terms"));});
check("source-url-tamper-blocked",()=>{const x=clone(matrix);x.sources.coinpaprika_terms.url="https://example.invalid/terms";x.sources.coinpaprika_terms.observationSha256=sha(Object.fromEntries(Object.entries(x.sources.coinpaprika_terms).filter(([key])=>key!=="observationSha256")));for(const p of x.providers)rebindProvider(p);rebindMatrix(x);const r=resolveProviderDeliveryRights({providerId:"coinpaprika",purpose:"internal_diagnostic",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("source_location_hash_mismatch:coinpaprika_terms"));});
check("duplicate-provider-blocked",()=>{const x=clone(matrix);x.providers.push(clone(x.providers[0]));rebindMatrix(x);const r=resolveProviderDeliveryRights({providerId:"coinpaprika",purpose:"internal_diagnostic",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("ambiguous_provider_rights_records"));});
check("fully-rebound-rights-still-need-approval-and-raw-terms",()=>{const x=clone(matrix);const p=x.providers.find((row)=>row.providerId==="coinpaprika");p.rights.publicDisplayAllowed=true;p.legalApprovalStatus="APPROVED";for(const s of Object.values(x.sources))rebindSource(s);for(const row of x.providers)rebindProvider(row);rebindMatrix(x);const r=resolveProviderDeliveryRights({providerId:"coinpaprika",purpose:"public_display",matrix:x});assert.equal(r.allowed,false);assert.ok(r.blockers.includes("raw_terms_document_hash_unavailable"));});
const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p18.provider-rights-gate-test.v2",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks},null,2));
process.exit(failed.length?1:0);
