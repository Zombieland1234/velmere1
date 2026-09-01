#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { evaluateDataLicenseEligibility, buildRedactedDataLicenseReceipt } from "../../lib/worldclass/data-license-eligibility.mjs";
const root = process.cwd();
const cells = fs.readFileSync(path.join(root, "evaluation/pass20/data-field-provider-license-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map(JSON.parse);
const H = createHash("sha256").update("pass20-boundary").digest("hex");
const by = (surface, tier, special = null) => cells.find((row) => row.surface === surface && row.tier === tier && (!special || row.specialGates.includes(special)));
function rows(cell, { stale=false, restricted=false, identity=false, families=null }={}) {
 const fsx=families??cell.requiredSourceFamilies.slice(0,cell.minimumIndependentFamilies);
 return fsx.map((family,index)=>({sourceId:`s${index+1}`,family,canonicalIdentity:identity?"wrong":cell.canonicalIdentity,fieldId:cell.fieldId,observedAt:stale?"2020-01-01T00:00:00.000Z":"2026-07-20T12:00:00.000Z",licenseStatus:restricted?"restricted":cell.tier==="basic"&&index===0?"display_only":"verified",payloadSha256:H,value:1}));
}
const tests=[]; const test=(name,fn)=>{try{const ok=Boolean(fn());tests.push({name,ok});}catch(error){tests.push({name,ok:false,error:String(error?.stack??error)});}};
const basic=by("shield","basic"), pro=by("shield","pro"), advancedAudit=by("smart_contract_audit","advanced","human_review_approved"), advancedLens=by("lens_pdf","advanced","preview_download_account_parity_verified");
test("basic_display_only_eligible",()=>evaluateDataLicenseEligibility({cell:basic,evidenceRows:rows(basic),now:"2026-07-20T12:00:30.000Z"}).status==="eligible");
test("basic_restricted_blocked",()=>evaluateDataLicenseEligibility({cell:basic,evidenceRows:rows(basic,{restricted:true}),now:"2026-07-20T12:00:30.000Z"}).blockers.includes("license_not_eligible"));
test("missing_evidence_blocked",()=>evaluateDataLicenseEligibility({cell:basic,evidenceRows:[],now:"2026-07-20T12:00:30.000Z"}).blockers.includes("field_evidence_missing"));
test("stale_evidence_blocked",()=>evaluateDataLicenseEligibility({cell:basic,evidenceRows:rows(basic,{stale:true}),now:"2026-07-20T12:00:30.000Z"}).blockers.includes("field_evidence_stale"));
test("identity_mismatch_blocked",()=>evaluateDataLicenseEligibility({cell:basic,evidenceRows:rows(basic,{identity:true}),now:"2026-07-20T12:00:30.000Z"}).blockers.includes("field_evidence_missing"));
test("paid_without_entitlement_blocked",()=>evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro),entitlementStatus:"unverified",now:"2026-07-20T12:00:30.000Z"}).blockers.includes("server_entitlement_not_verified"));
test("paid_with_display_only_blocked",()=>evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro).map((row)=>({...row,licenseStatus:"display_only"})),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"}).blockers.includes("commercial_rights_not_verified"));
test("paid_family_floor_blocked",()=>evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro,{families:["one_family"]}),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"}).blockers.includes("independent_source_family_floor_not_met"));
test("paid_fully_eligible",()=>evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"}).status==="eligible");
test("advanced_audit_review_missing_blocked",()=>evaluateDataLicenseEligibility({cell:advancedAudit,evidenceRows:rows(advancedAudit),entitlementStatus:"verified",humanReviewStatus:"required_missing",now:"2026-07-20T12:00:30.000Z"}).blockers.includes("human_review_not_approved"));
test("advanced_audit_review_approved",()=>evaluateDataLicenseEligibility({cell:advancedAudit,evidenceRows:rows(advancedAudit),entitlementStatus:"verified",humanReviewStatus:"approved",now:"2026-07-20T12:00:30.000Z"}).status==="eligible");
test("advanced_lens_parity_missing_blocked",()=>evaluateDataLicenseEligibility({cell:advancedLens,evidenceRows:rows(advancedLens),entitlementStatus:"verified",renderParityStatus:"missing",now:"2026-07-20T12:00:30.000Z"}).blockers.includes("render_parity_not_verified"));
test("advanced_lens_parity_verified",()=>evaluateDataLicenseEligibility({cell:advancedLens,evidenceRows:rows(advancedLens),entitlementStatus:"verified",renderParityStatus:"verified",now:"2026-07-20T12:00:30.000Z"}).status==="eligible");
test("receipt_redacts_values",()=>{const r=buildRedactedDataLicenseReceipt({cell:pro,evidenceRows:rows(pro),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"});return r.rawPayloadStored===false&&!JSON.stringify(r).includes(`"value"`);});
test("receipt_hash_present",()=>/^[0-9a-f]{64}$/u.test(evaluateDataLicenseEligibility({cell:basic,evidenceRows:rows(basic),now:"2026-07-20T12:00:30.000Z"}).receiptSha256));
// Determinism repeats.
for(let i=0;i<15;i+=1)test(`deterministic_repeat_${String(i+1).padStart(2,"0")}`,()=>{const a=evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"});const b=evaluateDataLicenseEligibility({cell:pro,evidenceRows:rows(pro),entitlementStatus:"verified",now:"2026-07-20T12:00:30.000Z"});return a.receiptSha256===b.receiptSha256;});
const passed=tests.filter((row)=>row.ok).length; const receipt={schemaVersion:"velmere.pass20.data-license-boundary-tests.v1",generatedAt:"2026-07-20T12:00:00.000Z",ok:passed===tests.length,tests:tests.length,passed,failed:tests.length-passed,results:tests,truthBoundary:"Boundary and determinism tests use synthetic evidence. They do not grant provider licenses or production eligibility."};
const out=path.join(root,".velmere/pass20-diagnostics/data-license-boundary-tests.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify({ok:receipt.ok,tests:receipt.tests,passed,failed:receipt.failed},null,2));if(!receipt.ok)process.exit(1);
