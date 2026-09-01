#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const read=(p)=>JSON.parse(readFileSync(p,'utf8')); const sha=(v)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
const market=read('config/pass35/market-runtime-coverage-contract.json'); const zero=read('config/pass35/zero-budget-functional-roadmap.json');
const excluded=new Set(zero.zeroBudgetCoreExclusions); const core=zero.capabilities.filter((c)=>!excluded.has(c.id));
const counts={DONE:0,PARTIAL:0,NOT_DONE:0,OPTIONAL_EXTERNAL:0}; for(const c of core) counts[c.status]++;
const weighted=Number((((counts.DONE+counts.PARTIAL*0.5)/core.length)*100).toFixed(1));
const lines=['# PASS35 A10 — Dynamic Market Runtime Coverage','',`- Source revision: \`${market.sourceRevisionId}\``,`- Visual changes: **NO**`,`- Surfaces: **3**`,`- Tier matrices: **${market.surfaceTierMatrices.length}**`,`- Zero-budget weighted progress: **${weighted}%**`,'', '## Whole-market denominator','',market.wholeMarketDefinition,'',`> ${market.regressionCorpusRule}`,'','## Runtime states','','- ELIGIBLE — every required field cell meets freshness and independent-source quorum.','- UNAVAILABLE — one or more required field cells are missing.','- STALE — one or more required observations exceed freshness limits.','- CONFLICTED — providers disagree and the conflict is unresolved.','','## Surface × tier matrix','','| Surface | Tier | Required fields | Independent quorum | Scenarios |','|---|---|---:|---:|---:|'];
for(const m of market.surfaceTierMatrices) lines.push(`| ${m.surfaceId} | ${m.tier} | ${m.requiredFieldCount} | ${m.minimumIndependentQuorum} | ${m.requiredScenarios.length} |`);
lines.push('','## Hard rules','',...market.hardRules.map((x)=>`- ${x}`),'','## Current boundary','','- This contract measures implementation and runtime coverage.','- It does not unlock checkout or claim real provider coverage until fresh snapshots and observations are supplied.','- Paid delivery remains false in all A10 synthetic/local receipts.','');
const body=lines.join('\n')+'\n'; mkdirSync('artifacts/release',{recursive:true}); writeFileSync('artifacts/release/PASS35_A10_MARKET_RUNTIME_COVERAGE.md',body);
const zeroLines=['# PASS35 A10 — Zero-Budget Functional Roadmap','',`- Current weighted progress: **${weighted}%**`,`- Core denominator: **${core.length}**`,`- DONE: **${counts.DONE}**; PARTIAL: **${counts.PARTIAL}**; NOT_DONE: **${counts.NOT_DONE}**`,'','| ID | Status | Truth |','|---|---|---|'];
for(const c of zero.capabilities) zeroLines.push(`| ${c.id} | **${c.status}** | ${c.truth.replaceAll('|','/')} |`);
const zeroBody=zeroLines.join('\n')+'\n';writeFileSync('artifacts/release/PASS35_A10_ZERO_BUDGET_ROADMAP.md',zeroBody);
const summary={schemaVersion:'velmere.pass35.a10-product-roadmap-summary.v1',passId:'PASS35_A10',sourceRevisionId:market.sourceRevisionId,visualChangesMade:false,canonicalWeightedPlanningPercent:40.7,zeroBudgetWeightedPlanningPercent:weighted,zeroBudgetCounts:counts,dynamicCatalogImplementationStatus:'DONE_LOCAL',realProviderRuntimeCoverageStatus:'NOT_EXECUTED',tierMatrixCount:market.surfaceTierMatrices.length,marketContractSha256:sha(readFileSync('config/pass35/market-runtime-coverage-contract.json')),marketBoardSha256:sha(body),zeroBudgetBoardSha256:sha(zeroBody),sellEnabled:false};
writeFileSync('artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:'PASS_A10_MARKET_ROADMAP_GENERATED',...summary},null,2));
