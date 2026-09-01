#!/usr/bin/env node
import fs from 'node:fs';

const envSources = ['ENV_REQUIRED.md','ENV_PRODUCTION_READY.example','.env.example'].filter(fs.existsSync);
const known = [
  ['NEXT_PUBLIC_SUPABASE_URL','public','required','Supabase browser URL only; not secret.'],
  ['SUPABASE_SERVICE_ROLE_KEY','server-secret','required','Server only; never NEXT_PUBLIC.'],
  ['STRIPE_SECRET_KEY','server-secret','required','Server only Stripe secret.'],
  ['STRIPE_WEBHOOK_SECRET','server-secret','required','Webhook signature verification.'],
  ['VELMERE_ADMIN_SESSION_SECRET','server-secret','required','HMAC admin session signing.'],
  ['PRINTFUL_API_TOKEN','server-secret','provider','Printful sandbox/live.'],
  ['PRINTFUL_STORE_ID','server-secret','provider','Printful store identifier.'],
  ['TAPSTITCH_API_KEY','server-secret','provider','Tapstitch sandbox/live.'],
  ['UPSTASH_REDIS_REST_URL','server-secret','recommended','Distributed rate-limit backend.'],
  ['UPSTASH_REDIS_REST_TOKEN','server-secret','recommended','Distributed rate-limit token.'],
  ['NEXT_PUBLIC_BASE_URL','public','recommended','Hosted smoke base URL.'],
];
const rows = known.map(([name, scope, tier, notes])=>({ name, scope, tier, configuredInCurrentProcess: Boolean(process.env[name]), notes }));
const csv = ['name,scope,tier,configuredInCurrentProcess,notes', ...rows.map(r=>[r.name,r.scope,r.tier,r.configuredInCurrentProcess,String(r.notes).replaceAll(',',';')].join(','))].join('\n')+'\n';
const md = ['# PASS2138 ENV Checklist Export','',`Sources: ${envSources.join(', ') || 'none'}`,'','| Name | Scope | Tier | Current process | Notes |','|---|---|---|---:|---|', ...rows.map(r=>`| ${r.name} | ${r.scope} | ${r.tier} | ${r.configuredInCurrentProcess ? 'yes' : 'no'} | ${r.notes} |`),''].join('\n');
const result = {
  pass: 'PASS2138',
  name: 'ENV checklist export',
  status: rows.filter(r=>r.tier==='required' && !r.configuredInCurrentProcess).length ? 'ENV_CHECKLIST_READY_REQUIRED_ENV_NOT_SET_HERE' : 'ENV_CHECKLIST_READY_CURRENT_PROCESS_HAS_REQUIRED_ENV',
  sources: envSources,
  total: rows.length,
  requiredMissingInCurrentProcess: rows.filter(r=>r.tier==='required' && !r.configuredInCurrentProcess).map(r=>r.name),
  publicVars: rows.filter(r=>r.scope==='public').map(r=>r.name),
  secretVars: rows.filter(r=>r.scope==='server-secret').map(r=>r.name),
  promotionImpact: 'LOCKED_BELOW_90_UNTIL_OWNER_SETS_REQUIRED_ENV_IN_HOSTING',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2138_ENV_CHECKLIST_EXPORT.json', JSON.stringify(result,null,2));
fs.writeFileSync('reports/PASS2138_ENV_CHECKLIST_EXPORT.csv', csv);
fs.writeFileSync('PASS2138_ENV_CHECKLIST_EXPORT.md', md);
console.log(JSON.stringify(result,null,2));
