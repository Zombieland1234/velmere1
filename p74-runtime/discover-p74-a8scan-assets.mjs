import fs from 'node:fs';
import path from 'node:path';
const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-a8scan-assets-out');
const BASE='https://scan.ancient8.gg';
const TARGET='0xca11bde05977b3631167028862be2a173976ca11';
fs.mkdirSync(OUT,{recursive:true});
async function text(url,init={}){const r=await fetch(url,{...init,signal:AbortSignal.timeout(12000),cache:'no-store'});const t=await r.text();return{status:r.status,contentType:r.headers.get('content-type'),text:t};}
const html=await text(`${BASE}/address/${TARGET}`,{headers:{accept:'text/html','user-agent':'Mozilla/5.0 VelmereP74AssetDiscovery/1.0'}});
const assets=[...new Set(html.text.match(/\/assets\/[A-Za-z0-9._-]+\.js/g)||[])];
const needles=['contractVerificationBaseUrl','deployed_bytecode','deployedBytecode','eth_getCode','/rpc','v2/contract','bytecode','rpcHttpUrl'];
const bundleHits=[];
for(const asset of assets){const x=await text(new URL(asset,BASE).toString(),{headers:{accept:'application/javascript,*/*;q=0.8','user-agent':'Mozilla/5.0 VelmereP74AssetDiscovery/1.0'}});const snippets=[];for(const n of needles){let i=x.text.indexOf(n);while(i>=0&&snippets.length<80){snippets.push({needle:n,snippet:x.text.slice(Math.max(0,i-500),Math.min(x.text.length,i+1000))});i=x.text.indexOf(n,i+n.length);}}if(snippets.length)bundleHits.push({asset,status:x.status,bytes:Buffer.byteLength(x.text),snippets});}
const body=JSON.stringify({jsonrpc:'2.0',id:74,method:'eth_getCode',params:[TARGET,'latest']});
const proxy=await text(`${BASE}/rpc`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74AssetDiscovery/1.0'},body});
let proxyJson=null;try{proxyJson=JSON.parse(proxy.text)}catch{}
const result={schemaVersion:'velmere.p74.a8scan-assets-discovery.v1',status:'DISCOVERY_ONLY_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),assetCount:assets.length,bundleHits,proxyProbe:{status:proxy.status,contentType:proxy.contentType,json:proxyJson,textPreview:proxy.text.slice(0,500)},credit:{product:0,currentRuntimeBytecode:0,sale:0,live:false},truthBoundary:'Explorer bundle/RPC discovery only; zero product/release credit.'};
fs.writeFileSync(path.join(OUT,'P74_A8SCAN_ASSETS_DISCOVERY.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,assetCount:assets.length,hitBundles:bundleHits.map(x=>x.asset),proxyProbe:result.proxyProbe},null,2));
