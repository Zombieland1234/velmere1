#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'lib', 'content'];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json']);
const patterns = [
  { id: 'roi_promise', rx: /\b(guaranteed profit|gwarantowany zysk|zarobisz|roi|moonshot|100x)\b/i, severity: 'P0' },
  { id: 'fake_certification', rx: /\b(certified|certyfikowany|audited by|zatwierdzone przez)\b/i, severity: 'P1' },
  { id: 'absolute_safety', rx: /\b(100% safe|całkowicie bezpieczne|zero risk|bez ryzyka)\b/i, severity: 'P0' },
  { id: 'unqualified_world_best', rx: /\b(best in the world|najlepszy na świecie|topka świata|world[- ]class)\b/i, severity: 'P1' }
];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'reports'].includes(item.name)) walk(p);
    } else if (exts.has(path.extname(item.name))) files.push(p);
  }
}
roots.forEach(walk);
const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    patterns.forEach((p) => {
      if (p.rx.test(line)) {
      const normalized = line.toLowerCase();
      const isBoundaryLanguage = /\b(no|not|kein|bez|brak|nie)\b/.test(normalized) && /\b(roi|profit|zysk|risk|ryzyka|certified|safe|promise|promises)\b/.test(normalized);
      if (!isBoundaryLanguage) findings.push({ file, line: idx + 1, id: p.id, severity: p.severity, snippet: line.trim().slice(0, 220) });
    }
    });
  });
}
const p0 = findings.filter((f) => f.severity === 'P0');
const result = {
  pass: 'PASS2164',
  name: 'Trust copy anti-hype sweep',
  status: p0.length ? 'P0_COPY_REVIEW_REQUIRED' : findings.length ? 'PASS_WITH_OWNER_REVIEW' : 'PASS',
  scannedFiles: files.length,
  findingCount: findings.length,
  p0FindingCount: p0.length,
  findings: findings.slice(0, 200),
  note: 'P1 world-class wording is allowed only as internal roadmap unless supported by runtime receipts and careful public copy.',
  generatedAt: new Date().toISOString()
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2164_TRUST_COPY_ANTI_HYPE_SWEEP.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
// Owner copy review findings do not fail static release; public copy promotion stays blocked until owner review.
process.exit(0);
