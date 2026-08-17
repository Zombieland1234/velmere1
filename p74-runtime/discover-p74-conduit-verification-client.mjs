import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-conduit-verification-client-out');
const HOME='https://scan.ancient8.gg/';
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
async function get(url){const r=await fetch(url,{headers:{accept:'*/*','user-agent':'VelmereP74VerificationDiscovery/1.0'},signal:AbortSignal.timeout(20000),cache:'no-store'});const body=Buffer.from(await r.arrayBuffer());return{url,status:r.status,headers:Object.fromEntries(r.headers),body,sha256:sha(body)};}
const result={schemaVersion:'velmere.p74.conduit-verification-client-discovery.v1',status:'DISCOVERY_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),home:HOME,assets:[],matches:[],errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Discovery only. Captures current explorer frontend code to identify the exact contract-verification client schema. No product/release credit.'};
try{
 const home=await get(HOME);if(home.status!==200)throw new Error(`home_http_${home.status}`);const html=home.body.toString('utf8');fs.writeFileSync(path.join(OUT,'A8SCAN_HOME_CURRENT.html'),home.body);
 const cfg=html.match(/window\.__CONFIG__\s*=\s*(\{.*?\});<\/script>/s);if(cfg){try{result.config=JSON.parse(cfg[1]);}catch(e){result.errors.push(`config_parse:${e.message}`)}}
 const urls=new Set();for(const m of html.matchAll(/(?:src|href)="([^"]+\.js(?:\?[^\"]*)?)"/g)){const raw=m[1];urls.add(new URL(raw,HOME).href)}
 for(const m of html.matchAll(/preloads:\$R\[\d+\]=\[(.*?)\]/gs)){for(const q of m[1].matchAll(/"([^\"]+\.js)"/g))urls.add(new URL(q[1],HOME).href)}
 for(const url of urls){try{const row=await get(url);const name=url.split('/').pop().split('?')[0];const safe=name.replace(/[^A-Za-z0-9._-]/g,'_');fs.writeFileSync(path.join(OUT,safe),row.body);const text=row.body.toString('utf8');const needles=['contractVerificationBaseUrl','contracts.conduit.xyz','/v2/contract','contractSource','isVerified','verification'];const hits=[];for(const needle of needles){let start=0;while(true){const i=text.indexOf(needle,start);if(i<0)break;hits.push({needle,index:i,context:text.slice(Math.max(0,i-900),Math.min(text.length,i+1800))});start=i+needle.length;if(hits.length>100)break}}
 result.assets.push({url,status:row.status,bytes:row.body.length,sha256:row.sha256,hitCount:hits.length});if(hits.length)result.matches.push({url,hits});}catch(e){result.errors.push(`${url}:${e.message}`)}}
 result.status=result.matches.length?'DISCOVERY_PASS_CLIENT_CODE_FOUND_NO_PRODUCT_CREDIT':'DISCOVERY_INCONCLUSIVE_NO_PRODUCT_CREDIT';
}catch(e){result.status='DISCOVERY_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
fs.writeFileSync(path.join(OUT,'P74_CONDUIT_VERIFICATION_CLIENT_DISCOVERY.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,config:result.config,assets:result.assets,matches:result.matches.map(x=>({url:x.url,hitCount:x.hits.length,needles:[...new Set(x.hits.map(h=>h.needle))]})),errors:result.errors},null,2));
