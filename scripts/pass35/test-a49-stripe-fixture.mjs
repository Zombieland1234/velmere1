#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
const checks=[];
const check=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
const webhookSecret="whsec_a49_fixture_secret_abcdefghijklmnopqrstuvwxyz";
const workerSecret="a49-worker-secret-current-abcdefghijklmnopqrstuvwxyz";
const lifecycleSecret="a49-lifecycle-secret-abcdefghijklmnopqrstuvwxyz";
const stripeSecret="sk_test_a49_fixture_abcdefghijklmnopqrstuvwxyz";
const publishable="pk_test_a49_fixture_abcdefghijklmnopqrstuvwxyz";

function json(res,status,body,cookies=[]){ res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...(cookies.length?{"set-cookie":cookies}: {})}); res.end(JSON.stringify(body)); }
async function readBody(req){ const chunks=[]; for await(const c of req) chunks.push(c); return Buffer.concat(chunks).toString("utf8"); }
function verifySig(raw,header){ const parts=Object.fromEntries(String(header||"").split(",").map(x=>x.split("=",2))); if(!parts.t||!parts.v1)return false; const expected=crypto.createHmac("sha256",webhookSecret).update(`${parts.t}.${raw}`).digest("hex"); try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts.v1));}catch{return false;} }
function cookieAccount(req,sessions){ const m=String(req.headers.cookie||"").match(/a49_session=([^;]+)/u); return m?sessions.get(m[1]):null; }
function safeEntitlementId(sessionId,productId,hash){ return `vlm_entitlement_${sessionId}_${productId}_${hash.slice(0,12)}`.toLowerCase().replace(/[^a-z0-9:_-]+/g,"-").slice(0,180); }

function createServer({partialRefund=false}={}){
  const sessions=new Map(); const events=new Set(); const entitlements=new Map();
  const paymentIntents=new Map(); const charges=new Map();
  return http.createServer(async(req,res)=>{
    const url=new URL(req.url,`http://${req.headers.host}`); const method=req.method||"GET";
    try{
      if(url.pathname==="/api/auth/session"&&method==="POST"){
        const body=JSON.parse(await readBody(req)); if(body.email!=="a49@example.invalid"||body.password!=="A49-password")return json(res,401,{ok:false,error:"invalid_credentials"});
        const token=crypto.randomBytes(12).toString("hex"); sessions.set(token,"acct-a49"); return json(res,200,{ok:true,authenticated:true,bindingState:"ready",session:{accountId:"acct-a49"}},[`a49_session=${token}; Path=/; HttpOnly; SameSite=Lax`]);
      }
      if(url.pathname==="/api/auth/session"&&method==="GET"){
        const account=cookieAccount(req,sessions); return json(res,200,{ok:true,authenticated:Boolean(account),bindingState:account?"ready":"missing",session:account?{accountId:account}:null});
      }
      if(url.pathname==="/api/auth/session"&&method==="DELETE"){
        const m=String(req.headers.cookie||"").match(/a49_session=([^;]+)/u); if(m)sessions.delete(m[1]); return json(res,200,{ok:true,authenticated:false},["a49_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"]);
      }
      if(url.pathname==="/api/checkout/vlm-service"&&method==="POST") return json(res,409,{ok:false,error:"product_cell_not_sell_ready",details:{chargeAllowed:false,productCell:{sellEnabled:false}}});
      if(url.pathname==="/api/stripe/webhook"&&method==="POST"){
        const raw=await readBody(req); const sig=req.headers["stripe-signature"]; if(!sig)return json(res,400,{error:"Missing Stripe signature."}); if(!verifySig(raw,sig))return json(res,400,{error:"Invalid Stripe webhook signature."});
        const event=JSON.parse(raw); if(events.has(event.id))return json(res,200,{received:true,duplicate:true}); events.add(event.id);
        const object=event.data?.object||{}; const md=object.metadata||{};
        if(event.type==="checkout.session.completed"){
          const id=safeEntitlementId(object.id,md.productId,md.contextHash); entitlements.set(id,{status:"active"}); return json(res,200,{received:true,kind:"vlm_paid_access",entitlementPersisted:true,evidencePersisted:true});
        }
        if(event.type==="charge.refunded"){
          const id=safeEntitlementId(md.stripeSessionId,md.productId,md.contextHash); const row=entitlements.get(id); if(!row)return json(res,500,{received:false,retryable:true,error:"webhook_processing_retryable"}); row.status="refunded"; return json(res,200,{received:true,type:event.type,stateUpdated:true});
        }
        return json(res,200,{received:true,ignored:true});
      }
      if(url.pathname==="/api/internal/vlm-entitlements/lifecycle"&&method==="POST"){
        if(req.headers.authorization!==`Bearer ${lifecycleSecret}`)return json(res,401,{ok:false,error:"unauthorized"}); const body=JSON.parse(await readBody(req)); const row=entitlements.get(body.entitlementId); if(!row)return json(res,404,{ok:false,error:"entitlement_not_found"});
        const previous=row.status; if(body.event==="refund"){ row.status="refunded"; return json(res,200,{ok:true,idempotent:previous==="refunded",event:"refund",previousStatus:previous,nextStatus:"refunded",ledgerMode:"durable"}); }
        return json(res,409,{ok:false,error:"invalid_entitlement_state_transition"});
      }
      if(url.pathname==="/api/internal/workers/stripe-webhook-reconciliation"&&method==="GET"){
        if(req.headers.authorization!==`Bearer ${workerSecret}`)return json(res,401,{ok:false,error:"unauthorized_worker"}); return json(res,200,{ok:true,skipped:false,summary:{leaseAcquired:true,scannedCount:2,staleReleasedCount:0,retryReadyCount:0,deadLetteredCount:0,completedWithoutEventCount:0,oldestProcessingAgeSeconds:null,errorBuckets:{provider:0,storage:0,entitlement:0,order:0,other:0},severity:"none",reasonCodes:[],alertDelivery:"not_required",durable:true}});
      }
      if(url.pathname==="/v1/payment_intents"&&method==="POST"){
        if(req.headers.authorization!==`Bearer ${stripeSecret}`)return json(res,401,{error:{code:"invalid_api_key"}}); const params=new URLSearchParams(await readBody(req)); const id=`pi_${crypto.randomBytes(10).toString("hex")}`; const ch=`ch_${crypto.randomBytes(10).toString("hex")}`; const amount=Number(params.get("amount")); const currency=params.get("currency"); const pi={id,object:"payment_intent",amount,currency,status:"succeeded",livemode:false,latest_charge:ch}; paymentIntents.set(id,pi); charges.set(ch,{id:ch,object:"charge",amount,amount_refunded:0,currency,refunded:false,livemode:false,payment_intent:id,metadata:{}}); return json(res,200,pi);
      }
      if(url.pathname==="/v1/refunds"&&method==="POST"){
        const params=new URLSearchParams(await readBody(req)); const pi=paymentIntents.get(params.get("payment_intent")); if(!pi)return json(res,404,{error:{code:"resource_missing"}}); const charge=charges.get(pi.latest_charge); charge.amount_refunded=partialRefund?Math.floor(charge.amount/2):charge.amount; charge.refunded=!partialRefund; return json(res,200,{id:`re_${crypto.randomBytes(10).toString("hex")}`,object:"refund",amount:charge.amount,currency:charge.currency,status:"succeeded",livemode:false,payment_intent:pi.id});
      }
      if(url.pathname.startsWith("/v1/charges/")&&method==="GET"){
        const id=decodeURIComponent(url.pathname.slice("/v1/charges/".length)); const charge=charges.get(id); return charge?json(res,200,charge):json(res,404,{error:{code:"resource_missing"}});
      }
      return json(res,404,{error:"not_found"});
    }catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}
  });
}

