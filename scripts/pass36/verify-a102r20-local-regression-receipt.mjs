#!/usr/bin/env node
import fs from "node:fs";
const REV="VELMERE_PASS36_A102R20_ACTION_REQUIRED_SINGLE_CURRENT_AUTHORITY_README_HISTORY_LABEL_STALE_POINTER_AND_PLANNING_ESTIMATE_COHERENCE_MINIMALISM_NO_REAL_CREDIT",PARENT="VELMERE_PASS36_A102R19_ACTION_REQUIRED_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM_NO_REAL_CREDIT";
const receipt=JSON.parse(fs.readFileSync("config/pass36/a102r20-local-regression-receipt.json","utf8")),state=JSON.parse(fs.readFileSync("config/pass36/a102r20-action-required-current-state.json","utf8"));
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",receipt.revisionId===REV&&receipt.parentRevisionId===PARENT);
add("status",receipt.status==="PASS_A102R20_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION");
add("stages",receipt.requiredStages===28&&receipt.executedStages===28&&receipt.passedStages===28&&receipt.failedStages===0);
add("denominators",receipt.keyDenominators?.a102r20Checks===48&&receipt.keyDenominators?.a102r19Checks===33&&receipt.keyDenominators?.routeDispatchChecks===1480&&receipt.keyDenominators?.productTierChecks===186&&receipt.keyDenominators?.zeroBudgetChecks===439);
add("source",receipt.sourceAudit?.syntaxErrors===0&&receipt.sourceAudit?.missingLocalImports===0&&receipt.sourceAudit?.missingCssModuleClasses===0,receipt.sourceAudit);
add("logs",receipt.stages?.length===28&&receipt.stages.every((r)=>r.exitCode===0&&r.passed===true&&/^[a-f0-9]{64}$/u.test(r.stdoutSha256)&&/^[a-f0-9]{64}$/u.test(r.stderrSha256)));
const c=receipt.localClosure??{};add("closure",c.singleCurrentAuthorityCoherent===true&&c.readmeCurrentHeadingCount===1&&c.cleanReadmeCurrentHeadingCount===1&&c.applicationSurfaceFiles===1833&&c.applicationSurfaceAggregateSha256==="c32e0a04f4eed273df473166dbc3ac0d4e56008e21f96461f30981cd54c6e835"&&c.applicationSurfaceFilesChanged===0&&c.quotedPassLiteralCandidates===200&&c.widerVisiblePassJargonInventoryClosed===false&&c.planningMinimum===6&&c.planningMostLikely===11&&c.planningWithRevisions===18&&c.formalRemainingEntries===31,c);
add("promotion",receipt.promotion?.globalDecision==="NO_GO"&&receipt.promotion?.live===false&&receipt.promotion?.saleEnabled===false&&receipt.promotion?.productionApproved===false&&receipt.promotion?.worldClassProven===false);
add("real",receipt.realEvidence?.realBrowserRows===0&&receipt.realEvidence?.realObservationRuns===0&&receipt.realEvidence?.stagingStages===0);
add("state",state.revisionId===REV&&state.localImplementation?.singleCurrentAuthorityCoherent===true&&state.localImplementation?.applicationSurfaceFilesChangedFromA102R19===0&&state.localImplementation?.widerVisiblePassJargonInventoryClosed===false);
const failed=checks.filter((r)=>!r.passed);console.log(JSON.stringify({status:failed.length?"FAIL_A102R20_LOCAL_REGRESSION_RECEIPT":"PASS_A102R20_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));process.exit(failed.length?1:0);
