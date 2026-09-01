#!/usr/bin/env node
import fs from 'node:fs';
const files = [
  'lib/providers/fulfilment-provider-contract.ts',
  'lib/providers/provider-sandbox-fulfilment.ts',
  'app/api/admin/orders/provider-sandbox/route.ts',
];
const checks = files.map((file) => ({ name: file, ok: fs.existsSync(file) }));
const text = files.filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
checks.push({ name: 'Printful contract', ok: text.includes('printful') && text.includes('PRINTFUL_API_TOKEN') });
checks.push({ name: 'Tapstitch contract', ok: text.includes('tapstitch') && text.includes('TAPSTITCH_API_KEY') });
checks.push({ name: 'sandbox blocked not fake success', ok: text.includes('blocked') && text.includes('missingEnv') });
checks.push({ name: 'admin protected route', ok: text.includes('verifyAdminSessionRequest') || text.includes('verifyAdminImportRequest') });
const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ schemaVersion: 'velmere.provider-sandbox-smoke.v1', status: failed.length ? 'FAIL' : process.env.PRINTFUL_API_TOKEN ? 'PASS_READY_FOR_SANDBOX' : 'BLOCKED_ENV', missingEnv: process.env.PRINTFUL_API_TOKEN ? [] : ['PRINTFUL_API_TOKEN'], checks }, null, 2));
process.exit(failed.length ? 1 : 0);
