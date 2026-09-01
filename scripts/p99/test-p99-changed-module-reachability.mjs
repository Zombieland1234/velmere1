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
let ts=null; for(const c of candidates){try{await access(c);ts=require(c);break;}catch{/* Probe the next canonical TypeScript location. */}}
if(!ts) throw new Error("global_typescript_unavailable_for_p99_transpile");
const rows=[];
function row(id,status,detail=undefined){rows.push({id,status,...(detail===undefined?{}:{detail})});if(status==="FAIL")throw new Error(`${id}:${JSON.stringify(detail??null)}`);}
try { const m=await import("../../lib/market-integrity/real-markets-basic-field-policy.ts"); row("field_policy_import","PASS",Object.keys(m).length); }
catch(error){ row("field_policy_import","FAIL",error instanceof Error?`${error.name}: ${error.message}`:String(error)); }
for(const [id,spec,log] of [
 ["market_row_gate","../../lib/market-integrity/market-row-delivery-gate.ts","MARKET_ROW_GATE_IMPORT_WITHHELD.log"],
 ["markets_route","../../lib/server/market-integrity-route-modules/markets.ts","MARKETS_ROUTE_IMPORT_WITHHELD.log"],
]){
 try{const m=await import(spec);row(`${id}_import`,"PASS",Object.keys(m));}
 catch(error){
  const message=error instanceof Error?`${error.name}: ${error.message}`:String(error);
  const expected=/zod|ERR_MODULE_NOT_FOUND|Cannot find package/i.test(message);
  row(`${id}_import`,expected?"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING":"FAIL",message);
  const target=path.join(root,"artifacts/p99/failures",log); await mkdir(path.dirname(target),{recursive:true}); await writeFile(target,`${message}\n`);
 }
}
const files=[
 "lib/market-integrity/real-markets-basic-field-policy.ts",
 "lib/market-integrity/market-row-delivery-gate.ts",
 "lib/server/market-integrity-route-modules/markets.ts",
];
for(const rel of files){
 const source=await readFile(path.join(root,rel),"utf8");
 const result=ts.transpileModule(source,{fileName:rel,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.Preserve,isolatedModules:true,importsNotUsedAsValues:ts.ImportsNotUsedAsValues.Remove,resolveJsonModule:true,sourceMap:false}});
 const errors=(result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 row(`transpile_${rel}`,errors.length?"FAIL":"PASS",errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")));
}
const failed=rows.filter(x=>x.status==="FAIL"); const withheld=rows.filter(x=>x.status.startsWith("WITHHELD"));
const receipt={schemaVersion:"velmere.p99.changed-module-reachability.v1",generatedAt:"2026-08-21T14:25:00.000Z",status:failed.length?"FAIL":"PASS_BOUNDED_IMPORT_AND_TRANSPILE",checks:{total:rows.length,passed:rows.filter(x=>x.status==="PASS").length,withheld:withheld.length,failed:failed.length,rows},zeroFakeCredit:{routeAndGateImports:withheld.length?"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING":"PASS_BOUNDED_IMPORT",routeExecuted:false,providerNetworkExecuted:false,rightsApproved:false,wholeProjectTypeScript:false,eslint:false,build:false,exactWindows:false,customerFinal:"0/20"},truthBoundary:"Imports the new rights/semantic policy and transpiles all three changed TypeScript production files. The market-row gate and customer route imports remain WITHHELD because the external zod dependency graph is absent. Transpile is not semantic route execution, provider execution, build, exact Windows or Customer FINAL."};
for(const rel of ["receipts/p99/P99_CHANGED_MODULE_REACHABILITY.json","artifacts/p99/P99_CHANGED_MODULE_REACHABILITY.json"]){const target=path.join(root,rel);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,JSON.stringify(receipt,null,2)+"\n");}
console.log(JSON.stringify({status:receipt.status,checks:receipt.checks},null,2)); if(failed.length)process.exitCode=1;
