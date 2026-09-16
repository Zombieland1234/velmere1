import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:3000';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname), 'Local isolated server only');
const path = '/api/account/customer-artifact?id=test-snapshot-123';
const cases = [
  ['anonymous',path,{},401,'account_session_required'],
  ['malformed-bearer',path,{headers:{authorization:'Bearer invalid.jwt.signature'}},401,'account_session_required'],
  ['forged-cookie',path,{headers:{cookie:'velmere_account_session=forged.invalid'}},401,'account_session_required'],
  ['duplicate-cookie',path,{headers:{cookie:'velmere_account_session=a; velmere_account_session=b'}},401,'account_session_required'],
  ['untrusted-account-id',path,{headers:{'x-velmere-account-id':'supabase:00000000-0000-4000-8000-000000000001'}},401,'account_session_required'],
  ['forged-case-ref',path+'&caseRef=FORGED',{},401,'account_session_required'],
  ['path-traversal','/api/account/customer-artifact?id=../../etc/passwd',{},401,'account_session_required'],
  ['wrong-method',path,{method:'POST'},405,null],
  ['production-diagnostics-absent','/api/internal/r13/release',{},404,null],
  ['cross-origin-request','/api/shield/analysis/composite',{method:'POST',headers:{'content-type':'application/json',origin:'https://untrusted.example.invalid'},body:'{"symbol":"BTC"}'},403,null],
  ['credential-candidate-cannot-bypass-missing-runtime',path,{headers:{'x-velmere-account-auth':'invalid-signature'}},503,null],
];
const results=[];
for (const [name,url,init,status,error] of cases) {
  const start=Date.now();
  try {
    const response=await fetch(base+url,{...init,signal:AbortSignal.timeout(10000)});
    const text=await response.text();let body;try{body=JSON.parse(text);}catch{body=null;}
    const pass=response.status===status && (error===null || body?.error===error)
      && !text.includes('PRIVATE KEY') && !text.includes('node_modules/');
    results.push({name,expectedStatus:status,status:response.status,error:body?.error??null,mode:body?.mode??null,pass,durationMs:Date.now()-start});
  } catch(e) {results.push({name,pass:false,error:e.name,durationMs:Date.now()-start});}
}
const burst=await Promise.all(Array.from({length:20},async()=>{
  const r=await fetch(base+path,{signal:AbortSignal.timeout(10000)});await r.arrayBuffer();return r.status;
}));
results.push({name:'20-concurrent-anonymous-requests-rejected',pass:burst.every(s=>s===401),statusCodes:burst});
mkdirSync('r13f-evidence',{recursive:true});
const receipt={schemaVersion:'velmere.r13f.local-production-http.v1',executedAt:new Date().toISOString(),sourceCommit:process.env.R13F_SOURCE_SHA??null,scope:'Real HTTP against local production build with no live credentials. Rejection paths only; NOT two-tenant isolation or paid-product E2E.',total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
writeFileSync('r13f-evidence/http-contract.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(receipt.failed)process.exitCode=1;
