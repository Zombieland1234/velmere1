#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const REV='VELMERE_PASS36_A102R21_ACTION_REQUIRED_CUSTOMER_ACCESSIBILITY_AND_OPERATOR_CHECKPOINT_JARGON_MINIMALISM_BOUNDARY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R20_ACTION_REQUIRED_SINGLE_CURRENT_AUTHORITY_README_HISTORY_LABEL_STALE_POINTER_AND_PLANNING_ESTIMATE_COHERENCE_MINIMALISM_NO_REAL_CREDIT';
const LEDGER='config/pass36/a102r21-approved-customer-jargon-minimalism-changes.json';
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(fs.readFileSync(LEDGER,'utf8')); const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add('identity',ledger.schemaVersion==='velmere.pass36.a102r21.approved-customer-jargon-minimalism-changes.v1'&&ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add('parent',ledger.parentArchive?.byteLength===122109003&&ledger.parentArchive?.sha256==='dbb3abed8c2047960ddf288c09430a83d440abb4e235a8d6fdc20aed0e472fb1');
add('denominator',Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===18);
for(const row of ledger.approvedChanges??[]){const b=fs.existsSync(row.path)?fs.readFileSync(row.path):Buffer.alloc(0);add(`file:${row.path}`,b.length===row.byteLength&&sha(b)===row.sha256&&Number.isInteger(row.parentByteLength)&&/^[a-f0-9]{64}$/u.test(row.parentSha256),row);}
const c=ledger.claims??{};
add('surface',c.changedApplicationSurfaceFiles===18&&c.applicationSurfaceFiles===1833&&c.parentApplicationSurfaceAggregateSha256==='c32e0a04f4eed273df473166dbc3ac0d4e56008e21f96461f30981cd54c6e835'&&c.applicationSurfaceAggregateSha256==='aa5360d32981793e965fa037237866d620ceb4e55cb8e765f86bc3394ee3c789');
add('classification',c.parentQuotedPassLiteralCandidates===200&&c.classifiedParentCandidates===200&&c.visibleOrAccessibilityQuotedCandidatesRemoved===39&&c.internalQuotedCandidatesRetained===161&&c.currentQuotedPassLiteralCandidates===161&&c.currentQuotedPassLiteralCandidateFiles===8);
add('minimalism',c.renderedAccessibilityOperatorCheckpointTokensRemoved===125&&c.confirmedVisibleAccessibilityCheckpointTokensRemaining===0&&c.apiProofIdentifiersChanged===0&&c.domEvidenceAttributeContractsChanged===0&&c.unmountedVerifierContractsChanged===0);
add('truth',c.realBrowserRowsExecuted===0&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false);
const child=spawnSync(process.execPath,['scripts/pass36/test-a102r21-customer-jargon-minimalism-boundary.mjs'],{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,TERM:'dumb'}});
add('target',child.status===0&&child.stdout.includes('PASS_A102R21_CUSTOMER_JARGON_MINIMALISM_BOUNDARY_LOCAL_ONLY'),{status:child.status,stdout:child.stdout.slice(-1200),stderr:child.stderr.slice(-500)});
const failed=checks.filter(x=>!x.passed); console.log(JSON.stringify({status:failed.length?'FAIL_A102R21_APPROVED_CUSTOMER_JARGON_MINIMALISM_CHANGES':'PASS_A102R21_APPROVED_CUSTOMER_JARGON_MINIMALISM_CHANGES_NO_PROMOTION',checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2)); process.exit(failed.length?1:0);
