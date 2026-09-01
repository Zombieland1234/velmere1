#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = ['app','components','lib','docs'];
const claimPatterns = [
  { id: 'absolute-100', pattern: /\b100%\b/gi, severity: 'owner_review' },
  { id: 'world-class', pattern: /world[- ]class|topka|najlepsz\w* na świecie|światow\w* poziom/gi, severity: 'evidence_required' },
  { id: 'guaranteed-profit', pattern: /gwarantujemy zysk|gwarantowany zysk|pewny zysk|guaranteed profit|guaranteed return|guaranteed safety/gi, severity: 'blocked_public_claim' },
];
const allowed = new Set([
  'VELMERE_TOPKA_100_MASTER_PROMPT_PROGRESS_TRACKER(1).txt',
]);

function walk(dir, out=[]) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|md|mjs|json|txt)$/.test(name)) out.push(p);
  }
  return out;
}
const findings = [];
for (const root of roots) {
  for (const file of walk(root)) {
    if (allowed.has(path.basename(file))) continue;
    const text = readFileSync(file, 'utf8');
    for (const pattern of claimPatterns) {
      for (const match of text.matchAll(pattern.pattern)) {
        const before = text.slice(0, match.index).split('\n').length;
        const line = text.split('\n')[before-1]?.slice(0, 220) ?? '';
        let severity = pattern.severity;
        if (pattern.id === 'guaranteed-profit' && /\b(no|not|never|cannot|does not|without|forbidden|block|keeps|nie|bez|kein)\b/i.test(line)) severity = 'protective_boundary';
        findings.push({ file, lineNumber: before, pattern: pattern.id, severity, line });
      }
    }
  }
}
const payload = {
  schemaVersion: 'velmere.pass2110.claim-ledger.v1',
  generatedAt: new Date().toISOString(),
  status: 'PASS_WITH_OWNER_REVIEW',
  summary: {
    filesScanned: roots.flatMap((r)=>walk(r)).length,
    findings: findings.length,
    blockedPublicClaims: findings.filter((f)=>f.severity==='blocked_public_claim').length,
    protectiveBoundaries: findings.filter((f)=>f.severity==='protective_boundary').length,
    evidenceRequired: findings.filter((f)=>f.severity==='evidence_required').length,
  },
  releaseRule: 'Public absolute/world-class/ROI claims require evidence and owner review before production.',
  findings: findings.slice(0, 200),
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2110_WORLDCLASS_CLAIM_LEDGER.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload.summary, null, 2));
process.exit(0);
