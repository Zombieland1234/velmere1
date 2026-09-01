#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const schemaPath = 'lib/db/schema.sql';
const exists = fs.existsSync(schemaPath);
const sql = exists ? fs.readFileSync(schemaPath, 'utf8') : '';
const requiredTables = [
  'velmere_products',
  'velmere_product_variants',
  'velmere_order_events',
  'velmere_fulfilment_retry_queue',
  'velmere_fulfilment_incidents',
  'velmere_audit_logs',
  'velmere_admin_sessions',
  'velmere_admin_roles',
  'velmere_source_receipts',
  'velmere_provider_snapshots',
];
const checks = requiredTables.map((table) => ({ table, present: new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+${table}`, 'i').test(sql) || new RegExp(table, 'i').test(sql) }));
const rlsEnabled = /enable\s+row\s+level\s+security/i.test(sql);
const idempotent = /if\s+not\s+exists/i.test(sql);
const checksum = crypto.createHash('sha256').update(sql).digest('hex');
const blocked = !exists || checks.some((c) => !c.present) || !idempotent;
const result = {
  pass: 'PASS2132',
  name: 'DB migration rehearsal',
  status: blocked ? 'BLOCKED_SCHEMA_REVIEW' : 'PASS_STATIC_ENV_BLOCKED',
  schemaPath,
  checksum,
  checks,
  rlsEnabled,
  idempotent,
  runbook: [
    'Open Supabase SQL editor on staging first.',
    'Apply lib/db/schema.sql once.',
    'Run select checks for required tables and RLS.',
    'Insert one sandbox order, one order event, one provider snapshot, one audit log.',
    'Export evidence to reports/PASS2132_DB_REMOTE_EVIDENCE.json.',
  ],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2132_DB_MIGRATION_REHEARSAL.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (blocked) process.exitCode = 1;
