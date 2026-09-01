#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = process.cwd();
const confirmation = process.env.VELMERE_RLS_STAGING_CONFIRM ?? "";
const databaseUrl = process.env.VELMERE_STAGING_DATABASE_URL ?? "";
const execute = process.argv.includes("--execute");
const receiptPath = path.join(root, ".velmere", "pass23-diagnostics", "rls-staging-harness.json");
const matrix = JSON.parse(fs.readFileSync(path.join(root,"config/pass23/rls-staging-case-matrix.json"),"utf8"));
const sqlPath = path.join(root,"tests/staging/pass23/rls-policy-structural-preflight.sql");
const sha256 = (v) => createHash("sha256").update(v).digest("hex");
const safeUrl = databaseUrl && !/(prod|production|live)/iu.test(databaseUrl) && /(staging|localhost|127\.0\.0\.1|supabase)/iu.test(databaseUrl);
let result = {
  schemaVersion:"velmere.pass23.rls-staging-harness-receipt.v1",
  truthBoundary:"Structural staging preflight plus prepared 19-case matrix. This receipt must not be called row-level multi-user isolation proof until all matrix cases are executed with table fixtures.",
  requestedExecution:execute,
  casesPrepared:matrix.summary.cases,
  casesExecuted:0,
  casesPassed:0,
  structuralPreflightExecuted:false,
  structuralPreflightPassed:false,
  status:"PREPARED_NOT_EXECUTED",
  sqlSha256:sha256(fs.readFileSync(sqlPath)),
  databaseUrlSha256:databaseUrl?sha256(databaseUrl):null
};
if (execute) {
  if (confirmation !== "I_UNDERSTAND_THIS_USES_A_DISPOSABLE_STAGING_DATABASE") throw new Error("Missing explicit staging confirmation token");
  if (!safeUrl) throw new Error("Database URL is absent or looks production-like");
  const check=spawnSync("psql",["--version"],{encoding:"utf8",windowsHide:true});
  if (check.status!==0) throw new Error("psql is required for staging execution");
  const run=spawnSync("psql",[databaseUrl,"-v","ON_ERROR_STOP=1","-f",sqlPath],{cwd:root,encoding:"utf8",maxBuffer:32*1024*1024,windowsHide:true});
  result={...result,structuralPreflightExecuted:true,structuralPreflightPassed:run.status===0,status:run.status===0?"STAGING_STRUCTURAL_PREFLIGHT_PASS":"FAIL",stdoutSha256:sha256(run.stdout??""),stderrSha256:sha256(run.stderr??""),outputTail:`${run.stdout??""}\n${run.stderr??""}`.trim().split(/\r?\n/u).slice(-80)};
  if (run.status!==0) process.exitCode=1;
}
fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
fs.writeFileSync(receiptPath,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
