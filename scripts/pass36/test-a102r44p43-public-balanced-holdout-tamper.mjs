import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verifyEvidenceDirectory } from "./verify-a102r44p43-public-balanced-holdout.mjs";

function copyDir(source, target) { fs.cpSync(source, target, { recursive: true }); }
function mutateJson(filePath, mutator) { const value = JSON.parse(fs.readFileSync(filePath, "utf8")); mutator(value); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`); }
const args = Object.fromEntries(process.argv.slice(2).reduce((rows, value, index, array) => index % 2 === 0 ? [...rows, [value.replace(/^--/u, ""), array[index + 1]]] : rows, []));
for (const key of ["evidence-root", "smartbugs-root", "openzeppelin-root"]) if (!args[key]) throw new Error(`missing_argument:${key}`);
const mutations = [
  ["summary-detected", (root) => mutateJson(path.join(root, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), (value) => { value.positiveEvaluation.supportedSignalsDetected += 1; })],
  ["summary-recall", (root) => mutateJson(path.join(root, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), (value) => { value.positiveEvaluation.recallWithinAnalyzedSupportedSubset = 0.123456; })],
  ["summary-formal-credit", (root) => mutateJson(path.join(root, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), (value) => { value.creditBoundary.formalBalancedMetricCredit = true; })],
  ["summary-sale-credit", (root) => mutateJson(path.join(root, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), (value) => { value.creditBoundary.saleCredit = true; })],
  ["summary-forbidden-metric", (root) => mutateJson(path.join(root, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), (value) => { value.precision = 1; })],
  ["index-drop", (root) => mutateJson(path.join(root, "R44P43_CASE_INDEX.json"), (value) => { value.rows.pop(); })],
  ["index-duplicate", (root) => mutateJson(path.join(root, "R44P43_CASE_INDEX.json"), (value) => { value.rows[1].caseId = value.rows[0].caseId; })],
  ["case-bytes", (root) => { const index=JSON.parse(fs.readFileSync(path.join(root,"R44P43_CASE_INDEX.json"),"utf8")); fs.appendFileSync(path.join(root,index.rows[0].path)," "); }],
  ["positive-source-hash", (root) => { const index=JSON.parse(fs.readFileSync(path.join(root,"R44P43_CASE_INDEX.json"),"utf8")); const row=index.rows.find((item)=>item.kind==="PUBLIC_VULNERABLE_CASE"); mutateJson(path.join(root,row.path),(value)=>{value.sourceMetadata.sha256="0".repeat(64);}); }],
  ["control-root-hash", (root) => { const index=JSON.parse(fs.readFileSync(path.join(root,"R44P43_CASE_INDEX.json"),"utf8")); const row=index.rows.find((item)=>item.kind==="PUBLIC_CONTROL_CANDIDATE"); mutateJson(path.join(root,row.path),(value)=>{value.rootSourceSha256="f".repeat(64);}); }],
  ["positive-independent-credit", (root) => { const index=JSON.parse(fs.readFileSync(path.join(root,"R44P43_CASE_INDEX.json"),"utf8")); const row=index.rows.find((item)=>item.kind==="PUBLIC_VULNERABLE_CASE"); mutateJson(path.join(root,row.path),(value)=>{value.creditBoundary.independentGroundTruthCredit=true;}); }],
  ["control-formal-credit", (root) => { const index=JSON.parse(fs.readFileSync(path.join(root,"R44P43_CASE_INDEX.json"),"utf8")); const row=index.rows.find((item)=>item.kind==="PUBLIC_CONTROL_CANDIDATE"); mutateJson(path.join(root,row.path),(value)=>{value.creditBoundary.formalFalsePositiveRateCredit=true;}); }],
];
const results=[];
for (const [id, mutate] of mutations) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),`r44p43-${id}-`));
  copyDir(args["evidence-root"], temp);
  mutate(temp);
  let outcome;
  try {
    const result=verifyEvidenceDirectory({evidenceRoot:temp,smartbugsRoot:args["smartbugs-root"],openzeppelinRoot:args["openzeppelin-root"]});
    outcome={id,rejected:!result.ok,failureCount:result.failed.length};
  } catch {
    outcome={id,rejected:true,failureCount:1};
  }
  results.push(outcome);
  fs.rmSync(temp,{recursive:true,force:true});
}
const failed=results.filter((row)=>!row.rejected);
const receipt={schemaVersion:"velmere.pass36.a102r44p43.tamper-suite.v1",status:failed.length?"FAIL_R44P43_TAMPER_SUITE":"PASS_R44P43_TAMPER_SUITE",tests:results.length,rejected:results.length-failed.length,results,failed,formalMetricCredit:false,saleCredit:false,liveCredit:false};
console.log(JSON.stringify(receipt,null,2));
process.exit(failed.length?1:0);
