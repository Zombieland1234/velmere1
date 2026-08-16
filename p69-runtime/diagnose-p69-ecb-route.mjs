import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.env.P69_SOURCE_ROOT||process.cwd();
const out=process.env.P69_RESULT_DIR||path.resolve(root,'../p69-out');fs.mkdirSync(out,{recursive:true});
const u=(p)=>pathToFileURL(path.join(root,p)).href;
const {handleRealMarketsGet}=await import(u('lib/market-integrity/real-markets-route-orchestrator.ts'));
const hydration=await import(u('lib/market-integrity/real-markets-quote-hydration.ts'));
const symbols=['EURUSD=X','EURPLN=X','EURGBP=X','EURTRY=X'];
const req=`http://localhost/api/market-integrity/real-markets?referenceFx=1&symbols=${encodeURIComponent(symbols.join(','))}`;
const response=await handleRealMarketsGet(new Request(req));
const raw=await response.text();
let payload=null;try{payload=JSON.parse(raw);}catch{}
const env=payload?.pass69EcbOfficialFxReferenceEnvelope??null;
const direct={};
for(const [name,url] of [['data',hydration.PASS69_ECB_REFERENCE_DATA_URL],['policy',hydration.PASS69_ECB_REUSE_POLICY_URL]]){
  try{
    const r=await fetch(url,{redirect:'manual',headers:{'user-agent':'Velmere-P69-Diagnostic/1.0'}});
    direct[name]={status:r.status,location:r.headers.get('location'),contentType:r.headers.get('content-type'),url:r.url};
  }catch(error){direct[name]={error:error instanceof Error?`${error.name}:${error.message}`:String(error)};}
}
const diag={status:'DIAGNOSTIC_ONLY_NO_CREDIT',route:{status:response.status,raw,payload},envelope:env,direct,truthBoundary:'Diagnostic-only transport receipt. It grants zero customer, rights, value, sale or LIVE credit.'};
fs.writeFileSync(path.join(out,'P69_ECB_ROUTE_DIAGNOSTIC.json'),JSON.stringify(diag,null,2)+'\n');
console.log(JSON.stringify(diag,null,2));
