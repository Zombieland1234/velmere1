#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync('config/pass35/product-tier-content-contract.json','utf8'));
const current = JSON.parse(readFileSync('config/current-release.json','utf8'));
const requiredSurfaces = ['shield','shield_pro','real_markets','audit_evm','pdf_delivery','market_impact','whale_watch'];
const requiredTiers = ['basic','pro','advanced'];
const allowedPrice = { basic:'FREE', pro:'PAID', advanced:'PAID' };
let checks = 0;
const check=(value,msg)=>{assert.ok(value,msg);checks++;};

check(contract.schemaVersion === 'velmere.pass35.product-tier-content-contract.v1','schema invalid');
check(/^PASS35_A(?:12|13|14|15|16|17|18|19|20|21|22|23|24)$/u.test(contract.passId) && contract.sourceRevisionId===current.sourceRevisionId,'pass/revision invalid');
check(contract.visualChangesMade === false,'visual changes must remain false');
check(contract.common.visualFreeze.enabled === true,'visual freeze missing');
check(contract.common.visualFreeze.owner === 'CODEX_FRONTEND_WORKSTREAM','visual owner invalid');
check(contract.common.canonicalPacketMinimum.length >= 20,'canonical packet minimum too small');
check(contract.common.chargeGate.length >= 7,'charge gate incomplete');
for (const tier of requiredTiers) check(contract.common.tierValueRules[tier].priceModel === allowedPrice[tier],`price model invalid:${tier}`);
const ids = contract.surfaces.map((s)=>s.surfaceId);
check(ids.length === requiredSurfaces.length && new Set(ids).size === ids.length,'surface ids invalid');
for (const surfaceId of requiredSurfaces) check(ids.includes(surfaceId),`surface missing:${surfaceId}`);
for (const surface of contract.surfaces) {
  for (const tierName of requiredTiers) {
    const tier=surface.tiers?.[tierName];
    check(Boolean(tier),`tier missing:${surface.surfaceId}:${tierName}`);
    const minSections = surface.surfaceId === 'pdf_delivery' ? surface.pageContract[tierName] : 5;
    check(Array.isArray(tier.requiredSections) && tier.requiredSections.length >= minSections,`sections incomplete:${surface.surfaceId}:${tierName}`);
    check(Array.isArray(tier.requiredFields) && tier.requiredFields.length >= 10,`fields incomplete:${surface.surfaceId}:${tierName}`);
    check(Array.isArray(tier.requiredEvidenceFamilies) && tier.requiredEvidenceFamilies.length >= 1,`evidence incomplete:${surface.surfaceId}:${tierName}`);
    if (['PASS35_A17','PASS35_A18'].includes(contract.passId)) check(Number.isSafeInteger(tier.evidenceFamilyFloor) && tier.evidenceFamilyFloor >= 1 && tier.requiredEvidenceFamilies.length >= tier.evidenceFamilyFloor,`A17 evidence floor invalid:${surface.surfaceId}:${tierName}`);
    check(Array.isArray(tier.explicitExclusions) && tier.explicitExclusions.length >= 1,`exclusions missing:${surface.surfaceId}:${tierName}`);
    check(Array.isArray(tier.failClosedIf) && tier.failClosedIf.length >= 5,`fail closed missing:${surface.surfaceId}:${tierName}`);
    check(typeof tier.purchaseValueReason === 'string' && tier.purchaseValueReason.length > 50,`value reason weak:${surface.surfaceId}:${tierName}`);
  }
}
const shield=contract.surfaces.find((s)=>s.surfaceId==='shield');
const markets=contract.surfaces.find((s)=>s.surfaceId==='real_markets');
const audit=contract.surfaces.find((s)=>s.surfaceId==='audit_evm');
const pdf=contract.surfaces.find((s)=>s.surfaceId==='pdf_delivery');
check(/50-asset corpus is regression coverage only/u.test(shield.marketCoverageRule),'shield whole market truth missing');
check(/100% of the declared provider-supported catalog/u.test(markets.marketCoverageRule),'real markets denominator missing');
check(audit.advancedModel.includes('Human Reviewed is a separate optional add-on'),'audit automated/human split missing');
check(audit.optionalAddOn.requiredForCoreAdvancedAutomated === false,'human addon must not block core advanced');
check(pdf.pageContract.basic===2 && pdf.pageContract.pro===4 && pdf.pageContract.advanced===8,'pdf page contract invalid');
check(pdf.rendererRule.includes('may not add analysis absent from the source product packet'),'pdf parity rule missing');
const impact=contract.surfaces.find((s)=>s.surfaceId==='market_impact');
const whale=contract.surfaces.find((s)=>s.surfaceId==='whale_watch');
check(impact.tiers.advanced.requiredScenarios.includes('spread_x3_depth_minus_50'),'market impact advanced stress missing');
check(impact.tiers.basic.explicitExclusions.includes('no_execution_guarantee'),'market impact truth boundary missing');
check(whale.tiers.pro.requiredFields.includes('wallet_label_registry_digest'),'whale pro label evidence missing');
check(whale.tiers.advanced.requiredFields.includes('holder_exit_stress_by_fraction'),'whale advanced exit stress missing');

if (contract.passId === 'PASS35_A18') {
  check(contract.a18TierValuePolicy?.supplementalEvidenceFamilyRuleCount === 5,'A18 tier value policy binding missing');
  check(pdf.tiers.pro.requiredEvidenceFamilies.includes('scenario_receipts'),'A18 PDF Pro evidence delta missing');
  check(pdf.tiers.advanced.requiredEvidenceFamilies.includes('monitoring_invalidation_receipts'),'A18 PDF Advanced evidence delta missing');
  check(markets.tiers.advanced.requiredEvidenceFamilies.includes('macro_factor_reference'),'A18 Real Markets Advanced evidence delta missing');
  check(whale.tiers.advanced.requiredEvidenceFamilies.includes('cluster_methodology_validation'),'A18 Whale Advanced evidence delta missing');
}

if (contract.a21AbstractPath) {
  check(contract.a21AbstractPath.paidGateEligible === false,'A21 path contract unlocked paid gate');
  for (const field of contract.a21AbstractPath.requiredProFields) check(audit.tiers.pro.requiredFields.includes(field),`A21 Pro path field missing:${field}`);
  for (const field of contract.a21AbstractPath.requiredAdvancedFields) check(audit.tiers.advanced.requiredFields.includes(field),`A21 Advanced path field missing:${field}`);
}
check(contract.completionDefinition.specificationCompleteWhen.length >= 6,'spec completion rules missing');
check(contract.completionDefinition.implementationCompleteWhen.length >= 5,'implementation completion rules missing');
console.log(JSON.stringify({status:'PASS_PRODUCT_TIER_CONTENT_CONTRACT',checks,surfaces:ids.length,tiers:ids.length*3,visualChangesMade:false},null,2));
