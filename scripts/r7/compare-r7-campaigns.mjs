import fs from "node:fs";
import crypto from "node:crypto";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const a = read(process.argv[2]); const b = read(process.argv[3]);
const byFile = new Map(b.results.map((r) => [r.file, r]));
const rows = a.results.map((r) => {
  const q = byFile.get(r.file);
  return { file: r.file, classificationStable: q?.classification === r.classification, exitCodeStable: q?.exitCode === r.exitCode, stdoutStable: q?.stdoutSha256 === r.stdoutSha256, stderrStable: q?.stderrSha256 === r.stderrSha256 };
});
const payload = {
 schemaVersion:"velmere.r7.current-execution-repeatability.v1",
 candidate:"R7_MERGED_CURRENT_SOURCE",
 denominator: rows.length,
 classificationStable: rows.filter((r)=>r.classificationStable).length,
 exitCodeStable: rows.filter((r)=>r.exitCodeStable).length,
 stdoutStable: rows.filter((r)=>r.stdoutStable).length,
 stderrStable: rows.filter((r)=>r.stderrStable).length,
 status: rows.length===52 && rows.every((r)=>r.classificationStable&&r.exitCodeStable) ? "PASS_OUTCOME_REPEATABLE" : "FAIL",
 rows,
 customerFinalCredit:false,
};
payload.aggregateSha256=crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
fs.writeFileSync("artifacts/r7/current-execution/R7_CURRENT_EXECUTION_REPEATABILITY.json",`${JSON.stringify(payload,null,2)}\n`);
console.log(JSON.stringify({status:payload.status,denominator:payload.denominator,classificationStable:payload.classificationStable,exitCodeStable:payload.exitCodeStable,stdoutStable:payload.stdoutStable,stderrStable:payload.stderrStable,aggregateSha256:payload.aggregateSha256},null,2));
if(payload.status!=="PASS_OUTCOME_REPEATABLE") process.exit(2);
