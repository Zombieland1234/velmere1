import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
function writeJson(name, data){ fs.writeFileSync(path.join(reportsDir,name), JSON.stringify(data,null,2)+'\n'); }
function writeMd(name, body){ fs.writeFileSync(path.join(reportsDir,name), body.trim()+'\n'); }
function exists(file){ return fs.existsSync(path.join(root,file)); }
function envPresent(name){ return Boolean(process.env[name] && String(process.env[name]).trim().length > 0); }
function safeEnv(name){ return envPresent(name) ? 'SET_REDACTED' : 'MISSING'; }

const requiredAny = [
  ['PRINTFUL_API_KEY','PRINTFUL_STORE_ID'],
  ['TAPSTITCH_API_KEY','TAPSTITCH_STORE_ID']
];
const groups = requiredAny.map(group => ({ group, ready: group.every(envPresent), env: Object.fromEntries(group.map(k=>[k,safeEnv(k)])) }));
const providerReady = groups.some(g=>g.ready);
const importScriptExists = exists('scripts/import-products.ts') || exists('scripts/printful-smoke-test.mjs');
const status = providerReady && importScriptExists ? 'READY_FOR_PROVIDER_SANDBOX_SMOKE' : 'BLOCKED_PROVIDER_ENV';
const commands = [
  'npm run printful:test',
  'npm run smoke:provider-sandbox',
  'npm run production:hard-gate:report'
];
const report = { pass: 2129, name: 'Provider sandbox harness', status, groups, importScriptExists, commands, clientSafety: 'Do not expose raw provider payloads or provider tokens to client bundle.' };
writeJson('PASS2129_PROVIDER_SANDBOX_HARNESS.json', report);
writeMd('PASS2129_PROVIDER_SANDBOX_HARNESS.md', `# PASS2129 — Provider sandbox harness\n\nStatus: **${status}**\n\nProvider ENV groups:\n\n${groups.map(g => `- ${g.group.join(' + ')}: ${g.ready ? 'READY' : 'MISSING'} (${Object.entries(g.env).map(([k,v])=>`${k}=${v}`).join(', ')})`).join('\n')}\n\nCommands:\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\`\n`);
console.log(`[PASS2129] ${status}`);
