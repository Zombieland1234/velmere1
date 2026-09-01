import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { buildCurrentEvidenceAvailabilityMatrix } from '../../../../lib/commerce/vlm-current-evidence-availability-matrix.ts';

const args = process.argv.slice(2);
function arg(name, fallback=null){ const i=args.indexOf(name); return i>=0 ? args[i+1] : fallback; }
const output = resolve(arg('--output'));
const evaluatedAt = arg('--evaluated-at','2026-08-16T18:30:00.000Z');
const root = resolve(new URL('../../../../', import.meta.url).pathname);
const p65Path = resolve(root,'artifacts/closure/p65/P65_CURRENT_FREE_LEGAL_DECISION_BASELINE.json');
const topologyPath = resolve(root,'lib/product/vlm-canonical-product-topology.ts');
const evidenceMatrixPath = resolve(root,'lib/commerce/vlm-current-evidence-availability-matrix.ts');
const p65 = JSON.parse(readFileSync(p65Path,'utf8'));
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const fileBind=(p)=>{ const b=readFileSync(p); return {path:relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)}; };
const stable=(v)=>JSON.stringify(v, Object.keys(v).sort());
function canonicalJson(value){
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}
function digest(v){ return sha(Buffer.from(canonicalJson(v))); }

const p65Rows = p65.customerRows ?? [];
function p65Overlay(row){
  const fam=row.canonicalFamily;
  if(fam==='audit'){
    const name=row.customerTier==='basic'?'Audit Basic':row.customerTier==='pro'?'Audit Pro':'Audit Advanced';
    const exact=p65Rows.find(x=>x.productSku===name);
    return exact ? {source:'P65_CURRENT_FREE_LEGAL_DECISION_BASELINE', decision:exact.decision, reason:exact.reason, freshnessPassed:exact.freshnessPassed, rightsPassed:false, finalCustomerOutputCredit:false} : null;
  }
  if(fam==='real-markets'){
    const x=p65Rows.find(x=>x.family==='real-markets');
    return x ? {source:'P65_CURRENT_FREE_LEGAL_DECISION_BASELINE', decision:x.decision, reason:x.reason, freshnessPassed:x.freshnessPassed, rightsPassed:false, finalCustomerOutputCredit:false} : null;
  }
  if(fam==='market-impact' || fam==='whale-watch'){
    const x=p65Rows.find(x=>x.family===fam);
    return x ? {source:'P65_CURRENT_FREE_LEGAL_DECISION_BASELINE', decision:x.decision, reason:x.reason, freshnessPassed:x.freshnessPassed, rightsPassed:false, finalCustomerOutputCredit:false} : null;
  }
  return null;
}

const m=buildCurrentEvidenceAvailabilityMatrix({locale:'en',evaluatedAt});
if(m.topology.customerFacingRows!==20 || m.topology.productFamilies!==10 || m.topology.internalExecutionProfiles!==20 || m.topology.contextTransitions!==10 || !m.topology.legacy33ProductCompletionDenominatorRetired || m.topology.pdfSeparateProductFamily!==false){
  throw new Error('P67 topology contract mismatch');
}
if(m.customerFacingRows.length!==20 || m.profiles.length!==20 || m.transitions.length!==10) throw new Error('P67 runtime denominator mismatch');
if(m.saleEligibleCustomerFacingRowCount!==0 || m.saleEligibleInternalProfileCount!==0) throw new Error('unexpected sale eligibility');

const rows=m.customerFacingRows.map(row=>{
  const r=row.receipt;
  const overlay=p65Overlay(row);
  const fallbackState = overlay?.decision ?? r.availabilityState;
  const sourceDecisionClass = overlay ? 'CURRENT_SOURCE_DECISION_OVERLAY_PLUS_CURRENT_RUNTIME_ELIGIBILITY' : 'CURRENT_RUNTIME_ELIGIBILITY_FAIL_CLOSED';
  const out={
    rowId:row.rowId,
    family:row.canonicalFamily,
    tier:row.customerTier,
    customerFacingType:row.customerFacingType,
    executionContext:row.evaluationContext,
    executionProfileId:row.evaluationProfileId,
    eligibilityReceiptHash:r.receiptHash,
    eligibilitySourceHash:r.sourceHash,
    evaluatedAt:r.evaluatedAt,
    availabilityState:r.availabilityState,
    analysisEligible:r.analysisEligible,
    checkoutEligible:r.checkoutEligible,
    saleEligible:r.saleEligible,
    valueEligible:r.valueEligible,
    historicalEligible:r.historicalEligible,
    requiredEvidenceIds:[...r.requiredEvidenceIds],
    availableEvidenceIds:[...r.availableEvidenceIds],
    missingEvidenceIds:[...r.missingEvidenceIds],
    staleEvidenceIds:[...r.staleEvidenceIds],
    conflictedEvidenceIds:[...r.conflictedEvidenceIds],
    unsupportedEvidenceIds:[...r.unsupportedEvidenceIds],
    rightsBlockedEvidenceIds:[...r.rightsBlockedEvidenceIds],
    runtimeBlockedEvidenceIds:[...r.runtimeBlockedEvidenceIds],
    limitationEvidenceIds:[...r.limitationEvidenceIds],
    reasonCodes:[...r.reasonCodes],
    sourceDecisionClass,
    sourceDecisionOverlay:overlay,
    fallbackState,
    finalOutputBytes:null,
    finalOutputSha256:null,
    finalCustomerOutputCredit:false,
    rightsPassed:false,
    customerValuePassed:false,
    securityFinalPassed:false,
    releaseDecision:'WITHHELD',
  };
  return {...out, decisionDigest:`sha256:${digest(out)}`};
});

