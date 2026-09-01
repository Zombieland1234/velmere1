#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA32Benchmark, verifyA32Benchmark, verifyA32Policy } from "../../lib/security/pass35-a32-report-delivery-runtime.mjs";

const PASS="PASS35_A32";
const REV="VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL";
const A16={canonical:40.7,strict:9.3,zeroBudget:80.0};
const A31={canonical:58.1,strict:37.2,zeroBudget:91.6};
const policyPath="config/pass35/a32-report-delivery-policy.json";
const runtimePath="artifacts/pass35/PASS35_A32_REPORT_DELIVERY_BENCHMARK.json";
const receiptPath="artifacts/pass35/PASS35_A32_REPORT_DELIVERY_RECEIPT.json";
const contractPath="config/pass35/a32-report-delivery-runtime-contract.json";
const summaryPath="artifacts/release/PASS35_A32_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath="artifacts/release/PASS35_A32_REPORT_DELIVERY.md";
const statusPath="config/pass35/current-status-register.json";
const zeroPath="config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath="VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read=(p)=>JSON.parse(readFileSync(p,"utf8"));
const write=(p,v)=>{mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,`${JSON.stringify(v,null,2)}\n`);};
const hash=(v)=>`sha256:${createHash("sha256").update(typeof v==="string"||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest("hex")}`;
const addUnique=(arr,values)=>{for(const value of values)if(!arr.includes(value))arr.push(value);};

const policy=read(policyPath);
if(!verifyA32Policy(policy))throw new Error("a32_policy_invalid");
const benchmark=runA32Benchmark(policy);
if(!verifyA32Benchmark(benchmark,policy))throw new Error("a32_benchmark_invalid");
write(runtimePath,benchmark);
const receiptCore={
 schemaVersion:"velmere.pass35.a32-report-delivery-receipt.v1",passId:PASS,sourceRevisionId:REV,
 status:"PASS_LOCAL_REPORT_DELIVERY_EVIDENCE_NOT_STAGING_NOT_CUSTOMER_PROVEN_NOT_FOR_SALE",
 policyPath,policySha256:hash(readFileSync(policyPath)),runtimePath,runtimeIntegritySha256:benchmark.integritySha256,
 denominators:benchmark.denominators,frozen:benchmark.frozen,mutation:benchmark.mutation,
 canonicalPacketAndClaimTaxonomyComplete:true,analyzerReceiptIndexComplete:true,tierScopeAndFieldCoverageComplete:true,
 sensitiveFindingRedactionComplete:true,accountCaseEntitlementBindingComplete:true,reportStructureCompletenessComplete:true,
 machineSealedArtifactIntegrityComplete:true,oneTimeDownloadAndReplayRejectionComplete:true,supersessionInvalidationComplete:true,
 comprehensionAcknowledgementContractComplete:true,privacyRetentionDeletionExportComplete:true,deterministicDeliveryReplayComplete:true,
 realAnalyzerExecutionProven:false,realCustomerComprehensionProven:false,stagingAccountIsolationProven:false,
 qualifiedHumanSignatureProven:false,customerWillingnessToPayProven:false,paidGateEligible:false,sellEnabled:false,chargeAllowed:false,promotionAllowed:false,
 truthBoundary:policy.truthBoundary
};
const receipt={...receiptCore,receiptSha256:hash(receiptCore)};write(receiptPath,receipt);

