import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './vm-source.mjs';

for (const rejection of [new Error('sensitive-credential-in-sdk-error'),'raw-credential-in-throw']) {
  test(`lazy dispatch redacts ${typeof rejection} handler failures`,async()=>{
    const {exports,logs}=await loadSource('lib/server/lazy-route-dispatch.ts');
    const response=await exports.dispatchLazyRoute({method:'GET',key:'report',request:new Request('https://example.invalid/report'),registry:{report:{methods:['GET'],load:async()=>({GET:async()=>{throw rejection;}})}},unknownError:'not_found',unavailableError:'temporarily_unavailable'});
    assert.equal(response.status,503);assert.equal((await response.json()).error,'temporarily_unavailable');
    assert.equal(logs.length,0);assert.equal(response.headers.get('cache-control'),'no-store');
  });
}
test('single lazy route catches async handler rejection without exposing details',async()=>{
  const {exports}=await loadSource('lib/server/lazy-route-dispatch.ts');
  const response=await exports.invokeLazyRouteHandler({method:'GET',request:new Request('https://example.invalid'),load:async()=>({GET:async()=>{throw new Error('secret-internal-detail');}}),unavailableError:'route_unavailable'});
  assert.equal(response.status,503);assert.equal((await response.json()).error,'route_unavailable');
});
test('null lazy module is a controlled unavailable response',async()=>{
  const {exports}=await loadSource('lib/server/lazy-route-dispatch.ts');
  const response=await exports.invokeLazyRouteHandler({method:'GET',request:new Request('https://example.invalid'),load:async()=>null,unavailableError:'route_unavailable'});
  assert.equal(response.status,503);
});
test('healthy lazy handler response is preserved',async()=>{
  const {exports}=await loadSource('lib/server/lazy-route-dispatch.ts');const good=Response.json({ok:true},{status:201});
  const response=await exports.invokeLazyRouteHandler({method:'POST',request:new Request('https://example.invalid',{method:'POST'}),load:async()=>({POST:async()=>good}),unavailableError:'route_unavailable'});
  assert.equal(response,good);
});
for (const headers of [{},{authorization:'Bearer malformed.invalid.signature'},{cookie:'velmere_account_session=forged.invalid'}]) {
  test(`missing valid account envelope rejected before unavailable limiter: ${Object.keys(headers)[0]??'anonymous'}`,async()=>{
    let limiterCalls=0,authCalls=0;
    const {exports}=await loadSource('lib/server/lazy-route-modules/account--customer-artifact.ts',{
      'next/server':{NextResponse:Response},
      '@/lib/auth/account-session':{hasRequestAccountCredential:()=>false,resolveRequestAccount:async()=>{authCalls++;return null;}},
      '@/lib/security/api-guard':{rejectLargeContentLength:()=>null,applyApiRateLimit:async()=>{limiterCalls++;return {ok:false,response:Response.json({ok:false,mode:'rate_limit_storage_unavailable'},{status:503})};}},
    },{NODE_ENV:'production'});
    const response=await exports.GET(new Request('https://example.invalid/api/account/customer-artifact',{headers}));
    assert.equal(response.status,401);assert.equal((await response.json()).error,'account_session_required');
    assert.equal(limiterCalls,0);assert.equal(authCalls,0);
  });
}
test('credential candidate still cannot bypass an unavailable durable limiter',async()=>{
  let authCalls=0;
  const {exports}=await loadSource('lib/server/lazy-route-modules/account--customer-artifact.ts',{
    'next/server':{NextResponse:Response},
    '@/lib/auth/account-session':{hasRequestAccountCredential:()=>true,resolveRequestAccount:async()=>{authCalls++;return {accountId:'forbidden'};}},
    '@/lib/security/api-guard':{rejectLargeContentLength:()=>null,applyApiRateLimit:async()=>({ok:false,response:Response.json({ok:false,mode:'rate_limit_storage_unavailable'},{status:503})})},
  },{NODE_ENV:'production'});
  assert.equal((await exports.GET(new Request('https://example.invalid'))).status,503);assert.equal(authCalls,0);
});
