import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-rest-diagnostic-out');
const CONDUIT='https://rpc-ancient8-mainnet-0.t.conduit.xyz/';
const SCAN='https://scan.ancient8.gg';
const EXPECTED_CHAIN='0x34fb5e38';
const TARGETS={canonicalExpected:'0xca11bde05977b3631167028862be2a173976ca11',officialDocumented:'0xb76d6e8c82d06fd262ef3799db73d5a724108d4e'};
fs.mkdirSync(OUT,{recursive:true});
const sha=(b)=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
function norm(v){if(typeof v!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(v))throw new Error('invalid_bytecode');return v.toLowerCase();}
function sum(v){const n=norm(v),b=Buffer.from(n.slice(2),'hex');return{byteLength:b.length,empty:b.length===0,sha256:sha(b)};}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const t=Date.now();try{const r=await fetch(CONDUIT,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74Diagnostic/4.0'},body,signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',error:`invalid_json:http_${r.status}:${text.slice(0,180)}`,latencyMs:Date.now()-t}};if(!r.ok||j?.error||typeof j?.result!=='string')return{status:'FAIL',error:`http_${r.status}:${JSON.stringify(j?.error??j).slice(0,220)}`,latencyMs:Date.now()-t};return{status:'PASS',result:j.result,httpStatus:r.status,latencyMs:Date.now()-t,requestDigest:sha(Buffer.from(body))};}catch(e){return{status:'FAIL',error:e instanceof Error?`${e.name}:${e.message}`:String(e),latencyMs:Date.now()-t};}}
async function scanJson(url,label){const t=Date.now();try{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'VelmereP74Diagnostic/4.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',error:`${label}:invalid_json:http_${r.status}:${text.slice(0,180)}`,latencyMs:Date.now()-t}};if(!r.ok)return{status:'FAIL',error:`${label}:http_${r.status}:${text.slice(0,220)}`,latencyMs:Date.now()-t};return{status:'PASS',json:j,httpStatus:r.status,latencyMs:Date.now()-t,responseDigest:sha(Buffer.from(text))};}catch(e){return{status:'FAIL',error:`${label}:${e instanceof Error?e.message:String(e)}`,latencyMs:Date.now()-t};}}
async function main(){
 const result={schemaVersion:'velmere.p74.conduit-blockscout-rest-diagnostic.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',sources:{conduit:{upstreamRoot:'rpc-ancient8-mainnet-0.t.conduit.xyz',providerFamily:'conduit_public_rpc'},blockscout:{upstreamRoot:'scan.ancient8.gg',providerFamily:'blockscout_rest_v2'}},targets:TARGETS,observations:{},quorum:null,errors:[],credit:{productChange:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Control-only current-state diagnostic. Blockscout REST deployed_bytecode and Conduit RPC are independent acquisition roots but this run grants zero product/release credit. Historical same-block equivalence is not claimed by the REST lane.'};
 const [chain,head,scanHead]=await Promise.all([rpc('eth_chainId'),rpc('eth_blockNumber'),scanJson(`${SCAN}/api?module=block&action=eth_block_number`,'scan_head')]);
 result.observations.chainId=chain;result.observations.conduitHead=head;result.observations.blockscoutHead=scanHead;
 if(chain.status!=='PASS'||chain.result.toLowerCase()!==EXPECTED_CHAIN)result.errors.push(`conduit_chain:${chain.error??chain.result}`);
 if(head.status!=='PASS')result.errors.push(`conduit_head:${head.error}`);
 let scanHeadHex=null;
 if(scanHead.status==='PASS')scanHeadHex=typeof scanHead.json?.result==='string'?scanHead.json.result:null;else result.errors.push(scanHead.error);
 const rows={};
 for(const [id,address] of Object.entries(TARGETS)){
   const [live,sc]=await Promise.all([rpc('eth_getCode',[address,'latest']),scanJson(`${SCAN}/api/v2/smart-contracts/${address}`,'scan_contract')]);
   const row={address,conduit:live,blockscout:sc,byteIdentical:false};
   if(live.status==='PASS'){try{row.conduitCode=sum(live.result)}catch(e){result.errors.push(`${id}:conduit_code:${e.message}`)}}
   if(sc.status==='PASS'){
     const deployed=sc.json?.deployed_bytecode;
     row.blockscoutFlags={isVerified:sc.json?.is_verified??null,isChangedBytecode:sc.json?.is_changed_bytecode??null,creationStatus:sc.json?.creation_status??null};
     try{row.blockscoutCode=sum(deployed)}catch(e){result.errors.push(`${id}:blockscout_code:${e.message}`)}
   } else result.errors.push(`${id}:${sc.error}`);
   if(row.conduitCode&&row.blockscoutCode)row.byteIdentical=row.conduitCode.sha256===row.blockscoutCode.sha256&&row.conduitCode.byteLength===row.blockscoutCode.byteLength;
   rows[id]=row;
 }
 result.observations.bytecode=rows;
 const c=rows.canonicalExpected,a=rows.officialDocumented;
 const cPass=!!c.byteIdentical&&!c.conduitCode?.empty&&!c.blockscoutCode?.empty;
 const aPass=!!a.byteIdentical&&!a.conduitCode?.empty&&!a.blockscoutCode?.empty;
 const distinct=!!c.conduitCode&&!!a.conduitCode&&c.conduitCode.sha256!==a.conduitCode.sha256;
 const headGap=(head.status==='PASS'&&scanHeadHex&&/^0x[0-9a-fA-F]+$/.test(scanHeadHex))?(BigInt(head.result)>=BigInt(scanHeadHex)?BigInt(head.result)-BigInt(scanHeadHex):BigInt(scanHeadHex)-BigInt(head.result)):null;
 result.quorum={twoIndependentAcquisitionRoots:true,conduitChainCorrect:chain.status==='PASS'&&chain.result.toLowerCase()===EXPECTED_CHAIN,canonicalCurrentCodeAgrees:cPass,officialDocumentedCurrentCodeAgrees:aPass,canonicalAndOfficialDocumentedDiffer:distinct,headGapBlocks:headGap===null?null:headGap.toString(),sameBlockNotClaimed:true,pass:cPass&&aPass&&distinct&&headGap!==null&&headGap<=20n};
 result.status=result.quorum.pass?'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
 fs.writeFileSync(path.join(OUT,'P74_CONDUIT_BLOCKSCOUT_REST_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
