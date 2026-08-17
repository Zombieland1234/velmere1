import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildAuditAdjudicatedAuthorityEvidence } from '../p73diag-work/source/lib/security/audit-adjudicated-authority-evidence';
import { safeEgressFetchWithTrace } from '../p73diag-work/source/lib/network/safe-egress';
import { readResponseBytesBounded } from '../p73diag-work/source/lib/network/fetch-with-deadline';
import { buildPass2814ExternalUrlDecision } from '../p73diag-work/source/lib/market-integrity/top1-source-poisoning-ssrf-firewall';

const OUT=process.env.P73_RESULT_DIR || path.resolve('p73diag-out');fs.mkdirSync(OUT,{recursive:true});
function sha(bytes:Uint8Array){return createHash('sha256').update(bytes).digest('hex');}
async function probe(id:string,url:string){
  try{
    const decision=buildPass2814ExternalUrlDecision(url);
    if(!decision.allowed||!decision.normalizedUrl) throw new Error(`firewall_blocked:${JSON.stringify(decision)}`);
    const host=new URL(decision.normalizedUrl).hostname.toLowerCase();
    const {response,trace}=await safeEgressFetchWithTrace(decision.normalizedUrl,{method:'GET',cache:'no-store',headers:{accept:'text/plain,text/html,application/json,*/*;q=0.1','user-agent':'VelmereP73Diagnostic/1.0'}},{allowedHosts:new Set([host]),allowSubdomains:false,maxRedirects:2,timeoutMs:7_500,operation:`p73_diag_${id}`,allowedMethods:['GET'],maxRequestBytes:0,maxResponseBytes:1_500_000});
    const bytes=await readResponseBytesBounded(response,1_500_000);
    return {id,url,state:'PASS',statusCode:response.status,finalUrl:trace.finalUrl,bodyBytes:bytes.byteLength,bodySha256:sha(bytes),contentType:response.headers.get('content-type')};
  }catch(error){return {id,url,state:'FAIL',error:error instanceof Error?`${error.name}: ${error.message}`:String(error)};}
}
async function main(){
  const evidence=await buildAuditAdjudicatedAuthorityEvidence({chain:'ancient8',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11'});
  const endpointProbes=[];
  endpointProbes.push(await probe('github_api_owner_comment','https://api.github.com/repos/mds1/multicall3/issues/comments/2495504312'));
  endpointProbes.push(await probe('frozen_raw_readme','https://raw.githubusercontent.com/mds1/multicall3/b667d67ecfa5361a81e8f110234ce242613b0012/README.md'));
  const result={schemaVersion:'velmere.p73r4r3.authority-runtime-diagnostic.v2',status:'PASS_DIAGNOSTIC_ZERO_CREDIT',evidence,endpointProbes,credit:{customerFinalOutput:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Diagnostic only. Emits exact authority evidence plus safe-egress endpoint behavior. No product or release credit.'};
  fs.writeFileSync(path.join(OUT,'P73R4R3_AUTHORITY_RUNTIME_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch((error)=>{console.error(error);process.exit(1)});
