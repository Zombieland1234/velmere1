#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {validateA64State} from "./a64-historical-control-metadata-recovery-lib.mjs";
const root=process.cwd();
const checks=[];const check=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),...(detail===null?{}:{detail})});
try{
  const state=validateA64State(root);
  check("state:restored-count",state.restoredCount===103,state.restoredCount);
  check("state:control-count",state.controlPlaneRestoredCount===96,state.controlPlaneRestoredCount);
  check("state:supplemental-complete",state.supplementalMetadataComplete===true);
  const run=spawnSync(process.execPath,["scripts/pass35/verify-control-plane.mjs"],{cwd:root,encoding:"utf8",timeout:180000});
  check("control:process",run.error===undefined&&run.signal===null&&run.status===0,{status:run.status,error:run.error?.message,stderr:run.stderr});
  let report=null;try{report=JSON.parse(run.stdout)}catch (ignoredError) { void ignoredError; }
  check("control:status",report?.status==="PASS_STATIC_CONTROLS",report?.status);
  check("control:failed-zero",Array.isArray(report?.failed)&&report.failed.length===0,report?.failed);
  check("control:all-pass",Number.isSafeInteger(report?.checkCount)&&report.passed===report.checkCount&&report.checkCount>=567,report);
}catch(error){check("state:exception",false,error instanceof Error?error.message:String(error));}
const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({status:failed.length?"FAIL_A64_HISTORICAL_CONTROL_METADATA_RECOVERY":"PASS_A64_HISTORICAL_CONTROL_METADATA_RECOVERY",checks:checks.length,passed:checks.length-failed.length,failed},null,2));
process.exitCode=failed.length?1:0;
