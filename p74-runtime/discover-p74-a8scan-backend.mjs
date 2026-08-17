import fs from 'node:fs';
import path from 'node:path';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-a8scan-discovery-out');
const BASE='https://scan.ancient8.gg';
const TARGET='0xca11bde05977b3631167028862be2a173976ca11';
fs.mkdirSync(OUT,{recursive:true});

async function get(url){const r=await fetch(url,{headers:{accept:'text/html,application/xhtml+xml,*/*;q=0.8','user-agent':'Mozilla/5.0 VelmereP74Discovery/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();return{url,status:r.status,contentType:r.headers.get('content-type'),text};}
function urls(text){return [...new Set((text.match(/https?:\\?\/\\?\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g)||[]).map(x=>x.replaceAll('\\/','/')))].sort();}
function scripts(text){return [...new Set([...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]))];}
function interesting(text){return text.split(/\r?\n/).filter(line=>/api|backend|blockscout|NEXT_PUBLIC|scan\.ancient8|graphql|socket/i.test(line)).slice(0,500);}

const pages=[];
for(const u of [`${BASE}/`,`${BASE}/address/${TARGET}`]){
 const x=await get(u);pages.push({url:x.url,status:x.status,contentType:x.contentType,bytes:Buffer.byteLength(x.text),urls:urls(x.text),scripts:scripts(x.text),interesting:interesting(x.text)});
 fs.writeFileSync(path.join(OUT,u.endsWith('/')?'A8SCAN_HOME.html':'A8SCAN_TARGET.html'),x.text);
}
const scriptRefs=[...new Set(pages.flatMap(p=>p.scripts))].slice(0,80);
const chunks=[];
for(const ref of scriptRefs){
 try{const u=new URL(ref,BASE).toString();const r=await fetch(u,{headers:{accept:'application/javascript,*/*;q=0.8','user-agent':'Mozilla/5.0 VelmereP74Discovery/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();const hit=/api|backend|blockscout|NEXT_PUBLIC|graphql|scan\.ancient8/i.test(text);if(hit){chunks.push({url:u,status:r.status,bytes:Buffer.byteLength(text),urls:urls(text).slice(0,100),snippets:(text.match(/.{0,140}(?:api|backend|blockscout|NEXT_PUBLIC|graphql|scan\.ancient8).{0,220}/gi)||[]).slice(0,50)});}}
 catch(e){chunks.push({url:ref,status:'ERROR',error:e instanceof Error?e.message:String(e)});}
}
const result={schemaVersion:'velmere.p74.a8scan-backend-discovery.v1',status:'DISCOVERY_ONLY_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),pages,chunks,credit:{product:0,currentRuntimeBytecode:0,sale:0,live:false},truthBoundary:'Explorer-backend discovery only; no product or release credit.'};
fs.writeFileSync(path.join(OUT,'P74_A8SCAN_BACKEND_DISCOVERY.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,pages:pages.map(p=>({url:p.url,status:p.status,bytes:p.bytes,scriptCount:p.scripts.length,urlCount:p.urls.length})),interestingChunks:chunks.length},null,2));
