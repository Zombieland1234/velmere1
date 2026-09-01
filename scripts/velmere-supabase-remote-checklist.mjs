import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
function writeJson(name, data){ fs.writeFileSync(path.join(reportsDir,name), JSON.stringify(data,null,2)+'\n'); }
function writeMd(name, body){ fs.writeFileSync(path.join(reportsDir,name), body.trim()+'\n'); }
function envPresent(name){ return Boolean(process.env[name] && String(process.env[name]).trim().length > 0); }
function safeEnv(name){ return envPresent(name) ? 'SET_REDACTED' : 'MISSING'; }

const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL'];
const migrations = fs.existsSync(path.join(root,'supabase/migrations')) ? fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort() : [];
const env = Object.fromEntries(required.map(k=>[k, safeEnv(k)]));
const missing = required.filter(k=>!envPresent(k));
const status = missing.length ? 'BLOCKED_ENV' : (migrations.length ? 'READY_FOR_REMOTE_DRY_RUN' : 'BLOCKED_NO_MIGRATIONS');
const commands = [
  'supabase link --project-ref <project-ref>',
  'supabase db diff --schema public --linked',
  'supabase migration up --dry-run',
  'npm run production:hard-gate:report'
];
const report = { pass: 2127, name: 'Supabase remote checklist', status, env, missing, migrations, commands, rule: 'Do not connect with service role from client code; use server-only route handlers.' };
writeJson('PASS2127_SUPABASE_REMOTE_CHECKLIST.json', report);
writeMd('PASS2127_SUPABASE_REMOTE_CHECKLIST.md', `# PASS2127 — Supabase remote checklist\n\nStatus: **${status}**\n\n| ENV | State |\n|---|---|\n${required.map(k=>`| ${k} | ${env[k]} |`).join('\n')}\n\nMigrations:\n${migrations.map(m=>`- ${m}`).join('\n') || '- none'}\n\nCommands:\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\`\n`);
console.log(`[PASS2127] ${status}`);
