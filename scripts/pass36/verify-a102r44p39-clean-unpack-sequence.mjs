#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const receiptPath = path.resolve(process.argv[2] ?? "");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const required = [
  "source-authority-before",
  "approved-source-changes",
  "current-release-pointers",
  "static-policy",
  "dynamic-scorecard",
  "r44p38-baseline-regression",
  "multi-file-protocol-matrix",
  "audit-integration",
  "deployment-binding",
  "external-accuracy-registry",
  "packet-tamper",
  "targeted-pdf-qa",
  "targeted-typescript",
  "targeted-evidence",
  "source-authority-after",
];
const rows=[];const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
check("status",receipt.status==="PASS_R44P39_CLEAN_UNPACK");
check("first-child",receipt.firstChildLiteral===true&&receipt.steps?.[0]?.id==="source-authority-before");
check("step-order",JSON.stringify(receipt.steps?.map((row)=>row.id))===JSON.stringify(required),receipt.steps?.map((row)=>row.id));
check("all-pass",receipt.steps?.length===required.length&&receipt.steps.every((row)=>row.exitCode===0&&row.status==="PASS"));
check("immutable",receipt.sourceImmutable===true&&receipt.sourceAggregateBefore===receipt.sourceAggregateAfter);
check("no-promotion",receipt.saleCredit===false&&receipt.liveCredit===false&&receipt.worldClassCredit===false);
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p39.clean-unpack-sequence-verification.v1",status:failed.length?"FAIL_R44P39_CLEAN_UNPACK_SEQUENCE":"PASS_R44P39_CLEAN_UNPACK_SEQUENCE",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
