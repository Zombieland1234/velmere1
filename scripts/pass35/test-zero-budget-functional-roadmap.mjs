#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const plan=JSON.parse(readFileSync('config/pass35/zero-budget-functional-roadmap.json','utf8'));
const current=JSON.parse(readFileSync('config/current-release.json','utf8'));
let checks=0; const check=(v,m)=>{assert.ok(v,m);checks++;};
check(plan.schemaVersion==='velmere.pass35.zero-budget-functional-roadmap.v1','schema invalid');
check(/^PASS35_A(?:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)$/u.test(plan.passId) && plan.sourceRevisionId===current.sourceRevisionId,'pass/revision invalid');
check(plan.tracks.ZERO_BUDGET_FUNCTIONAL_CORE.targetPercent===100,'zero budget target invalid');
check(plan.tracks.ZERO_BUDGET_FUNCTIONAL_CORE.institutionalProofRequired===false,'institutional proof must be optional');
check(plan.tracks.COMMERCIAL_AUTOMATED.paidFeedsRequired===false,'paid feeds must not be mandatory');
check(plan.tracks.OPTIONAL_INSTITUTIONAL_ASSURANCE.requiredForCoreLaunch===false,'institutional track must not block launch');
check(/supported providers/u.test(plan.scopeTruth.wholeMarketDefinition),'whole market denominator invalid');
check(/Regression and edge-case corpus only/u.test(plan.scopeTruth.fiftyCaseMeaning),'50 case truth missing');
check(Array.isArray(plan.capabilities) && [24,27,31,35,38,42,44,47,49,52,55,58,61,64,67,70,73,76,79,82,85,88].includes(plan.capabilities.length),'capability count invalid');
const ids=new Set(); const allowed=new Set(['DONE','PARTIAL','NOT_DONE','OPTIONAL_EXTERNAL']);
for(const cap of plan.capabilities){
 check(/^ZB\d{2}_[A-Z0-9_]+$/u.test(cap.id),`id invalid:${cap.id}`);
 check(!ids.has(cap.id),`duplicate:${cap.id}`); ids.add(cap.id);
 check(allowed.has(cap.status),`status invalid:${cap.id}`);
 check(String(cap.resourceModel).length>3 && String(cap.truth).length>20,`fields missing:${cap.id}`);
}
for(const id of plan.zeroBudgetCoreExclusions) check(ids.has(id),`exclusion missing:${id}`);
check(plan.zeroBudgetCoreExclusions.includes('ZB12_AUDIT_HUMAN_REVIEW_ADDON'),'human addon exclusion missing');
check(plan.zeroBudgetCoreExclusions.includes('ZB20_OPTIONAL_INSTITUTIONAL_ASSURANCE'),'institutional exclusion missing');
check(plan.hundredPercentRules.length>=6,'100% rules incomplete');
check(plan.capabilities.find((c)=>c.id==='ZB03_DYNAMIC_PROVIDER_CATALOG')?.status==='DONE','dynamic provider catalog must be done');
check(plan.capabilities.find((c)=>c.id==='ZB04_MARKET_FRESHNESS_CONFLICT_FAILOVER')?.status==='DONE','freshness/conflict/failover local contract must be done');
check(plan.capabilities.find((c)=>c.id==='ZB21_MARKET_IMPACT_BASIC_PRO_ADVANCED')?.status==='PARTIAL','market impact status invalid');
check(plan.capabilities.find((c)=>c.id==='ZB22_WHALE_WATCH_BASIC_PRO_ADVANCED')?.status==='PARTIAL','whale watch status invalid');
check(plan.capabilities.find((c)=>c.id==='ZB23_PUBLIC_PROVIDER_CATALOG_RUNTIME')?.status==='DONE','public catalog status invalid');
if(plan.passId==='PASS35_A13'){
 check(plan.capabilities.find((c)=>c.id==='ZB25_PUBLIC_FX_REAL_MARKETS_RUNTIME')?.status==='DONE','A13 FX runtime invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB26_FULL_CATALOG_TARGET_SCHEDULER')?.status==='DONE','A13 scheduler invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB27_WHALE_SUPPORTED_TOKEN_DENOMINATOR')?.status==='DONE','A13 whale denominator invalid');
}

