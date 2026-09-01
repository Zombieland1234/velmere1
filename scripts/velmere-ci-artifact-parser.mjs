#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const reportDir = process.argv.find((arg)=>arg.startsWith('--reports='))?.slice('--reports='.length) || 'reports';
const required = [
  'PASS2130_BUILD_FAILURE_CLASSIFIER.json',
  'PASS2131_ENV_SAFE_BOOT_PROBE.json',
  'PASS2132_DB_MIGRATION_REHEARSAL.json',
  'PASS2133_EVIDENCE_RECEIPTS.json',
  'PASS2134_PROMOTION_BOARD.json',
  'PASS2135_BUILD_LOG_INGESTION.json',
];
function readJson(file){
  try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; }
}
const present=[];
const missing=[];
for (const name of required){
  const file=path.join(reportDir,name);
  if (fs.existsSync(file)) present.push({name, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), bytes: fs.statSync(file).size, status: readJson(file)?.status || 'unknown'});
  else missing.push(name);
}
const allReports = fs.existsSync(reportDir) ? fs.readdirSync(reportDir).filter(n=>n.endsWith('.json')).sort() : [];
const result = {
  pass: 'PASS2136',
  name: 'CI artifact parser and proof manifest',
  status: missing.length ? 'STATIC_ARTIFACT_MANIFEST_INCOMPLETE' : 'STATIC_ARTIFACT_MANIFEST_READY',
  reportDir,
  jsonReportCount: allReports.length,
  requiredCount: required.length,
  present,
  missing,
  nextHumanAction: missing.length ? 'Run production:proofboard and pass2135 log ingestion before owner promotion.' : 'Upload reports/ as CI artifacts and attach them to release evidence.',
  promotionImpact: 'LOCKED_BELOW_90_UNTIL_CI_UPLOADS_REAL_ARTIFACTS',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2136_CI_ARTIFACT_MANIFEST.json', JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
