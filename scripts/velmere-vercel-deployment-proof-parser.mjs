#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const input = process.argv.find((arg)=>arg.startsWith('--input='))?.slice('--input='.length);
const raw = input && fs.existsSync(input) ? fs.readFileSync(input,'utf8') : '';
function includesAny(txt, needles){ return needles.some(n=>txt.toLowerCase().includes(n.toLowerCase())); }
let parsed;
try { parsed = raw.trim() ? JSON.parse(raw) : null; } catch { parsed = null; }
const text = raw || JSON.stringify(parsed || {});
const checks = [
  { id: 'has_deployment_url', ok: Boolean(parsed?.url || /https?:\/\/[^\s]+\.vercel\.app/i.test(text)), required: true },
  { id: 'build_ready_state', ok: Boolean(parsed?.readyState === 'READY' || includesAny(text,['READY','Deployment completed','Production deployment'])), required: true },
  { id: 'node24_hint', ok: includesAny(text,['24.18.0','node 24','NODE_VERSION']), required: true },
  { id: 'npm11_hint', ok: includesAny(text,['11.16.0','npm 11','NPM_VERSION']), required: true },
  { id: 'no_failed_state', ok: !includesAny(text,['ERROR','FAILED','CANCELED','build failed']), required: true },
];
const missing = checks.filter(c=>c.required && !c.ok).map(c=>c.id);
const result = {
  pass: 'PASS2137',
  name: 'Vercel deployment proof parser',
  status: raw ? (missing.length ? 'VERCEL_PROOF_INCOMPLETE' : 'VERCEL_PROOF_READY') : 'NO_VERCEL_PROOF_INPUT',
  input: input || 'none',
  inputSha256: raw ? crypto.createHash('sha256').update(raw).digest('hex') : null,
  checks,
  missing,
  requiredEvidence: ['Vercel deployment JSON/log export','deployment URL','READY state','Node 24.18.0/npm 11.16.0 evidence','no failed build state'],
  promotionImpact: missing.length || !raw ? 'LOCKED_BELOW_90_UNTIL_REAL_VERCEL_PROOF' : 'CAN_ADVANCE_AFTER_OWNER_REVIEW',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2137_VERCEL_DEPLOYMENT_PROOF.json', JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
