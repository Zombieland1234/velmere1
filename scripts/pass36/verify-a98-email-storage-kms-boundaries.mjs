#!/usr/bin/env node
import fs from "node:fs";import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A98R0_EMAIL_STORAGE_KMS_ORIGIN_CONTEXT_CLEANUP_AND_DELIVERY_TRUTH_BOUNDARY";
const policy=JSON.parse(fs.readFileSync("config/pass36/a98-email-storage-kms-boundary-policy.json","utf8"));
const runner=fs.readFileSync("scripts/a98-email-storage-kms-acceptance.mjs","utf8");
const boundary=fs.readFileSync("scripts/pass36/a98-email-storage-kms-boundary.mjs","utf8");
const fixture=fs.readFileSync("scripts/pass36/test-a98-email-storage-kms-fixture.mjs","utf8");
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("policy:identity",policy.revisionId===REV&&policy.parentRevisionId==="VELMERE_PASS36_A97R1_SCOPED_PAYMENT_OPERATOR_ASSERTIONS_DUAL_CONTROL_AND_SINGLE_USE_REQUEUE");
add("policy:no-credit",policy.localPassCredit===false&&policy.promotion?.stagingCredit===false&&policy.promotion?.saleEnabled===false&&policy.promotion?.live===false);
add("policy:denominators",policy.localDenominators?.boundaryAssertions===77&&policy.localDenominators?.realStorageMutations===0&&policy.localDenominators?.realKmsCalls===0&&policy.localDenominators?.realEmails===0);
add("runner:boundary-import",runner.includes("a98-email-storage-kms-boundary.mjs"));
add("runner:strict-json",runner.includes("parseA98StrictJson")&&runner.includes("boundedJson"));
add("runner:signed-url",runner.includes("validateA98SignedStorageUrl")&&runner.includes("normalizeSignedUrl"));
add("runner:kms-binding",runner.includes("validateA98KmsResponse")&&runner.includes("contextDigest")&&runner.includes("requestId"));
add("runner:aad-envelope",runner.includes("buildA98EncryptedEnvelope")&&runner.includes("openA98EncryptedEnvelope"));
add("runner:separate-secrets",runner.includes("VELMERE_A98_KMS_WRAP_BEARER_SECRET")&&runner.includes("VELMERE_A98_KMS_UNWRAP_BEARER_SECRET")&&!runner.includes("VELMERE_A98_KMS_BEARER_SECRET"));
add("runner:recipient-binding",runner.includes("VELMERE_A98_EMAIL_TO_SHA256")&&runner.includes("validateA98DisposableEmail"));
add("runner:cleanup-finally-boundary",runner.includes("confirmEmergencyCleanup")&&runner.includes("cleanupAttempts")&&runner.includes("emergencyCleanup"));
add("runner:key-zeroization",runner.includes("zeroizeSensitiveKeys")&&runner.includes("key.fill(0)"));
add("runner:truth",runner.includes("productionEmailProven: false")&&runner.includes("productionStorageProven: false")&&runner.includes("productionKmsProven: false")&&runner.includes("saleEnabled: false"));
add("boundary:duplicate-keys",boundary.includes("a98_json_duplicate_key")&&boundary.includes("a98_json_forbidden_key"));
add("boundary:same-origin",boundary.includes("a98_origin_mismatch")&&boundary.includes("a98_signed_url_path_mismatch"));
add("boundary:kms-exact-fields",boundary.includes("a98_kms_response_fields_invalid")&&boundary.includes("a98_kms_request_binding_mismatch")&&boundary.includes("a98_kms_context_binding_mismatch"));
add("boundary:aad",boundary.includes("setAAD")&&boundary.includes("contextDigest"));
add("fixture:current-runner",fixture.includes("scripts/a98-email-storage-kms-acceptance.mjs")&&fixture.includes("artifacts/pass36/a98"));
for(const [id,script] of [["pure","scripts/pass36/test-a98-email-storage-kms-boundaries.mjs"],["fixture","scripts/pass36/test-a98-email-storage-kms-fixture.mjs"]]){
 const r=spawnSync(process.execPath,[script],{encoding:"utf8",timeout:300000});
 add(`${id}:executed`,r.status===0,{status:r.status,stdout:(r.stdout??"").slice(-1000),stderr:(r.stderr??"").slice(-1000)});
 if(id==="pure"&&r.status===0){try{const o=JSON.parse(r.stdout);add("pure:assertions",o.assertions===77&&o.realStorageMutations===0&&o.realKmsCalls===0&&o.realEmails===0,o);}catch{add("pure:assertions",false);}}
 if(id==="fixture"&&r.status===0){try{const o=JSON.parse(r.stdout);add("fixture:assertions",o.checks===22&&o.passed===22&&o.failed===0,o);}catch{add("fixture:assertions",false);}}
}
const failed=checks.filter(r=>!r.passed);console.log(JSON.stringify({status:failed.length?"FAIL_A98_EMAIL_STORAGE_KMS_BOUNDARY":"PASS_A98_EMAIL_STORAGE_KMS_BOUNDARY_LOCAL_ONLY",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks,realStorageMutations:0,realKmsCalls:0,realEmails:0,stagingCredit:false,live:false,saleEnabled:false},null,2));process.exit(failed.length?1:0);