const zero=read(zeroPath);zero.passId=PASS;zero.sourceRevisionId=REV;
const putCapability=(row)=>{const i=zero.capabilities.findIndex((x)=>x.id===row.id);if(i>=0)zero.capabilities[i]={...zero.capabilities[i],...row};else zero.capabilities.push(row);};
putCapability({id:"ZB86_A16_CANONICAL_REPORT_ASSEMBLY_AND_CLAIM_TAXONOMY",status:"DONE",resourceModel:"Own work only",truth:"A32 binds exact canonical packet/facts/findings hashes to a report with complete analyzer receipt index and explicit FACT/FINDING/INFERENCE/ASSUMPTION/LIMITATION/NOT_TESTED classes. Critical sections and required tier fields must be complete; rendering cannot create analysis."});
putCapability({id:"ZB87_A16_ACCOUNT_BOUND_PRIVATE_DELIVERY_INTEGRITY_AND_SUPERSESSION",status:"DONE",resourceModel:"Own work only",truth:"A32 enforces server-authorized account/case/tier bindings, sensitive-claim redaction, machine-sealed artifact integrity, one-time expiring download tokens, replay rejection, audit trail, correction supersession, invalidation and immutable history."});
putCapability({id:"ZB88_A16_COMPREHENSION_PRIVACY_AND_FROZEN_DELIVERY_BENCHMARK",status:"DONE",resourceModel:"Own work only",truth:"A32 executes 192 generated report-delivery cases across 12 families with 72 frozen cases and 2304 fail-closed mutations. Scope/limitations/not-tested/false-safety acknowledgement and bounded retention/delete/export are locally enforced; real customers, staging and paid value receive zero credit."});
const excluded=new Set(zero.zeroBudgetCoreExclusions);const core=zero.capabilities.filter((x)=>!excluded.has(x.id));
const zeroCounts={DONE:core.filter((x)=>x.status==="DONE").length,PARTIAL:core.filter((x)=>x.status==="PARTIAL").length,NOT_DONE:core.filter((x)=>x.status==="NOT_DONE").length};
const zeroWeighted=Number((((zeroCounts.DONE+zeroCounts.PARTIAL*0.5)/core.length)*100).toFixed(1));
if(core.length!==86||zeroCounts.DONE!==73||zeroCounts.PARTIAL!==12||zeroCounts.NOT_DONE!==1||zeroWeighted!==91.9)throw new Error(`a32_zero_math:${JSON.stringify({core:core.length,zeroCounts,zeroWeighted})}`);
zero.truthBoundary=`PASS35 A32 adds a locally complete A16 report-delivery evidence contract for the declared bounded scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Real analyzer inputs, production tenant isolation, customer comprehension, willingness-to-pay, qualified signatures, staging, LIVE, sale and customer outcomes remain outside this local claim.`;write(zeroPath,zero);

const status=read(statusPath);status.sourceRevisionId=REV;status.evaluatedAt="2026-07-23T20:20:00.000Z";
status.statusPrecedence=["this register","A32 roadmap current-status section","machine-generated readiness dashboard","A31 and earlier addenda as historical implementation notes only","base roadmap as target requirements"];
const statusRow=status.rows.find((row)=>row.id==="AUD18_A16_REPORT_DELIVERY");if(!statusRow)throw new Error("a32_status_row_missing");
Object.assign(statusRow,{status:"DONE",doneEvidence:[
 "exact canonical packet/facts/findings/source revision/report schema bindings",
 "complete applicable analyzer receipt index with raw/normalized/tool-method digests and local claim boundaries",
 "FACT/FINDING/INFERENCE/ASSUMPTION/LIMITATION/NOT_TESTED taxonomy and section-to-claim references",
 "critical report section and required tier-field coverage with Pro-to-Advanced leakage prevention",
 "sensitive-finding redaction and separate private-lane references",
 "server-authorized account/case/tier entitlement binding",
 "4-page Pro and 8-page Advanced machine-sealed artifact integrity",
 "one-time expiring download token, replay rejection and delivery audit trail",
 "correction supersession, old-download revocation, invalidation triggers and immutable history",
 "scope/limitation/not-tested/false-safety comprehension acknowledgement contract",
 "PII/secret minimization plus retention/delete/export/backup-expiry controls",
 "192-case frozen benchmark and 2304 mutation campaign"
 ],missing:[],blocker:"NONE_LOCAL_FOR_DECLARED_BOUNDED_A16_REPORT_DELIVERY_EVIDENCE_IMPLEMENTATION",
 nextAction:"Execute A32 against complete real analyzer receipts in multi-account staging, prove cross-tenant isolation and account-bound delivery, conduct customer comprehension and willingness-to-pay evaluation, and obtain qualified/independent signed review where required.",
 sellImpact:"Completes the declared local A16 evidence-integrity and private-delivery implementation only; Audit Pro/Advanced remain blocked by real analyzer execution, staging, customer value and external gates."});
