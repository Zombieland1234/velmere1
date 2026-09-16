import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
// Fixed, dedicated preview. No real credentials, database writes, or paid calls.
const slug=process.env.R13B_LEGACY==='1'?'velmere-product-entitlement-bridge':'r13-entitlement-boundary-preview';
const target=`https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/${slug}`;
const fakeJwt=['SYNTHETIC_HEADER','SYNTHETIC_PAYLOAD','SYNTHETIC_SIGNATURE'].join('.');
const cap='SYNTHETIC_INVALID_CAPABILITY_'.repeat(3);
const auth={Authorization:`Bearer ${fakeJwt}`,'x-velmere-entitlement-server-capability':cap};
const valid={action:'resolve',productSlug:'browser',requiredTier:'pro',schemaVersion:'velmere.product-entitlement-bridge-request.v1'};
const cases=[
 {id:'get',method:'GET',status:405,error:'method_not_allowed'},
 {id:'put',method:'PUT',status:405,error:'method_not_allowed'},
 {id:'anonymous',headers:{},body:'{}',status:401,error:'authentication_required'},
 {id:'bad_bearer',headers:{Authorization:'Bearer invalid'},body:'{}',status:401,error:'authentication_required'},
 {id:'missing_capability',headers:{Authorization:`Bearer ${fakeJwt}`},body:'{}',status:403,error:'entitlement_capability_required'},
 {id:'short_capability',headers:{...auth,'x-velmere-entitlement-server-capability':'short'},body:'{}',status:403,error:'entitlement_capability_required'},
 {id:'null_json',body:'null',status:400,error:'request_invalid'},
 {id:'array_json',body:'[]',status:400,error:'request_invalid'},
 {id:'scalar_json',body:'42',status:400,error:'request_invalid'},
 {id:'broken_json',body:'{',status:400,error:'invalid_json'},
 {id:'missing_fields',body:'{}',status:400,error:'request_invalid'},
 {id:'wrong_product',body:JSON.stringify({...valid,productSlug:'audit'}),status:400,error:'request_invalid'},
 {id:'wrong_tier',body:JSON.stringify({...valid,requiredTier:'root'}),status:400,error:'request_invalid'},
 {id:'client_owner_override',body:JSON.stringify({...valid,accountId:'supabase:synthetic-other'}),status:400,error:'request_invalid'},
 {id:'oversized_stream',body:JSON.stringify({data:'x'.repeat(4200)}),status:413,error:'payload_too_large'},
 ...[['tier_array_pro',['pro']],['tier_array_advanced',['advanced']],['tier_nested_array',[['pro']]],['tier_object',{value:'pro'}],['tier_boolean',true],['tier_null',null]].map(([id,requiredTier])=>({id,body:JSON.stringify({...valid,requiredTier}),status:400,error:'request_invalid'})),
 {id:'unicode_oversized',body:JSON.stringify({data:'界'.repeat(1400)}),status:413,error:'payload_too_large'},
 {id:'empty_json',body:'',status:400,error:'invalid_json'},
 {id:'well_shaped_but_unauthenticated',body:JSON.stringify(valid),status:401,error:'authentication_invalid'},
];
const result={schema:'velmere.r13b.edge-boundaries.v1',observedAt:new Date().toISOString(),sourceSha:process.env.GITHUB_SHA??null,
 target,projectRef:'yljjyowcvjgjcamffnvd',functionSlug:slug,managementVersion:slug==='velmere-product-entitlement-bridge'?1:2,
 managementBundleSha256:slug==='velmere-product-entitlement-bridge'?'3cdd48f0cfd995045e919bfa711557a7dd390509ac40809f8d4b41e63986c6b6':'5342693d251a629fb78c43aeefab6e61db365f2135cb4302990d0c4f78d48f7e',
 scope:'deployed_negative_validation_and_auth_boundary_not_product_e2e',checks:[],writes:0,realCredentialsUsed:0};
for(const c of cases){const start=performance.now();
 try{
  const response=await fetch(target,{method:c.method??'POST',headers:{'content-type':'application/json',...(c.headers??auth)},body:c.body,redirect:'error',signal:AbortSignal.timeout(8000)});
  const chunks=[];let length=0;
  if(response.body)for await(const chunk of response.body){length+=chunk.length;if(length>65536)throw new Error('response_limit');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);let data;try{data=JSON.parse(bytes.toString('utf8'));}catch{}
  const exactBody=JSON.stringify(data)===JSON.stringify({ok:false,error:c.error});
  const scope=slug==='velmere-product-entitlement-bridge'||response.headers.get('x-velmere-r13-scope')==='legacy-browser-boundary-preview-v1';
  const revision=response.headers.get('x-velmere-boundary-revision');
  const noStore=(response.headers.get('cache-control')??'').includes('no-store');
  const noSniff=response.headers.get('x-content-type-options')==='nosniff';
  const match=response.status===c.status&&exactBody&&scope&&noStore&&noSniff;
  result.checks.push({id:c.id,status:match?'PASS':response.status===404?'BLOCKED':'FAIL',expectedStatus:c.status,httpStatus:response.status,
    exactSafeBody:exactBody,scopeHeaderMatches:scope,revision,revisionMatches:revision==='r13b1',noStore,noSniff,responseBytes:length,responseSha256:createHash('sha256').update(bytes).digest('hex'),elapsedMs:Math.round(performance.now()-start)});
 }catch(e){result.checks.push({id:c.id,status:'BLOCKED',code:e?.name==='TimeoutError'?'timeout':'transport_or_size_error',elapsedMs:Math.round(performance.now()-start)});}
}
result.summary=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,result.checks.filter(c=>c.status===s).length]));
result.deploymentMatches=result.checks.every(c=>c.revisionMatches===true);
result.qualifiedScope='negative_input_and_auth_boundary_only';result.commercialReadyRows=0;result.productVerdict='NO_GO';
await writeFile(`r13b-${slug}-boundaries.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:result.scope,summary:result.summary,productVerdict:result.productVerdict}));
process.exitCode=result.summary.FAIL?1:result.summary.BLOCKED?2:result.deploymentMatches?0:3;
