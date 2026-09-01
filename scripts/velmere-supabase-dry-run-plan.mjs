import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations', '20260616000001_2097_velmere_core_truth.sql');
const bridgeMigrationPath = path.join(root, 'supabase', 'migrations', '20260616000002_2121_runtime_bridge_checks.sql');
const outputPath = path.join(root, 'reports', 'PASS2121_SUPABASE_DRY_RUN_PLAN.json');
const requiredTables = [
  'velmere_products',
  'velmere_product_variants',
  'velmere_orders',
  'velmere_order_events',
  'velmere_order_drafts',
  'velmere_order_state_events',
  'velmere_fulfilment_retry_queue',
  'velmere_fulfilment_incidents',
  'velmere_audit_logs',
  'velmere_admin_sessions',
  'velmere_admin_roles',
  'velmere_source_receipts',
  'velmere_provider_snapshots',
  'velmere_provider_contracts',
  'velmere_provider_sandbox_runs',
  'velmere_runtime_bridge_evidence_runs',
  'velmere_runtime_bridge_gate_results',
];
const requiredViews = ['velmere_public_product_truth', 'velmere_runtime_bridge_latest_status'];

function readMaybe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const sql = `${readMaybe(migrationPath)}\n${readMaybe(bridgeMigrationPath)}`;
const missingTables = requiredTables.filter((table) => !new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, 'i').test(sql));
const missingViews = requiredViews.filter((view) => !new RegExp(`create\\s+or\\s+replace\\s+view\\s+public\\.${view}`, 'i').test(sql));
const rlsTables = requiredTables.filter((table) => new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql));
const envPresent = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE));
const status = missingTables.length || missingViews.length ? 'BLOCKED_SCHEMA_MISSING' : envPresent ? 'READY_FOR_REMOTE_DRY_RUN' : 'STATIC_SCHEMA_OK_ENV_BLOCKED';

const report = {
  schemaVersion: 'velmere.pass2121.supabase-dry-run-plan.v1',
  generatedAt: new Date().toISOString(),
  status,
  migrationFiles: [
    'supabase/migrations/20260616000001_2097_velmere_core_truth.sql',
    'supabase/migrations/20260616000002_2121_runtime_bridge_checks.sql',
  ],
  requiredTables,
  requiredViews,
  missingTables,
  missingViews,
  rlsCoverage: { checkedTables: requiredTables.length, rlsEnabledTables: rlsTables.length, missingRls: requiredTables.filter((table) => !rlsTables.includes(table)) },
  env: {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE),
  },
  ownerCommand: 'supabase db push --include-all OR paste supabase/migrations/*.sql into Supabase SQL editor, then run npm run supabase:dry-run:plan again with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set.',
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`[pass2121] ${status}; tables missing=${missingTables.length}; views missing=${missingViews.length}; rls=${rlsTables.length}/${requiredTables.length}`);
if (missingTables.length || missingViews.length) process.exit(1);
