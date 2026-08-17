import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-l1-output-v3-out');
const ORACLE='0xb09dc08428c8b4efb4ff9c0827386cdf34277996';
const L1_BLOCK='0x189518d';
const OUTPUT_INDEX=13146n;
const GET_L2_OUTPUT_SELECTOR='0xa25ae557';
const PROVIDERS=[
  {id:'publicnode',url:'https://ethereum-rpc.publicnode.com'},
  {id:'drpc',url:'https://eth.drpc.org'},
  {id:'blockpi',url:'https://ethereum.public.blockpi.network/v1/rpc/public'},
  {id:'alchemy_docs_demo',url:'https://eth-mainnet.g.alchemy.com/v2/docs-demo'},
  {id:'cloudflare',url:'https://cloudflare-eth.com'},
];
const MAX_ATTEMPTS=8;
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const calldata=`${GET_L2_OUTPUT_SELECTOR}${OUTPUT_INDEX.toString(16).padStart(64,'0')}`;

function normalizeHex(v){if(typeof v!=='string'||!/^0x[0-9a-fA-F]*$/.test(v))throw new Error(`invalid_hex:${String(v).slice(0,80)}`);return v.toLowerCase();}
function decodeOutput(raw){const h=normalizeHex(raw).slice(2);if(h.length!==192)throw new Error(`unexpected_output_length:${h.length}`);return{outputRoot:`0x${h.slice(0,64)}`,timestamp:BigInt(`0x${h.slice(64,128)}`).toString(10),l2BlockNumber:BigInt(`0x${h.slice(128,192)}`).toString(10)};}
async function rpcOnce(provider,method,params,attempt){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const started=Date.now();try{const r=await fetch(provider.url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74L1OutputQuorum/3.0'},body,signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',attempt,httpStatus:r.status,error:`invalid_json:${text.slice(0,180)}`,latencyMs:Date.now()-started}};if(!r.ok||j?.error||j?.result===undefined||j?.result===null)return{status:'FAIL',attempt,httpStatus:r.status,error:JSON.stringify(j?.error??j).slice(0,300),latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text))};return{status:'PASS',attempt,httpStatus:r.status,result:j.result,latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text)),requestDigest:sha(Buffer.from(body))};}catch(e){return{status:'FAIL',attempt,error:e instanceof Error?`${e.name}:${e.message}`:String(e),latencyMs:Date.now()-started};}}
async function rpc(provider,method,params,{attempts=MAX_ATTEMPTS}={}){const rows=[];for(let i=1;i<=attempts;i++){const x=await rpcOnce(provider,method,params,i);rows.push(x);if(x.status==='PASS')return{...x,attempts:rows};if(i<attempts)await sleep([150,250,400,650,1000,1500,2200][Math.min(i-1,6)]);}return{...rows.at(-1),attempts:rows};}
async function probe(provider){
 const chain=await rpc(provider,'eth_chainId',[],{attempts:3});
 if(chain.status!=='PASS'||String(chain.result).toLowerCase()!=='0x1')return{provider,chain,status:'IDENTITY_FAIL'};
 const code=await rpc(provider,'eth_getCode',[ORACLE,L1_BLOCK],{attempts:5});
 const output=await rpc(provider,'eth_call',[{to:ORACLE,data:calldata},L1_BLOCK],{attempts:MAX_ATTEMPTS});
 let decoded=null,codeSummary=null,error=null;
 try{if(code.status!=='PASS')throw new Error(`oracle_code_failed:${code.error??'unknown'}`);if(output.status!=='PASS')throw new Error(`oracle_output_failed:${output.error??'unknown'}`);const codeHex=normalizeHex(code.result).slice(2);const codeBytes=Buffer.from(codeHex,'hex');if(codeBytes.length===0)throw new Error('oracle_code_empty');codeSummary={byteLength:codeBytes.length,sha256:sha(codeBytes)};decoded=decodeOutput(output.result);}catch(e){error=e instanceof Error?e.message:String(e);}
 return{provider,chain,code,output,codeSummary,decoded,error,status:decoded&&codeSummary?'PASS':'PROBE_FAIL'};
}

const result={schemaVersion:'velmere.p74.l1-oracle-output-quorum.v3',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),oracle:ORACLE,l1BlockTag:L1_BLOCK,outputIndex:OUTPUT_INDEX.toString(10),calldata,providers:PROVIDERS,observations:[],quorum:null,credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Focused control-only L1 oracle quorum diagnostic. No product/release credit. At least two independent Ethereum provider hosts must return the same non-empty oracle code hash and the exact same getL2Output(index) bytes at the exact same historical L1 block.'};
result.observations=await Promise.all(PROVIDERS.map(probe));
const passes=result.observations.filter(x=>x.status==='PASS');
const groups=new Map();
for(const row of passes){const key=JSON.stringify({codeHash:row.codeSummary.sha256,rawOutput:normalizeHex(row.output.result)});const arr=groups.get(key)||[];arr.push(row);groups.set(key,arr);}
let best=[];for(const arr of groups.values())if(arr.length>best.length)best=arr;
const decoded=best[0]?.decoded??null;
result.quorum={eligibleProviderCount:passes.length,largestAgreementGroup:best.length,providerHosts:best.map(x=>new URL(x.provider.url).hostname),providerIds:best.map(x=>x.provider.id),oracleCodeSha256:best[0]?.codeSummary?.sha256??null,rawOutput:best[0]?.output?.result?normalizeHex(best[0].output.result):null,decoded,pass:best.length>=2&&decoded?.l2BlockNumber==='23664600'&&decoded?.outputRoot==='0x2a0440424a946f6a2ce6309ab48333bdcd191a86631010a00ece069c4e47dc4e'};
result.status=result.quorum.pass?'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
fs.writeFileSync(path.join(OUT,'P74_L1_ORACLE_OUTPUT_QUORUM_V3.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,quorum:result.quorum,providerSummary:result.observations.map(x=>({id:x.provider.id,status:x.status,chain:x.chain.status,code:x.code?.status??null,output:x.output?.status??null,error:x.error??null,outputAttempts:x.output?.attempts?.length??0}))},null,2));
