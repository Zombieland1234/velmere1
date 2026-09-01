import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const policyPath = path.join(root, "config/pass36/a102r44p10-independent-final-audit-policy.json");
const skuPath = path.join(root, "config/pass36/a102r44p10-customer-facing-sku-truth.json");
function readJson(p){return JSON.parse(fs.readFileSync(p,"utf8"));}
function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(f));else if(e.isFile())out.push(f);}return out;}
function rel(p){return path.relative(root,p).split(path.sep).join("/");}
function sha256(p){return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");}
const policy=readJson(policyPath), sku=readJson(skuPath), checks=[], warnings=[];
const check=(id,ok,detail={})=>checks.push({id,ok:Boolean(ok),detail});
check("revision",policy.revisionId===sku.revisionId);
check("parent",policy.parentRevisionId?.includes("A102R44P9"));
check("global-no-go",policy.globalTruth?.decision==="NO_GO");
check("live-false",policy.globalTruth?.live===false);
check("sale-false",policy.globalTruth?.saleEnabled===false);
check("production-false",policy.globalTruth?.productionApproved===false);
check("world-class-false",policy.globalTruth?.worldClassProven===false);
for(const tier of ["basic","pro","advanced"]){const row=sku.tiers?.[tier];check(`${tier}-checkout-disabled`,row?.publicCheckoutAllowed===false);check(`${tier}-price-null`,row?.price===null);check(`${tier}-human-review-false`,row?.humanReviewIncluded===false);}
check("advanced-not-for-sale",sku.tiers?.advanced?.customerDecision==="NOT_FOR_SALE");
check("pro-invitation-only",sku.tiers?.pro?.customerDecision==="CONTROLLED_INVITATION_ONLY_BETA");
check("numeric-tier-confidence-forbidden",sku.findingConfidence?.numericTierConfidenceAllowed===false);
check("public-confidence-not-calibrated",sku.findingConfidence?.publicValue==="NOT_CALIBRATED");

const forbidden=[];
for(const n of ["node_modules",".next",".turbo",".cache"]){if(fs.existsSync(path.join(root,n)))forbidden.push(n);}
const all=walk(root);
for(const file of all){const r=rel(file);if(/(^|\/)\.env(?:\.|$)/i.test(r)||/(^|\/)(?:node_modules|\.next(?:-[^/]+)?|\.turbo|\.cache)(\/|$)/i.test(r))forbidden.push(r);}
check("source-forbidden-generated-paths-zero",forbidden.length===0,{count:forbidden.length,sample:forbidden.slice(0,20)});

const productText=fs.readFileSync(path.join(root,"lib/security/vlm-audit-product.ts"),"utf8");
const numericTierRows=[...productText.matchAll(/(?:Basic|Pro|Advanced)[^\n]{0,120}(?:confidence|pewność|konfidenz)[^\n]{0,160}percent\s*:\s*\d+/gi)].map(m=>m[0]);
const calibratedRows=[...productText.matchAll(/(?:Basic|Pro|Advanced)[^\n]{0,120}status\s*:\s*["']NOT_CALIBRATED["'][^\n]{0,120}percent\s*:\s*null/gi)].length;
check("customer-tier-numeric-confidence-zero",numericTierRows.length===0,{count:numericTierRows.length,sample:numericTierRows.slice(0,10)});
check("customer-tier-not-calibrated-nine",calibratedRows===9,{count:calibratedRows});

const activeRoots=["app","components","lib","messages"];
const activeFiles=activeRoots.flatMap(d=>walk(path.join(root,d))).filter(p=>/\.(?:[cm]?[jt]sx?|json)$/i.test(p));
const claims=[];
for(const file of activeFiles){let text;try{text=fs.readFileSync(file,"utf8");}catch{continue;}const r=rel(file);const re=/(human review|human-reviewed|operator signoff)/gi;for(const m of text.matchAll(re)){const start=Math.max(0,m.index-100),end=Math.min(text.length,m.index+m[0].length+100);const ctx=text.slice(start,end);if(/(?:do not claim|forbidden|not included|no |without |cannot|must not|never|claimAllowed\s*:\s*false|kein(?:e|en|er|es)? |nicht enthalten|nie zawiera|bez |brak )/i.test(ctx))continue;claims.push({path:r,phrase:m[0],context:ctx.replace(/\s+/g," ").slice(0,220)});}}
check("affirmative-human-review-claims-zero",claims.length===0,{count:claims.length,sample:claims.slice(0,20)});

const visibleFiles = [
  "app/[locale]/security/audits/page.tsx",
  "components/security/SecurityAuditsCleanPage.tsx",
  "components/account/AuditAccountMessagesClient.tsx",
  "components/account/AuditCasesPortalClient.tsx",
  "components/checkout/VelmereCheckoutFlowClient.tsx",
  "components/checkout/VlmServiceCheckoutSuccessClient.tsx",
  "lib/security/vlm-audit-product.ts",
  "lib/security/audit-watch-server-helpers.ts",
  "lib/security/linked-request-drawer.ts",
  "lib/intelligence/intelligence-content.ts",
  "lib/server/lazy-route-modules/angel.ts",
  "lib/ai/audit-output-quality.ts",
  "lib/server/market-integrity-route-modules/advanced-review-state.ts",
];
const activeAuditCorpus = visibleFiles.map((relative)=>fs.readFileSync(path.join(root,relative),"utf8")).join("\n");
check("active-public-audit-prices-zero", !/(?:Advanced Audit[^\n]{0,80}(?:149[.,]99|149€)|Pro Audit[^\n]{0,80}(?:79[.,]99|79€))/i.test(activeAuditCorpus));
const fixtureRuntime=fs.readFileSync(path.join(root,"lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs"),"utf8");
check("synthetic-fixture-human-review-false", /humanReviewVerified:\s*false/.test(fixtureRuntime));

const normalizer=fs.readFileSync(path.join(root,"lib/security/customer-truth-normalizer.mjs"),"utf8");
check("legacy-status-normalizer-present",["human_review_queued","human_review_processing","operator_signoff_pending"].every(x=>normalizer.includes(x)));
check("metamorphic-test-present",fs.existsSync(path.join(root,"tests/pass36/a102r44p10-metamorphic-generalization.mjs")));
check("real-local-e2e-present",fs.existsSync(path.join(root,"tests/pass36/a102r44p10-real-local-e2e.mjs")));
check("structured-analyzer-honest-class",fs.readFileSync(path.join(root,"lib/security/solidity-structured-signal.mjs"),"utf8").includes("STRUCTURED_TOKEN_AST_NOT_COMPILER_AST"));
const legacy=all.filter(p=>/\.(?:[cm]?[jt]sx?|json|sql|md|txt)$/i.test(p)).filter(p=>/human_review|operator_signoff/i.test(fs.readFileSync(p,"utf8"))).map(rel);
if(legacy.length)warnings.push({id:"legacy-identifiers-remain-for-compatibility",count:legacy.length,sample:legacy.slice(0,30),blocking:false});
const failed=checks.filter(x=>!x.ok);
const out={schemaVersion:"velmere.pass36.a102r44p10.independent-static-policy.v1",revisionId:policy.revisionId,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,policySha256:sha256(policyPath),skuTruthSha256:sha256(skuPath),warnings,checksDetail:checks,globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false};
console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(1);
