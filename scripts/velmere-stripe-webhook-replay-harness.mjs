import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
function read(file){ try { return fs.readFileSync(path.join(root,file),'utf8'); } catch { return ''; } }
function writeJson(name, data){ fs.writeFileSync(path.join(reportsDir,name), JSON.stringify(data,null,2)+'\n'); }
function writeMd(name, body){ fs.writeFileSync(path.join(reportsDir,name), body.trim()+'\n'); }
function envPresent(name){ return Boolean(process.env[name] && String(process.env[name]).trim().length > 0); }
function safeEnv(name){ return envPresent(name) ? 'SET_REDACTED' : 'MISSING'; }

const route = read('app/api/stripe/webhook/route.ts');
const required = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_SITE_URL'];
const env = Object.fromEntries(required.map(k=>[k, safeEnv(k)]));
const missing = required.filter(k=>!envPresent(k));
const hasSignatureVerification = /constructEvent\s*\(/.test(route) && /stripe-signature/i.test(route);
const hasRawBody = /await\s+req\.text\s*\(/.test(route);
const status = missing.length ? 'BLOCKED_ENV' : (hasSignatureVerification && hasRawBody ? 'READY_FOR_STRIPE_CLI_REPLAY' : 'BLOCKED_WEBHOOK_CONTRACT');
const commands = [
  'stripe login',
  'stripe listen --forward-to localhost:3000/api/stripe/webhook',
  'stripe trigger checkout.session.completed',
  'npm run smoke:stripe-e2e-test-mode'
];
const report = { pass: 2128, name: 'Stripe webhook replay harness', status, env, missing, contract: { hasSignatureVerification, hasRawBody }, commands };
writeJson('PASS2128_STRIPE_WEBHOOK_REPLAY_HARNESS.json', report);
writeMd('PASS2128_STRIPE_WEBHOOK_REPLAY_HARNESS.md', `# PASS2128 — Stripe webhook replay harness\n\nStatus: **${status}**\n\n| Contract | State |\n|---|---|\n| Stripe-Signature constructEvent | ${hasSignatureVerification ? 'OK' : 'MISSING'} |\n| raw body req.text() | ${hasRawBody ? 'OK' : 'MISSING'} |\n\nCommands:\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\`\n`);
console.log(`[PASS2128] ${status}`);
