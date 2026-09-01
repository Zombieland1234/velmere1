#!/usr/bin/env node
import fs from 'node:fs';
const REV='VELMERE_PASS36_A102R44P36_ACTION_REQUIRED_FULL_CURRENT_BYTE_RELEASE_PSYCHOLOGY30_DYNAMIC_REBASELINE_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT';
const paths=['config/pass36/current-release-authority.json','config/current-release.json','config/pass35/current-revision.json'];
const checks=[];
for(const p of paths){if(!fs.existsSync(p)){checks.push({path:p,passed:false,reason:'MISSING'});continue}const v=JSON.parse(fs.readFileSync(p,'utf8'));checks.push({path:p,passed:v.revisionId===REV&&v.live===false&&v.saleEnabled===false,revisionId:v.revisionId,live:v.live,saleEnabled:v.saleEnabled});}
const failed=checks.filter((c)=>!c.passed);
process.stdout.write(JSON.stringify({status:failed.length?'FAIL_R44P36_CURRENT_POINTERS':'PASS_R44P36_CURRENT_POINTERS',passed:checks.length-failed.length,total:checks.length,checks},null,2)+'\n');
process.exit(failed.length?1:0);
