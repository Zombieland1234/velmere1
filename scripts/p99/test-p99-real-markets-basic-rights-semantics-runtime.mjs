#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks=[];
function check(id, condition, detail=undefined){
  const row={id,status:condition?"PASS":"FAIL",...(detail===undefined?{}:{detail})};
  checks.push(row);
  if(!condition) throw new Error(`P99 runtime failed: ${id} ${JSON.stringify(detail??null)}`);
}
async function rejects(id,fn,needle){
  let caught=null; try{ await fn(); }catch(error){ caught=error; }
  const message=caught instanceof Error?caught.message:String(caught??"");
  check(id,caught!==null&&(!needle||message.includes(needle)),{message});
}
const policy=await import("../../lib/market-integrity/real-markets-basic-field-policy.ts");
const canonical=await import("../../lib/security/canonical-json.ts");
const crypto=await import("../../lib/security/cryptographic-digest.ts");

const decision=policy.buildP99RealMarketsBasicDeliveryPreflight();
check("current_preflight_verifies",policy.verifyP99RealMarketsBasicDeliveryPreflight(decision));
check("current_rights_withheld",decision.state==="WITHHELD_RIGHTS_UNVERIFIED"&&!decision.customerDeliveryAllowed);
check("network_blocked_before_provider",decision.providerNetworkAllowed===false);
check("no_live_claim",decision.liveClaimed===false);
check("no_executable_quote_claim",decision.executableQuoteClaimed===false);
check("price_is_reference",decision.priceSemanticClass==="reference");
check("field_count_23",decision.fieldCount===23);
check("display_rights_zero",decision.displayEligibleFieldCount===0);
check("customer_rights_zero",decision.customerEligibleFieldCount===0);
check("all_fields_blocked",decision.blockedFieldCount===23);
check("provider_display_blocker",decision.blockers.includes("provider_public_display_rights_not_approved"));
check("provider_delivery_blocker",decision.blockers.includes("provider_customer_delivery_rights_not_approved"));
check("field_display_shortfall",decision.blockers.includes("field_public_display_rights_shortfall:0/23"));
check("field_delivery_shortfall",decision.blockers.includes("field_customer_delivery_rights_shortfall:0/23"));
check("registry_exact_hash",decision.registrySha256===policy.P99_REAL_MARKETS_BASIC_REGISTRY_SHA256);
check("matrix_hash_bound",/^[a-f0-9]{64}$/u.test(decision.rightsMatrixSha256));
check("decision_digest_canonical",decision.decisionDigest===crypto.sha256Digest(canonical.canonicalJson(Object.fromEntries(Object.entries(decision).filter(([key])=>key!=="decisionDigest")))));

const publicPayload=policy.toP99CustomerSafeRealMarketsBasicWithheld(decision);
const publicKeys=Object.keys(publicPayload).sort();
check("withheld_projection_closed_shape",JSON.stringify(publicKeys)===JSON.stringify([
  "availability","currentness","error","executableQuoteClaimed","liveClaimed","mode","priceSemanticClass","reason","requestedTier","retryAfter","rows","schemaVersion",
].sort()),publicKeys);
check("withheld_projection_no_rows",Array.isArray(publicPayload.rows)&&publicPayload.rows.length===0);
check("withheld_projection_unknown_currentness",publicPayload.currentness==="UNKNOWN_BLOCKED");
check("withheld_projection_no_internal_topology",!publicKeys.some((key)=>/provider|matrix|registry|blocker|fieldCount|digest|receipt/i.test(key)),publicKeys);
check("withheld_projection_no_provider_name",!JSON.stringify(publicPayload).toLowerCase().includes("coingecko")&&!JSON.stringify(publicPayload).toLowerCase().includes("binance"));
check("withheld_projection_reference_not_quote",publicPayload.priceSemanticClass==="reference"&&!publicPayload.liveClaimed&&!publicPayload.executableQuoteClaimed);

