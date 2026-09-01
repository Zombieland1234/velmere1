#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
const scripts=[
 'scripts/pass36/verify-a102r44p36-source-authority.mjs',
 'scripts/pass36/verify-a102r44p36-approved-changes.mjs',
 'scripts/pass36/verify-a102r44p36-current-release-pointers.mjs',
 'scripts/pass36/verify-a102r44p36-psychology30.mjs',
 'scripts/pass36/verify-a102r44p36-dynamic-scorecard.mjs',
 'scripts/pass36/verify-a102r44p36-static-policy.mjs',
];
const rows=[];let failed=0;
for(const script of scripts){const r=spawnSync(process.execPath,[script],{encoding:'utf8'});rows.push({script,exitCode:r.status,stdout:r.stdout.trim(),stderr:r.stderr.trim()});if(r.status!==0)failed++;}
process.stdout.write(JSON.stringify({status:failed?'FAIL_R44P36_TARGETED_CYCLE':'PASS_R44P36_TARGETED_CYCLE',passed:rows.length-failed,total:rows.length,rows},null,2)+'\n');
process.exit(failed?1:0);
