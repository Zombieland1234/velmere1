#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p,f={})=>{const a=path.join(root,p);return fs.existsSync(a)?JSON.parse(fs.readFileSync(a,"utf8")):f;};
const corpus=read("evaluation/pass16/worldclass-base-corpus.json");
const canonical=read("evaluation/pass16/worldclass-2700-summary.json");
const market=read("evaluation/pass17/market-adapter-simulation-summary.json");
const auditLens=read("evaluation/pass18/audit-lens-adapter-simulation-summary.json");
const brainAngel=read("evaluation/pass19/brain-angel-adapter-simulation-summary.json");
const dataSummary=read("evaluation/pass20/data-field-provider-license-summary.json");
const dataVerify=read(".velmere/pass20-diagnostics/data-license-matrix-verification.json");
const provider=read(".velmere/pass23-diagnostics/provider-rights-reconciliation.json");
const merchant=read(".velmere/pass23-diagnostics/merchant-legal-intake-audit.json");
const i18n=read(".velmere/pass23-diagnostics/i18n-release-readiness.json");
const nativeReview=read(".velmere/pass23-diagnostics/native-review-overflow-preparation.json");
const rlsStatic=read(".velmere/pass22-diagnostics/owner-operator-rls-audit.json");
const rlsHarness=read(".velmere/pass23-diagnostics/rls-staging-harness-verification.json");
const db=read(".velmere/pass14-diagnostics/database-contract-audit.json");
const syntax=read("config/pass23/typescript-syntax-scan.json");
const deployable=db.planes?.find(x=>x.name==="deployable_migrations")??{};
const simulations=[market,auditLens,brainAngel];
const required=Number(corpus.counts?.expandedCases??canonical.expandedCases??2700);
const executed=Number(canonical.executedCanonicalCases??canonical.executed??0);
const synthetic=simulations.reduce((s,x)=>s+Number(x.matrixRowsExecuted??0),0);
const report={
 schemaVersion:"velmere.pass23.current-product-readiness.v1",
 generatedAt:"2026-07-20T18:00:00.000Z",
 truthBoundary:"PASS23 closes static/source preparation only. Zero real provider rights, zero canonical outputs, zero native review, zero browser overflow execution and zero RLS staging cases remain explicit NO-GO boundaries.",
 canonical:{required,executed,passed:Number(canonical.passedCanonicalCases??0),failed:Number(canonical.failedCanonicalCases??0),status:canonical.status??"PREPARED_NOT_EXECUTED"},
 adapters:{implemented:"6/6",syntheticRows:synthetic,contractPass:simulations.reduce((s,x)=>s+Number(x.contractPass??0),0),deterministicPass:simulations.reduce((s,x)=>s+Number(x.deterministicPass??0),0),lineagePass:simulations.reduce((s,x)=>s+Number(x.lineagePass??0),0),status:simulations.every(x=>x.ok===true)?"SYNTHETIC_CONTRACT_PASS":"FAIL"},
 dataCommercialization:{requirementCells:Number(dataSummary.requirementCells??0),providerBoundCells:Number(dataSummary.providerBoundCells??0),licenseVerifiedCells:Number(dataSummary.licenseVerifiedCells??0),sellEligibleCells:Number(dataSummary.sellEligibleCells??0),syntheticEligibilityPass:Number(dataVerify.syntheticEligibleContractPass??dataVerify.contractPass??0),providersRegistered:Number(provider.summary?.registered??0),rightsEvidenceRecords:Number(provider.summary?.evidenceRecords??0),externalRightsVerified:Number(provider.summary?.approved??0),commerciallyEnabledProviders:Number(provider.summary?.commerciallyEnabled??0)},
 legal:{merchantIntakeValid:merchant.ok===true,merchantMissingFields:Number(merchant.missing?.length??0),commercialReady:merchant.commercialReady===true,legalReady:false},
 i18n:{keyParity:i18n.summary?.keyParity===true,criticalStaticPass:i18n.summary?.criticalStaticPass===true,identicalNonNeutral:Number(i18n.summary?.identicalNonNeutral??0),criticalLeaks:Number(i18n.summary?.criticalEnglishLeakCandidates??0),legalPlaceholderBlockers:Number(i18n.summary?.legalPlaceholderBlockers??0),nativePolishReview:nativeReview.nativeReview?.polish??"PENDING",nativeGermanReview:nativeReview.nativeReview?.german??"PENDING",overflowCasesPlanned:Number(nativeReview.overflow?.planned??300),overflowCasesExecuted:Number(nativeReview.overflow?.executed??0)},
 database:{auditOk:db.ok===true,migrationFiles:Number(deployable.files??0),tablesDeclared:Number(deployable.tablesDeclared??0),tablesWithoutRls:Number(deployable.tablesWithoutRls?.length??0),serviceRoleOnlyTables:Number(deployable.serviceRoleOnlyTables?.length??0),unclassifiedRlsWithoutPolicy:Number(deployable.rlsWithoutPolicyAndNotServiceRoleOnly?.length??0),ownerOperatorPolicies:`${Number(rlsStatic.policiesFound??0)}/${Number(rlsStatic.expectedPolicies??0)}`,multiUserCasesPrepared:Number(rlsHarness.summary?.cases??0),multiUserCasesExecuted:Number(rlsHarness.summary?.executed??0),multiUserCasesPassed:Number(rlsHarness.summary?.passed??0),stagingProven:false},
 syntax:{files:Number(syntax.files??0),parseErrors:Number(syntax.parseErrors??-1),semanticTypecheckProven:false},
 releaseEligibility:{basicCanonicalProven:false,proSellReady:false,advancedSellReady:false,providerRightsReady:false,merchantLegalReady:false,nativeLanguageReady:false,rlsStagingReady:false,buildProven:false,stagingProven:false,liveProven:false,status:"NO_GO"},
 nextRequiredProof:[
  "Run one exact Node 24.18.0/npm 11.16.0 semantic TypeScript/lint/test milestone on this exact source SHA.",
  "Obtain Webpack and Turbopack RC=0 for one exact source SHA.",
  "Execute 19 multi-user RLS cases on disposable staging Postgres/Supabase.",
  "Complete Polish and German native review and 300 browser overflow cases.",
  "Attach reviewed external provider documents; rights remain 0/21 until evidence hashes are promoted.",
  "Complete verified merchant identity and jurisdiction-specific legal approval.",
  "Execute 2700 provider/model/reviewer/renderer-bound canonical outputs, then independent validation and LIVE cohorts."
 ]
};
const structuralOk=provider.ok===true&&provider.summary?.registered===21&&provider.summary?.approved===0&&merchant.ok===true&&merchant.commercialReady===false&&report.i18n.keyParity&&report.i18n.criticalStaticPass&&report.i18n.identicalNonNeutral===0&&report.i18n.criticalLeaks===0&&report.database.tablesWithoutRls===0&&report.database.unclassifiedRlsWithoutPolicy===0&&report.database.ownerOperatorPolicies==="19/19"&&report.database.multiUserCasesPrepared===19&&report.database.multiUserCasesExecuted===0&&report.syntax.parseErrors===0&&synthetic===2700&&required===2700&&report.dataCommercialization.requirementCells===7750&&executed===0;
const out=path.join(root,".velmere/pass23-diagnostics/current-product-readiness.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({ok:structuralOk,providers:`${report.dataCommercialization.externalRightsVerified}/${report.dataCommercialization.providersRegistered}`,merchantMissing:report.legal.merchantMissingFields,i18nIdenticalNonNeutral:report.i18n.identicalNonNeutral,nativeReview:`${report.i18n.nativePolishReview}/${report.i18n.nativeGermanReview}`,overflow:`${report.i18n.overflowCasesExecuted}/${report.i18n.overflowCasesPlanned}`,rlsServiceRoleOnly:report.database.serviceRoleOnlyTables,rlsUnclassified:report.database.unclassifiedRlsWithoutPolicy,rlsStaging:`${report.database.multiUserCasesExecuted}/${report.database.multiUserCasesPrepared}`,canonical:`${executed}/${required}`,status:report.releaseEligibility.status},null,2));
if(!structuralOk)process.exit(1);