const profiles=m.profiles.map(p=>{
  const r=p.receipt;
  const matchingRow=rows.find(x=>x.executionProfileId===p.profileId);
  const out={
    profileId:p.profileId,
    family:p.canonicalFamily,
    context:p.context,
    customerTier:p.customerTier,
    standaloneProduct:p.standaloneProduct,
    policyAdapterTier:p.policyAdapterTier,
    customerFacingRowId:p.customerFacingRowId,
    eligibilityReceiptHash:r.receiptHash,
    eligibilitySourceHash:r.sourceHash,
    evaluatedAt:r.evaluatedAt,
    availabilityState:r.availabilityState,
    analysisEligible:r.analysisEligible,
    checkoutEligible:r.checkoutEligible,
    saleEligible:r.saleEligible,
    valueEligible:r.valueEligible,
    missingEvidenceIds:[...r.missingEvidenceIds],
    staleEvidenceIds:[...r.staleEvidenceIds],
    conflictedEvidenceIds:[...r.conflictedEvidenceIds],
    unsupportedEvidenceIds:[...r.unsupportedEvidenceIds],
    rightsBlockedEvidenceIds:[...r.rightsBlockedEvidenceIds],
    runtimeBlockedEvidenceIds:[...r.runtimeBlockedEvidenceIds],
    limitationEvidenceIds:[...r.limitationEvidenceIds],
    reasonCodes:[...r.reasonCodes],
    sourceDecisionOverlay:matchingRow?.sourceDecisionOverlay ?? null,
    fallbackState:matchingRow?.fallbackState ?? r.availabilityState,
    finalCustomerOutputCredit:false,
    rightsPassed:false,
    customerValuePassed:false,
    securityFinalPassed:false,
    releaseDecision:'WITHHELD',
  };
  return {...out, decisionDigest:`sha256:${digest(out)}`};
});

// Transitions remain value-withheld; no matched-input customer-value credit is inferred from eligibility.
const transitions=m.transitions.map(t=>({
  transitionId:t.transitionId,
  family:t.family,
  fromContext:t.fromContext,
  toContext:t.toContext,
  deltaRequiredByCatalog:t.deltaRequiredByCatalog,
  expectedDeltaDimensions:[...t.expectedDeltaDimensions],
  valueResult:'WITHHELD_NO_CURRENT_MATCHED_INPUT_VALUE_EVIDENCE',
  valuePassed:false,
}));

const packet={
  schemaVersion:'velmere.p67.current-source-fallback-decisions.v1',
  revision:'P67/V16_OWNER_CORRECTED_TOPOLOGY',
  generatedAt:'2026-08-16T18:45:00.000Z',
  evaluatedAt,
  topology:{productFamilies:10,customerFacingRows:20,tieredRows:15,standaloneRows:5,currentExecutionProfiles:20,paidValueTransitions:10,legacy33ProductCompletionDenominatorRetired:true,pdfSeparateProductFamily:false},
  denominators:{customerRowsSourceFallbackDecision:rows.length,internalProfilesSourceFallbackDecision:profiles.length,paidValueTransitions:transitions.length,finalCustomerOutputs:0,finalAuditPdfOutputs:0,rightsPassed:0,saleEligibleRows:0},
  sourceBindings:{topology:fileBind(topologyPath),currentEvidenceAvailabilityMatrix:fileBind(evidenceMatrixPath),p65DecisionBaseline:fileBind(p65Path)},
  runtimeSummary:{saleEligibleCustomerFacingRowCount:m.saleEligibleCustomerFacingRowCount,analysisEligibleCustomerFacingRowCount:m.analysisEligibleCustomerFacingRowCount,saleEligibleInternalProfileCount:m.saleEligibleInternalProfileCount,analysisEligibleInternalProfileCount:m.analysisEligibleInternalProfileCount},
  customerRows:rows,
  internalProfiles:profiles,
  paidValueTransitions:transitions,
  truthBoundary:'P67 physically executes the current owner-corrected evidence availability matrix at a fixed evaluation time and records fail-closed source/fallback decisions for all 20 customer rows and all 20 current execution profiles. P65 source-decision evidence is overlaid only where it remains applicable. This grants no final customer output, Audit PDF, field-level rights, customer-value, sale, LIVE or WORLD_CLASS credit.',
  releaseState:{GO_INTERNAL:false,PILOT_READY:false,GO_PAID:false,LIVE:false,WORLD_CLASS_PROVEN:false},
};
packet.packetDigest=`sha256:${digest(packet)}`;
const bytes=Buffer.from(JSON.stringify(packet,null,2)+'\n');
writeFileSync(output,bytes);
console.log(JSON.stringify({status:'PASS_P67_CURRENT_SOURCE_FALLBACK_DECISIONS_20_OF_20_NO_PROMOTION',customerRows:rows.length,profiles:profiles.length,transitions:transitions.length,packetSha256:sha(bytes),packetDigest:packet.packetDigest},null,2));
