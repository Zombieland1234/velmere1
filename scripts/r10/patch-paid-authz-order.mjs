#!/usr/bin/env node
import fs from "node:fs";

const file = "components/security/SecurityAuditsCleanPage.tsx";
let src = fs.readFileSync(file, "utf8");
const startAnchor = "  async function runAuditExecution(tierToRun: TierId) {\n";
const insertAnchor = "  const completeAuditPaymentSuccess = (tier: \"pro\" | \"advanced\") => {";
const start = src.indexOf(startAnchor);
if (start < 0) throw new Error("paid_authz_order_function_start_missing");
const end = src.indexOf("\n\n  return (", start);
if (end < 0) throw new Error("paid_authz_order_function_end_missing");
const insertAt = src.indexOf(insertAnchor);
if (insertAt < 0) throw new Error("paid_authz_order_insert_anchor_missing");
if (start < insertAt) {
  console.log(JSON.stringify({ status: "NOOP_ALREADY_ORDERED" }, null, 2));
  process.exit(0);
}
const block = src.slice(start, end);
src = src.slice(0, start) + src.slice(end + 2);
const newInsertAt = src.indexOf(insertAnchor);
src = src.slice(0, newInsertAt) + block + "\n\n" + src.slice(newInsertAt);
const functionIndex = src.indexOf(startAnchor);
const completeIndex = src.indexOf(insertAnchor);
const stageIndex = src.indexOf("  const stageAudit = async () => {");
if (functionIndex < 0 || completeIndex < 0 || stageIndex < 0 || !(functionIndex < completeIndex && functionIndex < stageIndex)) {
  throw new Error("paid_authz_order_verification_failed");
}
fs.writeFileSync(file, src);
console.log(JSON.stringify({ status: "PASS", functionBeforePaidCompletion: true, functionBeforeStageAudit: true }, null, 2));
