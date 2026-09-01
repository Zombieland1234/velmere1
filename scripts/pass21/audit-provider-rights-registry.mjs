#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path"; import { createHash } from "node:crypto";
const root=process.cwd(); const file="config/pass21/provider-commercial-rights-registry.json"; const registry=JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));
const errors=[]; const ids=new Set(); let externalVerified=0; let codePresent=0;
for(const p of registry.providers??[]){
 if(!p.id||ids.has(p.id)) errors.push(`duplicate_or_missing_id:${p.id}`); ids.add(p.id);
 if(p.technicalState==="CODE_PRESENT") codePresent++;
 for(const rel of p.integrationPaths??[]) if(!fs.existsSync(path.join(root,rel))) errors.push(`missing_integration:${p.id}:${rel}`);
 const evidence=p.evidence??[];
 if(p.rightsState==="VERIFIED") externalVerified++;
 if((p.commercialUseAllowed||p.redistributionAllowed||p.displayUseAllowed)&&p.rightsState!=="VERIFIED") errors.push(`rights_without_verification:${p.id}`);
 if(p.rightsState==="VERIFIED"&&evidence.length===0) errors.push(`verified_without_evidence:${p.id}`);
 for(const e of evidence){ if(!/^[0-9a-f]{64}$/.test(e.sha256??"")) errors.push(`bad_evidence_hash:${p.id}`); if(!fs.existsSync(path.join(root,e.path??""))) errors.push(`missing_evidence_file:${p.id}`); }
}
const required=["binance","coingecko","coinbase","kraken","alpha_vantage","twelve_data","polygon","coinmarketcap","defillama","etherscan","alchemy","quicknode","gemini","openai","angel_external","printful","tapstitch","contrado","stripe","supabase","resend"];
for(const id of required) if(!ids.has(id)) errors.push(`missing_required_provider:${id}`);
const dataSummary=JSON.parse(fs.readFileSync(path.join(root,"evaluation/pass20/data-field-provider-license-summary.json"),"utf8"));
if(dataSummary.providerBoundCells!==0||dataSummary.licenseVerifiedCells!==0||dataSummary.sellEligibleCells!==0) errors.push("pass20_zero_truth_changed_without_provider_receipts");
const result={schemaVersion:"velmere.pass21.provider-rights-audit.v1",generatedAt:"2026-07-20T13:00:00.000Z",ok:errors.length===0,providers:ids.size,codePresent,externalRightsVerified:externalVerified,commerciallyEnabledProviders:(registry.providers??[]).filter(p=>p.commercialUseAllowed).length,providerBoundCells:dataSummary.providerBoundCells,licenseVerifiedCells:dataSummary.licenseVerifiedCells,sellEligibleCells:dataSummary.sellEligibleCells,errors,registrySha256:createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex"),status:externalVerified===0?"REGISTRY_COMPLETE_EXTERNAL_RIGHTS_ZERO_NO_GO_PAID":"PARTIAL_RIGHTS",truthBoundary:registry.truthBoundary};
const out=path.join(root,".velmere/pass21-diagnostics/provider-rights-audit.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(1);
