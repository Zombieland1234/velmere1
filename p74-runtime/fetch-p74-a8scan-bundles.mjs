import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-a8scan-bundles-out');
const BASE='https://scan.ancient8.gg';
const ASSETS=['/assets/vendor-tanstack-cC0_lpeL.js','/assets/_address-BX0IuAst.js'];
fs.mkdirSync(OUT,{recursive:true});
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[];
for(const rel of ASSETS){
 const url=new URL(rel,BASE).toString();
 const r=await fetch(url,{headers:{accept:'application/javascript,*/*;q=0.8','user-agent':'Mozilla/5.0 VelmereP74BundleCapture/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});
 const bytes=Buffer.from(await r.arrayBuffer());
 if(!r.ok||bytes.length===0)throw new Error(`bundle_fetch_failed:${r.status}:${rel}`);
 fs.writeFileSync(path.join(OUT,path.basename(rel)),bytes);
 rows.push({rel,url,status:r.status,contentType:r.headers.get('content-type'),bytes:bytes.length,sha256:sha(bytes)});
}
const result={schemaVersion:'velmere.p74.a8scan-bundle-capture.v1',status:'PASS_DISCOVERY_ONLY_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),rows,credit:{product:0,currentRuntimeBytecode:0,sale:0,live:false},truthBoundary:'Public explorer bundle capture only. Used to identify the exact frontend data routes; grants zero product/release credit.'};
fs.writeFileSync(path.join(OUT,'P74_A8SCAN_BUNDLE_CAPTURE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));