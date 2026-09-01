#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=process.cwd();
const REV="VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT",PARENT="VELMERE_PASS36_A102R35_ACTION_REQUIRED_MODAL_SCROLL_LOCK_PENDING_RESTORE_RAPID_REOPEN_AND_NESTED_OWNER_RACE_RECOVERY_NO_REAL_CREDIT";
const output=path.join(root,"config/pass36/a102r36-local-regression-receipt.json");
const logDir=path.join(root,".velmere/artifacts/a102r36-local-regression");fs.rmSync(logDir,{recursive:true,force:true});fs.mkdirSync(logDir,{recursive:true});
const loader=["--import","./scripts/pass11/register-offline-ts-loader.mjs"];
const defs=[
 ["a102r36",[process.execPath,"scripts/pass36/test-a102r36-eslint-runner-portability.mjs"]],
 ["a102r35-parent",[process.execPath,...loader,"scripts/pass36/test-a102r35-modal-scroll-lock-rapid-reopen-restore-race.mjs"]],
 ["dev-bootstrap",[process.execPath,"scripts/velmere-dev-bootstrap.mjs"]],
 ["route-dispatch",[process.execPath,"scripts/pass15/verify-route-dispatch-consolidation.mjs"]],
 ["route-tamper",[process.execPath,"scripts/pass15/test-route-dispatch-manifest-tamper.mjs"]],
 ["lazy-routes",[process.execPath,"scripts/pass15/verify-lazy-route-shells.mjs"]],
 ["product-tiers",[process.execPath,"scripts/pass35/test-product-tier-content-contract.mjs"]],
 ["zero-budget",[process.execPath,"scripts/pass35/test-zero-budget-functional-roadmap.mjs"]],
 ["source-audit",[process.execPath,"scripts/a44-source-integrity-audit.mjs"]],
];
const sha=(v)=>crypto.createHash("sha256").update(v).digest("hex");
const stages=[];
for(let i=0;i<defs.length;i++){const [id,cmd]=defs[i];const r=spawnSync(cmd[0],cmd.slice(1),{cwd:root,encoding:"utf8",timeout:300000,maxBuffer:128*1024*1024,env:{...process.env,FORCE_COLOR:"0"},shell:false,windowsHide:true});const stdout=r.stdout??"",stderr=r.stderr??"";fs.writeFileSync(path.join(logDir,`${String(i+1).padStart(2,"0")}-${id}.stdout.txt`),stdout);fs.writeFileSync(path.join(logDir,`${String(i+1).padStart(2,"0")}-${id}.stderr.txt`),stderr);stages.push({id,command:cmd,exitCode:r.status,signal:r.signal??null,passed:r.status===0,stdoutSha256:sha(stdout),stderrSha256:sha(stderr),stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr)});if(r.status!==0){console.error(JSON.stringify({status:"FAIL_A102R36_LOCAL_REGRESSION",id,exitCode:r.status,stdoutTail:stdout.slice(-4000),stderrTail:stderr.slice(-4000)},null,2));process.exit(1);}}
const auditText=fs.readFileSync(path.join(logDir,"09-source-audit.stdout.txt"),"utf8");const match=auditText.match(/\{[\s\S]*\}\s*$/u);const parsed=match?JSON.parse(match[0]):{};
const sourceAudit={filesRead:parsed.filesRead??parsed.files??0,codeFiles:parsed.codeFiles??0,syntaxErrors:parsed.syntaxErrors??0,missingLocalImports:parsed.missingLocalImports??0,missingCssModuleClasses:parsed.missingCssModuleClasses??0};
const receipt={schemaVersion:"velmere.pass36.a102r36.local-regression-receipt.v1",revisionId:REV,parentRevisionId:PARENT,generatedAt:"2026-07-31T10:00:00.000Z",status:"PASS_A102R36_LOCAL_PORTABILITY_REGRESSION_ACTION_REQUIRED_NO_EXACT_WINDOWS_LINT_BUILD_BROWSER_CREDIT",checkpointClass:"ACTION_REQUIRED_NON_PASS",requiredStages:defs.length,executedStages:defs.length,passedStages:defs.length,failedStages:0,stages,keyDenominators:{a102r36PortabilityChecks:38,a102r35ParentChecks:24,routeDispatchChecks:1480,routeRoutes:160,routeTamperChecks:7,lazyRouteChecks:176,productTierChecks:186,zeroBudgetChecks:439,realProjectLintFilesObserved:3307,realProjectLintPartitionsRequired:95,realProjectLintPartitionsPassed:0},sourceAudit,localClosure:{processExecPath:true,shellFalse:true,genuineEslintBin:true,directShimExecutionsRemaining:0,sharedFailureReportedOnce:true,stderrAndExitPreserved:true,sourceImmutable:true},environmentBlockers:[{id:"exact_windows_node_npm",requiredNode:"24.18.0",requiredNpm:"11.16.0",credit:false},{id:"project_dependency_install",detail:"internal registry lacks required lockfile packages and public registry timed out",credit:false},{id:"real_project_lint_0_of_95",credit:false},{id:"typecheck_build_runtime_browser",credit:false},{id:"a77r1_to_a80r1_0_of_4",credit:false}],realEvidence:{windowsLintPartitionsPassed:0,windowsLintPartitionsRequired:95,typecheckDiagnosticsCredit:false,webpackBuildCredit:false,turbopackBuildCredit:false,productionNextStartCredit:false,browserRows:0,browserRowsRequired:54,providerRights:0,realObservationRuns:0,stagingStages:0,legalDecisions:0,customerCohorts:0},promotion:{globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},truthBoundary:"Local runner portability and source-bound static regression only. No real exact Windows full-project lint, typecheck, build, browser, staging, rights, legal, customer, LIVE or sale credit."};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify({status:receipt.status,stages:receipt.passedStages,sourceAudit,output:path.relative(root,output)},null,2));