const statusCounts={DONE:status.rows.filter((x)=>x.status==="DONE").length,PARTIAL:status.rows.filter((x)=>x.status==="PARTIAL").length,BLOCKED_EXTERNAL:status.rows.filter((x)=>x.status==="BLOCKED_EXTERNAL").length,NOT_DONE:status.rows.filter((x)=>x.status==="NOT_DONE").length};
const canonicalWeighted=Number((((statusCounts.DONE+statusCounts.PARTIAL*0.5)/status.rows.length)*100).toFixed(1));
const canonicalStrict=Number(((statusCounts.DONE/status.rows.length)*100).toFixed(1));
if(status.rows.length!==43||statusCounts.DONE!==17||statusCounts.PARTIAL!==17||statusCounts.BLOCKED_EXTERNAL!==9||statusCounts.NOT_DONE!==0||canonicalWeighted!==59.3||canonicalStrict!==39.5)throw new Error(`a32_canonical_math:${JSON.stringify({statusCounts,canonicalWeighted,canonicalStrict})}`);
status.zeroBudgetFunctionalTrack={...status.zeroBudgetFunctionalTrack,currentWeightedPlanningPercent:zeroWeighted,coreDenominator:core.length,done:zeroCounts.DONE,partial:zeroCounts.PARTIAL,notDone:zeroCounts.NOT_DONE,a32ReportDeliveryPolicyPath:policyPath,a32ReportDeliveryContractPath:contractPath};
status.truthBoundary=`PASS35 A32 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted-A31.canonical).toFixed(1)} pp weighted and ${(canonicalStrict-A31.strict).toFixed(1)} pp strict from A31, and ${(canonicalWeighted-A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted-A31.zeroBudget).toFixed(1)} pp from A31 and ${(zeroWeighted-A16.zeroBudget).toFixed(1)} pp from A16. A32 locally closes bounded report assembly, claim taxonomy, receipt index, tier scope, redaction, account-bound delivery, artifact integrity, one-time download, supersession, comprehension and privacy controls. Real analyzer execution, staging tenant isolation, customer comprehension/value, qualified signatures, LIVE and sale remain unclaimed.`;write(statusPath,status);

const audit=read("config/pass35/audit-program.json");
const a16=audit.controls.find((x)=>x.id==="A16");if(!a16)throw new Error("a32_audit_a16_missing");a16.status="IMPLEMENTED_LOCAL_CASE_BOUND_REPORT_DELIVERY_EVIDENCE_BENCHMARKED_STAGING_CUSTOMER_PROOF_MISSING";
audit.a32ReportDelivery={policyPath,runtimePath,receiptPath,contractPath,status:"PASS_LOCAL_REPORT_DELIVERY_NOT_STAGING_NOT_CUSTOMER_PROVEN_NOT_FOR_SALE",paidGateEligible:false};write("config/pass35/audit-program.json",audit);
const envelope=read("config/pass35/audit-execution-envelope.json");const family=envelope.capabilityInventory.find((x)=>x.familyId==="report_packet_and_private_delivery");if(!family)throw new Error("a32_envelope_family_missing");
Object.assign(family,{state:"IMPLEMENTED_LOCAL_CASE_BOUND_REPORT_DELIVERY_EVIDENCE_BENCHMARKED_STAGING_CUSTOMER_PROOF_MISSING",activePaths:["lib/security/pass35-a32-report-delivery-runtime.mjs",policyPath,contractPath,"scripts/pass35/test-a32-report-delivery.mjs"],executionClass:"local_packet_receipt_taxonomy_tier_redaction_account_artifact_download_supersession_comprehension_privacy_evidence_not_staging_customer_delivery",mayClaim:["canonical packet/report and analyzer-receipt binding","claim taxonomy and complete critical report sections","tier field scope, sensitive redaction and machine-sealed artifact integrity","account/case entitlement, one-time download, supersession, comprehension and privacy evidence","generated frozen benchmark passed for declared local scope"],mayNotClaim:["real analyzer execution","production tenant isolation or staging delivery","real customer comprehension or willingness-to-pay","qualified human signature","A16 paid gate passed"]});write("config/pass35/audit-execution-envelope.json",envelope);

const product=read("config/pass35/product-tier-content-contract.json");
const proFields=["report_canonical_packet_and_facts_binding","report_analyzer_receipt_index","report_claim_taxonomy","report_critical_section_completeness","report_tier_scope_and_field_coverage","report_sensitive_finding_redaction","report_account_case_entitlement_binding","report_machine_sealed_artifact_integrity","report_one_time_download_and_replay_rejection","report_supersession_and_invalidation","report_comprehension_acknowledgements","report_privacy_retention_delete_export","report_delivery_audit_trail"];
const advancedFields=["report_private_sensitive_finding_lane","report_full_raw_receipt_index","report_correction_supersession_graph","report_complete_not_tested_scope","report_lineage_expiry_and_invalidation","report_advanced_proof_capsule_machine_seal","report_download_revocation_and_immutable_history","report_customer_view_private_view_separation"];
product.a32ReportDelivery={policyPath,contractPath,requiredProFields:proFields,requiredAdvancedFields:advancedFields,truthBoundary:policy.truthBoundary};
const surface=product.surfaces.find((x)=>x.surfaceId==="audit_evm");if(!surface)throw new Error("a32_product_surface_missing");
addUnique(surface.tiers.pro.requiredSections,["A16_report_delivery_evidence"]);addUnique(surface.tiers.pro.requiredFields,proFields);
addUnique(surface.tiers.advanced.requiredSections,["A16_private_delivery_supersession_and_proof_capsule"]);addUnique(surface.tiers.advanced.requiredFields,[...proFields,...advancedFields]);write("config/pass35/product-tier-content-contract.json",product);

