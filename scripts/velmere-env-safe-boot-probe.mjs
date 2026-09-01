#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'scripts'];
const CLIENT_MARKER = /['"]use client['"]/;
const SECRET_ENV = /(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|PRINTFUL_API_TOKEN|TAPSTITCH_API_KEY|VELMERE_ADMIN_SESSION_SECRET)/;
const PUBLIC_ENV_ACCESS = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g;
const ALLOWED_PUBLIC_ENV = new Set(['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_ADMIN_TOOLS_ENABLED', 'NEXT_PUBLIC_ADMIN_TOOLS_ENV']);
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const isClient = CLIENT_MARKER.test(text.slice(0, 300));
    if (isClient && SECRET_ENV.test(text)) {
      findings.push({ severity: 'P0', id: 'SECRET_ENV_IN_CLIENT_FILE', file, action: 'Move server-only env access behind API/server module.' });
    }
    for (const match of text.matchAll(PUBLIC_ENV_ACCESS)) {
      const envName = match[1];
      if (!ALLOWED_PUBLIC_ENV.has(envName) && /(SECRET|TOKEN|WEBHOOK|SERVICE_ROLE|PRIVATE|ADMIN)/i.test(envName)) {
        findings.push({ severity: 'P0', id: 'SUSPICIOUS_NEXT_PUBLIC_SECRET_NAME', file, match: envName, action: 'Rename as server env or prove it is publishable.' });
      }
    }
  }
}

const result = {
  pass: 'PASS2131',
  name: 'Env safe boot probe',
  status: findings.some((f) => f.severity === 'P0') ? 'BLOCKED_CLIENT_SECRET_RISK' : 'PASS_STATIC',
  scannedRoots: ROOTS,
  findings,
  bootPolicy: {
    client: 'only NEXT_PUBLIC publishable values',
    server: 'Supabase service role, Stripe secret/webhook, provider tokens, admin secrets',
    customerBoundary: 'never expose provider raw payload, service role, webhook signatures, or admin tokens',
  },
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2131_ENV_SAFE_BOOT_PROBE.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS_STATIC') process.exitCode = 1;
