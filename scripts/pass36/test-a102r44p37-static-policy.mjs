#!/usr/bin/env node
import fs from "node:fs";

const REV="VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const read=(file)=>fs.readFileSync(file,"utf8");
const rows=[]; const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
const intelligence=read("components/intelligence/IntelligencePage.tsx");
const spine=read("lib/security/audit-source-spine.ts");
const route=read("lib/server/security-route-modules/audit-source-spine.ts");
const angelPanel=read("components/angel/AngelPanel.tsx");
const impact=read("lib/market-integrity/market-impact-engine.ts");
const marketRoute=read("lib/server/market-integrity-route-modules/market-intelligence.ts");
const psychology=read("scripts/pass36/test-a102r44p35-standalone-psychology-matrix.mjs");
const tamper=read("scripts/pass36/test-a102r44p31-external-ci-storage-kms-email-tamper.mjs");
const manifestBuilder=read("scripts/pass36/build-a102r44p37-source-manifest.mjs");
const manifestVerifier=read("scripts/pass36/verify-a102r44p37-source-authority.mjs");
check("revision-marker", read("VELMERE_ACTIVE_PASS.txt").trim()===REV);
for(const forbidden of [
 "mandatory human verification","obowiązkową weryfikację człowieka","verpflichtende menschliche Prüfung",
 "The deepest audit, combining Pro automation with manual review","Najgłębszy audyt łączący automat Pro z ręczną weryfikacją","Tiefster Audit aus Pro-Automation",
 "required operator sign-off is recorded","wymaganego zatwierdzenia operatora","erforderlichen Operator Sign-off blockiert",
]) check(`forbidden-active-copy:${forbidden}`, !intelligence.includes(forbidden), forbidden);
for(const required of [
 "Advanced is not currently for sale and includes no human review or operator sign-off",
 "Advanced nie jest obecnie na sprzedaż i nie zawiera weryfikacji człowieka ani zatwierdzenia operatora",
 "Advanced ist derzeit nicht im Verkauf und enthält weder Human Review noch Operator Sign-off",
]) check(`required-active-copy:${required.slice(0,24)}`, intelligence.includes(required), required);
check("source-spine-no-current-human-review", spine.includes("No current SKU may claim manual QA, human review or operator sign-off") && spine.includes("NOT_FOR_SALE — human review and operator sign-off are not included"));
check("source-spine-route-no-current-human-review", route.includes("Advanced is NOT_FOR_SALE and includes no human review or operator sign-off"));
check("angel-evidence-arrays-typed", angelPanel.includes("{ label: truthCopy.checks, values: [message.structured.nextSafeCheck] }") && !angelPanel.includes("[truthCopy.checks, message.structured.nextSafeCheck]"));
check("impact-context-type-imported", impact.includes("VlmCustomerLocale, VlmReportContextDepth"));
check("risk-fallback-complete", marketRoute.includes("pass36.r44p37.market-intelligence-insufficient-data.v1") && marketRoute.includes("requiredReview: true"));
check("whale-basic-no-impossible-depth-compare", !marketRoute.includes('selectedDepth === "advanced" ? whaleWatch : standaloneWhaleView(whaleWatch)'));
check("no-empty-catch", psychology.includes("catch { matrix = null; }") && !psychology.includes("catch {}"));
check("tamper-unused-imports-removed", !tamper.includes('node:os') && !tamper.includes('fileURLToPath') && !tamper.includes('const ROOT='));
check("bytewise-builder", manifestBuilder.includes("Buffer.compare") && manifestBuilder.includes("UTF8_BYTEWISE_ASCENDING_V1") && !manifestBuilder.includes("localeCompare"));
check("bytewise-verifier", manifestVerifier.includes("Buffer.compare") && manifestVerifier.includes("UTF8_BYTEWISE_ASCENDING_V1") && !manifestVerifier.includes("localeCompare"));
const state=JSON.parse(read("config/pass36/r44p37-current-state.json"));
check("cycle-zero-of-three", state.testCycle==="0/3" && state.globalDecision==="NO_GO" && state.saleEnabled===false && state.live===false);
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p37.static-policy-test.v1",revisionId:REV,status:failed.length?"FAIL_R44P37_STATIC_POLICY":"PASS_R44P37_STATIC_POLICY_NO_PROMOTION",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
