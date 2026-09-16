// R13 non-production validation preview of the existing browser entitlement protocol.
// This is NOT Audit/Shield/Real Markets purchase E2E and does not create entitlements.
import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";
import { readRequestObject } from "./request-body.ts";

const JWT_SHAPE=/^[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,2048}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0",pragma:"no-cache","x-content-type-options":"nosniff","referrer-policy":"no-referrer","x-velmere-r13-scope":"legacy-browser-boundary-preview-v1"};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
function bearer(req:Request){const m=(req.headers.get("authorization")??"").match(/^Bearer\s+([^\s]+)$/i);return m&&JWT_SHAPE.test(m[1]!)?m[1]!:null;}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return reply(405,{ok:false,error:"method_not_allowed"});
  const token=bearer(req); if(!token) return reply(401,{ok:false,error:"authentication_required"});
  const capability=(req.headers.get("x-velmere-entitlement-server-capability")??"").trim();
  if(capability.length<48||capability.length>512) return reply(403,{ok:false,error:"entitlement_capability_required"});
  const parsed=await readRequestObject(req);
  if(!parsed.ok) return reply(parsed.status,{ok:false,error:parsed.error});
  const body=parsed.body;
  const keys=Object.keys(body).sort();
  const expected=["action","productSlug","requiredTier","schemaVersion"];
  if(keys.length!==expected.length||keys.some((k,i)=>k!==expected[i])||body.schemaVersion!=="velmere.product-entitlement-bridge-request.v1"||body.action!=="resolve"||body.productSlug!=="browser"||!["pro","advanced"].includes(String(body.requiredTier??""))) return reply(400,{ok:false,error:"request_invalid"});

  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service) return reply(503,{ok:false,error:"server_environment_unavailable"});
  const caller=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const userResult=await caller.auth.getUser(token); const user=userResult.data.user;
  if(userResult.error||!user||!UUID.test(user.id)) return reply(401,{ok:false,error:"authentication_invalid"});
  const accountResult=await caller.rpc("velmere_current_active_session_account_id");
  if(accountResult.error) return reply(503,{ok:false,error:"session_binding_unavailable"});
  const accountId=typeof accountResult.data==="string"?accountResult.data:null;
  const expectedAccount=`supabase:${user.id.toLowerCase()}`;
  if(!accountId) return reply(401,{ok:false,error:"session_inactive"});
  if(accountId!==expectedAccount) return reply(403,{ok:false,error:"account_binding_invalid"});

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const resolved=await admin.rpc("velmere_r7_resolve_browser_paid_entitlement_v1",{
    p_account_id:accountId,
    p_product_slug:"browser",
    p_required_tier:String(body.requiredTier),
    p_server_capability:capability,
  });
  if(resolved.error){
    if(resolved.error.code==="42501") return reply(403,{ok:false,error:"entitlement_capability_invalid"});
    return reply(503,{ok:false,error:"entitlement_resolution_unavailable"});
  }
  return reply(200,{ok:true,schemaVersion:"velmere.product-entitlement-bridge-response.v1",allowed:resolved.data===true,productSlug:"browser",requiredTier:body.requiredTier,rawCapabilityReturned:false,serviceRoleReturned:false});
});