const fields=policy.getP99RealMarketsBasicFieldContracts();
check("field_ids_unique",new Set(fields.map((field)=>field.fieldId)).size===fields.length);
check("all_fields_rights_withheld",fields.every((field)=>field.rightsStatus==="WITHHELD_UNVERIFIED"&&!field.publicDisplayAllowed&&!field.customerDeliveryAllowed));
check("all_fields_non_executable",fields.every((field)=>field.executionEligible===false));
check("all_fields_reference_currentness",fields.every((field)=>field.currentnessClass==="provider_timestamped_reference"));
check("all_fields_have_positive_ttl",fields.every((field)=>Number.isSafeInteger(field.maxAgeSeconds)&&field.maxAgeSeconds>0));
check("no_current_quote_semantics",fields.every((field)=>!["current_quote","venue_quote","executable_quote"].includes(field.semanticClass)));
check("price_field_reference",policy.getP99RealMarketsFieldContract("market.price").semanticClass==="reference");
check("price_field_usd",policy.getP99RealMarketsFieldContract("market.price").currency==="USD");
check("volume_field_derived",policy.getP99RealMarketsFieldContract("market.volume_24h").semanticClass==="derived");
check("high_field_historical",policy.getP99RealMarketsFieldContract("market.high_24h").semanticClass==="historical");
check("observed_at_provider_timestamp",policy.getP99RealMarketsFieldContract("market.observed_at").semanticClass==="provider_timestamp");
check("identity_reference",policy.getP99RealMarketsFieldContract("identity.market_id").semanticClass==="reference");
await rejects("unknown_field_rejected",()=>policy.getP99RealMarketsFieldContract("market.execution_price"),"field_contract_missing");

function recompute(value){
  const unsigned=Object.fromEntries(Object.entries(value).filter(([key])=>key!=="decisionDigest"));
  value.decisionDigest=crypto.sha256Digest(canonical.canonicalJson(unsigned));
}
for(const [id,mutate] of [
  ["state",(v)=>{v.state="READY_REFERENCE";}],
  ["customer_delivery",(v)=>{v.customerDeliveryAllowed=true;}],
  ["network",(v)=>{v.providerNetworkAllowed=true;}],
  ["live",(v)=>{v.liveClaimed=true;}],
  ["executable",(v)=>{v.executableQuoteClaimed=true;}],
  ["semantic",(v)=>{v.priceSemanticClass="current_quote";}],
  ["field_count",(v)=>{v.fieldCount=22;}],
  ["display_count",(v)=>{v.displayEligibleFieldCount=23;}],
  ["customer_count",(v)=>{v.customerEligibleFieldCount=23;}],
  ["blocked_count",(v)=>{v.blockedFieldCount=0;}],
  ["blockers",(v)=>{v.blockers=[];}],
  ["registry",(v)=>{v.registrySha256="0".repeat(64);} ],
  ["matrix",(v)=>{v.rightsMatrixSha256="1".repeat(64);} ],
]){
  const mutated=structuredClone(decision); mutate(mutated); recompute(mutated);
  check(`self_consistent_mutation_rejected_${id}`,policy.verifyP99RealMarketsBasicDeliveryPreflight(mutated)===false);
}
const extra=structuredClone(decision); extra.extra=true; recompute(extra);
check("extra_field_rejected",policy.verifyP99RealMarketsBasicDeliveryPreflight(extra)===false);
const badDigest=structuredClone(decision); badDigest.decisionDigest=`sha256:${"0".repeat(64)}`;
check("bad_digest_rejected",policy.verifyP99RealMarketsBasicDeliveryPreflight(badDigest)===false);
await rejects("ready_decision_cannot_use_withheld_projection",()=>policy.toP99CustomerSafeRealMarketsBasicWithheld({...decision,state:"READY_REFERENCE",customerDeliveryAllowed:true,providerNetworkAllowed:true}),"not_authorized");

const receipt={
  schemaVersion:"velmere.p99.real-markets-basic-rights-semantics-runtime.v1",
  generatedAt:"2026-08-21T14:15:00.000Z",
  status:"PASS",
  checks:{total:checks.length,passed:checks.filter((row)=>row.status==="PASS").length,failed:checks.filter((row)=>row.status!=="PASS").length,rows:checks},
  currentDecision:decision,
  customerProjection:publicPayload,
  truthBoundary:"Local deterministic policy proof against the current frozen rights registries. No provider network, live quote, rights approval, route execution, customer data, build, exact Windows or Customer FINAL credit.",
};
await mkdir(new URL("../../receipts/p99/",import.meta.url),{recursive:true});
await writeFile(new URL("../../receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_RUNTIME.json",import.meta.url),JSON.stringify(receipt,null,2)+"\n");
console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.total},null,2));
