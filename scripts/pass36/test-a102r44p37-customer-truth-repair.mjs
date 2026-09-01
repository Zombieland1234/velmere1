#!/usr/bin/env node
import fs from "node:fs";

const rows=[]; const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
const files={
 intelligence:fs.readFileSync("components/intelligence/IntelligencePage.tsx","utf8"),
 spine:fs.readFileSync("lib/security/audit-source-spine.ts","utf8"),
 checkout:fs.readFileSync("components/checkout/VlmServiceCheckoutSuccessClient.tsx","utf8"),
 pipeline:fs.readFileSync("lib/security/audit-customer-report-pipeline.ts","utf8"),
 sku:fs.readFileSync("lib/commerce/vlm-current-sku-truth.ts","utf8"),
};
for(const [locale,needle] of Object.entries({pl:"Advanced nie jest obecnie na sprzedaż",en:"Advanced is not currently for sale",de:"Advanced ist derzeit nicht im Verkauf"})) check(`advanced-not-sale:${locale}`,files.intelligence.includes(needle),needle);
for(const forbidden of ["mandatory human verification","obowiązkową weryfikację człowieka","verpflichtende menschliche Prüfung"]) check(`no-mandatory-human:${forbidden}`,!files.intelligence.includes(forbidden),forbidden);
check("checkout-no-human-review",files.checkout.includes("human review is not included")&&files.checkout.includes("human review nie jest zawarty")&&files.checkout.includes("Human Review ist nicht enthalten"));
check("pipeline-not-for-sale",files.pipeline.includes("Advanced is not for sale")&&files.pipeline.includes("does not unlock public delivery, human-review claims, operator sign-off or certification"));
check("sku-no-human-review",files.sku.includes("It includes no human review, operator sign-off, or independent certification"));
check("source-spine-future-only",files.spine.includes("Future human review — currently unavailable")&&files.spine.includes("No current SKU may claim manual QA, human review or operator sign-off"));
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p37.customer-truth-repair-test.v1",status:failed.length?"FAIL_R44P37_CUSTOMER_TRUTH_REPAIR":"PASS_R44P37_CUSTOMER_TRUTH_REPAIR_NO_HUMAN_REVIEW_CLAIM",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
