#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const topology=JSON.parse(fs.readFileSync("config/pass36/a102r44p35-canonical-product-topology.json","utf8"));
const source=fs.readFileSync("lib/product/vlm-canonical-product-topology.ts","utf8");
const checks=[];const add=(id,fn)=>{try{fn();checks.push({id,passed:true});}catch(error){checks.push({id,passed:false,error:error instanceof Error?error.message:String(error)});}};
add("rows-17",()=>assert.equal(topology.products.length,17));
add("tiered-families",()=>assert.deepEqual(topology.tieredFamilies,["audit","pdf","browser"]));
add("standalone-8",()=>assert.equal(topology.standaloneProductIds.length,8));
add("cycle-2",()=>assert.equal(topology.testCycle.current,2));
for(const id of ["market-impact","whale-watch","angel","risk-indicator"]){add(`${id}-standalone`,()=>assert.equal(topology.products.find((p)=>p.productId===id)?.tier,null));}
add("shield-pro-separate",()=>assert.ok(topology.products.some((p)=>p.productId==="shield")&&topology.products.some((p)=>p.productId==="shield-pro")));
add("risk-invariance",()=>assert.equal(topology.nonNegotiable.riskValueCannotChangeBecauseCustomerPaidMore,true));
add("angel-invariance",()=>assert.equal(topology.nonNegotiable.angelSafetyAndTruthStandardCannotChangeByReportTier,true));
add("source-revision",()=>assert.ok(source.includes("A102R44P35")));
const failures=checks.filter((x)=>!x.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p35.product-topology-test.v1",status:failures.length?"FAIL":"PASS_R44P35_PRODUCT_TOPOLOGY",checks:checks.length,passed:checks.length-failures.length,failed:failures.length,rows:checks},null,2));if(failures.length)process.exit(1);
