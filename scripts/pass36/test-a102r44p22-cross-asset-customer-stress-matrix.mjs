#!/usr/bin/env node
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import {spawnSync} from "node:child_process";
const ledger=process.env.VELMERE_R44P22_REAL_CRYPTO_LEDGER; if(!ledger) throw new Error("VELMERE_R44P22_REAL_CRYPTO_LEDGER required");
const out=path.join(os.tmpdir(),`r44p22-cross-asset-${process.pid}.json`);
const run=spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/build-a102r44p22-cross-asset-customer-stress-matrix.mjs","--real-ledger",ledger,"--output",out],{encoding:"utf8",env:process.env,maxBuffer:64*1024*1024});
if(run.status!==0) throw new Error(`${run.stderr}\n${run.stdout}`);
const x=JSON.parse(fs.readFileSync(out,"utf8")); fs.rmSync(out,{force:true});
const rows=[]; const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("classes",x.summary.assetClasses===7); add("assets-per-class",x.summary.assetsPerClass===20); add("unique-assets",x.summary.uniqueAssets===140); add("tier-rows",x.summary.tierRows===420);
add("class-counts",Object.values(x.summary.classCounts).every(v=>v===20),x.summary.classCounts);
add("real-crypto",x.summary.realNetworkCryptoAssets===20&&x.rows.filter(r=>r.assetClass==="crypto").every(r=>r.truthClass.startsWith("REAL_PUBLIC_NETWORK")));
add("synthetic-noncrypto",x.summary.syntheticStressAssets===120&&x.rows.filter(r=>r.assetClass!=="crypto").every(r=>r.truthClass==="SYNTHETIC_FIXTURE_STRESS_ONLY"));
add("three-tiers",["basic","pro","advanced"].every(t=>x.rows.filter(r=>r.tier===t).length===140));
add("no-rights",x.summary.rightsApprovedAssets===0&&x.rows.every(r=>r.providerRightsApproved===false));
add("no-paid-live",x.summary.paidReadyRows===0&&x.summary.liveRows===0&&x.rows.every(r=>r.paidGateEligible===false&&r.live===false));
add("truth-boundary",x.truthBoundary.fullCatalogCoverage===false&&x.truthBoundary.customerOutcomeProven===false&&x.truthBoundary.saleEnabled===false);
const failed=rows.filter(r=>!r.passed); console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.cross-asset-customer-stress-test.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2)); process.exit(failed.length?1:0);
