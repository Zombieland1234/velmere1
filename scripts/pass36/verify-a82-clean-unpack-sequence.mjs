#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
const root=process.cwd(); const REV="VELMERE_PASS36_A82R0_AUDIT_BASIC_PRO_ADVANCED_REAL_CONTRACT_MATRIX_AND_OFFICIAL_TOOL_EVIDENCE_BINDING"; const packageManifest=path.join(root,"_velmere/PASS35_SOURCE_ONLY_MANIFEST.json"); if(!fs.existsSync(packageManifest))throw new Error("a82_clean_unpack_package_manifest_required");
const commands=[
{id:"a58_release_integrity_first",args:["scripts/pass36/verify-a58-release-integrity.mjs"],parseA58:true},
{id:"a58_contract",args:["scripts/pass36/test-a58-release-integrity.mjs"]},
{id:"source_package_self_audit",args:["scripts/pass35/test-source-package-self-verification.mjs"]},
{id:"a82_descendant",args:["scripts/pass36/verify-a82-current-root-descendant.mjs"]},
{id:"a82_matrix",args:["scripts/pass36/verify-a82-audit-real-contract-matrix.mjs"]},
{id:"a81_descendant",args:["scripts/pass36/verify-a81-current-root-descendant.mjs"]},
{id:"a81_matrix",args:["--experimental-strip-types","scripts/pass36/verify-a81-canonical-mega-matrix-orchestrator.ts"]},
{id:"a80_descendant",args:["scripts/pass36/verify-a80-current-root-descendant.mjs"]},
{id:"a80_admission",args:["scripts/pass36/verify-a80-frozen-local-release-candidate-admission.mjs"]},
{id:"a79_descendant",args:["scripts/pass36/verify-a79-current-root-descendant.mjs"]},
{id:"a79_admission",args:["scripts/pass36/verify-a79-exact-final-byte-build-browser-evidence-binding.mjs"]},
{id:"a46_data_plane",args:["scripts/pass35/test-a46-customer-data-plane-acceptance.mjs"]},
{id:"a57_acceptance",args:["scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs"]},
{id:"route_dispatch",args:["scripts/pass15/verify-route-dispatch-consolidation.mjs"]},
{id:"static_control_plane",args:["scripts/pass35/verify-control-plane.mjs"]},
{id:"product_tiers",args:["scripts/pass35/test-product-tier-content-contract.mjs"]},
{id:"zero_budget",args:["scripts/pass35/test-zero-budget-functional-roadmap.mjs"]},
{id:"source_audit",args:["scripts/a44-source-integrity-audit.mjs"]},
];
const results=[]; for(const command of commands){const run=spawnSync(process.execPath,command.args,{cwd:root,encoding:"utf8",maxBuffer:256*1024*1024,timeout:120000,env:{...process.env,VELMERE_A82_CLEAN_UNPACK_SEQUENCE:"1"}});let parsed=null;try{parsed=JSON.parse(run.stdout)}catch (ignoredError) { void ignoredError; }let passed=run.status===0&&!run.signal&&!run.error;if(command.parseA58)passed=passed&&parsed?.status==="PASS_RELEASE_INTEGRITY_NO_PROMOTION"&&parsed?.summary?.blockingFailed===0&&parsed?.historicalArtifactRecoveryComplete===false;results.push({id:command.id,passed,exitCode:run.status,signal:run.signal,timedOut:run.error?.code==="ETIMEDOUT",stdoutBytes:Buffer.byteLength(run.stdout??""),stderrBytes:Buffer.byteLength(run.stderr??""),status:parsed?.status??null,failureTail:passed?null:`${run.stderr??""}\n${run.stdout??""}`.slice(-4000)});if(!passed)break;}
const failures=results.filter(r=>!r.passed); const report={schemaVersion:"velmere.pass36.a82.clean-unpack-sequence.v1",revisionId:REV,status:failures.length?"FAIL_A82_CLEAN_UNPACK_SEQUENCE":"PASS_A82_CLEAN_UNPACK_SEQUENCE_NO_PROMOTION",requiredOrder:["A58_EXACT_PATH_SET_BEFORE_ANY_RECEIPT_GENERATING_TEST","A82_AND_RETAINED_REGRESSIONS_AFTER_A58"],checks:results.length,passed:results.length-failures.length,failed:failures.length,results,historicalArtifactsRecovered:false,exactBuildBrowserExecuted:false,realAuditCasesFullyVerified:0,officialAuditToolExecutions:0,stagingProven:false,liveProven:false,saleEnabled:false,truthBoundary:"This sequence verifies an unpacked SOURCE_ONLY package in safe order. A58 runs before receipt-generating tests. It does not recover A61, install exact dependencies, execute official audit tools, verify real contracts, prove staging, LIVE or sale."}; console.log(JSON.stringify(report,null,2)); if(failures.length)process.exit(1);