if(['PASS35_A14','PASS35_A15','PASS35_A16','PASS35_A17','PASS35_A18','PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 check(plan.capabilities.find((c)=>c.id==='ZB28_FULL_CATALOG_EXECUTION_LEDGER')?.status==='DONE','A14 execution ledger invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB29_MARKET_IMPACT_FULL_DENOMINATOR')?.status==='DONE','A14 market impact denominator invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB30_WHALE_MULTI_SOURCE_BINDING_RESOLVER')?.status==='DONE','A14 whale binding resolver invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB31_PUBLIC_SECURITIES_CATALOG_RUNTIME')?.status==='DONE','A14 securities catalog invalid');
}
if(['PASS35_A15','PASS35_A16','PASS35_A17','PASS35_A18','PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB32_HASH_BOUND_SNAPSHOT_IMPORT','ZB33_SECURITIES_QUOTES_HISTORY_RUNTIME','ZB34_CORPORATE_ACTIONS_CALENDAR_RUNTIME','ZB35_REAL_MARKETS_CROSS_ASSET_TIER_RUNTIME','ZB36_ORDER_BOOK_IMPORT_REPLAY','ZB37_WHALE_EVIDENCE_BUNDLE_IMPORT','ZB38_LEDGER_DENOMINATOR_BRIDGE']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A15 capability invalid:${id}`);
}

if(['PASS35_A16','PASS35_A17','PASS35_A18','PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 check(plan.capabilities.find((c)=>c.id==='ZB02_CANONICAL_PACKET_AND_PARITY')?.status==='DONE','A16 canonical parity invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB13_BRAIN_ANGEL_ORCHESTRATION')?.status==='DONE','A16 Brain/Angel invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB15_RISK_PRO_ADVANCED')?.status==='PARTIAL','A16 Risk status invalid');
 for(const id of ['ZB39_CROSS_ASSET_PORTFOLIO_RUNTIME','ZB40_MARKET_REGIME_CLASSIFICATION','ZB41_CROSS_ASSET_STRESS_SCENARIOS','ZB42_PROSPECTIVE_RISK_LEDGER']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A16 capability invalid:${id}`);
}

