import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const sourceRoot=process.env.P71_SOURCE_ROOT || process.cwd();
const resultDir=process.env.P71_RESULT_DIR || process.cwd();
const mod=(p:string)=>import(pathToFileURL(path.join(sourceRoot,p)).href);
const quorum=await mod('lib/security/audit-source-quorum-runtime.ts');
const spineMod=await mod('lib/security/audit-source-spine.ts');
const queueMod=await mod('lib/security/advanced-manual-review-queue.ts');
const deliveryMod=await mod('lib/security/customer-safe-delivery-decision.ts');
const consoleMod=await mod('lib/security/advanced-operator-console-merge.ts');
const checks:Array<{id:string;passed:boolean;detail?:unknown}>=[];
const check=(id:string,cond:unknown,detail?:unknown)=>{assert.ok(cond,id);checks.push({id,passed:true,...(detail===undefined?{}:{detail})});};

const q=quorum.buildPass2570AuditSourceQuorumReport({locale:'en',reviewLevel:'advanced_review',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11'});
const manualLane=q.lanes.find((x:any)=>x.id==='manual-human-review');
check('quorum:optional-human-lane-present-for-legacy-schema',Boolean(manualLane));
check('quorum:optional-human-lane-not-run-zero-confidence',manualLane?.state==='not_run' && manualLane?.confidence===0,manualLane);
check('quorum:manual-lane-absence-not-missing',Array.isArray(manualLane?.missing) && manualLane.missing.length===0,manualLane?.missing);
const scored=q.lanes.filter((x:any)=>x.id!=='manual-human-review');
const counted={
  confirmed:scored.filter((x:any)=>x.state==='confirmed').length,
  partial:scored.filter((x:any)=>x.state==='partial').length,
  missing:scored.filter((x:any)=>x.state==='missing').length,
  notRun:scored.filter((x:any)=>x.state==='not_run').length,
  blocked:scored.filter((x:any)=>x.state==='blocked').length,
};
check('quorum:optional-human-excluded-from-denominator',q.overall.confirmedSources===counted.confirmed && q.overall.partialSources===counted.partial && q.overall.missingSources===counted.missing && q.overall.notRunSources===counted.notRun && q.overall.blockedSources===counted.blocked,{overall:q.overall,counted});
check('quorum:advanced-product-rule-automated',String(q.productRule).includes('deepest automated') && String(q.productRule).includes('no mandatory human'),q.productRule);

const spine=spineMod.buildPass2569AuditSourceSpine('en');
const spineHuman=spine.lanes.find((x:any)=>x.id==='manual-human-review');
check('spine:human-is-optional-internal-qa',spineHuman?.status==='unavailable' && String(spineHuman?.label).includes('Optional internal QA'),spineHuman);
check('spine:human-never-product-gate',String(spineHuman?.adapterTarget).includes('never a customer entitlement') && String(spineHuman?.missingRule).includes('Do not treat absence'),spineHuman);

const queue=queueMod.buildPass2579AdvancedManualReviewQueueReport({locale:'en',reviewLevel:'advanced_review'});
check('queue:legacy-id-current-semantics-automated',queueMod.PASS2579_CURRENT_SEMANTICS==='advanced-automated-evidence-queue',queueMod.PASS2579_CURRENT_SEMANTICS);
check('queue:stop-sold-boundary',String(queue.paymentBoundary).includes('NOT_FOR_SALE') && String(queue.paymentBoundary).includes('cannot unlock'),queue.paymentBoundary);
check('queue:legacy-ready-alias-only',queue.summary.readyForOperator===queue.summary.readyForAutomation,queue.summary);
check('queue:no-human-requirement',String(queue.rule).includes('optional internal QA only') && String(queue.rule).includes('never gates customer delivery'),queue.rule);

const delivery=deliveryMod.buildPass2580CustomerSafeDeliveryDecisionReport({locale:'en',reviewLevel:'advanced_review',advancedManualReviewQueue:queue});
check('delivery:advanced-stop-sold',delivery.summary.deliveryStatus==='not_deliverable',delivery.summary);
check('delivery:advanced-ready-false',delivery.summary.advancedReady===false,delivery.summary);
const availability=delivery.gates.find((x:any)=>x.id==='product-availability');
check('delivery:owner-bound-availability-hard-gate',availability?.status==='blocked' && availability?.priority==='critical',availability);
check('delivery:payment-not-unlock-path',String(delivery.rule).includes('cannot become customer-ready through payment or human review'),delivery.rule);

const consoleReport=consoleMod.buildPass2586AdvancedOperatorConsoleMergeReport({locale:'en',reviewLevel:'advanced_review',paymentVerified:true,advancedManualReviewQueue:queue,customerSafeDeliveryDecision:delivery});
check('console:internal-analysis-can-run-stop-sold',consoleReport.summary.canOpenAdvancedCase===true,consoleReport.summary);
check('console:payment-cannot-deliver',consoleReport.summary.canCustomerDeliverAdvanced===false,consoleReport.summary);
check('console:manual-signoff-cannot-unlock',consoleReport.summary.canFinalSignAdvanced===false,consoleReport.summary);
const availabilityControl=consoleReport.controls.find((x:any)=>x.id==='adv-current-product-availability');
check('console:availability-control-blocked',availabilityControl?.status==='blocked' && availabilityControl?.blocksCustomerDelivery===true,availabilityControl);
const paymentControl=consoleReport.controls.find((x:any)=>x.family==='payment_receipt');
check('console:payment-control-never-current-unlock-gate',paymentControl?.blocksCustomerDelivery===false && paymentControl?.blocksFinalSign===false,paymentControl);
const optionalQa=consoleReport.controls.find((x:any)=>x.label==='Optional internal QA notes');
check('console:optional-qa-nonblocking',optionalQa?.blocksCustomerDelivery===false && optionalQa?.blocksFinalSign===false,optionalQa);
check('console:rule-denies-human-override',String(consoleReport.rule).includes('no human/operator action may unlock, block or certify it'),consoleReport.rule);

const result={schemaVersion:'velmere.p71r1.expanded-advanced-automation-runtime.v1',status:'PASS',checkCount:checks.length,checks};
fs.mkdirSync(resultDir,{recursive:true});
fs.writeFileSync(path.join(resultDir,'P71R1_EXPANDED_ADVANCED_AUTOMATION_RUNTIME_TEST.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
