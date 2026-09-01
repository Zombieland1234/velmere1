#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const required = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VELMERE_ADMIN_SESSION_SECRET',
  'VELMERE_ADMIN_OWNER_EMAILS',
  'PRINTFUL_API_TOKEN',
  'PRINTFUL_STORE_ID',
  'TAPSTITCH_API_KEY',
  'VELMERE_PRODUCTS_DB_READ_ENABLED',
  'VELMERE_ENV_STRICT',
];

const serverOnlyFragments = ['SECRET', 'TOKEN', 'PRIVATE', 'SERVICE_ROLE', 'API_KEY'];
const allowedPublic = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_VELMERE_OPERATOR_DIAGNOSTICS',
  'NEXT_PUBLIC_VELMERE_SHOW_PDF_QA',
];

function parseEnvFile(file) {
  const names = [];
  if (!existsSync(file)) return { exists: false, names, duplicates: [], leakedPublicSecrets: [] };
  const seen = new Map();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const name = trimmed.split('=')[0].trim();
    if (!/^[A-Z0-9_]+$/.test(name)) continue;
    names.push(name);
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  const duplicates = Array.from(seen.entries()).filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));
  const leakedPublicSecrets = names.filter((name) => {
    if (!name.startsWith('NEXT_PUBLIC_')) return false;
    if (allowedPublic.includes(name)) return false;
    return serverOnlyFragments.some((fragment) => name.includes(fragment));
  });
  return { exists: true, names, duplicates, leakedPublicSecrets };
}

const productionTemplate = parseEnvFile('ENV_PRODUCTION_READY.example');
const generalExample = parseEnvFile('.env.example');
const missingInProductionTemplate = required.filter((name) => !productionTemplate.names.includes(name));
const missingInGeneralExample = required.filter((name) => !generalExample.names.includes(name));

const blockers = [];
if (!productionTemplate.exists) blockers.push('ENV_PRODUCTION_READY.example is missing');
if (missingInProductionTemplate.length) blockers.push(`production template missing: ${missingInProductionTemplate.join(', ')}`);
if (productionTemplate.duplicates.length) blockers.push(`production template has duplicate env keys: ${productionTemplate.duplicates.map((item) => `${item.name}x${item.count}`).join(', ')}`);
if (productionTemplate.leakedPublicSecrets.length) blockers.push(`production template exposes secret-like public keys: ${productionTemplate.leakedPublicSecrets.join(', ')}`);
if (missingInGeneralExample.length) blockers.push(`.env.example missing required documentation keys: ${missingInGeneralExample.join(', ')}`);
if (generalExample.leakedPublicSecrets.length) blockers.push(`.env.example exposes secret-like public keys: ${generalExample.leakedPublicSecrets.join(', ')}`);

const payload = {
  schemaVersion: 'velmere.pass2105.env-example-guard.v1',
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'FAIL' : 'PASS',
  productionTemplate: {
    exists: productionTemplate.exists,
    keyCount: productionTemplate.names.length,
    duplicates: productionTemplate.duplicates,
    leakedPublicSecrets: productionTemplate.leakedPublicSecrets,
    missingRequired: missingInProductionTemplate,
  },
  generalExample: {
    exists: generalExample.exists,
    keyCount: generalExample.names.length,
    duplicates: generalExample.duplicates,
    leakedPublicSecrets: generalExample.leakedPublicSecrets,
    missingRequired: missingInGeneralExample,
  },
  blockers,
};

mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2105_ENV_EXAMPLE_GUARD.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
process.exit(blockers.length ? 1 : 0);
