import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-a8scan-routes-out');
const BASE='https://scan.ancient8.gg';
const RPC=`${BASE}/rpc`;
const CHAIN_ID=888888888;
const CHAIN_HEX='0x34fb5e38';
const TARGETS={canonicalExpected:'0xca11bde05977b3631167028862be2a173976ca11',officialDocumented:'0xb76d6e8c82d06fd262ef3799db73d5a724108d4e'};
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
function norm(v){if(typeof v!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(v))throw new Error('invalid_bytecode');return v.toLowerCase();}
function summary(v){const n=norm(v),b=Buffer.from(n.slice(2),'hex');return{byteLength:b.length,empty:b.length===0,sha256:sha(b),castTextBytes:Buffer.byteLength(`${n}\n`),castTextSha256:sha(Buffer.from(`${n}\n`))};}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const t=Date.now();const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74Routes/1.0'},body,signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{throw new Error(`rpc:${method}:invalid_json:${r.status}:${text.slice(0,180)}`)}if(!r.ok||j?.error||typeof j?.result!=='string')throw new Error(`rpc:${method}:failed:${r.status}:${JSON.stringify(j?.error??j).slice(0,220)}`);return{result:j.result,statusCode:r.status,latencyMs:Date.now()-t,responseDigest:sha(Buffer.from(text)),requestDigest:sha(Buffer.from(body))};}
async function codeRoute(address){const u=new URL('/api/code',BASE);u.searchParams.set('address',address.toLowerCase());u.searchParams.set('chainId',String(CHAIN_ID));u.searchParams.set('highlight','false');const t=Date.now();const r=await fetch(u,{headers:{accept:'application/json','user-agent':'VelmereP74Routes/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}return{url:u.toString(),statusCode:r.status,contentType:r.headers.get('content-type'),latencyMs:Date.now()-t,responseDigest:sha(Buffer.from(text)),json:j,textPreview:text.slice(0,1000)};}

const result={schemaVersion:'velmere.p74.a8scan-public-routes-diagnostic.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainIdDecimal:CHAIN_ID,sources:{rpc:{root:'scan.ancient8.gg/rpc',class:'a8scan_public_json_rpc_proxy'},code:{root:'scan.ancient8.gg/api/code',class:'a8scan_public_contract_verification_route'}},targets:TARGETS,observations:{},adjudication:null,errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Control-only A8Scan route diagnostic. RPC and code routes are separate public data paths but share the scan.ancient8.gg origin and are not counted as independent-provider quorum. Zero product/release credit.'};
try{
 const [chain,head]=await Promise.all([rpc('eth_chainId'),rpc('eth_blockNumber')]);
 result.observations.chainId=chain;result.observations.head=head;
 if(chain.result.toLowerCase()!==CHAIN_HEX)throw new Error(`chain_id_mismatch:${chain.result}`);
 const rows={};
 for(const [id,address] of Object.entries(TARGETS)){
   const [runtime,verification]=await Promise.all([rpc('eth_getCode',[address,'latest']),codeRoute(address)]);
   rows[id]={address,runtime:{...runtime,code:summary(runtime.result)},verification};
 }
 result.observations.targets=rows;
 const c=rows.canonicalExpected,a=rows.officialDocumented;
 const cVerification=c.verification.json;
 const aVerification=a.verification.json;
 result.adjudication={
   canonicalRuntimePresent:!c.runtime.code.empty,
   officialRuntimePresent:!a.runtime.code.empty,
   runtimesDiffer:c.runtime.code.sha256!==a.runtime.code.sha256,
   canonicalVerificationHttp:c.verification.statusCode,
   officialVerificationHttp:a.verification.statusCode,
   canonicalRuntimeMatch:cVerification?.runtimeMatch??null,
   officialRuntimeMatch:aVerification?.runtimeMatch??null,
   canonicalCompilation:cVerification?.compilation??null,
   officialCompilation:aVerification?.compilation??null,
   canonicalVerifiedAt:cVerification?.verifiedAt??null,
   officialVerifiedAt:aVerification?.verifiedAt??null,
 };
 result.status='DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT';
}catch(e){result.status='DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
fs.writeFileSync(path.join(OUT,'P74_A8SCAN_PUBLIC_ROUTES_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
