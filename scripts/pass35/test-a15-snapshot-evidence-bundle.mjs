#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildPass35A15SnapshotEvidenceBundle, importPass35A15SnapshotEvidenceBundle, verifyPass35A15SnapshotEvidenceBundle } from '../../lib/market-integrity/pass35-snapshot-evidence-bundle.mjs';
let checks=0;const check=(v,m)=>{checks+=1;assert.ok(v,m);};
const payload=JSON.stringify({rows:[{symbol:'BTCUSDT',price:65000}]});
const built=buildPass35A15SnapshotEvidenceBundle({providerId:'binance',providerFamily:'binance',datasetType:'SPOT_QUOTES',sourceMode:'FILE_IMPORT',observedAt:'2026-07-23T00:00:00.000Z',exportedAt:'2026-07-23T00:00:05.000Z',sourceUrl:'https://api.binance.com/api/v3/ticker/price',payload,recordCount:1});
check(verifyPass35A15SnapshotEvidenceBundle(built.bundle,built.payloadBytes),'bundle verifies');
const imported=importPass35A15SnapshotEvidenceBundle({bundle:built.bundle,payload:payload,now:'2026-07-23T00:01:00.000Z',maximumAgeMs:120000,expectedProviderId:'binance',expectedDatasetType:'SPOT_QUOTES'});
check(imported.state==='ACCEPTED','accepted');check(imported.paidGateEligible===false&&!imported.liveClaimed,'fail closed');
const stale=importPass35A15SnapshotEvidenceBundle({bundle:built.bundle,payload,now:'2026-07-24T00:00:00.000Z',maximumAgeMs:1000});check(stale.state==='STALE','stale');
const tampered=structuredClone(built.bundle);tampered.recordCount=99;check(!verifyPass35A15SnapshotEvidenceBundle(tampered,payload),'metadata tamper');
check(!verifyPass35A15SnapshotEvidenceBundle(built.bundle,payload+'x'),'payload tamper');
assert.throws(()=>importPass35A15SnapshotEvidenceBundle({bundle:built.bundle,payload,expectedProviderId:'mexc'}),/provider_mismatch/);checks+=1;
assert.throws(()=>buildPass35A15SnapshotEvidenceBundle({providerId:'x',providerFamily:'x',datasetType:'X',sourceMode:'FILE_IMPORT',observedAt:'2026-07-23T00:00:05Z',exportedAt:'2026-07-23T00:00:00Z',payload:'x'}),/time_invalid/);checks+=1;
const fixture=buildPass35A15SnapshotEvidenceBundle({providerId:'fixture',providerFamily:'fixture',datasetType:'X',sourceMode:'INJECTED_FIXTURE',observedAt:'2026-07-23T00:00:00Z',payload:'x'});check(fixture.bundle.publicNetworkExecuted===false,'fixture not public');
console.log(JSON.stringify({status:'PASS_A15_SNAPSHOT_EVIDENCE_BUNDLE',checks,paidDeliveryEligible:false,liveClaimed:false},null,2));
