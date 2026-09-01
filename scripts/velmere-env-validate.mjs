#!/usr/bin/env node

const requiredForProduction = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'VELMERE_ADMIN_SESSION_SECRET',
  'VELMERE_ADMIN_OWNER_EMAILS',
];

const providerOptionalButRequiredForLiveFulfilment = [
  'PRINTFUL_API_TOKEN',
  'PRINTFUL_STORE_ID',
  'TAPSTITCH_API_KEY',
];

const present = (name) => Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
const missingP0 = requiredForProduction.filter((name) => !present(name));
const missingProvider = providerOptionalButRequiredForLiveFulfilment.filter((name) => !present(name));
const hasPublicSecret = Object.keys(process.env).some((name) => name.startsWith('NEXT_PUBLIC_') && /SECRET|TOKEN|PRIVATE|SERVICE_ROLE/i.test(name));

const report = {
  schemaVersion: 'velmere.env.validation.v1',
  generatedAt: new Date().toISOString(),
  mode: process.env.NODE_ENV ?? 'unknown',
  p0ProductionReady: missingP0.length === 0 && !hasPublicSecret,
  providerLiveReady: missingProvider.length === 0,
  missingP0,
  missingProvider,
  hasSuspiciousPublicSecretName: hasPublicSecret,
  rule: 'Missing ENV means BLOCKED, never fake success. Secrets must stay server-side and must not use NEXT_PUBLIC_* names.',
};

console.log(JSON.stringify(report, null, 2));
if (process.env.VELMERE_ENV_STRICT === '1' && !report.p0ProductionReady) process.exit(1);
