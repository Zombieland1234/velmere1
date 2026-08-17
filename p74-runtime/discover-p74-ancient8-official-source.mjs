import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-ancient8-official-source-out');
const ADDRESS='0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const CHAIN_ID=888888888;
const A8='https://scan.ancient8.gg';
const RPC=`${A8}/rpc`;
const VERIFY='https://contracts.conduit.xyz/v2/contract';
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
async function http(url){const started=Date.now();try{const r=await fetch(url,{headers:{accept:'application/json,text/plain,*/*','user-agent':'VelmereP74OfficialSource/1.0'},signal:AbortSignal.timeout(20000),cache:'no-store'});const body=Buffer.from(await r.arrayBuffer());return{url,status:r.status,ok:r.ok,contentType:r.headers.get('content-type'),latencyMs:Date.now()-started,bytes:body.length,sha256:sha(body),bodyText:body.toString('utf8')};}catch(e){return{url,status:null,ok:false,error:e instanceof Error?`${e.name}:${e.message}`:String(e)}}}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:7407,method,params});const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74OfficialSource/1.0'},body,signal:AbortSignal.timeout(20000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{throw new Error(`${method}:invalid_json:http_${r.status}`)}if(!r.ok||j?.error||j?.result===undefined||j?.result===null)throw new Error(`${method}:rpc_error:http_${r.status}:${JSON.stringify(j?.error??j).slice(0,300)}`);return{result:j.result,httpStatus:r.status,requestSha256:sha(Buffer.from(body)),responseSha256:sha(Buffer.from(text))};}
function compact(row){let parsed=null;try{parsed=JSON.parse(row.bodyText)}catch{}return{url:row.url,status:row.status,ok:row.ok,contentType:row.contentType,latencyMs:row.latencyMs,bytes:row.bytes,sha256:row.sha256,error:row.error??null,json:parsed,textPreview:parsed?null:(row.bodyText??'').slice(0,1000)};}
const result={schemaVersion:'velmere.p74.ancient8-official-source-discovery.v1',status:'DISCOVERY_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainId:CHAIN_ID,address:ADDRESS,observations:{},errors:[],credit:{product:0,currentRuntimeBytecode:0,sourceDeploymentIdentity:0,vulnerabilityGroundTruth:0,customerFinal:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Discovery only. Captures exact current source/verification responses and runtime bytes. No source-to-deployment or product credit until compiler/settings replay is independently executed and matched.'};
try{
 const codeUrl=`${A8}/api/code?${new URLSearchParams({address:ADDRESS,chainId:String(CHAIN_ID),highlight:'false'})}`;
 const base=`${VERIFY}/${CHAIN_ID}/${ADDRESS}`;
 const candidates=[codeUrl,base,`${base}?fields=abi`,`${base}?fields=source`,`${base}?fields=sources`,`${base}?fields=compiler`,`${base}?fields=metadata`,`${base}?fields=abi,source,compiler,metadata`];
 const rows=[];for(const url of candidates){const row=await http(url);rows.push(compact(row));const name=`HTTP_${String(rows.length).padStart(2,'0')}.txt`;fs.writeFileSync(path.join(OUT,name),`URL ${url}\nSTATUS ${row.status}\nCONTENT_TYPE ${row.contentType}\nSHA256 ${row.sha256}\n\n${row.bodyText??row.error??''}`)}
 const [chain,head]=await Promise.all([rpc('eth_chainId'),rpc('eth_blockNumber')]);const blockTag=head.result;const code=await rpc('eth_getCode',[ADDRESS,blockTag]);if(typeof code.result!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(code.result))throw new Error('invalid_runtime');const runtime=Buffer.from(code.result.slice(2),'hex');fs.writeFileSync(path.join(OUT,'OFFICIAL_RUNTIME.hex'),`${code.result.toLowerCase()}\n`);
 result.observations={http:rows,rpc:{chainId:chain.result,head:blockTag,runtimeBytes:runtime.length,runtimeSha256:sha(runtime),runtimeHexTextSha256:sha(Buffer.from(`${code.result.toLowerCase()}\n`)),chainEvidence:{requestSha256:chain.requestSha256,responseSha256:chain.responseSha256},headEvidence:{requestSha256:head.requestSha256,responseSha256:head.responseSha256},codeEvidence:{requestSha256:code.requestSha256,responseSha256:code.responseSha256}}};
 const sourceRow=rows[0];result.status=sourceRow?.ok?'DISCOVERY_PASS_SOURCE_CHANNEL_RESPONDED_NO_PRODUCT_CREDIT':'DISCOVERY_INCONCLUSIVE_NO_PRODUCT_CREDIT';
}catch(e){result.status='DISCOVERY_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
fs.writeFileSync(path.join(OUT,'P74_ANCIENT8_OFFICIAL_SOURCE_DISCOVERY.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,address:result.address,http:result.observations.http?.map(x=>({url:x.url,status:x.status,ok:x.ok,bytes:x.bytes,sha256:x.sha256,jsonKeys:x.json&&typeof x.json==='object'?Object.keys(x.json):null,textPreview:x.textPreview})),rpc:result.observations.rpc,errors:result.errors},null,2));
