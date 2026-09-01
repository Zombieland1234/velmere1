#!/usr/bin/env node
import fs from 'node:fs';
const v=JSON.parse(fs.readFileSync('config/pass36/r44p36-dynamic-scorecard.json','utf8'));
const errors=[];const ids=new Set();
if(v.products?.length!==17)errors.push('PRODUCT_COUNT');
for(const p of v.products??[]){if(ids.has(p.productId))errors.push(`DUP:${p.productId}`);ids.add(p.productId);for(const k of ['quality','releaseReadiness','customerProof','worldClassEvidence']){if(!(Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100))errors.push(`RANGE:${p.productId}:${k}`)}if(p.customerProof===0&&p.worldClassEvidence>49)errors.push(`CAP:${p.productId}`);if(!Array.isArray(p.gates)||p.gates.length<5)errors.push(`GATES:${p.productId}`);if(!Number.isFinite(p.deltaQuality))errors.push(`DELTA:${p.productId}`);}
process.stdout.write(JSON.stringify({status:errors.length?'FAIL_R44P36_DYNAMIC_SCORECARD':'PASS_R44P36_DYNAMIC_SCORECARD',products:v.products?.length??0,gates:(v.products??[]).reduce((n,p)=>n+(p.gates?.length??0),0),errors},null,2)+'\n');
process.exit(errors.length?1:0);
