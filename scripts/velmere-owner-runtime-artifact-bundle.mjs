#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const roots = ['reports', 'receipts/runtime', 'docs/runtime'];
const out = 'reports/PASS2152_OWNER_RUNTIME_ARTIFACT_BUNDLE.json';
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) items.push(...walk(p));
    else if (/PASS21|runtime|receipt|proof|promotion|stripe|supabase|provider|hosted|owner|vercel|build|typecheck/i.test(p)) {
      items.push({ path: p, size: st.size, sha256: sha(p) });
    }
  }
  return items.sort((a,b) => a.path.localeCompare(b.path));
}
const artifacts = roots.flatMap(walk);
const byFamily = artifacts.reduce((acc, a) => {
  const family = a.path.includes('receipts/runtime') ? 'runtime_receipts' : a.path.includes('docs/runtime') ? 'runtime_docs' : 'reports';
  acc[family] = (acc[family] || 0) + 1;
  return acc;
}, {});
const report = {
  pass: 'PASS2152',
  name: 'Owner runtime artifact bundle manifest',
  status: artifacts.length ? 'BUNDLE_MANIFEST_READY' : 'NO_RUNTIME_ARTIFACTS_FOUND',
  artifactCount: artifacts.length,
  byFamily,
  artifacts,
  noSecretsRule: 'Manifest contains paths, sizes and hashes only; never raw secret values.',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, artifactCount: report.artifactCount, byFamily }, null, 2));
