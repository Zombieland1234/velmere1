#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  appendJournalEvent,
  evaluateProgram,
  redactObject,
  verifyJournal,
} from "./a63-staging-program-lib.mjs";
const policy=JSON.parse(fs.readFileSync("config/pass36/a63-staging-program-orchestrator.json","utf8"));
const source="a".repeat(64), now=Date.parse("2026-07-26T13:00:00.000Z");
function base(){
 const environment={
  VELMERE_A63_PROGRAM_ID:"A63-REAL-STAGING-PROGRAM-0001",
  VELMERE_A63_PROJECT_CLASS:policy.projectClass,
  VELMERE_A63_STAGING_ENVIRONMENT_ID:"staging-environment-identity-0001",
  VELMERE_A63_EXPECTED_SOURCE_MANIFEST_SHA256:source,
  VELMERE_A63_CONFIRM:policy.confirmationToken,
  VELMERE_A48_STAGING_BASE_URL:"https://app.preview.example.test",
  VELMERE_A51_BACKUP_URL:"https://backup.staging.example.test/create",
  VELMERE_A57_SECURITY_URL:"https://security.canary.example.test/snapshot",
  VELMERE_A49_STRIPE_SECRET_KEY:"sk_test_00000000000000000000000000000001",
  VELMERE_A50_KMS_BEARER_SECRET:"kms-secret-000000000000000000000000000001",
  VELMERE_A57_CONTROL_BEARER_SECRET:"control-secret-00000000000000000000000001"
 };
 const stageReceipts=Object.fromEntries(policy.stages.map((stage,index)=>[stage.id,{revisionId:stage.revisionId,decision:stage.expectedDecision,fixtureMode:false,generatedAt:new Date(Date.parse("2026-07-26T12:10:00.000Z")+index*60000).toISOString(),sourceManifestSha256:source,saleEnabled:false,liveProven:false,productionApproved:false}]));
 return {runtime:{...policy.runtime},sourceManifestSha256:source,expectedSourceManifestSha256:source,environment,a60:{revisionId:policy.requiredPreconditions.a60.revisionId,decision:policy.requiredPreconditions.a60.decision,fixtureMode:false,generatedAt:"2026-07-26T12:00:00.000Z",sourceManifestSha256:source},a61:{revisionId:policy.requiredPreconditions.a61.revisionId,decision:policy.requiredPreconditions.a61.decision,fixtureMode:false,generatedAt:"2026-07-26T12:01:00.000Z"},criticalGate:{lineageMode:"legacy",summary:{suites:30,passed:30,exactByteBlocked:0,runtimeDependencyBlocked:0,semanticOrUnknownFailed:0},criticalGate30Of30Credit:true},stageReceipts,nowMs:now,fixtureMode:true};
}
const clone=(v)=>structuredClone(v);
const scenarios=[];
function scenario(id,mutate,expected){const c=base();mutate(c);scenarios.push({id,c,expected});}
scenario("valid",()=>{},policy.decisions.verified);
scenario("valid-signed-clean-root",c=>{c.a61=null;c.a77={revisionId:policy.requiredPreconditions.lineage.cleanRoot.revisionId,decision:policy.requiredPreconditions.lineage.cleanRoot.decision,fixtureMode:false,saleEnabled:false,liveProven:false};c.criticalGate.lineageMode="current-root";},policy.decisions.verified);
scenario("wrong-node",c=>c.runtime.node="24.17.0",policy.decisions.blocked);
scenario("wrong-npm",c=>c.runtime.npm="11.15.0",policy.decisions.blocked);
scenario("manifest-anchor-mismatch",c=>c.expectedSourceManifestSha256="b".repeat(64),policy.decisions.blocked);
scenario("manifest-anchor-invalid",c=>c.expectedSourceManifestSha256="invalid",policy.decisions.blocked);
scenario("a60-missing",c=>c.a60=null,policy.decisions.blocked);
scenario("a60-wrong-decision",c=>c.a60.decision="BLOCKED_EXACT_PREFLIGHT",policy.decisions.blocked);
scenario("a60-fixture",c=>c.a60.fixtureMode=true,policy.decisions.blocked);
scenario("a60-source-drift",c=>c.a60.sourceManifestSha256="b".repeat(64),policy.decisions.blocked);
scenario("a61-missing",c=>c.a61=null,policy.decisions.blocked);
scenario("a61-wrong-decision",c=>c.a61.decision="PARTIAL_RECOVERY",policy.decisions.blocked);
scenario("critical-29",c=>c.criticalGate.summary.passed=29,policy.decisions.blocked);
scenario("critical-byte-blocked",c=>c.criticalGate.summary.exactByteBlocked=1,policy.decisions.blocked);
scenario("critical-runtime-blocked",c=>c.criticalGate.summary.runtimeDependencyBlocked=1,policy.decisions.blocked);
scenario("critical-semantic-fail",c=>c.criticalGate.summary.semanticOrUnknownFailed=1,policy.decisions.blocked);
scenario("critical-no-credit",c=>c.criticalGate.criticalGate30Of30Credit=false,policy.decisions.blocked);
scenario("critical-lineage-mode-mismatch",c=>c.criticalGate.lineageMode="current-root",policy.decisions.blocked);
scenario("wrong-project-class",c=>c.environment.VELMERE_A63_PROJECT_CLASS="production",policy.decisions.blocked);
scenario("wrong-confirmation",c=>c.environment.VELMERE_A63_CONFIRM="NO",policy.decisions.blocked);
scenario("short-program-id",c=>c.environment.VELMERE_A63_PROGRAM_ID="a63",policy.decisions.blocked);
scenario("short-staging-id",c=>c.environment.VELMERE_A63_STAGING_ENVIRONMENT_ID="short",policy.decisions.blocked);
scenario("http-url",c=>c.environment.VELMERE_A48_STAGING_BASE_URL="http://app.preview.example.test",policy.decisions.blocked);
scenario("production-host",c=>c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.production.example.test",policy.decisions.blocked);
scenario("host-no-staging-hint",c=>c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.example.invalid",policy.decisions.blocked);
scenario("origin-collapse",c=>{c.environment.VELMERE_A51_BACKUP_URL="https://app.preview.example.test/backup";c.environment.VELMERE_A57_SECURITY_URL="https://app.preview.example.test/security";},policy.decisions.blocked);
scenario("live-stripe-key",c=>c.environment.VELMERE_A49_STRIPE_SECRET_KEY=["sk","live","000000000000000000000000000001"].join("_"),policy.decisions.blocked);
scenario("weak-secret",c=>c.environment.VELMERE_A50_KMS_BEARER_SECRET="weak",policy.decisions.blocked);
scenario("duplicate-secrets",c=>c.environment.VELMERE_A57_CONTROL_BEARER_SECRET=c.environment.VELMERE_A50_KMS_BEARER_SECRET,policy.decisions.blocked);
scenario("missing-a47",c=>delete c.stageReceipts.A47,policy.decisions.incomplete);
scenario("a47-action-required",c=>c.stageReceipts.A47.decision="ACTION_REQUIRED",policy.decisions.actionRequired);
scenario("a48-fixture",c=>c.stageReceipts.A48.fixtureMode=true,policy.decisions.actionRequired);
scenario("a49-sale-enabled",c=>c.stageReceipts.A49.saleEnabled=true,policy.decisions.actionRequired);
scenario("a50-live-claimed",c=>c.stageReceipts.A50.liveProven=true,policy.decisions.actionRequired);
scenario("a51-source-drift",c=>c.stageReceipts.A51.sourceManifestSha256="b".repeat(64),policy.decisions.actionRequired);
scenario("a52-stale",c=>c.stageReceipts.A52.generatedAt="2020-01-01T00:00:00.000Z",policy.decisions.actionRequired);
scenario("a54-future",c=>c.stageReceipts.A54.generatedAt="2026-07-27T00:00:00.000Z",policy.decisions.actionRequired);
scenario("a55-wrong-revision",c=>c.stageReceipts.A55.revisionId="A55_WRONG",policy.decisions.actionRequired);
scenario("a56-out-of-order",c=>c.stageReceipts.A56.generatedAt="2026-07-26T12:05:00.000Z",policy.decisions.actionRequired);
scenario("a57-production-approved",c=>c.stageReceipts.A57.productionApproved=true,policy.decisions.actionRequired);
let assertions=0;
for(const s of scenarios){const r=evaluateProgram(s.c,policy);assert.equal(r.decision,s.expected,`${s.id}:${r.decision}`);assert.equal(r.saleEnabled,false,s.id);assert.equal(r.liveProven,false,s.id);assert.ok(r.summary.totalChecks>0,s.id);assertions+=4;}
let journal=[];journal=appendJournalEvent(journal,{type:"START",programId:"A63-REAL-STAGING-PROGRAM-0001"});journal=appendJournalEvent(journal,{type:"STAGE",stageId:"A47"});assert.equal(verifyJournal(journal).ok,true);assertions++;
const tampered=clone(journal);tampered[1].stageId="A48";assert.equal(verifyJournal(tampered).ok,false);assertions++;
assert.throws(()=>redactObject({leak:"super-secret-value-0000000000000000000001"},["super-secret-value-0000000000000000000001"]),/secret_leak/);assertions++;
assert.throws(()=>redactObject({key:["sk","live","abc123456789"].join("_")},[]),/live_key_leak/);assertions++;
const output={schemaVersion:"velmere.pass36.a63.staging-program-test-receipt.v1",revisionId:policy.revisionId,status:"PASS",scenarioCount:scenarios.length,assertions,validProgramDecision:policy.decisions.verified,negativeScenarios:scenarios.length-1,journalChecks:4,saleEnabled:false,liveProven:false};
fs.writeFileSync("config/pass36/a63-staging-program-test-receipt.json",`${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify(output,null,2));
