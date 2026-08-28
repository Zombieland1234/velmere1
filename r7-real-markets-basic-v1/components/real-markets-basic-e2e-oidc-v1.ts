import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPO = "Zombieland1234/velmere1";
const REPO_ID = "1269597731";
const OWNER = "Zombieland1234";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Real Markets Basic Direct Chain E2E";
const WORKFLOW_PATH = "/.github/workflows/r7-real-markets-basic-e2e-v1.yml@";
const AUDIENCE = "velmere-r7-real-markets-basic-v1-e2e";
const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, max-age=0", pragma: "no-cache", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });
function decode(value: string) { const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4); return Uint8Array.from(atob(normalized),(character)=>character.charCodeAt(0)); }
function json(value: string) { return JSON.parse(new TextDecoder().decode(decode(value))) as Record<string, unknown>; }
function audienceMatches(value: unknown) { return typeof value === "string" ? value === AUDIENCE : Array.isArray(value) && value.includes(AUDIENCE); }

async function verify(token: string) {
  const segments=token.split(".");
  if (segments.length !== 3) throw new Error("shape");
  const header=json(segments[0]!); const claims=json(segments[1]!);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("header");
  const response=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)});
  const keyData=(await response.json() as {keys?:JsonWebKey[]}).keys?.find((item)=>item.kid===header.kid);
  if (!response.ok || !keyData) throw new Error("jwks");
  const key=await crypto.subtle.importKey("jwk",keyData,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(segments[2]!),new TextEncoder().encode(`${segments[0]}.${segments[1]}`));
  if (!verified) throw new Error("signature");
  const now=Math.floor(Date.now()/1000), expiresAt=Number(claims.exp??0), issuedAt=Number(claims.iat??0), notBefore=Number(claims.nbf??0);
  if (claims.iss!=="https://token.actions.githubusercontent.com" || !audienceMatches(claims.aud) || expiresAt<=now-15 || issuedAt<now-900 || issuedAt>now+30 || (Number.isFinite(notBefore)&&notBefore>now+30)) throw new Error("time");
  if (claims.repository!==REPO || String(claims.repository_id??"")!==REPO_ID || claims.repository_owner!==OWNER || claims.actor!==ACTOR || String(claims.actor_id??"")!==ACTOR_ID || claims.ref!==`refs/heads/${BRANCH}` || claims.workflow!==WORKFLOW || typeof claims.workflow_ref!=="string" || !claims.workflow_ref.includes(WORKFLOW_PATH)) throw new Error("identity");
  const runId=String(claims.run_id??""), headSha=String(claims.sha??"");
  if (!/^[1-9][0-9]{0,19}$/.test(runId) || !/^[a-f0-9]{40}$/.test(headSha)) throw new Error("run");
  return {runId,headSha};
}

Deno.serve(async (request: Request) => {
  if (request.method!=="POST") return respond(405,{ok:false,error:"method_not_allowed"});
  const match=(request.headers.get("authorization")??"").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401,{ok:false,error:"oidc_missing"});
  let identity:{runId:string;headSha:string};
  try { identity=await verify(match[1]!); } catch (error) { return respond(401,{ok:false,error:error instanceof Error?`oidc_${error.message}`:"oidc_invalid"}); }
  let body:Record<string,unknown>;
  try { body=await request.json() as Record<string,unknown>; } catch { return respond(400,{ok:false,error:"invalid_json"}); }
  if (body.action!=="capability" || Object.keys(body).length!==1) return respond(400,{ok:false,error:"action_invalid"});
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(503,{ok:false,error:"server_environment_unavailable"});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const capability=await admin.rpc("velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc");
  if (capability.error || typeof capability.data!=="string" || capability.data.length<48) return respond(503,{ok:false,error:"real_markets_basic_capability_unavailable"});
  return respond(200,{ok:true,schemaVersion:"velmere.r7.real-markets-basic-v1-e2e-capability.v1",runId:identity.runId,headSha:identity.headSha,realMarketsBasicServerCapability:capability.data,serviceRoleReturned:false,customerFinalCredit:false});
});
