import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
function writeJson(name, data){ fs.writeFileSync(path.join(reportsDir,name), JSON.stringify(data,null,2)+'\n'); }
function writeMd(name, body){ fs.writeFileSync(path.join(reportsDir,name), body.trim()+'\n'); }

const patterns = [
  { id: 'node-engine', match: /(EBADENGINE|Unsupported engine|node version)/i, ownerFix: 'Use Node 24.18.0 and npm 11.16.x, then clean npm ci.' },
  { id: 'missing-module', match: /(Cannot find module|Module not found)/i, ownerFix: 'Run npm ci, then verify package-lock/package.json sync.' },
  { id: 'ts-error', match: /(Type error|TS\d{4})/i, ownerFix: 'Open the first TypeScript diagnostic and patch source before retrying build.' },
  { id: 'next-build', match: /(next build|Failed to compile|static generation failed)/i, ownerFix: 'Run npm run build locally with the same env as Vercel.' },
  { id: 'env-missing', match: /(missing env|ENV|SUPABASE|STRIPE|PRINTFUL|TAPSTITCH)/i, ownerFix: 'Fill ENV_REQUIRED.md and Vercel project variables.' },
  { id: 'secret-leak', match: /(secret|NEXT_PUBLIC_.*SECRET|api key exposed)/i, ownerFix: 'Move private env to server-only and rerun secret-redaction-static.' }
];
const logPath = process.env.CI_LOG_PATH || '';
const raw = logPath && fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
const findings = raw ? patterns.filter(p => p.match.test(raw)).map(p => ({ id:p.id, ownerFix:p.ownerFix })) : [];
const report = { pass: 2126, name: 'CI log triage', status: raw ? (findings.length ? 'TRIAGED_WITH_FINDINGS' : 'NO_KNOWN_PATTERNS_FOUND') : 'READY_NO_LOG_PROVIDED', logPath: logPath || 'not provided', patterns: patterns.map(({id, ownerFix}) => ({id, ownerFix})), findings };
writeJson('PASS2126_CI_LOG_TRIAGE.json', report);
writeMd('PASS2126_CI_LOG_TRIAGE.md', `# PASS2126 — CI log triage\n\nStatus: **${report.status}**\n\nSet \`CI_LOG_PATH=/path/to/vercel-or-github-log.txt\` and run:\n\n\`\`\`bash\nnpm run ci:log:triage\n\`\`\`\n\nKnown triage patterns:\n\n${patterns.map(p => `- **${p.id}** — ${p.ownerFix}`).join('\n')}\n`);
console.log(`[PASS2126] ${report.status}`);
