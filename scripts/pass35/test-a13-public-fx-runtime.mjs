#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  clearPass35A13PublicFxRuntimeForTests,
  parseBankOfCanadaFx,
  parseEcbFxCsv,
  runPass35A13PublicFxRuntime,
  verifyPass35A13PublicFxRuntime,
} from '../../lib/market-integrity/pass35-public-fx-runtime.mjs';

let checks=0;const check=(value,message)=>{checks+=1;assert.ok(value,message);};
const dates=['2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-20','2026-07-21','2026-07-22'];
const ecbRows=['KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS'];
for(let i=0;i<dates.length;i+=1){
  ecbRows.push(`D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,${dates[i]},${(1.145+i*0.001).toFixed(4)},A`);
  ecbRows.push(`D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,${dates[i]},${(0.865+i*0.0005).toFixed(4)},A`);
  ecbRows.push(`D.JPY.EUR.SP00.A,D,JPY,EUR,SP00,A,${dates[i]},${(168.0+i*0.2).toFixed(3)},A`);
}
const ecbCsv=`${ecbRows.join('\n')}\n`;
const bocPayload={observations:dates.map((date,i)=>({d:date,FXUSDCAD:{v:(1.36+i*0.001).toFixed(4)},FXEURCAD:{v:((1.145+i*0.001)*(1.36+i*0.001)).toFixed(6)},FXGBPCAD:{v:(((1.145+i*0.001)/(0.865+i*0.0005))*(1.36+i*0.001)).toFixed(6)},FXJPYCAD:{v:(((1.145+i*0.001)/(168+i*0.2))*(1.36+i*0.001)).toFixed(8)}}))};

check(parseEcbFxCsv(ecbCsv).length===dates.length*3,'ECB rows');
check(parseBankOfCanadaFx(bocPayload).length===dates.length*4,'BoC rows');
assert.throws(()=>parseEcbFxCsv('bad,data\n1,2\n'),/schema_missing/u);checks+=1;
assert.throws(()=>parseBankOfCanadaFx({}),/observations_missing/u);checks+=1;

let requestCount=0;let releaseSlow;
const slowGate=new Promise((resolve)=>{releaseSlow=resolve;});
let slowMode=false;let badEcb=false;
const server=createServer(async(req,res)=>{
  requestCount+=1;
  if(slowMode)await slowGate;
  if(req.url==='/ecb'){
    res.writeHead(200,{'content-type':'text/csv'});res.end(badEcb?'wrong,columns\n1,2\n':ecbCsv);return;
  }
  if(req.url==='/boc'){
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(bocPayload));return;
  }
  res.writeHead(404);res.end('{}');
});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();const base=`http://127.0.0.1:${address.port}`;
const endpoints={ecb:`${base}/ecb`,bank_of_canada:`${base}/boc`};
const now=new Date('2026-07-22T18:00:00.000Z');

try{
  clearPass35A13PublicFxRuntimeForTests();
  const runtime=await runPass35A13PublicFxRuntime({now,endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',bypassCache:true,policy:{quotaLimit:20,maxAgeHours:120}});
  check(verifyPass35A13PublicFxRuntime(runtime),'runtime verify');
  check(runtime.executionMode==='LOCAL_HTTP_FIXTURE'&&!runtime.liveClaimed&&!runtime.realPublicNetworkExecution,'truth boundary');
  check(runtime.providerCount===2&&runtime.successfulProviderCount===2,'providers');
  check(runtime.pairCount===4&&runtime.eligibleBasicPairs===4,'basic FX coverage');
  check(runtime.eligibleProPairs>=3,'two-family pro coverage');
  check(runtime.eligibleAdvancedPairs===0,'advanced quorum fail closed');
  const eurusd=runtime.pairs.find((row)=>row.pair==='EUR/USD');
  check(eurusd.providerFamilyCount===2&&eurusd.tiers.pro.state==='ELIGIBLE','EURUSD reconciled');
  check((eurusd.divergenceBps??999)<10,'low divergence');
  check(runtime.sellEnabled===false&&!runtime.paidDeliveryEligible,'billing lock');
  check(runtime.receipts.every((row)=>row.state==='OK'&&row.rawDigest),'receipt binding');

  const callsBefore=requestCount;
  const cached=await runPass35A13PublicFxRuntime({now:new Date(now.getTime()+1000),endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',policy:{quotaLimit:20,maxAgeHours:120}});
  check(cached.cacheState==='hit','cache hit');
  check(requestCount===callsBefore,'cache avoided network');
  check(verifyPass35A13PublicFxRuntime(cached),'cache integrity');

  clearPass35A13PublicFxRuntimeForTests();slowMode=true;
  const first=runPass35A13PublicFxRuntime({now,endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',policy:{quotaLimit:20,maxAgeHours:120}});
  const second=runPass35A13PublicFxRuntime({now,endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',policy:{quotaLimit:20,maxAgeHours:120}});
  releaseSlow();
  const [firstValue,secondValue]=await Promise.all([first,second]);slowMode=false;
  check(firstValue.cacheState==='miss','first inflight');
  check(secondValue.cacheState==='shared_inflight','shared inflight');

  clearPass35A13PublicFxRuntimeForTests();badEcb=true;
  const degraded=await runPass35A13PublicFxRuntime({now,endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',bypassCache:true,policy:{quotaLimit:20,maxAgeHours:120}});badEcb=false;
  check(verifyPass35A13PublicFxRuntime(degraded),'degraded verify');
  check(degraded.successfulProviderCount===1&&degraded.blockers.some((x)=>x.startsWith('ecb:')),'schema quarantine');
  check(degraded.eligibleProPairs===0&&!degraded.liveClaimed,'degraded pro fail closed');

  clearPass35A13PublicFxRuntimeForTests();
  const one=await runPass35A13PublicFxRuntime({now,providers:['ecb'],endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',bypassCache:true,policy:{quotaLimit:1,maxAgeHours:120}});
  const limited=await runPass35A13PublicFxRuntime({now:new Date(now.getTime()+1),providers:['ecb'],endpointOverrides:endpoints,executionMode:'LOCAL_HTTP_FIXTURE',bypassCache:true,policy:{quotaLimit:1,maxAgeHours:120}});
  check(one.successfulProviderCount===1,'first quota');
  check(limited.receipts[0].state==='RATE_LIMITED'&&limited.pairCount===0,'quota fail closed');

  const tampered=structuredClone(runtime);tampered.pairs[0].consensusRate=99;check(!verifyPass35A13PublicFxRuntime(tampered),'tamper rejected');
  console.log(JSON.stringify({status:'PASS_A13_PUBLIC_FX_RUNTIME',checks,providers:runtime.providerCount,pairs:runtime.pairCount,basicEligible:runtime.eligibleBasicPairs,proEligible:runtime.eligibleProPairs,advancedEligible:runtime.eligibleAdvancedPairs,localHttpNetworkStackProven:true,cacheProven:true,sharedInflightProven:true,quotaProven:true,schemaQuarantineProven:true,visualChangesMade:false,paidDeliveryEligible:false,liveClaimed:false},null,2));
}finally{await new Promise((resolve)=>server.close(resolve));}
