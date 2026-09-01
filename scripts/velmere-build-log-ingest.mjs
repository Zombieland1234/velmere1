#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const inputArg = process.argv.find((arg) => arg.startsWith('--input='))?.slice('--input='.length);
const inputDir = inputArg || 'logs';
const reportOnly = process.argv.includes('--report-only');
const patterns = [
  { id: 'NODE_ENGINE_MISMATCH', severity: 'P0', regex: /(EBADENGINE|Unsupported engine|Expected version|Got "?v?\d+\.\d+\.\d+"?)/i },
  { id: 'LOCKFILE_DRIFT', severity: 'P0', regex: /(package-lock|lock file|EUSAGE|npm ci.*can only install)/i },
  { id: 'MODULE_NOT_FOUND', severity: 'P0', regex: /(Module not found|Cannot find module|Can't resolve)/i },
  { id: 'TYPESCRIPT_ERROR', severity: 'P0', regex: /(Type error|TS\d{4}|Property .* does not exist|Type .* is not assignable)/i },
  { id: 'NEXT_BUILD_ERROR', severity: 'P0', regex: /(Failed to compile|Export encountered errors|Dynamic server usage|next build)/i },
  { id: 'ENV_MISSING', severity: 'P0', regex: /(Missing env|SUPABASE_|STRIPE_|PRINTFUL_|TAPSTITCH_|WEBHOOK_SECRET|ADMIN_SESSION_SECRET)/i },
  { id: 'PLAYWRIGHT_BROWSER_MISSING', severity: 'P1', regex: /(playwright.*install|browser executable doesn't exist|chromium)/i },
  { id: 'VERCEL_DEPLOYMENT_ERROR', severity: 'P0', regex: /(vercel.*error|deployment failed|build failed)/i },
];

function walkLogs(dir){
  if (!fs.existsSync(dir)) return [];
  const out=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walkLogs(p));
    else if (/\.(log|txt|json|md)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

const files = walkLogs(inputDir);
const sampleLog = `npm ERR! code EBADENGINE\nType error: Property foo does not exist on type Bar\nMissing env: STRIPE_WEBHOOK_SECRET\n`;
const sources = files.length ? files.map((file)=>({file, text: fs.readFileSync(file,'utf8')})) : [{file:'sample/no-logs-provided.log', text: sampleLog}];
const findings=[];
for (const src of sources){
  const lines = src.text.split(/\r?\n/);
  lines.forEach((line, idx)=>{
    for (const pattern of patterns){
      if (pattern.regex.test(line)) findings.push({ id: pattern.id, severity: pattern.severity, file: src.file, line: idx+1, excerpt: line.slice(0,220) });
    }
  });
}
const grouped = findings.reduce((acc, f)=>{ acc[f.id]=(acc[f.id]||0)+1; return acc; },{});
const result = {
  pass: 'PASS2135',
  name: 'Build log ingestion and normalized blocker map',
  status: files.length ? (findings.some(f=>f.severity==='P0') ? 'INGESTED_WITH_P0_FINDINGS' : 'INGESTED_NO_P0_FINDINGS') : 'SAMPLE_MODE_NO_REAL_LOGS',
  inputDir,
  scannedFiles: files.length,
  sourceCount: sources.length,
  sourceDigest: crypto.createHash('sha256').update(sources.map(s=>s.file+':'+s.text.length).join('|')).digest('hex'),
  findingCount: findings.length,
  grouped,
  findings: findings.slice(0,80),
  promotionImpact: findings.some(f=>f.severity==='P0') || !files.length ? 'LOCKED_BELOW_90_UNTIL_REAL_CI_LOGS_PARSED' : 'CAN_ADVANCE_AFTER_BUILD_PROOF',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2135_BUILD_LOG_INGESTION.json', JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if (!reportOnly && result.promotionImpact.startsWith('LOCKED')) process.exitCode = 0;
