#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const tierContract=read('config/pass35/product-tier-content-contract.json');
const zero=read('config/pass35/zero-budget-functional-roadmap.json');
const sha=(v)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
const title=(s)=>s.replaceAll('_',' ').toUpperCase();
const list=(items)=>items.map((x)=>`- ${x}`).join('\n');
const tierLines=['# PASS35 A9 — Product Tier Content Contract','',
 `- Source revision: \`${tierContract.sourceRevisionId}\``,
 `- Visual changes: **${tierContract.visualChangesMade ? 'YES' : 'NO'}**`,
 `- Surfaces: **${tierContract.surfaces.length}**`,
 `- Tier variants: **${tierContract.surfaces.length*3}**`,
 '- Product specification status: **DONE_LOCAL_SPECIFICATION**','',
 '## Non-visual ownership boundary','',
 `- Visual owner: **${tierContract.common.visualFreeze.owner}**`,
 '- This workstream changes product truth, schemas, evidence fields, tier value and tests only.','',
 '## Common tier truth','',list(tierContract.common.truthRules),''];
for(const surface of tierContract.surfaces){
 tierLines.push(`## ${title(surface.surfaceId)}`,'');
 for(const key of ['productRole','marketCoverageRule','tierValueBoundary','advancedModel','rendererRule']) if(surface[key]) tierLines.push(`**${key}:** ${surface[key]}`,'');
 if(surface.pageContract) tierLines.push(`**Page contract:** Basic ${surface.pageContract.basic}, Pro ${surface.pageContract.pro}, Advanced ${surface.pageContract.advanced}.`,'');
 for(const tierName of ['basic','pro','advanced']){
  const t=surface.tiers[tierName];
  tierLines.push(`### ${tierName.toUpperCase()} — ${title(t.purpose)}`,'',`**Customer question:** ${t.customerQuestion}`,'',`**Why this tier has value:** ${t.purchaseValueReason}`,'','**Required sections:**',list(t.requiredSections),'','**Required fields:**',list(t.requiredFields),'','**Evidence floor:**',list(t.requiredEvidenceFamilies),'','**Scenarios:**',t.requiredScenarios.length?list(t.requiredScenarios):'- None beyond the narrow Basic scope.','','**Explicit exclusions:**',list(t.explicitExclusions),'','**Fail closed when:**',list(t.failClosedIf),'');
 }
 if(surface.optionalAddOn){ tierLines.push('### OPTIONAL HUMAN REVIEW ADD-ON','',`- ID: \`${surface.optionalAddOn.id}\``,'- Not required for core Automated Advanced.',list(surface.optionalAddOn.adds),'',`**Sell rule:** ${surface.optionalAddOn.sellRule}`,''); }
}
const tierBody=`${tierLines.join('\n')}\n`;
mkdirSync('artifacts/release',{recursive:true});
writeFileSync('artifacts/release/PASS35_A9_PRODUCT_TIER_CONTRACT.md',tierBody);

const excluded=new Set(zero.zeroBudgetCoreExclusions);
const core=zero.capabilities.filter((c)=>!excluded.has(c.id));
const statuses=['DONE','PARTIAL','NOT_DONE','OPTIONAL_EXTERNAL'];
const counts=Object.fromEntries(statuses.map((s)=>[s,core.filter((c)=>c.status===s).length]));
const weighted=Number((((counts.DONE+counts.PARTIAL*0.5)/core.length)*100).toFixed(1));
const zeroLines=['# PASS35 A9 — Zero-Budget Functional Roadmap','',
 `- Source revision: \`${zero.sourceRevisionId}\``,'- Target: **100% of the declared zero-budget functional core**',
 `- Current core denominator: **${core.length}**`,'- Current weighted planning progress: **'+weighted+'%**',
 `- Optional external capabilities excluded: **${zero.zeroBudgetCoreExclusions.length}**`,'',
 '## Scope truth','',`- Whole market: ${zero.scopeTruth.wholeMarketDefinition}`,
 `- 50-case corpus: ${zero.scopeTruth.fiftyCaseMeaning}`,'','## Tracks',''];
for(const [id,t] of Object.entries(zero.tracks)) zeroLines.push(`### ${id}`,'',...Object.entries(t).map(([k,v])=>`- ${k}: ${Array.isArray(v)?v.join(', '):v}`),'');
zeroLines.push('## Capabilities','','| ID | Status | Resource model | Truth |','|---|---|---|---|');
for(const c of zero.capabilities) zeroLines.push(`| ${c.id} | **${c.status}** | ${c.resourceModel.replaceAll('|','/')} | ${c.truth.replaceAll('|','/')} |`);
zeroLines.push('','## Meaning of 100%','',list(zero.hundredPercentRules),'');
const zeroBody=`${zeroLines.join('\n')}\n`;
writeFileSync('artifacts/release/PASS35_A9_ZERO_BUDGET_ROADMAP.md',zeroBody);
const summary={schemaVersion:'velmere.pass35.a9-product-roadmap-summary.v1',sourceRevisionId:tierContract.sourceRevisionId,visualChangesMade:false,visualSurfaceCount:tierContract.surfaces.length,tierVariantCount:tierContract.surfaces.length*3,productSpecificationCompletionPercent:100,zeroBudgetCoreDenominator:core.length,zeroBudgetCounts:counts,zeroBudgetWeightedPlanningPercent:weighted,zeroBudgetTargetPercent:100,optionalExternalExcluded:zero.zeroBudgetCoreExclusions,productContractSha256:sha(readFileSync('config/pass35/product-tier-content-contract.json')),zeroBudgetRoadmapSha256:sha(readFileSync('config/pass35/zero-budget-functional-roadmap.json')),productBoardSha256:sha(tierBody),zeroBudgetBoardSha256:sha(zeroBody)};
writeFileSync('artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json',`${JSON.stringify(summary,null,2)}\n`);
console.log(JSON.stringify({status:'PASS_A9_PRODUCT_ROADMAP_GENERATED',...summary},null,2));
