#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateAdmission, sha256 } from "./a95-staging-subject-lib.mjs";
import { canonicalJson, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";

const policy=JSON.parse(fs.readFileSync("config/pass36/a95-staging-subject-admission-policy.json","utf8"));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"velmere-a95-test-"));
const archive=path.join(tmp,"A95_SOURCE_ONLY.zip");
const payload=Buffer.from("export const fixture = true;\n","utf8");
const entries=[{path:"app/fixture.ts",byteLength:payload.length,sha256:sha256(payload),mode:0o100644}];
const manifestCore={
 schemaVersion:"velmere.pass36.a95.test-source-only-package-manifest.v1",
 revisionId:policy.revisionId,
 parentRevisionId:policy.parentRevisionId,
 normalizedTimestamp:"1980-01-01T00:00:00.000Z",
 fileCount:entries.length,
 byteLength:entries.reduce((sum,row)=>sum+row.byteLength,0),
 pathSetSha256:sha256(entries.map((row)=>row.path).join("\n")),
 aggregateSha256:sha256(entries.map((row)=>`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
 entries,
 manifestPath:"_velmere/PASS36_A95_TEST_SOURCE_ONLY_MANIFEST.json",
 manifestExcludedFromOwnInventory:true,
 checkpointClass:"ACTION_REQUIRED_NON_PASS",
 completedThrough:94,
 exactReleaseCredit:false,
 globalDecision:"NO_GO",
 live:false,
 saleEnabled:false,
 productionApproved:false,
 worldClassProven:false
};
const manifestSha=sha256(canonicalJson(manifestCore));
const manifest={...manifestCore,manifestSha256:manifestSha};
writeDeterministicZip(archive,[
 {path:entries[0].path,content:payload,mode:entries[0].mode},
 {path:manifestCore.manifestPath,content:Buffer.from(JSON.stringify(manifest,null,2)+"\n","utf8"),mode:0o100644}
]);
const archiveBytes=fs.readFileSync(archive);
const plainTextArchive=path.join(tmp,"NOT_A_ZIP.zip");fs.writeFileSync(plainTextArchive,"a95-plain-text-not-a-zip\n");
const baseEnv={
 VELMERE_A95_PROGRAM_ID:"A95-STAGING-PROGRAM-0001",
 VELMERE_A95_STAGING_ENVIRONMENT_ID:"a95-disposable-staging-env-0001",
 VELMERE_A95_PROJECT_CLASS:policy.environment.projectClass,
 VELMERE_A95_SOURCE_ARCHIVE_PATH:archive,
 VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256:sha256(archiveBytes),
 VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES:String(archiveBytes.length),
 VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256:manifestSha,
 VELMERE_A95_CONFIRM:policy.environment.confirmationToken,
 VELMERE_A48_STAGING_BASE_URL:"https://app.staging.example.test/a48",
 VELMERE_A50_KMS_WRAP_URL:"https://kms.preview.example.test/wrap",
 VELMERE_A52_ALERT_DELIVERY_URL:"https://alerts.sandbox.example.test/delivery",
 VELMERE_A48_TENANT_A_EMAIL:"tenant-a@example.test",
 VELMERE_A48_TENANT_B_EMAIL:"tenant-b@example.test",
 VELMERE_A48_TENANT_A_PASSWORD:"fixture-password-a-00000000000000000001",
 VELMERE_A48_TENANT_B_PASSWORD:"fixture-password-b-00000000000000000002",
 STRIPE_SECRET_KEY:"sk_test_fixture_00000000000000000000000001",
 STRIPE_WEBHOOK_SECRET:"whsec_fixture_000000000000000000000001",
 SUPABASE_SERVICE_ROLE_KEY:"fixture-service-role-000000000000000000001",
 UNRELATED_AMBIENT_VALUE:"ignored"
};
const exactReceipts=Object.fromEntries(policy.exactReleasePrerequisites.map((row)=>[row.id,{revisionId:row.revisionId,decision:row.decision,fixtureMode:false,subject:{sourcePackageManifestSha256:manifestSha},liveProven:false,saleEnabled:false,productionApproved:false}]));
const base={
 authority:{authorityRevisionId:policy.revisionId,parentRevisionId:policy.parentRevisionId,currentSource:{revisionId:policy.revisionId,parentRevisionId:policy.parentRevisionId},claims:{liveProven:false,saleEnabled:false,productionApproved:false,worldClassProven:false}},
 descendant:{revisionId:policy.revisionId,parentRevisionId:policy.parentRevisionId,manifestDigestSha256:"2".repeat(64),checkpointClass:policy.subject.requiredCheckpointClass,completedThrough:policy.subject.completedThrough,claims:{stagingExecuted:false,liveProven:false,saleEnabled:false,productionApproved:false,worldClassProven:false}},
 sourcePackageManifest:{revisionId:policy.revisionId,manifestSha256:manifestSha,exactReleaseCredit:false,live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},
 exactReceipts,
 currentRootReceipt:{summary:{suites:30,passed:30,blocked:0,semanticFailures:0},exactRuntimeProven:true,criticalGate30Of30Credit:true},
 environment:baseEnv,sourceRoot:process.cwd(),executeRequested:false,fixtureMode:true
};
const clone=(v)=>structuredClone(v);
const cases=[];
function scenario(id,mutate,expectedReady=false,extra=null){const c=clone(base);mutate?.(c);const r=evaluateAdmission(c,policy);const passed=(r.preflightPassed===expectedReady)&&(extra?extra(r):true);cases.push({id,passed,decision:r.decision,failed:r.checks.filter((x)=>!x.passed).map((x)=>x.id)});}
scenario("valid-ready",null,true,(r)=>r.stageCallsAllowed===0&&r.mutationAllowed===false&&r.environment.ignoredCount>=1);
scenario("valid-execute-admitted",(c)=>{c.executeRequested=true;},true,(r)=>r.mutationAllowed===true&&r.stageCallsAllowed===10);
scenario("missing-a77r1",(c)=>{delete c.exactReceipts.A77R1;});
scenario("missing-a80r1",(c)=>{delete c.exactReceipts.A80R1;});
scenario("exact-source-binding-missing",(c)=>{delete c.exactReceipts.A79R1.subject;});
scenario("exact-source-binding-wrong",(c)=>{c.exactReceipts.A78R1.subject.sourcePackageManifestSha256="3".repeat(64);});
scenario("exact-fixture-rejected",(c)=>{c.exactReceipts.A77R1.fixtureMode=true;});
scenario("exact-live-promotion-rejected",(c)=>{c.exactReceipts.A80R1.liveProven=true;});
scenario("authority-drift",(c)=>{c.authority.authorityRevisionId=policy.parentRevisionId;});
scenario("authority-parent-drift",(c)=>{c.authority.parentRevisionId="wrong";});
scenario("authority-promotion",(c)=>{c.authority.claims.saleEnabled=true;});
scenario("descendant-drift",(c)=>{c.descendant.revisionId=policy.parentRevisionId;});
scenario("descendant-missing-digest",(c)=>{c.descendant.manifestDigestSha256=null;});
scenario("descendant-promotion",(c)=>{c.descendant.claims.stagingExecuted=true;});
scenario("package-revision-drift",(c)=>{c.sourcePackageManifest.revisionId=policy.parentRevisionId;});
scenario("package-missing-digest",(c)=>{c.sourcePackageManifest.manifestSha256=null;});
scenario("package-promotion",(c)=>{c.sourcePackageManifest.exactReleaseCredit=true;});
scenario("current-root-29",(c)=>{c.currentRootReceipt.summary.passed=29;});
scenario("current-root-blocked",(c)=>{c.currentRootReceipt.summary.blocked=1;});
scenario("current-root-semantic-fail",(c)=>{c.currentRootReceipt.summary.semanticFailures=1;});
scenario("current-root-no-exact-credit",(c)=>{c.currentRootReceipt.exactRuntimeProven=false;});
scenario("unknown-relevant-env",(c)=>{c.environment.VELMERE_UNREGISTERED_SECRET="x".repeat(40);});
scenario("wrong-program-id",(c)=>{c.environment.VELMERE_A95_PROGRAM_ID="short";});
scenario("wrong-staging-id",(c)=>{c.environment.VELMERE_A95_STAGING_ENVIRONMENT_ID="short";});
scenario("wrong-project-class",(c)=>{c.environment.VELMERE_A95_PROJECT_CLASS="production";});
scenario("wrong-confirmation",(c)=>{c.environment.VELMERE_A95_CONFIRM="yes";});
scenario("archive-hash-mismatch",(c)=>{c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256="4".repeat(64);});
scenario("archive-size-mismatch",(c)=>{c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES="999";});
scenario("plain-text-zip-rejected",(c)=>{const bytes=fs.readFileSync(plainTextArchive);c.environment.VELMERE_A95_SOURCE_ARCHIVE_PATH=plainTextArchive;c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256=sha256(bytes);c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES=String(bytes.length);});
scenario("archive-inside-source",(c)=>{c.environment.VELMERE_A95_SOURCE_ARCHIVE_PATH=path.join(process.cwd(),"package.json");c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256=sha256(fs.readFileSync("package.json"));c.environment.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES=String(fs.statSync("package.json").size);});
const link=path.join(tmp,"archive-link.zip");try{fs.symlinkSync(archive,link);scenario("archive-symlink",(c)=>{c.environment.VELMERE_A95_SOURCE_ARCHIVE_PATH=link;});}catch{
  // A platform without symlink support cannot execute this optional mutation.
}
scenario("http-url",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="http://app.staging.example.test/a48";});
scenario("url-credentials",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://user:pass@app.staging.example.test/a48";});
scenario("url-query",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.staging.example.test/a48?x=1";});
scenario("url-fragment",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.staging.example.test/a48#x";});
scenario("localhost-url",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://localhost/a48";});
scenario("private-ip-url",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://127.0.0.1/a48";});
scenario("production-token-url",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.production.example.test/a48";});
scenario("missing-staging-hint",(c)=>{c.environment.VELMERE_A48_STAGING_BASE_URL="https://app.example.com/a48";});
scenario("origin-collapse",(c)=>{c.environment.VELMERE_A50_KMS_WRAP_URL="https://app.staging.example.test/kms";c.environment.VELMERE_A52_ALERT_DELIVERY_URL="https://app.staging.example.test/alerts";});
scenario("short-secret",(c)=>{c.environment.STRIPE_SECRET_KEY="sk_test_short";});
scenario("live-stripe-secret",(c)=>{c.environment.STRIPE_SECRET_KEY="sk_live_"+"x".repeat(40);});
scenario("duplicate-secrets",(c)=>{c.environment.STRIPE_WEBHOOK_SECRET=c.environment.STRIPE_SECRET_KEY;});
scenario("duplicate-tenant-emails",(c)=>{c.environment.VELMERE_A48_TENANT_B_EMAIL=c.environment.VELMERE_A48_TENANT_A_EMAIL;});
scenario("source-manifest-env-malformed",(c)=>{c.environment.VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256="bad";});
const failed=cases.filter((row)=>!row.passed);
const receipt={schemaVersion:"velmere.pass36.a95.staging-subject-admission-test-receipt.v1",revisionId:policy.revisionId,generatedAt:"2026-07-29T00:35:00.000Z",cases:cases.length,passed:cases.length-failed.length,failed:failed.length,stageCallsOnBlockedCases:0,mutationStarted:false,results:cases,decision:failed.length?"FAIL":"PASS_LOCAL_ADVERSARIAL_NO_STAGING_CREDIT",stagingCredit:false,liveProven:false,saleEnabled:false};
if(process.env.VELMERE_A95_NO_WRITE!=="1"){fs.mkdirSync("artifacts/pass36/a95",{recursive:true});fs.writeFileSync("artifacts/pass36/a95/PASS36_A95_STAGING_SUBJECT_ADMISSION_TEST.json",JSON.stringify(receipt,null,2)+"\n");}
console.log(JSON.stringify({decision:receipt.decision,cases:receipt.cases,passed:receipt.passed,failed:receipt.failed},null,2));
fs.rmSync(tmp,{recursive:true,force:true});process.exit(failed.length?1:0);