const contract={schemaVersion:"velmere.pass35.a32-report-delivery-runtime-contract.v1",passId:PASS,sourceRevisionId:REV,baselineA16:A16,baselineA31:A31,
 progressDeltaVsA31:{canonicalPercentagePoints:Number((canonicalWeighted-A31.canonical).toFixed(1)),strictPercentagePoints:Number((canonicalStrict-A31.strict).toFixed(1)),zeroBudgetPercentagePoints:Number((zeroWeighted-A31.zeroBudget).toFixed(1))},
 progressDeltaVsA16:{canonicalPercentagePoints:Number((canonicalWeighted-A16.canonical).toFixed(1)),strictPercentagePoints:Number((canonicalStrict-A16.strict).toFixed(1)),zeroBudgetPercentagePoints:Number((zeroWeighted-A16.zeroBudget).toFixed(1))},
 canonicalWeightedPlanningPercent:canonicalWeighted,canonicalStrictDonePercent:canonicalStrict,canonicalCounts:statusCounts,zeroBudgetWeightedPlanningPercent:zeroWeighted,zeroBudgetCoreDenominator:core.length,zeroBudgetCounts:zeroCounts,
 benchmark:{...benchmark.denominators,frozen:benchmark.frozen,mutation:benchmark.mutation,runtimeIntegritySha256:benchmark.integritySha256,receiptSha256:receipt.receiptSha256},visualChangesMade:false,sellEnabled:false,chargeAllowed:false,paidDeliveryAllowed:false,
 realAnalyzerExecutionProven:false,realCustomerComprehensionProven:false,stagingAccountIsolationProven:false,qualifiedHumanSignatureProven:false,customerWillingnessToPayProven:false,truthBoundary:status.truthBoundary};write(contractPath,contract);

const current=read("config/current-release.json");current.sourceRevisionId=REV;current.sourceRevisionStatus="A32_REPORT_DELIVERY_IMPLEMENTED_STAGING_AND_CUSTOMER_PROOF_UNCLAIMED";current.truthBoundary=status.truthBoundary;
current.a32ReportDeliveryPolicyPath=policyPath;current.a32ReportDeliveryRuntimePath=runtimePath;current.a32ReportDeliveryReceiptPath=receiptPath;current.a32ReportDeliveryContractPath=contractPath;current.a32ProductRoadmapSummaryPath=summaryPath;current.a32BoardPath=boardPath;write("config/current-release.json",current);

for(const name of readdirSync("config/pass35")){const file=path.join("config/pass35",name);if(statSync(file).isDirectory()||!name.endsWith(".json"))continue;try{const value=read(file);if(value&&typeof value==="object"&&"sourceRevisionId" in value){value.sourceRevisionId=REV;write(file,value);}}catch (ignoredError) { void ignoredError; }}
for(const file of ["README.md","CLEAN_SAFE_README.md"]){if(!existsSync(file))continue;let text=readFileSync(file,"utf8");if(file==="README.md")text=text.replace(/source revision `[^`]+`/u,`source revision \`${REV}\``);if(!text.includes("## PASS35 A32 local changes"))text+="\n\n## PASS35 A32 local changes\n\n- Added case-bound A16 report-delivery evidence covering canonical packet and analyzer receipt binding, claim taxonomy, tier scope, sensitive redaction, account/case entitlement, machine-sealed artifact integrity, one-time download, supersession, comprehension and privacy lifecycle.\n- Added a 192-case / 2304-mutation frozen report-delivery benchmark.\n- Marked AUD18/A16 DONE locally for the declared bounded evidence-contract scope only.\n- Real analyzer execution, staging tenant isolation, customer comprehension/value, qualified signatures and paid readiness remain unclaimed.\n- Visual files remain unchanged.\n";writeFileSync(file,text);}

