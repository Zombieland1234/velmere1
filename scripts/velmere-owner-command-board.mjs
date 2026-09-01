#!/usr/bin/env node
import fs from 'node:fs';

fs.mkdirSync('reports', { recursive: true });
fs.mkdirSync('docs/runtime', { recursive: true });
const commands = [
  { step: 1, command: 'node -v && npm -v', expected: 'v24.18.0 and 11.16.x' },
  { step: 2, command: 'npm ci --no-audit --no-fund --progress=false', expected: 'clean install passes' },
  { step: 3, command: 'npm run typecheck', expected: 'TypeScript passes' },
  { step: 4, command: 'npm run build', expected: 'Next/Vercel build passes' },
  { step: 5, command: 'npm run release:proof-ingestion', expected: 'static proof ingestion passes' },
  { step: 6, command: 'npm run runtime:bridge:acceptance', expected: 'runtime bridge reports generated; may be blocked until ENV' },
  { step: 7, command: 'npm run production:promotion-board', expected: 'promotion stays locked until real evidence receipts are attached' },
  { step: 8, command: 'npm run supabase:remote:checklist', expected: 'Supabase checklist ready or applied' },
  { step: 9, command: 'npm run stripe:webhook:replay:harness', expected: 'Stripe replay harness ready or verified' },
  { step: 10, command: 'npm run provider:sandbox:harness', expected: 'provider sandbox ready or verified' },
];
const result = {
  pass: 'PASS2144',
  name: 'Final owner command board',
  status: 'COMMAND_BOARD_READY_RUNTIME_REQUIRED',
  commands,
  promoteAbove90Rule: 'Only promote above 90% after steps 1-4 pass and at least DB/Stripe/provider/hosted smoke evidence receipts are attached.',
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync('reports/PASS2144_OWNER_COMMAND_BOARD.json', JSON.stringify(result, null, 2));
fs.writeFileSync('docs/runtime/OWNER_COMMAND_BOARD_PASS2144.md', `# PASS2144 Owner Command Board\n\nStatus: **${result.status}**\n\n${result.promoteAbove90Rule}\n\n| Step | Command | Expected |\n|---:|---|---|\n${commands.map((item) => `| ${item.step} | \`${item.command}\` | ${item.expected} |`).join('\n')}\n`);
console.log(JSON.stringify({ status: result.status, commands: commands.length }, null, 2));
