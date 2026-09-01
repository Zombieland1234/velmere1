import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const p=path.join(root,"config/pass36/a102r44p10-route-dispatch-rebaseline.json");
const x=JSON.parse(fs.readFileSync(p,"utf8"));
const sha=(r)=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,r))).digest("hex");
const checks=[
 ["revision-current",x.revisionId==="VELMERE_PASS36_A102R44P10_ACTION_REQUIRED_METAMORPHIC_GENERALIZATION_CUSTOMER_CONFIDENCE_AND_ANALYSIS_QUEUE_TRUTH_CLEAN_SOURCE_CLOSURE_NO_LIVE_CREDIT"],
 ["denominator-retained",x.routeDenominatorBefore===160&&x.routeDenominatorAfter===160],
 ["changed-routes-exact",x.changedRoutes===3&&x.changedFields===6],
 ["removed-added-zero",x.removedRoutes===0&&x.addedRoutes===0],
 ["methods-unchanged",x.methodExportChanges===0&&x.changes.every((r)=>JSON.stringify(r.before?.methods)===JSON.stringify(r.after?.methods))],
 ["manifest-current",sha("config/pass15/route-dispatch-manifest.json")===x.currentManifestSha256&&x.currentManifestSha256===x.afterManifestSha256],
 ["registry-bound",sha("config/pass15/route-export-ast-registry.json")===x.routeAstRegistrySha256],
 ["exact-parser",x.parser?.version==="5.9.3"&&x.parser?.exactToolchainCreditEligible===true],
 ["no-live-credit",x.truthBoundary?.liveCredit===false],
];
const failed=checks.filter(([,ok])=>!ok);
const out={schemaVersion:"velmere.pass36.a102r44p10.route-dispatch-rebaseline-verification.v1",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,checksDetail:checks.map(([id,ok])=>({id,ok})),revisionId:x.revisionId,globalDecision:"NO_GO",live:false};
console.log(JSON.stringify(out,null,2)); if(failed.length)process.exit(1);
