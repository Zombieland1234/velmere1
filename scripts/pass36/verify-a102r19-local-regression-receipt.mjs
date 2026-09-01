#!/usr/bin/env node
import fs from "node:fs";
const REV="VELMERE_PASS36_A102R19_ACTION_REQUIRED_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM_NO_REAL_CREDIT",PARENT="VELMERE_PASS36_A102R18_ACTION_REQUIRED_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_TEXT_LINK_CONTROL_BIDI_AND_SAME_ORIGIN_FAIL_CLOSED_NO_REAL_CREDIT";
const receipt=JSON.parse(fs.readFileSync("config/pass36/a102r19-local-regression-receipt.json","utf8")),state=JSON.parse(fs.readFileSync("config/pass36/a102r19-action-required-current-state.json","utf8"));
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",receipt.revisionId===REV&&receipt.parentRevisionId===PARENT);
add("status",receipt.status==="PASS_A102R19_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION");
add("stages",receipt.requiredStages===27&&receipt.executedStages===27&&receipt.passedStages===27&&receipt.failedStages===0);
add("denominators",receipt.keyDenominators?.a102r19Checks===33&&receipt.keyDenominators?.a102r18Checks===42&&receipt.keyDenominators?.routeDispatchChecks===1480&&receipt.keyDenominators?.productTierChecks===186&&receipt.keyDenominators?.zeroBudgetChecks===439);
add("source",receipt.sourceAudit?.syntaxErrors===0&&receipt.sourceAudit?.missingLocalImports===0&&receipt.sourceAudit?.missingCssModuleClasses===0,receipt.sourceAudit);
add("logs",receipt.stages?.length===27&&receipt.stages.every((row)=>row.exitCode===0&&row.passed===true&&/^[a-f0-9]{64}$/u.test(row.stdoutSha256)&&/^[a-f0-9]{64}$/u.test(row.stderrSha256)));
const c=receipt.localClosure??{};
add("closure",c.activeGlobalCssKeyframeNamespaceUnique===true&&c.activeGlobalStylesheets===3&&c.activeGlobalKeyframeNames===361&&c.duplicateGlobalKeyframeNames===0&&c.removedDuplicateOrDeadKeyframeBlocks===7&&c.globalsCssBytesReduced===627&&c.customerSurfacesSimplified===3&&c.internalProofMarkersRetained===true,c);
add("promotion",receipt.promotion?.globalDecision==="NO_GO"&&receipt.promotion?.live===false&&receipt.promotion?.saleEnabled===false&&receipt.promotion?.productionApproved===false&&receipt.promotion?.worldClassProven===false);
add("real",receipt.realEvidence?.realBrowserRows===0&&receipt.realEvidence?.screenshotParityRows===0&&receipt.realEvidence?.realObservationRuns===0&&receipt.realEvidence?.stagingStages===0);
add("state",state.revisionId===REV&&state.localImplementation?.activeGlobalCssKeyframeNamespaceUnique===true&&state.localImplementation?.duplicateActiveGlobalKeyframeNames===0&&state.localImplementation?.exactBrowserVisualParityVerified===false);
const failed=checks.filter((x)=>!x.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R19_LOCAL_REGRESSION_RECEIPT":"PASS_A102R19_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
