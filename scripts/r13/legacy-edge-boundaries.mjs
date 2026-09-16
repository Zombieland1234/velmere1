import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Bounded negative checks of an ALREADY DEPLOYED R7 edge function. These are
// NOT R13 application E2E. Reviewed handler rejects every request below before
// user/entitlement RPCs. No real JWT, capability, user ID or account is used.
const target='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/velmere-product-entitlement-bridge';
const fakeJwt=['SYNTHETIC_HEADER','SYNTHETIC_PAYLOAD','SYNTHETIC_SIGNATURE'].join('.');
const cap='SYNTHETIC_INVALID_CAPABILITY_'.repeat(3);
const cases=[
  {id:'method',method:'GET',expected:405,error:'method_not_allowed'},
  {id:'anonymous',method:'POST',body:'{}',expected:401,error:'authentication_required'},
  {id:'malformed_bearer',method:'POST',headers:{Authorization:'Bearer malformed'},body:'{}',expected:401,error:'authentication_required'},
  {id:'missing_capability',method:'POST',headers:{Authorization:`Bearer ${fakeJwt}`},body:'{}',expected:403,error:'entitlement_capability_required'},
  {id:'malformed_json',method:'POST',headers:{Authorization:`Bearer ${fakeJwt}`,'x-velmere-entitlement-server-capability':cap},body:'{',expected:400,error:'invalid_json'},
  {id:'null_json',method:'POST',headers:{Authorization:`Bearer ${fakeJwt}`,'x-velmere-entitlement-server-capability':cap},body:'null',expected:400,error:'request_invalid'},
];
const result={schema:'velmere.r13.legacy-edge-boundaries.v1',observedAt:new Date().toISOString(),sourceSha:process.env.GITHUB_SHA??null,
  targetClass:'legacy_R7_not_R13_product',functionSlug:'velmere-product-entitlement-bridge',
  inspectedManagementVersion:1,inspectedBundleSha256:'3cdd48f0cfd995045e919bfa711557a7dd390509ac40809f8d4b41e63986c6b6',
  deploymentBinding:'management_source_observation_not_runtime_attestation',writes:0,realCredentialsUsed:0,checks:[]};
for(const c of cases){
  const begin=performance.now();
  try{
    const r=await fetch(target,{method:c.method,body:c.body,headers:{'content-type':'application/json',...c.headers},redirect:'error',signal:AbortSignal.timeout(8000)});
    const chunks=[];let size=0;
    if(r.body)for await(const chunk of r.body){size+=chunk.length;if(size>65536)throw new Error('bounded_response_exceeded');chunks.push(chunk);}
    const body=Buffer.concat(chunks);let json;try{json=JSON.parse(body.toString('utf8'));}catch{ /* empty */ }
    const expectedError=json?.error===c.error;
    const bodyShape=json&&typeof json==='object'&&!Array.isArray(json)&&json.ok===false;
    // Never retain raw upstream bodies or headers. Record bounded expected-code matches.
    const status=r.status===c.expected&&expectedError&&bodyShape?'PASS':r.status===404||r.status===401&&!expectedError?'BLOCKED':'FAIL';
    result.checks.push({id:c.id,status,expectedStatus:c.expected,httpStatus:r.status,expectedErrorMatches:expectedError,
      responseShapeMatches:Boolean(bodyShape),responseBytes:size,responseSha256:createHash('sha256').update(body).digest('hex'),elapsedMs:Math.round(performance.now()-begin)});
  }catch(e){result.checks.push({id:c.id,status:'BLOCKED',code:e?.name==='TimeoutError'?'timeout':'transport_or_size_error',elapsedMs:Math.round(performance.now()-begin)});}
}
result.summary=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,result.checks.filter(c=>c.status===s).length]));
result.r13IntegrationQualified=false;result.verdict='NO_GO';
const dest=path.resolve(process.env.R13_EDGE_OUTPUT??'r13-legacy-edge-boundaries.json');
await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:result.targetClass,sourceSha:result.sourceSha,summary:result.summary,verdict:result.verdict}));
process.exitCode=result.summary.FAIL?1:result.summary.BLOCKED?2:0;
