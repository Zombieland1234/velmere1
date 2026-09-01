#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildDynamicMarketDenominator, buildProviderCatalogSnapshot } from '../../lib/market-integrity/pass35-market-runtime-coverage.mjs';
import { buildPass35A13MarketTargetSchedule } from '../../lib/market-integrity/pass35-market-target-scheduler.mjs';
import { buildPass35A14ExecutionLedger, verifyPass35A14ExecutionLedger } from '../../lib/market-integrity/pass35-full-catalog-execution-ledger.mjs';
let checks=0;const check=(value,message)=>{checks+=1;assert.ok(value,message);};const sha=(value)=>`sha256:${createHash('sha256').update(String(value)).digest('hex')}`;
const now='2026-07-22T21:00:00.000Z';const providers=['binance','mexc','coinbase','kraken'];
const snapshots=providers.map((providerId,pIndex)=>buildProviderCatalogSnapshot({providerId,providerFamily:providerId,providerState:'LIVE',observedAt:now,rawPayloadDigest:sha(providerId),termsMode:'PUBLIC_FREE_UNVERIFIED',instruments:Array.from({length:50},(_,index)=>({providerInstrumentId:`EX${String(index+1).padStart(3,'0')}${providerId}`,canonicalAssetId:`crypto:EX${String(index+1).padStart(3,'0')}`,assetClass:'crypto',symbol:`EX${String(index+1).padStart(3,'0')}`,baseSymbol:`EX${String(index+1).padStart(3,'0')}`,quoteSymbol:'USDT',venue:providerId,marketType:'spot',status:index===49&&pIndex===3?'HALTED':'ACTIVE',sourceRef:`${providerId}:${index}`}))}));
const denominator=buildDynamicMarketDenominator({snapshots,evaluatedAt:now,maxSnapshotAgeSeconds:900});const schedule=buildPass35A13MarketTargetSchedule({denominator,generatedAt:now});
const results=[];for(const [index,job] of schedule.jobs.entries()){
  if(index%17===0)continue;
  let state='AVAILABLE';let observedAt=new Date(Date.parse(now)-5_000).toISOString();let errorCode=null;
  if(index%13===0){state='RATE_LIMITED';errorCode='quota_exhausted';}
  else if(index%11===0){state='FAILED';errorCode='upstream_500';}
  else if(index%7===0){observedAt=new Date(Date.parse(now)-(job.maximumAgeSeconds+10)*1000).toISOString();}
  results.push({jobId:job.jobId,providerId:job.providerId,role:job.role,canonicalAssetId:job.canonicalAssetId,state,observedAt,payloadDigest:['AVAILABLE','STALE','CONFLICTED'].includes(state)?sha(`${job.jobId}:payload`):null,errorCode,sourceMode:'INJECTED_FIXTURE',recordCount:state==='AVAILABLE'?25:0,latencyMs:20+index%30});
}
const ledger=buildPass35A14ExecutionLedger({schedule,results,evaluatedAt:now,executionMode:'INJECTED_FIXTURE'});
check(verifyPass35A14ExecutionLedger(ledger),'ledger verify');check(ledger.rowCount===schedule.jobCount,'every scheduled job accounted');check(ledger.stateCounts.UNAVAILABLE>0&&ledger.stateCounts.STALE>0&&ledger.stateCounts.FAILED>0&&ledger.stateCounts.RATE_LIMITED>0,'terminal states');check(ledger.terminalCoverageBps===10000&&ledger.fullCatalogAccounted,'full accounting');check(ledger.assetDenominator===50,'asset denominator');check(ledger.byRole.length===3&&ledger.byProvider.length===4,'coverage dimensions');check(ledger.rows.filter((row)=>row.errorCode==='result_missing').length===Math.ceil(schedule.jobCount/17),'missing explicit');check(ledger.sellEnabled===false&&!ledger.paidDeliveryEligible&&!ledger.liveClaimed,'billing/live lock');check(ledger.assets.every((row)=>row.sellEnabled===false),'asset locks');
const tampered=structuredClone(ledger);tampered.rowCount=1;check(!verifyPass35A14ExecutionLedger(tampered),'tamper rejected');
assert.throws(()=>buildPass35A14ExecutionLedger({schedule,results:[results[0],results[0]],evaluatedAt:now}),/execution_result_duplicate/u);checks+=1;
assert.throws(()=>buildPass35A14ExecutionLedger({schedule,results:[{...results[0],jobId:sha('orphan')}],evaluatedAt:now}),/execution_result_orphan/u);checks+=1;
console.log(JSON.stringify({status:'PASS_A14_FULL_CATALOG_EXECUTION_LEDGER',checks,scheduledJobs:schedule.jobCount,rowCount:ledger.rowCount,activeAssets:ledger.assetDenominator,stateCounts:ledger.stateCounts,availableCoverageBps:ledger.availableCoverageBps,basicEligibleAssets:ledger.basicEligibleAssets,proEligibleAssets:ledger.proEligibleAssets,advancedEligibleAssets:ledger.advancedEligibleAssets,visualChangesMade:false,paidDeliveryEligible:false,liveClaimed:false},null,2));
