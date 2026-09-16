import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Fixed destinations. This tool cannot be used as an arbitrary authenticated proxy.
const REPO = 'Zombieland1234/velmere1';
const PROJECT = 'yljjyowcvjgjcamffnvd';
const result = {schema:'velmere.r13.infrastructure-probe.v1',observedAt:new Date().toISOString(),
  scope:'read_only_connectivity_not_product_e2e',sourceSha:process.env.GITHUB_SHA ?? null,
  node:process.version,checks:[],productionWrites:0,charges:0,commercialReadyRows:0};
const sha = value => createHash('sha256').update(value).digest('hex');
async function request(label,url,headers={}) {
  const start=performance.now();
  try {
    const res=await fetch(url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(8000)});
    let total=0;const chunks=[];
    if (res.body) for await (const chunk of res.body) {
      total+=chunk.byteLength;
      if(total>1048576){result.checks.push({label,status:'FAIL',code:'response_size_limit',httpStatus:res.status});return null;}
      chunks.push(chunk);
    }
    const bytes=Buffer.concat(chunks);let json=null;
    try {json=JSON.parse(bytes.toString('utf8'));} catch { /* empty */ }
    // No raw response body, URL parameters, request headers or exception messages are logged.
    const observation={label,status:res.ok?'PASS':'BLOCKED',httpStatus:res.status,
      elapsedMs:Math.round(performance.now()-start),responseBytes:total,responseSha256:sha(bytes)};
    result.checks.push(observation);return {json,observation};
  } catch (error) {
    result.checks.push({label,status:'BLOCKED',code:error?.name==='TimeoutError'?'timeout':'transport_error',elapsedMs:Math.round(performance.now()-start)});
    return null;
  }
}
function blocked(label,code){result.checks.push({label,status:'BLOCKED',code});}
const gh=process.env.GITHUB_TOKEN;
const g=await request('github_repository',`https://api.github.com/repos/${REPO}`,{
  Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(gh?{Authorization:`Bearer ${gh}`}:{})});
if(g?.json?.full_name){g.observation.identityMatches=g.json.full_name===REPO;g.observation.defaultBranch=g.json.default_branch;
  if(!g.observation.identityMatches)g.observation.status='FAIL';}

const anon=(process.env.SUPABASE_ANON_KEY??'').trim();
const anonHeaders=anon?{apikey:anon,Authorization:`Bearer ${anon}`} : {};
await request('supabase_auth_health',`https://${PROJECT}.supabase.co/auth/v1/health`,anonHeaders);
if(anon){
  const db=await request('supabase_rest_schema',`https://${PROJECT}.supabase.co/rest/v1/`,{...anonHeaders,Accept:'application/openapi+json'});
  if(db?.json?.paths)db.observation.visibleEndpointCount=Object.keys(db.json.paths).length;
} else blocked('supabase_rest_schema','publishable_key_not_supplied');

const stripe=(process.env.STRIPE_SECRET_KEY??'').trim();
if(/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(stripe)){
  const prices=await request('stripe_test_prices','https://api.stripe.com/v1/prices?limit=3',{Authorization:`Bearer ${stripe}`});
  if(prices?.json?.data){prices.observation.returnedPrices=prices.json.data.length;
    prices.observation.allTestMode=prices.json.data.every(p=>p.livemode===false);
    if(!prices.observation.allTestMode)prices.observation.status='FAIL';}
} else blocked('stripe_test_prices',/^(?:sk|rk)_live_/.test(stripe)?'live_key_refused':'test_key_not_supplied');

const vercel=process.env.VERCEL_TOKEN;
if(vercel){
  const teams=await request('vercel_accessible_teams','https://api.vercel.com/v2/teams',{Authorization:`Bearer ${vercel}`});
  if(teams?.json?.teams){teams.observation.teamCount=teams.json.teams.length;
    if(!teams.observation.teamCount){teams.observation.status='BLOCKED';teams.observation.code='no_accessible_team';}}
} else blocked('vercel_accessible_teams','token_not_supplied');

// No fabricated checkout/audit/export events are sent to analytics.
blocked('posthog_product_funnel','no_verified_product_flow_executed');
result.summary=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,result.checks.filter(c=>c.status===s).length]));
result.integrationQualified=false;
result.verdict='NO_GO';
const dest=path.resolve(process.env.R13_PROBE_OUTPUT??'r13-infrastructure-probe.json');
await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:result.scope,sourceSha:result.sourceSha,summary:result.summary,verdict:result.verdict}));
process.exitCode=result.summary.FAIL?1:result.summary.BLOCKED?2:0;
