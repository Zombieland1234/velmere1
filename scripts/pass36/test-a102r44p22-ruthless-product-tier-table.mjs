#!/usr/bin/env node
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import {spawnSync} from "node:child_process";
const out=path.join(os.tmpdir(),`r44p22-product-${process.pid}.json`); const run=spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/build-a102r44p22-ruthless-product-tier-table.mjs","--output",out],{encoding:"utf8",env:process.env,maxBuffer:32*1024*1024}); if(run.status!==0)throw new Error(`${run.stderr}\n${run.stdout}`); const x=JSON.parse(fs.readFileSync(out,"utf8")); fs.rmSync(out,{force:true});
const rows=[];const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("rows-30",x.rows.length===30); add("tiers-10",["basic","pro","advanced"].every(t=>x.rows.filter(r=>r.tier===t).length===10));
add("basic-free",x.rows.filter(r=>r.tier==="basic").every(r=>r.maxHonestPublicPriceEur===0&&r.saleEnabled===false));
add("paid-null",x.rows.filter(r=>r.tier!=="basic").every(r=>r.maxHonestPublicPriceEur===null&&r.saleEnabled===false));
add("no-current-closure",x.rows.every(r=>r.currentByteReleaseClosure===false)); add("no-paid-ready",x.summary.readyForPublicPaidSale===0);
add("advanced-no",x.rows.filter(r=>r.tier==="advanced").every(r=>r.wouldBuy==="NO"));
add("pro-beta-only",x.rows.filter(r=>r.tier==="pro"&&["audit","pdf"].includes(r.family)).every(r=>r.wouldBuy.includes("CONTROLLED_BETA")));
add("wtp-missing",x.rows.every(r=>r.willingnessToPayEvidence==="MISSING"));
add("blockers",x.rows.every(r=>Array.isArray(r.blockers)&&r.blockers.length>0));
const failed=rows.filter(r=>!r.passed);console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.ruthless-product-tier-table-test.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));process.exit(failed.length?1:0);
