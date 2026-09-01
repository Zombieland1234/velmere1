#!/usr/bin/env node
import fs from "node:fs";
const oldPolicy=JSON.parse(fs.readFileSync("config/pass36/a102r44p2-official-toolchain-policy.json","utf8"));
const migration=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-semgrep-version-migration.json","utf8"));
const current=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-official-toolchain-platform-policy.json","utf8"));
const checks=[];const check=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
const oldSemgrep=oldPolicy.tools.find(x=>x.id==="semgrep");const newSemgrep=current.tools.find(x=>x.toolId==="semgrep");
check("old-version-1.129.0",oldSemgrep?.requiredVersion==="1.129.0",oldSemgrep);
check("new-version-1.130.0",newSemgrep?.requiredVersion==="1.130.0"&&newSemgrep?.versionMatched===true,newSemgrep);
check("migration-version-pair",migration.oldRequiredVersion==="1.129.0"&&migration.newRequiredVersion==="1.130.0",migration);
check("all-tools-retained",JSON.stringify([...migration.retainedToolFamilies].sort())===JSON.stringify(["forge","semgrep","slither","solc"]));
check("no-tools-removed",Array.isArray(migration.removedToolFamilies)&&migration.removedToolFamilies.length===0,migration.removedToolFamilies);
check("execution-denominator-preserved",migration.denominatorMigration.oldPlannedExecutions===200&&migration.denominatorMigration.newRequiredExecutions===200&&migration.denominatorMigration.removedRows===0,migration.denominatorMigration);
check("semgrep-executions-50",migration.newCompletedOfficialExecutions===50&&current.denominators.completedOfficialExecutions===200,{migration:migration.newCompletedOfficialExecutions,total:current.denominators.completedOfficialExecutions});
check("exact-executable-bound",/^[0-9a-f]{64}$/.test(migration.newExecutableSha256)&&migration.newExecutableSha256===newSemgrep.executableSha256);
check("exact-interpreter-bound",/^[0-9a-f]{64}$/.test(migration.newInterpreterSha256)&&migration.newInterpreterSha256===newSemgrep.interpreterSha256);
check("no-real-live-sale-credit",migration.realAuditCredit===0&&migration.customerCredit===0&&migration.liveCredit===0&&migration.saleEnabled===false,migration);
const failed=checks.filter(x=>!x.passed);const out={schemaVersion:"velmere.pass36.a102r44p4.semgrep-version-migration-verification.v1",status:failed.length?"FAIL":"PASS_A102R44P4_SEMGREP_1_129_0_TO_1_130_0_ZERO_REMOVAL_MIGRATION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed,rows:checks,realAuditCredit:0,liveCredit:0,saleEnabled:false};console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(1);
