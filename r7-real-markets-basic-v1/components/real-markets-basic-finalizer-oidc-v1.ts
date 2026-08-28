import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPO="Zombieland1234/velmere1", REPO_ID="1269597731", OWNER="Zombieland1234", ACTOR="Zombieland1234", ACTOR_ID="213797395";
const BRANCH="velmere-r7-successor-delta-20260825";
const WORKFLOW="R7 Real Markets Basic Direct Chain E2E";
const WORKFLOW_FILE=".github/workflows/r7-real-markets-basic-e2e-v1.yml";
const WORKFLOW_PATH="/.github/workflows/r7-real-markets-basic-e2e-v1.yml@";
const AUDIENCE="velmere-r7-real-markets-basic-v1-finalizer";
const GH_HEADERS={accept:"application/vnd.github+json","user-agent":"velmere-r7-real-markets-basic-finalizer","x-github-api-version":"2022-11-28"};
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0",pragma:"no-cache","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
function decode(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);return Uint8Array.from(atob(normalized),(character)=>character.charCodeAt(0));}
function json(value:string){return JSON.parse(new TextDecoder().decode(decode(value))) as Record<string,unknown>;}
function audienceMatches(value:unknown){return typeof value==="string"?value===AUDIENCE:Array.isArray(value)&&value.includes(AUDIENCE);}
async function sha256(bytes:Uint8Array){const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));return Array.from(digest,(value)=>value.toString(16).padStart(2,"0")).join("");}

