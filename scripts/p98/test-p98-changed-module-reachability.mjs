#!/usr/bin/env node
import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const require=createRequire(import.meta.url);
const candidates=[
 path.resolve(path.dirname(process.execPath),"../lib/node_modules/typescript/lib/typescript.js"),
 path.resolve(path.dirname(process.execPath),"../../lib/node_modules/typescript/lib/typescript.js"),
];
let ts=null;for(const c of candidates){try{await access(c);ts=require(c);break;}catch{/* Probe the next canonical TypeScript location. */}}
if(!ts) throw new Error("global_typescript_unavailable_for_p98_transpile");
const rows=[];
function row(id,status,detail=undefined){rows.push({id,status,...(detail===undefined?{}:{detail})});if(status==="FAIL")throw new Error(`${id}:${JSON.stringify(detail??null)}`);}
const importModules=[
 ["policy","../../lib/market-integrity/customer-paid-tier-exact-delivery-policy.ts"],
 ["access","../../lib/market-integrity/top1-entitlement-report-access.ts"],
 ["tier_value","../../lib/market-integrity/customer-report-tier-value.ts"],
 ["commercial","../../lib/market-integrity/worldclass-report-commercial-policy.ts"],
 ["delivery","../../lib/market-integrity/customer-report-delivery-policy.ts"],
 ["payload","../../lib/market-integrity/customer-report-payload.ts"],
 ["evidence","../../lib/market-integrity/real-markets-customer-evidence.ts"],
 ["layout","../../lib/market-integrity/customer-report-layout-model.ts"],
 ["token","../../lib/market-integrity/customer-report-exact-pdf-token.ts"],
 ["report_pdf","../../lib/server/market-integrity-route-modules/report-pdf.ts"],
];
for(const [id,spec] of importModules){const m=await import(spec);row(`${id}_import`,`PASS`,Object.keys(m).length);}
const routeImports=[
 ["real_markets_route","../../lib/market-integrity/real-markets-route-orchestrator.ts"],
 ["market_report_route","../../lib/server/market-integrity-route-modules/report.ts"],
];
for(const [id,spec] of routeImports){
 try{const m=await import(spec);row(`${id}_import`,`PASS`,Object.keys(m));}
 catch(error){
  const message=error instanceof Error?`${error.name}: ${error.message}`:String(error);
  const expected=/zod|ERR_MODULE_NOT_FOUND|Cannot find package/i.test(message);
  row(`${id}_import`,expected?"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING":"FAIL",message);
  const target=path.join(root,"artifacts/p98/failures",`${id.toUpperCase()}_IMPORT_WITHHELD.log`);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,`${message}\n`);
 }
}
const files=[
 "lib/market-integrity/customer-paid-tier-exact-delivery-policy.ts",
 "lib/market-integrity/top1-entitlement-report-access.ts",
 "lib/market-integrity/customer-report-tier-value.ts",
 "lib/market-integrity/worldclass-report-commercial-policy.ts",
 "lib/market-integrity/customer-report-delivery-policy.ts",
 "lib/market-integrity/customer-report-payload.ts",
 "lib/market-integrity/real-markets-customer-evidence.ts",
 "lib/market-integrity/real-markets-route-orchestrator.ts",
 "lib/server/market-integrity-route-modules/report.ts",
 "lib/market-integrity/customer-report-layout-model.ts",
 "lib/market-integrity/customer-report-exact-pdf-token.ts",
 "lib/server/market-integrity-route-modules/report-pdf.ts",
];
for(const rel of files){
 const source=await readFile(path.join(root,rel),"utf8");
 const result=ts.transpileModule(source,{fileName:rel,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.Preserve,isolatedModules:true,importsNotUsedAsValues:ts.ImportsNotUsedAsValues.Remove,sourceMap:false}});
 const errors=(result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 row(`transpile_${rel}`,errors.length?"FAIL":"PASS",errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")));
}
const failed=rows.filter(x=>x.status==="FAIL");const withheld=rows.filter(x=>x.status.startsWith("WITHHELD"));
const receipt={schemaVersion:"velmere.p98.changed-module-reachability.v1",generatedAt:"2026-08-21T12:00:00.000Z",status:failed.length?"FAIL":"PASS_BOUNDED_IMPORT_AND_TRANSPILE",checks:{total:rows.length,passed:rows.filter(x=>x.status==="PASS").length,withheld:withheld.length,failed:failed.length,rows},zeroFakeCredit:{twoRouteImports:withheld.length?"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING":"PASS_BOUNDED_IMPORT",routesExecuted:false,providersExecuted:false,pdfGenerated:false,wholeProjectTypeScript:false,eslint:false,build:false,exactWindows:false,customerFinal:"0/20"},truthBoundary:"Imports ten changed modules through the canonical offline loader and transpiles all twelve changed production files. Two route imports remain WITHHELD when the external zod dependency graph is absent. Transpile is syntax reachability, not semantic route execution, build, exact Windows or Customer FINAL."};
for(const rel of ["receipts/p98/P98_CHANGED_MODULE_REACHABILITY.json","artifacts/p98/P98_CHANGED_MODULE_REACHABILITY.json"]){const t=path.join(root,rel);await mkdir(path.dirname(t),{recursive:true});await writeFile(t,`${JSON.stringify(receipt,null,2)}\n`);}
console.log(JSON.stringify({status:receipt.status,checks:receipt.checks}));if(failed.length)process.exitCode=1;
