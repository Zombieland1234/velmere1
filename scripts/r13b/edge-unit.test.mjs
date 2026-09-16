// Actual checked-in handlers; only the external Supabase SDK is substituted.
// This is synthetic unit coverage, never payment/tenant/product E2E.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const root=resolve(process.env.R13B_TARGET_ROOT??'.');
const preview='supabase/functions/r13-entitlement-boundary-preview';
const targets=process.env.R13B_BASELINE_ONLY?[preview]:[preview,'supabase/functions/velmere-product-entitlement-bridge'];
const userId='11111111-1111-4111-8111-111111111111';
const fakeJwt='SYNTHETIC_HEADER.SYNTHETIC_PAYLOAD.SYNTHETIC_SIGNATURE';
const auth={authorization:`Bearer ${fakeJwt}`,'x-velmere-entitlement-server-capability':'SYNTHETIC_CAPABILITY_'.repeat(4),'content-type':'application/json'};
const valid={action:'resolve',productSlug:'browser',requiredTier:'pro',schemaVersion:'velmere.product-entitlement-bridge-request.v1'};
async function load(target,scenario={}) {
 let handler; const calls=[];
 const context=vm.createContext({Request,Response,Headers,TextDecoder,TextEncoder,Uint8Array,ReadableStream,AbortSignal,setTimeout,clearTimeout,
  fetch:async()=>{throw new Error('unexpected_network');},
  Deno:{serve(fn){handler=fn;},env:{get(name){return scenario.noEnv?undefined:({SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'SYNTHETIC_ANON',SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_SERVICE'})[name];}}}});
 const sdk=new vm.SyntheticModule(['createClient'],function(){this.setExport('createClient',(_url,key,options)=>{
  calls.push({kind:'client',key,options});
  if(scenario.constructorThrows)throw new Error('SYNTHETIC_SECRET_MUST_NOT_LEAK');
  return {auth:{async getUser(){
   calls.push({kind:'getUser'});
   if(scenario.authThrows)throw new Error('SYNTHETIC_SECRET_MUST_NOT_LEAK');
   return scenario.authInvalid?{data:{user:null},error:{message:'invalid'}}:{data:{user:{id:scenario.userId??userId}},error:null};
  }},async rpc(name,args){
   calls.push({kind:'rpc',name,args});
   if(scenario.rpcThrows)throw new Error('SYNTHETIC_SECRET_MUST_NOT_LEAK');
   if(name==='velmere_current_active_session_account_id')return {data:scenario.account===undefined?`supabase:${userId}`:scenario.account,error:scenario.sessionError?{code:'500'}:null};
   return {data:scenario.allowed===undefined?true:scenario.allowed,error:scenario.resolverError?{code:scenario.resolverError,message:'SYNTHETIC_SECRET_MUST_NOT_LEAK'}:null};
  }};
 });},{context});
 const declarations=new vm.SyntheticModule([],function(){},{context});
 const cache=new Map();
 async function moduleAt(path){
  if(cache.has(path))return cache.get(path);
  const source=await readFile(path,'utf8');
  const mod=new vm.SourceTextModule(stripTypeScriptTypes(source,{mode:'strip'}),{context,identifier:path});cache.set(path,mod);
  await mod.link(async(spec,importer)=>spec.startsWith('jsr:@supabase/supabase-js@')?sdk:spec.startsWith('jsr:@supabase/functions-js@')?declarations:moduleAt(resolve(dirname(importer.identifier),spec)));
  return mod;
 }
 const mod=await moduleAt(resolve(root,target,'index.ts'));await mod.evaluate();
 return {handler,calls};
}
const negatives=[
 ['null',null],['array',[]],['scalar',42],['missing_fields',{}],
 ['tier_array_pro',{...valid,requiredTier:['pro']}],['tier_array_advanced',{...valid,requiredTier:['advanced']}],
 ['tier_nested_array',{...valid,requiredTier:[['pro']]}],['tier_object',{...valid,requiredTier:{value:'pro'}}],
 ['tier_number',{...valid,requiredTier:1}],['tier_boolean',{...valid,requiredTier:true}],['tier_null',{...valid,requiredTier:null}],
 ['tier_basic',{...valid,requiredTier:'basic'}],['tier_case',{...valid,requiredTier:'PRO'}],['tier_space',{...valid,requiredTier:'pro '}],
 ['wrong_product',{...valid,productSlug:'audit'}],['wrong_action',{...valid,action:'grant'}],['wrong_schema',{...valid,schemaVersion:'v0'}],
 ['owner_override',{...valid,accountId:'supabase:other'}],['prototype_key',JSON.parse(JSON.stringify(valid).slice(0,-1)+',"__proto__":{"admin":true}}')]
];
for(const target of targets){
 for(const [name,payload]of negatives)test(`${target}: reject ${name} before SDK`,async()=>{
  const {handler,calls}=await load(target);const response=await handler(new Request('https://unit.invalid',{method:'POST',headers:auth,body:JSON.stringify(payload)}));
  assert.equal(response.status,400);assert.deepEqual(await response.json(),{ok:false,error:'request_invalid'});assert.equal(calls.length,0);
 });
 const cases=[
  ['anonymous',{},401,'authentication_required',{headers:{}}],['method',{},405,'method_not_allowed',{method:'GET'}],
  ['bad_capability',{},403,'entitlement_capability_required',{headers:{...auth,'x-velmere-entitlement-server-capability':'short'}}],
  ['no_environment',{noEnv:true},503,'server_environment_unavailable'],['auth_invalid',{authInvalid:true},401,'authentication_invalid'],
  ['invalid_subject',{userId:'not-a-uuid'},401,'authentication_invalid'],['inactive_session',{account:null},401,'session_inactive'],
  ['cross_account',{account:'supabase:22222222-2222-4222-8222-222222222222'},403,'account_binding_invalid'],
  ['session_unavailable',{sessionError:true},503,'session_binding_unavailable'],['invalid_capability',{resolverError:'42501'},403,'entitlement_capability_invalid'],
  ['resolver_unavailable',{resolverError:'XX000'},503,'entitlement_resolution_unavailable'],
  ['constructor_exception',{constructorThrows:true},503,'entitlement_service_unavailable'],['auth_exception',{authThrows:true},503,'entitlement_service_unavailable'],
  ['rpc_exception',{rpcThrows:true},503,'entitlement_service_unavailable']
 ];
 for(const [name,scenario,status,error,request={}]of cases)test(`${target}: safe ${name}`,async()=>{
  const {handler}=await load(target,scenario);const response=await handler(new Request('https://unit.invalid',{method:request.method??'POST',headers:request.headers??auth,...(request.method==='GET'?{}:{body:JSON.stringify(valid)})}));
  assert.equal(response.status,status);assert.deepEqual(await response.json(),{ok:false,error});assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 });
 for(const [name,allowed,expected]of [['grant',true,true],['deny',false,false],['null',null,false],['truthy_string','true',false]])test(`${target}: synthetic resolver ${name} is strict`,async()=>{
  const {handler,calls}=await load(target,{allowed});const response=await handler(new Request('https://unit.invalid',{method:'POST',headers:auth,body:JSON.stringify(valid)}));
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.allowed,expected);assert.equal(data.rawCapabilityReturned,false);assert.equal(data.serviceRoleReturned,false);
  const rpc=calls.find(c=>c.name==='velmere_r7_resolve_browser_paid_entitlement_v1');assert.equal(rpc.args.p_account_id,`supabase:${userId}`);assert.equal(rpc.args.p_required_tier,'pro');
 });
}
