#!/usr/bin/env node
import fs from 'node:fs';
const v=JSON.parse(fs.readFileSync('config/pass36/r44p36-psychology30.json','utf8'));
const ids=new Set();const errors=[];
if(v.personas!==30)errors.push('PERSONA_COUNT');
if(v.stepsPerPersona!==24)errors.push('STEP_COUNT');
if(v.rows?.length!==720)errors.push('ROW_COUNT');
for(const row of v.rows??[]){const key=`${row.personaId}:${row.stepId}`;if(ids.has(key))errors.push(`DUP:${key}`);ids.add(key);if(row.realCustomerCredit!==false)errors.push(`REAL_CREDIT:${key}`);if(!row.expected||!row.acceptanceTest||!row.status)errors.push(`FIELDS:${key}`);}
const personaCounts={};for(const r of v.rows??[])personaCounts[r.personaId]=(personaCounts[r.personaId]??0)+1;
if(Object.keys(personaCounts).length!==30||Object.values(personaCounts).some((n)=>n!==24))errors.push('DENOMINATOR');
process.stdout.write(JSON.stringify({status:errors.length?'FAIL_R44P36_PSYCHOLOGY30':'PASS_R44P36_PSYCHOLOGY30',rows:v.rows?.length??0,personas:Object.keys(personaCounts).length,realParticipants:v.realParticipants,errors},null,2)+'\n');
process.exit(errors.length?1:0);