if(['PASS35_A17','PASS35_A18','PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 check(plan.capabilities.find((c)=>c.id==='ZB08_PDF_BASIC_PRO_ADVANCED')?.status==='DONE','A17 packet PDF runtime invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB43_EVIDENCE_QUALITY_CONTRADICTION_RUNTIME')?.status==='DONE','A17 evidence quality runtime invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB44_CROSS_SURFACE_DECISION_PACKET_RUNTIME')?.status==='DONE','A17 cross-surface decision runtime invalid');
}

if(['PASS35_A18','PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB45_TIER_INCREMENTAL_VALUE_BENCHMARK','ZB46_TIER_VALUE_MUTATION_FILLER_DEFENSE','ZB47_NO_SILENT_DOWNGRADE_NO_CHARGE_RUNTIME']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A18 capability invalid:${id}`);
}

if(['PASS35_A19','PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 check(plan.capabilities.find((c)=>c.id==='ZB09_AUDIT_BASIC_AUTOMATED')?.status==='DONE','A19 Audit Basic local implementation invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB48_AUDIT_STATIC_PRESCREEN_FROZEN_BENCHMARK')?.status==='DONE','A19 audit benchmark invalid');
 check(plan.capabilities.find((c)=>c.id==='ZB49_EXACT_RUNTIME_BOOTSTRAP_FAIL_CLOSED')?.status==='DONE','A19 exact runtime bootstrap contract invalid');
}

if(['PASS35_A20','PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB50_CASE_BOUND_DEPENDENCY_GRAPH','ZB51_CASE_BOUND_LICENSE_ADVISORY_MAPPING','ZB52_A12_FROZEN_BENCHMARK_RECEIPT']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A20 capability invalid:${id}`);
}
if(['PASS35_A21','PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB53_BOUNDED_ABSTRACT_EVM_INTERPRETER','ZB54_SIMPLE_PATH_CONSTRAINT_FEASIBILITY','ZB55_REACHABLE_RISK_PATH_RECEIPTS']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A21 capability invalid:${id}`);
}

if(['PASS35_A22','PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB56_EVIDENCE_BOUND_SEVERITY_TRIAGE','ZB57_ATTACK_CHAIN_BLAST_RADIUS_RUNTIME','ZB58_SEVERITY_UNCERTAINTY_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A22 capability invalid:${id}`);
}
if(['PASS35_A23','PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB59_PATCH_IMPACT_COVERAGE_GRAPH','ZB60_FAMILY_DERIVED_RETEST_CLOSURE_MATRIX','ZB61_REMEDIATION_CLOSURE_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A23 capability invalid:${id}`);
}

if(['PASS35_A24','PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB62_MONITORING_EVENT_DEDUP_CORRELATION','ZB63_INCIDENT_RESPONSE_LIFECYCLE_GATE','ZB64_MONITORING_LIFECYCLE_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A24 capability invalid:${id}`);
}

if(['PASS35_A25','PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB65_A07_EXACT_TEST_BEHAVIOR_REGISTRY','ZB66_A07_COVERAGE_ISOLATION_MUTATION_GATE','ZB67_A07_EXACT_TEST_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A25 capability invalid:${id}`);
}
if(['PASS35_A26','PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB68_A08_FUZZ_INVARIANT_REGISTRY_AND_BINDINGS','ZB69_A08_SEED_STATE_REPLAY_SHRINK_MUTATION_GATE','ZB70_A08_FUZZ_INVARIANT_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A26 capability invalid:${id}`);
}
if(['PASS35_A27','PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB71_A09_CHAIN_BLOCK_STATE_TRANSACTION_BINDINGS','ZB72_A09_ASSERTION_DEPENDENCY_ISOLATED_REPLAY_GATE','ZB73_A09_FORK_REPLAY_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A27 capability invalid:${id}`);
}
if(['PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB77_A11_PROXY_AUTH_MULTISIG_TIMELOCK_BINDINGS','ZB78_A11_STORAGE_ROLLBACK_EMERGENCY_KEY_CONTROLS','ZB79_A11_OPERATIONS_REPLAY_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A29 capability invalid:${id}`);
}
if(['PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB80_A03_COMPONENT_ASSET_ACTOR_BOUNDARY_REGISTRY','ZB81_A03_ASSUMPTION_INVARIANT_ABUSE_ATTACK_MODEL','ZB82_A03_THREAT_MODEL_REPLAY_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A30 capability invalid:${id}`);
}
const core=plan.capabilities.filter((c)=>!plan.zeroBudgetCoreExclusions.includes(c.id));
const counts=Object.fromEntries([...allowed].map((s)=>[s,core.filter((c)=>c.status===s).length]));
const weighted=Number((((counts.DONE+(counts.PARTIAL*0.5))/core.length)*100).toFixed(1));
check(counts.OPTIONAL_EXTERNAL===0,'optional external leaked into core denominator');

if(['PASS35_A28','PASS35_A29','PASS35_A30','PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB74_A10_TARGET_SCENARIO_EVIDENCE_BINDINGS','ZB75_A10_SENSITIVITY_UNCERTAINTY_REPLAY_GATE','ZB76_A10_ECONOMIC_ADVERSARIAL_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A28 capability invalid:${id}`);
}

if(['PASS35_A31','PASS35_A32'].includes(plan.passId)){
 for(const id of ['ZB83_A04_ROLE_PRINCIPAL_SELECTOR_AUTHORIZATION_BINDINGS','ZB84_A04_ROLE_ADMIN_PROXY_DELEGATION_SOD_ESCALATION_CONTROLS','ZB85_A04_PRIVILEGE_CONTROL_REPLAY_FROZEN_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A31 capability invalid:${id}`);
}
if(plan.passId==='PASS35_A31'){
 const excluded=new Set(plan.zeroBudgetCoreExclusions), core=plan.capabilities.filter((c)=>!excluded.has(c.id));
 const done=core.filter((c)=>c.status==='DONE').length, partial=core.filter((c)=>c.status==='PARTIAL').length, notDone=core.filter((c)=>c.status==='NOT_DONE').length;
 const weighted=Number((((done+partial*0.5)/core.length)*100).toFixed(1));
 check(core.length===83&&done===70&&partial===12&&notDone===1&&weighted===91.6,'A31 zero-budget math invalid');
}
if(plan.passId==='PASS35_A32'){
 for(const id of ['ZB86_A16_CANONICAL_REPORT_ASSEMBLY_AND_CLAIM_TAXONOMY','ZB87_A16_ACCOUNT_BOUND_PRIVATE_DELIVERY_INTEGRITY_AND_SUPERSESSION','ZB88_A16_COMPREHENSION_PRIVACY_AND_FROZEN_DELIVERY_BENCHMARK']) check(plan.capabilities.find((c)=>c.id===id)?.status==='DONE',`A32 capability invalid:${id}`);
 const excluded=new Set(plan.zeroBudgetCoreExclusions), core=plan.capabilities.filter((c)=>!excluded.has(c.id));
 const done=core.filter((c)=>c.status==='DONE').length, partial=core.filter((c)=>c.status==='PARTIAL').length, notDone=core.filter((c)=>c.status==='NOT_DONE').length;
 const weighted=Number((((done+partial*0.5)/core.length)*100).toFixed(1));
 check(core.length===86&&done===73&&partial===12&&notDone===1&&weighted===91.9,'A32 zero-budget math invalid');
}
console.log(JSON.stringify({status:'PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP',checks,coreDenominator:core.length,counts,weightedPlanningPercent:weighted,targetPercent:100},null,2));
