import fs from 'node:fs';
import path from 'node:path';
const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-thirdweb-proof-out');
const RPC='https://888888888.rpc.thirdweb.com';
const TARGET='0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const ANCHOR_BLOCK='0x25d1e19'; // 39,655,449
fs.mkdirSync(OUT,{recursive:true});
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:7420,method,params});const started=Date.now();try{const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74ThirdwebProof/1.0'},body,signal:AbortSignal.timeout(15000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',method,httpStatus:r.status,error:`invalid_json:${text.slice(0,180)}`,latencyMs:Date.now()-started}};if(!r.ok||j?.error||j?.result==null)return{status:'FAIL',method,httpStatus:r.status,error:j?.error??j,latencyMs:Date.now()-started};return{status:'PASS',method,httpStatus:r.status,result:j.result,latencyMs:Date.now()-started};}catch(e){return{status:'FAIL',method,error:e instanceof Error?`${e.name}:${e.message}`:String(e),latencyMs:Date.now()-started};}}
const result={schemaVersion:'velmere.p74.thirdweb-proof-capability.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),provider:'thirdweb',rpc:RPC,target:TARGET,anchorBlock:ANCHOR_BLOCK,observations:{},credit:{product:0,currentRuntimeBytecode:0,customerFinal:0,sale:0,live:false},truthBoundary:'Capability diagnostic only. No product or release credit under any outcome.'};
const chain=await rpc('eth_chainId');
const head=await rpc('eth_blockNumber');
const anchorProof=await rpc('eth_getProof',[TARGET,[],ANCHOR_BLOCK]);
let recentProof=null,recentTag=null;
if(head.status==='PASS'){const n=BigInt(head.result);recentTag=`0x${(n>64n?n-64n:n).toString(16)}`;recentProof=await rpc('eth_getProof',[TARGET,[],recentTag]);}
result.observations={chain,head,anchorProof,recentTag,recentProof};
result.status=chain.status==='PASS'&&anchorProof.status==='PASS'?'DIAGNOSTIC_CAPABILITY_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_CAPABILITY_BLOCKED_NO_PRODUCT_CREDIT';
fs.writeFileSync(path.join(OUT,'P74_THIRDWEB_PROOF_CAPABILITY.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