const summary={schemaVersion:"velmere.pass35.a32-product-roadmap-summary.v1",passId:PASS,sourceRevisionId:REV,globalDecision:status.globalDecision,sellEnabledCount:0,canonicalWeightedPlanningPercent:canonicalWeighted,canonicalStrictDonePercent:canonicalStrict,canonicalCounts:statusCounts,zeroBudgetWeightedPlanningPercent:zeroWeighted,zeroBudgetCoreDenominator:core.length,zeroBudgetCounts:zeroCounts,baselineA16:A16,baselineA31:A31,benchmark:contract.benchmark,visualChangesMade:false,truthBoundary:status.truthBoundary};write(summaryPath,summary);
writeFileSync(boardPath,["# PASS35 A32 — Report Delivery Evidence","",`- Source revision: \`${REV}\``,`- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`,`- A31 baseline: **${A31.canonical}% canonical / ${A31.strict}% strict / ${A31.zeroBudget}% ZERO-BUDGET**`,`- A32 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`,`- Change vs A31: **+${(canonicalWeighted-A31.canonical).toFixed(1)} pp canonical / +${(canonicalStrict-A31.strict).toFixed(1)} pp strict / +${(zeroWeighted-A31.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`,`- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`,`- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**`,"","## Truth boundary","",status.truthBoundary,""].join("\n"));

const rows=status.rows.map((row)=>`${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ")||"—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows=zero.capabilities.map((row)=>`${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap=readFileSync(roadmapPath,"utf8");const history=oldRoadmap.replaceAll("PASS35 A31 is the only canonical current status.","PASS35 A31 was canonical at that historical checkpoint and does not override A32.");
const roadmap=["====================================================================================================","PASS35 A32 — REPORT DELIVERY EVIDENCE (NON-VISUAL)","====================================================================================================","Data rewizji: 2026-07-23, Europe/Berlin",`Source revision ID: ${REV}`,`Decyzja globalna: ${status.globalDecision}`,"Stan sprzedaży: 0 sellEnabled",`A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,`A31 BASELINE: ${A31.canonical}% canonical / ${A31.strict}% strict / ${A31.zeroBudget}% ZERO-BUDGET`,`A32 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,`ZMIANA VS A31: canonical +${(canonicalWeighted-A31.canonical).toFixed(1)} pp; strict +${(canonicalStrict-A31.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted-A31.zeroBudget).toFixed(1)} pp`,`ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted-A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict-A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted-A16.zeroBudget).toFixed(1)} pp`,`Product/tier specification: 100% (7 surfaces x 3 tiers = 21)`,`Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched`,"","A32 — LOCAL A16 REPORT DELIVERY EVIDENCE","----------------------------------------------------------------------------------------------------","- Exact canonical packet, facts, findings, source revision and report-schema hashes bind every report.","- Applicable analyzer receipts, explicit claim taxonomy, complete critical sections and tier field scope are fail-closed.","- Sensitive redaction, account/case entitlement, machine seal, one-time download, supersession, comprehension and privacy lifecycle are enforced.",`- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,`- AUD18/A16 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.`,``,`A32 — POSTĘP`,`----------------------------------------------------------------------------------------------------`,`- Canonical: A16 ${A16.canonical}% -> A31 ${A31.canonical}% -> A32 ${canonicalWeighted}%.`,`- Strict: A16 ${A16.strict}% -> A31 ${A31.strict}% -> A32 ${canonicalStrict}%.`,`- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A31 ${A31.zeroBudget}% -> A32 ${zeroWeighted}%.`,`- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,`- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`,``,`A32 — ZERO-BUDGET FUNCTIONAL CORE`,`----------------------------------------------------------------------------------------------------`,`ID | STATUS | RESOURCE MODEL | TRUTH`,`----------------------------------------------------------------------------------------------------`,...zeroRows,"","A32 — KANONICZNA TABELA 43 WORKSTREAMÓW","----------------------------------------------------------------------------------------------------",...rows,"","A32 TRUTH BOUNDARY","----------------------------------------------------------------------------------------------------",status.truthBoundary,"","HISTORYCZNE PODSUMOWANIE A31 I WCZEŚNIEJSZYCH FAL","----------------------------------------------------------------------------------------------------","Everything below is historical implementation context and cannot override A32.","",history.trimEnd(),""].join("\n");writeFileSync(roadmapPath,roadmap);
const boardResult=spawnSync(process.execPath,["scripts/pass35/build-current-status-roadmap.mjs"],{encoding:"utf8"});if(boardResult.status!==0)throw new Error(`a32_board_failed:${boardResult.stderr||boardResult.stdout}`);
console.log(JSON.stringify({status:"PASS_A32_ROADMAP_BUILT",sourceRevisionId:REV,canonicalWeightedPlanningPercent:canonicalWeighted,canonicalStrictDonePercent:canonicalStrict,zeroBudgetWeightedPlanningPercent:zeroWeighted,deltaVsA31:contract.progressDeltaVsA31,deltaVsA16:contract.progressDeltaVsA16,cases:benchmark.denominators.cases,mutations:benchmark.denominators.mutations,sellEnabled:false},null,2));
