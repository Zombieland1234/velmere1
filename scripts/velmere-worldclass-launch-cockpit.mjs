#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json','utf8'));
const scripts = pkg.scripts ?? {};
const gates = [
  ['clean-install','npm run owner:clean-install', Boolean(scripts['owner:clean-install'])],
  ['typecheck','npm run typecheck', Boolean(scripts.typecheck)],
  ['build','npm run build', Boolean(scripts.build)],
  ['release-gate','npm run release:gate', Boolean(scripts['release:gate'])],
  ['owner-gate','npm run release:owner-gate', Boolean(scripts['release:owner-gate'])],
  ['worldclass-claim-ledger','npm run worldclass:claim-ledger', Boolean(scripts['worldclass:claim-ledger'])],
  ['worldclass-pii-scan','npm run worldclass:pii-scan', Boolean(scripts['worldclass:pii-scan'])],
  ['worldclass-chaos-drills','npm run worldclass:chaos-drills', Boolean(scripts['worldclass:chaos-drills'])],
  ['pass2110-2119','npm run verify:pass2110-2119-worldclass-expansion', Boolean(scripts['verify:pass2110-2119-worldclass-expansion'])],
];
const payload = {
  schemaVersion:'velmere.pass2117.launch-cockpit.v1',
  generatedAt:new Date().toISOString(),
  status: gates.every((g)=>g[2]) ? 'STATIC_COCKPIT_READY_RUNTIME_BLOCKED' : 'MISSING_STATIC_GATE',
  cannotExceed90Without:['clean npm ci','full typecheck','full build','Supabase migration','Stripe signed webhook test','provider sandbox','admin auth smoke','owner legal review'],
  gates: gates.map(([id,command,configured])=>({id,command,configured})),
  evidenceArtifacts: ['reports/PASS2110_WORLDCLASS_CLAIM_LEDGER.json','reports/PASS2112_PRIVACY_PII_SCAN.json','reports/PASS2113_CHAOS_DRILL_MATRIX.json','reports/PASS2117_LAUNCH_COCKPIT.json'],
};
mkdirSync('reports',{recursive:true});
writeFileSync('reports/PASS2117_LAUNCH_COCKPIT.json', JSON.stringify(payload,null,2));
console.log(JSON.stringify({status:payload.status,gates:gates.length,configured:gates.filter(g=>g[2]).length},null,2));
process.exit(payload.status === 'MISSING_STATIC_GATE' ? 1 : 0);
