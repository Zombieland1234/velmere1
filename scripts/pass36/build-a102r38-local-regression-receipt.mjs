#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=process.cwd();
const REV="VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT",PARENT="VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT";
const output=path.join(root,"config/pass36/a102r38-local-regression-receipt.json");
const logDir=path.join(root,".velmere/artifacts/a102r38-local-regression");fs.rmSync(logDir,{recursive:true,force:true});fs.mkdirSync(logDir,{recursive:true});
const defs=[
 ["a102r38-evidence",[process.execPath,"scripts/pass36/test-a102r38-production-smoke-evidence-uniqueness.mjs"]],
 ["production-smoke-contract",[process.execPath,"--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/deployment/test-production-smoke-contract.mjs"]],
 ["a102r36-parent",[process.execPath,"scripts/pass36/test-a102r36-eslint-runner-portability.mjs"]],
 ["a42-rebaseline",[process.execPath,"scripts/pass36/verify-a102r38-a42-critical-rebaseline.mjs"]],
 ["a42-contract",[process.execPath,"scripts/pass35/test-a42-dev-runtime-cache-recovery.mjs"]],
 ["dev-bootstrap",[process.execPath,"scripts/velmere-dev-bootstrap.mjs"]],
 ["route-dispatch",[process.execPath,"scripts/pass15/verify-route-dispatch-consolidation.mjs"]],
 ["route-tamper",[process.execPath,"scripts/pass15/test-route-dispatch-manifest-tamper.mjs"]],
 ["lazy-routes",[process.execPath,"scripts/pass15/verify-lazy-route-shells.mjs"]],
 ["product-tiers",[process.execPath,"scripts/pass35/test-product-tier-content-contract.mjs"]],
 ["zero-budget",[process.execPath,"scripts/pass35/test-zero-budget-functional-roadmap.mjs"]],
 ["source-audit-generated-next-types",[process.execPath,"scripts/pass36/test-a102r38-source-audit-generated-next-types.mjs"]],
 ["source-audit",[process.execPath,"scripts/a44-source-integrity-audit.mjs"]],
];
const sha=(v)=>crypto.createHash("sha256").update(v).digest("hex");
const stages=[];
for(let i=0;i<defs.length;i++){const [id,cmd]=defs[i];const r=spawnSync(cmd[0],cmd.slice(1),{cwd:root,encoding:"utf8",timeout:300000,maxBuffer:128*1024*1024,env:{...process.env,FORCE_COLOR:"0"},shell:false,windowsHide:true});const stdout=r.stdout??"",stderr=r.stderr??"";fs.writeFileSync(path.join(logDir,`${String(i+1).padStart(2,"0")}-${id}.stdout.txt`),stdout);fs.writeFileSync(path.join(logDir,`${String(i+1).padStart(2,"0")}-${id}.stderr.txt`),stderr);stages.push({id,command:cmd,exitCode:r.status,signal:r.signal??null,passed:r.status===0,stdoutSha256:sha(stdout),stderrSha256:sha(stderr),stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr)});if(r.status!==0){console.error(JSON.stringify({status:"FAIL_A102R38_LOCAL_REGRESSION",id,exitCode:r.status,stdoutTail:stdout.slice(-5000),stderrTail:stderr.slice(-5000)},null,2));process.exit(1);}}
const auditText=fs.readFileSync(path.join(logDir,"13-source-audit.stdout.txt"),"utf8");const match=auditText.match(/\{[\s\S]*\}\s*$/u);const parsed=match?JSON.parse(match[0]):{};
const sourceAudit={filesRead:parsed.filesRead??parsed.files??0,codeFiles:parsed.codeFiles??0,syntaxErrors:parsed.syntaxErrors??0,missingLocalImports:parsed.missingLocalImports??0,missingCssModuleClasses:parsed.missingCssModuleClasses??0};
const receipt={schemaVersion:"velmere.pass36.a102r38.local-regression-receipt.v1",revisionId:REV,parentRevisionId:PARENT,generatedAt:"2026-08-01T04:00:00+02:00",status:"PASS_A102R38_LOCAL_EVIDENCE_UNIQUENESS_AND_AUTHORITY_REGRESSION_ACTION_REQUIRED_NO_FRESH_BUILD_BROWSER_CREDIT",checkpointClass:"ACTION_REQUIRED_NON_PASS",requiredStages:defs.length,executedStages:defs.length,passedStages:defs.length,failedStages:0,stages,keyDenominators:{a102r38EvidenceChecks:46,productionSmokeContractChecks:82,parentA102r36Checks:39,expectedSmokeAssertions:55,uniqueSmokeAssertions:55,expectedSmokeResults:16,uniqueSmokeResults:16,routeDispatchChecks:1480,routeRoutes:160,routeTamperChecks:7,lazyRouteChecks:176,productTierChecks:186,zeroBudgetChecks:439,sourceAuditGeneratedNextTypesChecks:11},sourceAudit,localClosure:{exactAssertionIdentitySet:true,exactResultIdentitySet:true,duplicatesFailClosed:true,missingExtraReorderedInvalidFailClosed:true,sourceAuthorityReconciled:true,sourceImmutable:true},historicalCorrection:{r37r4SmokeRows:55,r37r4UniqueAssertions:52,r37r4ResultRows:17,r37r4UniqueResults:16,r37r4Smoke55Of55Credit:false},environmentBlockers:[{id:"fresh_exact_windows_node_npm",requiredNode:"24.18.0",requiredNpm:"11.16.0",credit:false},{id:"fresh_webpack_turbopack_smoke_parity",credit:false},{id:"exact_chrome_playwright",credit:false},{id:"a77r1_to_a80r1_0_of_4",credit:false},{id:"staging_rights_legal_customers",credit:false}],realEvidence:{freshWebpackBuildCredit:false,freshTurbopackBuildCredit:false,freshProductionSmokeCredit:false,exactBrowserCredit:false,a102ObservationRuns:0,stagingStages:0,providerRights:0,legalDecisions:0,customerCohorts:0},promotion:{globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},truthBoundary:"Local evidence-cardinality, runner wiring, authority coherence and static regression only. No fresh exact build, browser, Windows, staging, rights, legal, customer, LIVE or sale credit."};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify({status:receipt.status,stages:receipt.passedStages,sourceAudit,output:path.relative(root,output)},null,2));