async function verify(token:string){
  const segments=token.split("."); if(segments.length!==3)throw new Error("shape");
  const header=json(segments[0]!),claims=json(segments[1]!); if(header.alg!=="RS256"||typeof header.kid!=="string")throw new Error("header");
  const response=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)});
  const keyData=(await response.json() as {keys?:JsonWebKey[]}).keys?.find((item)=>item.kid===header.kid); if(!response.ok||!keyData)throw new Error("jwks");
  const key=await crypto.subtle.importKey("jwk",keyData,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(segments[2]!),new TextEncoder().encode(`${segments[0]}.${segments[1]}`)); if(!verified)throw new Error("signature");
  const now=Math.floor(Date.now()/1000),expiresAt=Number(claims.exp??0),issuedAt=Number(claims.iat??0),notBefore=Number(claims.nbf??0);
  if(claims.iss!=="https://token.actions.githubusercontent.com"||!audienceMatches(claims.aud)||expiresAt<=now-15||issuedAt<now-900||issuedAt>now+30||(Number.isFinite(notBefore)&&notBefore>now+30))throw new Error("time");
  if(claims.repository!==REPO||String(claims.repository_id??"")!==REPO_ID||claims.repository_owner!==OWNER||claims.actor!==ACTOR||String(claims.actor_id??"")!==ACTOR_ID||claims.ref!==`refs/heads/${BRANCH}`||claims.workflow!==WORKFLOW||typeof claims.workflow_ref!=="string"||!claims.workflow_ref.includes(WORKFLOW_PATH))throw new Error("identity");
  const runId=String(claims.run_id??""),headSha=String(claims.sha??""); if(!/^[1-9][0-9]{0,19}$/.test(runId)||!/^[a-f0-9]{40}$/.test(headSha))throw new Error("run"); return{runId,headSha};
}
async function githubJson(path:string){const response=await fetch(`https://api.github.com/repos/${REPO}${path}`,{headers:GH_HEADERS,signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`github_${response.status}`);return await response.json();}
async function raw(headSha:string,path:string){const response=await fetch(`https://raw.githubusercontent.com/${REPO}/${headSha}/${path}`,{headers:{"user-agent":"velmere-r7-real-markets-basic-finalizer"},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`raw_${response.status}_${path}`);return new Uint8Array(await response.arrayBuffer());}

Deno.serve(async(request:Request)=>{
  if(request.method!=="POST")return respond(405,{ok:false,error:"method_not_allowed"});
  const match=(request.headers.get("authorization")??"").match(/^Bearer\s+(.+)$/i);if(!match)return respond(401,{ok:false,error:"oidc_missing"});
  let identity:{runId:string;headSha:string};try{identity=await verify(match[1]!);}catch(error){return respond(401,{ok:false,error:error instanceof Error?`oidc_${error.message}`:"oidc_invalid"});}
  let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return respond(400,{ok:false,error:"invalid_json"});}
  if(body.action!=="finalize"||Object.keys(body).length!==1)return respond(400,{ok:false,error:"action_invalid"});
  try{
    const run=await githubJson(`/actions/runs/${identity.runId}`) as Record<string,unknown>;
    if(run.name!==WORKFLOW||run.path!==WORKFLOW_FILE||run.head_branch!==BRANCH||run.head_sha!==identity.headSha||!["in_progress","completed"].includes(String(run.status??"")))throw new Error("run_binding");
    const jobs=await githubJson(`/actions/runs/${identity.runId}/jobs?per_page=100`) as {jobs?:Record<string,unknown>[]};
    const e2e=jobs.jobs?.find((job)=>job.name==="real-markets-basic-customer-e2e");if(!e2e||e2e.conclusion!=="success")throw new Error("e2e_not_success");
    let artifact:Record<string,unknown>|undefined;
    for(let attempt=0;attempt<12&&!artifact;attempt+=1){const artifacts=await githubJson(`/actions/runs/${identity.runId}/artifacts?per_page=100`) as {artifacts?:Record<string,unknown>[]};artifact=artifacts.artifacts?.find((item)=>item.name===`r7-real-markets-basic-v1-customer-e2e-${identity.headSha}-${identity.runId}`);if(!artifact)await new Promise((resolve)=>setTimeout(resolve,1000));}
    if(!artifact||artifact.expired===true||typeof artifact.digest!=="string"||!artifact.digest.startsWith("sha256:"))throw new Error("artifact_not_bound");
    const bridgeBytes=await raw(identity.headSha,"r7-real-markets-basic-v1/components/real-markets-basic-public-bridge-v1.ts");
    const helperBytes=await raw(identity.headSha,"r7-real-markets-basic-v1/components/real-markets-basic-e2e-oidc-v1.ts");
    const finalizerBytes=await raw(identity.headSha,"r7-real-markets-basic-v1/components/real-markets-basic-finalizer-oidc-v1.ts");
    const sqlBytes=await raw(identity.headSha,"r7-real-markets-basic-v1/sql/real-markets-basic-capability-finalizer-v1.sql");
    const workflowBytes=await raw(identity.headSha,WORKFLOW_FILE);
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)throw new Error("server_environment");
    const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const finalization=await admin.rpc("velmere_r7_finalize_real_markets_basic_v1",{p_github_run_id:identity.runId,p_github_sha:identity.headSha,p_workflow_sha256:await sha256(workflowBytes),p_artifact_digest_sha256:artifact.digest.slice(7),p_bridge_digest_sha256:await sha256(bridgeBytes),p_oidc_helper_digest_sha256:await sha256(helperBytes),p_finalizer_edge_digest_sha256:await sha256(finalizerBytes),p_sql_digest_sha256:await sha256(sqlBytes)});
    if(finalization.error)throw new Error(`rpc_${finalization.error.code??"failed"}_${finalization.error.message}`);
    const ledger=await admin.from("velmere_r7_customer_final_ledger").select("product_ordinal,product_slug,final_status,finalized_at,evidence").eq("product_slug","real-markets-basic").maybeSingle();
    if(ledger.error||!ledger.data||ledger.data.product_ordinal!==13||ledger.data.final_status!=="FINAL")throw new Error("ledger_reread_failed");
    return respond(200,{ok:true,schemaVersion:"velmere.r7.real-markets-basic-v1-finalizer.v1",runId:identity.runId,headSha:identity.headSha,artifactId:artifact.id,artifactDigest:artifact.digest,result:finalization.data,ledgerReRead:ledger.data,serviceRoleReturned:false});
  }catch(error){return respond(503,{ok:false,error:error instanceof Error?error.message:"real_markets_basic_finalization_failed"});}
});
