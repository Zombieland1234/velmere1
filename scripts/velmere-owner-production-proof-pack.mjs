#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const commands = [
  'node -v  # must be v24.18.0',
  'npm -v   # must be 11.16.0',
  'rm -rf node_modules .next',
  'npm ci --no-audit --no-fund --progress=false',
  'npm run env:validate',
  'npm run typecheck',
  'npm run build',
  'npm run production:proofboard',
  'npm run production:proof-pack',
  'npm run smoke:stripe-e2e-test-mode',
  'npm run provider:sandbox:harness',
  'npm run smoke:hosted-pack -- --base-url=https://YOUR_DEPLOYMENT_URL',
];
const requiredReports = [
  'PASS2135_BUILD_LOG_INGESTION.json',
  'PASS2136_CI_ARTIFACT_MANIFEST.json',
  'PASS2137_VERCEL_DEPLOYMENT_PROOF.json',
  'PASS2138_ENV_CHECKLIST_EXPORT.json',
];
const reportState = requiredReports.map(name=>({ name, exists: fs.existsSync(path.join('reports',name)) }));
const md = ['# PASS2139 Owner One-Command Production Proof Pack','','## Purpose','This pack prevents fake promotion above 90%. It lists exact commands and evidence files the owner/CI must produce.','','## Commands','```bash',...commands,'```','','## Required reports','| Report | Exists now |','|---|---:|',...reportState.map(r=>`| ${r.name} | ${r.exists ? 'yes' : 'no'} |`),'','## Promotion rule','Do not mark production readiness above 90% until clean install, typecheck, build, DB migration, Stripe webhook replay, provider sandbox, hosted smoke and owner legal review are attached as evidence.',''].join('\n');
const result = {
  pass: 'PASS2139',
  name: 'Owner one-command production proof pack',
  status: reportState.every(r=>r.exists) ? 'PROOF_PACK_READY_RUNTIME_STILL_OWNER_BLOCKED' : 'PROOF_PACK_PARTIAL_MISSING_REPORTS',
  commands,
  reportState,
  promotionImpact: 'LOCKED_BELOW_90_UNTIL_OWNER_RUNS_COMMANDS_AND_ATTACHES_EVIDENCE',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2139_OWNER_PRODUCTION_PROOF_PACK.json', JSON.stringify(result,null,2));
fs.writeFileSync('PASS2139_OWNER_PRODUCTION_PROOF_PACK.md', md);
console.log(JSON.stringify(result,null,2));
