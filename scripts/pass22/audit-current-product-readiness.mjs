#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p,f={})=>{const a=path.join(root,p);return fs.existsSync(a)?JSON.parse(fs.readFileSync(a,'utf8')):f;};
const corpus=read('evaluation/pass16/worldclass-base-corpus.json');
const canonical=read('evaluation/pass16/worldclass-2700-summary.json');
const market=read('evaluation/pass17/market-adapter-simulation-summary.json');
const auditLens=read('evaluation/pass18/audit-lens-adapter-simulation-summary.json');
const brainAngel=read('evaluation/pass19/brain-angel-adapter-simulation-summary.json');
const dataSummary=read('evaluation/pass20/data-field-provider-license-summary.json');
const dataVerify=read('.velmere/pass20-diagnostics/data-license-matrix-verification.json');
const registry=read('.velmere/pass21-diagnostics/provider-rights-audit.json');
const evidence=read('.velmere/pass22-diagnostics/provider-rights-evidence-audit.json');
const merchant=read('.velmere/pass21-diagnostics/merchant-legal-readiness.json');
const rls=read('.velmere/pass22-diagnostics/owner-operator-rls-audit.json');
const i18n=read('.velmere/pass22-diagnostics/i18n-release-readiness.json');
const db=read('.velmere/pass14-diagnostics/database-contract-audit.json');
const deployable=db.planes?.find((x)=>x.name==='deployable_migrations')??{};
const simulations=[market,auditLens,brainAngel];
const required=Number(corpus.counts?.expandedCases??canonical.expandedCases??2700);
const executed=Number(canonical.executedCanonicalCases??canonical.executed??0);
const synthetic=simulations.reduce((s,x)=>s+Number(x.matrixRowsExecuted??0),0);
const report={
 schemaVersion:'velmere.pass22.current-product-readiness.v1',generatedAt:'2026-07-20T16:00:00.000Z',
 canonical:{required,executed,passed:Number(canonical.passedCanonicalCases??0),failed:Number(canonical.failedCanonicalCases??0),status:canonical.status??'PREPARED_NOT_EXECUTED'},
 adapters:{implemented:'6/6',syntheticRows:synthetic,contractPass:simulations.reduce((s,x)=>s+Number(x.contractPass??0),0),deterministicPass:simulations.reduce((s,x)=>s+Number(x.deterministicPass??0),0),lineagePass:simulations.reduce((s,x)=>s+Number(x.lineagePass??0),0),status:simulations.every((x)=>x.ok===true)?'SYNTHETIC_CONTRACT_PASS':'FAIL'},
 dataCommercialization:{requirementCells:Number(dataSummary.requirementCells??0),providerBoundCells:Number(dataSummary.providerBoundCells??0),licenseVerifiedCells:Number(dataSummary.licenseVerifiedCells??0),sellEligibleCells:Number(dataSummary.sellEligibleCells??0),syntheticEligibilityPass:Number(dataVerify.syntheticEligibleContractPass??dataVerify.contractPass??0),providersRegistered:Number(evidence.providersRegistered??registry.providers??0),rightsEvidenceRecords:Number(evidence.evidenceRecords??0),externalRightsVerified:Number(evidence.externalRightsVerified??0),commerciallyEnabledProviders:Number(evidence.commerciallyEnabledProviders??0)},
 legal:{merchantRegistryBlockers:Number(merchant.registryBlockers??0),legacyMessagePlaceholders:Number(merchant.legacyMessagePlaceholders??0),legalReady:false},
 i18n:{keyParity:i18n.summary?.keyParity===true,criticalStaticPass:i18n.summary?.criticalStaticPass===true,identicalNonNeutral:Number(i18n.summary?.identicalNonNeutral??0),criticalLeaks:Number(i18n.summary?.criticalEnglishLeakCandidates??0),legalPlaceholderBlockers:Number(i18n.summary?.legalPlaceholderBlockers??0)},
 database:{auditOk:db.ok===true,tablesDeclared:Number(deployable.tablesDeclared??0),tablesWithoutRls:Number(deployable.tablesWithoutRls?.length??0),rlsWithoutPolicy:Number(deployable.rlsWithoutPolicy?.length??0),ownerOperatorPolicies:`${Number(rls.policiesFound??0)}/${Number(rls.expectedPolicies??0)}`,codeLevelPolicyBlockers:Number(rls.codeLevelStagingPolicyBlockers??0),multiUserStagingProofRequired:Number(rls.multiUserStagingProofRequired??0),stagingProven:false},
 releaseEligibility:{basicCanonicalProven:false,proSellReady:false,advancedSellReady:false,providerRightsReady:false,merchantLegalReady:false,rlsStagingReady:false,buildProven:false,stagingProven:false,liveProven:false,status:'NO_GO'},
 nextRequiredProof:['Provide reviewed provider agreements/terms evidence; rights remain 0 until external documents are bound.','Complete verified merchant identity and jurisdiction-specific legal review.','Execute migrations and 19 owner/operator policies against real multi-user Postgres/Supabase.','Complete remaining 300 non-neutral locale values plus native-language and browser overflow review.','Provide exact Node 24.18.0/npm 11.16.0 cache and execute one semantic TypeScript/lint/test milestone.','Obtain Webpack and Turbopack RC=0, then browser/WCAG/PDF proof.','Execute 2700 provider/model/reviewer/render-bound canonical outputs.']
};
const ok=evidence.ok===true&&merchant.ok===true&&rls.ok===true&&report.i18n.keyParity&&report.i18n.criticalStaticPass&&report.database.tablesWithoutRls===0&&report.database.codeLevelPolicyBlockers===0&&synthetic===2700&&required===2700&&report.dataCommercialization.requirementCells===7750;
const out=path.join(root,'.velmere/pass22-diagnostics/current-product-readiness.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify({ok,providers:report.dataCommercialization.providersRegistered,externalRightsVerified:report.dataCommercialization.externalRightsVerified,merchantBlockers:report.legal.merchantRegistryBlockers,ownerOperatorPolicies:report.database.ownerOperatorPolicies,multiUserProofRequired:report.database.multiUserStagingProofRequired,identicalNonNeutral:report.i18n.identicalNonNeutral,canonical:`${executed}/${required}`,status:report.releaseEligibility.status},null,2));if(!ok)process.exit(1);