async function runScenario(name,options,expectPass){
  const server=createServer(options); await new Promise(r=>server.listen(0,"127.0.0.1",r)); const port=server.address().port;
  const child=spawn(process.execPath,["scripts/a49-stripe-payment-acceptance.mjs","--fixture"],{cwd:root,stdio:["ignore","pipe","pipe"],env:{...process.env,
    VELMERE_A49_STAGING_BASE_URL:`http://127.0.0.1:${port}`,VELMERE_A49_STRIPE_API_BASE:`http://127.0.0.1:${port}`,
    VELMERE_A49_TEST_ACCOUNT_EMAIL:"a49@example.invalid",VELMERE_A49_TEST_ACCOUNT_PASSWORD:"A49-password",
    STRIPE_SECRET_KEY:stripeSecret,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:publishable,STRIPE_WEBHOOK_SECRET:webhookSecret,
    VELMERE_ENTITLEMENT_LIFECYCLE_SECRET:lifecycleSecret,VELMERE_WORKER_INTERNAL_WORKERS_STRIPE_WEBHOOK_RECONCILIATION_SECRET_CURRENT:workerSecret,
    VELMERE_A49_CONFIRM:"fixture"
  }});
  let stdout="",stderr=""; child.stdout.on("data",c=>stdout+=c); child.stderr.on("data",c=>stderr+=c);
  const status=await new Promise(r=>child.on("close",r)); await new Promise(r=>server.close(r));
  const report=JSON.parse(fs.readFileSync(path.join(root,"artifacts/pass35/a49/PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE.json"),"utf8"));
  check(`${name}:exit`,expectPass?status===0:status!==0,{status,stdout:stdout.trim(),stderr:stderr.trim()});
  check(`${name}:decision`,expectPass?report.decision==="FIXTURE_PASS":report.decision==="FIXTURE_FAIL",report.decision);
  check(`${name}:truth`,report.liveModeProven===false&&report.productionPaymentProven===false&&report.saleEnabled===false,{liveModeProven:report.liveModeProven,productionPaymentProven:report.productionPaymentProven,saleEnabled:report.saleEnabled});
  if(!expectPass)check(`${name}:detects_partial_refund`,report.failures?.some(r=>r.id==="stripe-charge-fully-refunded"),report.failures);
}

await runScenario("clean",{},true);
await runScenario("partial_refund",{partialRefund:true},false);
const failures=checks.filter(r=>!r.ok); console.log(JSON.stringify({checks:checks.length,passed:checks.length-failures.length,failed:failures.length},null,2));
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1);}
