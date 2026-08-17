import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-thirdweb-a8scan-out');
const A8='https://scan.ancient8.gg/rpc';
const THIRDWEB='https://888888888.rpc.thirdweb.com';
const CHAIN='0x34fb5e38';
const TARGETS={canonicalExpected:'0xca11bde05977b3631167028862be2a173976ca11',officialDocumented:'0xb76d6e8c82d06fd262ef3799db73d5a724108d4e'};
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
function norm(v){if(typeof v!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(v))throw new Error('invalid_bytecode');return v.toLowerCase();}
function code(v){const n=norm(v),b=Buffer.from(n.slice(2),'hex');return{byteLength:b.length,empty:b.length===0,sha256:sha(b),castTextBytes:Buffer.byteLength(`${n}\n`),castTextSha256:sha(Buffer.from(`${n}\n`))};}
async function rpc(url,provider,method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const started=Date.now();try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74Quorum/1.0'},body,signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',provider,method,httpStatus:r.status,error:`invalid_json:${text.slice(0,220)}`,latencyMs:Date.now()-started}};if(!r.ok||j?.error||typeof j?.result!=='string')return{status:'FAIL',provider,method,httpStatus:r.status,error:JSON.stringify(j?.error??j).slice(0,300),latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text))};return{status:'PASS',provider,method,httpStatus:r.status,result:j.result,latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text)),requestDigest:sha(Buffer.from(body))};}catch(e){return{status:'FAIL',provider,method,error:e instanceof Error?`${e.name}:${e.message}`:String(e),latencyMs:Date.now()-started};}}

const result={schemaVersion:'velmere.p74.thirdweb-a8scan-bytecode-quorum-diagnostic.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainIdDecimal:888888888,sources:{a8scan:{root:'scan.ancient8.gg/rpc',providerFamily:'a8scan_public_rpc_proxy'},thirdweb:{root:'888888888.rpc.thirdweb.com',providerFamily:'thirdweb_rpc'}},targets:TARGETS,observations:{},quorum:null,errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Control-only 2-provider diagnostic. No product/release credit. Current-runtime quorum requires both providers to report Ancient8 chain ID and byte-identical non-empty code for both target addresses at the exact same common block.'};
const [a8Chain,twChain,a8Head,twHead]=await Promise.all([rpc(A8,'a8scan','eth_chainId'),rpc(THIRDWEB,'thirdweb','eth_chainId'),rpc(A8,'a8scan','eth_blockNumber'),rpc(THIRDWEB,'thirdweb','eth_blockNumber')]);
result.observations.identity={a8Chain,twChain,a8Head,twHead};
if(a8Chain.status!=='PASS'||twChain.status!=='PASS'||a8Head.status!=='PASS'||twHead.status!=='PASS'){
 result.status='DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push('provider_identity_or_head_unavailable');
}else if(a8Chain.result.toLowerCase()!==CHAIN||twChain.result.toLowerCase()!==CHAIN){
 result.status='DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(`chain_id_mismatch:a8=${a8Chain.result}:thirdweb=${twChain.result}`);
}else{
 const a8N=BigInt(a8Head.result),twN=BigInt(twHead.result),snapshot=a8N<twN?a8N:twN,tag=`0x${snapshot.toString(16)}`;
 result.observations.snapshot={blockNumberDecimal:snapshot.toString(10),blockTag:tag,headGapBlocks:(a8N>=twN?a8N-twN:twN-a8N).toString(10)};
 const rows={};
 for(const [id,address] of Object.entries(TARGETS)){
   const [a8Code,twCode]=await Promise.all([rpc(A8,'a8scan','eth_getCode',[address,tag]),rpc(THIRDWEB,'thirdweb','eth_getCode',[address,tag])]);
   const row={address,a8scan:a8Code,thirdweb:twCode,byteIdentical:false};
   if(a8Code.status==='PASS')try{row.a8scan.code=code(a8Code.result)}catch(e){result.errors.push(`${id}:a8_code:${e.message}`)};
   if(twCode.status==='PASS')try{row.thirdweb.code=code(twCode.result)}catch(e){result.errors.push(`${id}:thirdweb_code:${e.message}`)};
   if(row.a8scan.code&&row.thirdweb.code)row.byteIdentical=row.a8scan.code.sha256===row.thirdweb.code.sha256&&row.a8scan.code.byteLength===row.thirdweb.code.byteLength;
   rows[id]=row;
 }
 result.observations.bytecode=rows;
 const c=rows.canonicalExpected,a=rows.officialDocumented;
 const cPass=c.byteIdentical&&!c.a8scan.code?.empty&&!c.thirdweb.code?.empty;
 const aPass=a.byteIdentical&&!a.a8scan.code?.empty&&!a.thirdweb.code?.empty;
 const distinct=!!c.a8scan.code&&!!a.a8scan.code&&c.a8scan.code.sha256!==a.a8scan.code.sha256;
 result.quorum={twoProviderRoots:true,sameCommonBlock:true,canonicalCodeAgrees:cPass,officialDocumentedCodeAgrees:aPass,canonicalAndOfficialDocumentedDiffer:distinct,pass:cPass&&aPass&&distinct};
 result.status=result.quorum.pass?'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
}
fs.writeFileSync(path.join(OUT,'P74_THIRDWEB_A8SCAN_QUORUM_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
