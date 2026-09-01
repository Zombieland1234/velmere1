#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A97R1_SCOPED_PAYMENT_OPERATOR_ASSERTIONS_DUAL_CONTROL_AND_SINGLE_USE_REQUEUE";
const PARENT="VELMERE_PASS36_A97R0_STRIPE_TEST_RUNTIME_RECEIPT_REFUND_REPLAY_AND_RECONCILIATION_CONTROL";
const read=(f)=>JSON.parse(fs.readFileSync(f,"utf8"));
const authority=read("config/pass36/current-release-authority.json");
const mirror=read("config/pass35/current-revision.json");
const legacy=read("config/current-release.json");
const state=read("config/pass36/a97r1-action-required-current-state.json");
const program=read("config/pass36/a97r1-world-class-completion-program.json");
const policy=read("config/pass36/a97r1-payment-operator-assertion-policy.json");
const staging=read("config/pass35/staging-plan.json");
const active=fs.readFileSync("VELMERE_ACTIVE_PASS.txt","utf8").trim();
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("active:revision",active===REV,active);
add("authority:revision",authority.authorityRevisionId===REV&&authority.currentSource?.revisionId===REV);
add("authority:parent",authority.parentRevisionId===PARENT&&authority.currentSource?.parentRevisionId===PARENT);
add("authority:program",authority.planes?.roadmapProgram?.revisionId===REV&&authority.planes?.roadmapProgram?.path==="config/pass36/a97r1-world-class-completion-program.json");
add("authority:operator-plane",authority.planes?.paymentOperatorAssertionControl?.revisionId===REV&&authority.planes?.paymentOperatorAssertionControl?.behavioralAssertions===44&&authority.planes?.paymentOperatorAssertionControl?.realDurableAssertionConsumptions===0);
add("authority:no-promotion",authority.claims?.currentRevisionId===REV&&authority.claims?.decision==="NO_GO"&&authority.claims?.a90ToA97R1PassCredit===false&&authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false);
add("mirror:revision",mirror.sourceRevisionId===REV&&mirror.parentSourceRevisionId===PARENT&&mirror.a97r1PaymentOperatorAssertionImplemented===true&&mirror.a97r1StagingCredit===false);
add("legacy:pointer",legacy.notAuthoritativeCurrentSourcePointer===true&&legacy.authoritativeCurrentSourceRevisionId===REV&&legacy.a90ToA97R1PassCredit===false);
add("state:truth",state.revisionId===REV&&state.passCredit?.A97R1===false&&state.localVerification?.a97r1BehavioralAssertions===44&&state.localVerification?.a97r1RealDurableAssertionConsumptions===0);
add("program:truth",program.revisionId===REV&&program.remainingPasses===31&&program.localA97R1Summary?.stagingCredit===false);
add("policy:truth",policy.revisionId===REV&&policy.localPassCredit===false&&policy.realDenominators?.realStripeRequeues===0);
add("staging:current",staging.currentStagingSubject?.revisionId===REV&&staging.a97r1?.realDurableAssertionConsumptions===0&&staging.a97r1?.stagingCredit===false);
for(const [id,cmd] of [["descendant",["scripts/pass36/verify-a97r1-current-root-descendant.mjs"]],["operator",["scripts/pass36/verify-a97r1-payment-operator-assertions.mjs"]]]){
 const r=spawnSync(process.execPath,cmd,{encoding:"utf8",timeout:300000});
 add(`${id}:verified`,r.status===0,{status:r.status,stdout:(r.stdout??"").slice(-500),stderr:(r.stderr??"").slice(-500)});
}
const failed=checks.filter(r=>!r.passed);
const out={status:failed.length?"FAIL_A97R1_AUTHORITY":"PASS_A97R1_ACTION_REQUIRED_AUTHORITY_NO_STAGING_CREDIT",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks,globalDecision:"NO_GO",realOperatorReauthCeremonies:0,realDurableAssertionConsumptions:0,realStripeRequeues:0,stagingCredit:false,live:false,saleEnabled:false,productionApproved:false,worldClassProven:false};
console.log(JSON.stringify(out,null,2));process.exit(failed.length?1:0);
