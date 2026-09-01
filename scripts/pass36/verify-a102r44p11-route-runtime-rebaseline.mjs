import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const rel="config/pass36/a102r44p11-route-runtime-rebaseline.json";
const x=JSON.parse(fs.readFileSync(path.join(root,rel),"utf8"));
const sha=(p)=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,p))).digest("hex");
const checks=[
 ["schema",x.schemaVersion==="velmere.pass36.a102r44p11.route-runtime-rebaseline.v1"],
 ["revision",x.revisionId?.includes("A102R44P11")],
 ["parent",x.parentRevisionId?.includes("A102R44P10")],
 ["denominator-retained",x.routeDenominatorBefore===160&&x.routeDenominatorAfter===160],
 ["single-route-two-fields",x.changedRoutes===1&&x.changedFields===2&&x.changes?.length===1],
 ["access-route-only",x.changes?.[0]?.publicPath==="/api/market-integrity/access"&&x.changes?.[0]?.handlerModule==="lib/server/market-integrity-route-modules/access.ts"],
 ["methods-unchanged",x.methodExportChanges===0&&JSON.stringify(x.changes?.[0]?.before?.methods)===JSON.stringify(x.changes?.[0]?.after?.methods)],
 ["added-removed-zero",x.addedRoutes===0&&x.removedRoutes===0],
 ["dispatch-manifest-current",sha("config/pass15/route-dispatch-manifest.json")===x.currentManifestSha256&&x.currentManifestSha256===x.afterManifestSha256],
 ["route-ast-current",sha("config/pass15/route-export-ast-registry.json")===x.routeAstRegistryAfterSha256],
 ["lazy-manifest-retained",sha("config/pass15/lazy-route-shell-manifest.json")===x.lazyRouteManifestSha256],
 ["lazy-profile-current",sha("config/pass15/lazy-build-surface-profile.json")===x.lazyProfileAfterSha256],
 ["exact-parser",x.parser?.version==="5.9.3"&&x.parser?.exactToolchainCreditEligible===true],
 ["tooling-fix-no-collapse",x.toolingFix?.removedTests===0&&x.toolingFix?.denominatorReduced===false],
 ["no-browser-live-sale-credit",x.truthBoundary?.browserCredit===false&&x.truthBoundary?.liveCredit===false&&x.truthBoundary?.saleCredit===false],
];
const failed=checks.filter(([,ok])=>!ok);
const out={schemaVersion:"velmere.pass36.a102r44p11.route-runtime-rebaseline-verification.v1",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,checksDetail:checks.map(([id,ok])=>({id,ok})),revisionId:x.revisionId,globalDecision:"NO_GO",live:false,saleEnabled:false};
console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(1);
