#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const scanRoots = ['app/api','lib','components'];
const dangerousPatterns = [
  { id: 'console-pii-email', pattern: /console\.(log|warn|error)\([^\n]*(email|address|phone|name|customer|recipient)/i, severity: 'review' },
  { id: 'secret-to-client', pattern: /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE)/, severity: 'blocker' },
  { id: 'public-key-review', pattern: /NEXT_PUBLIC_(?!STRIPE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY|SUPABASE_URL|SITE_URL)[A-Z0-9_]*KEY/, severity: 'review' },
  { id: 'raw-provider-client', pattern: /rawProviderPayload|providerRaw|rawPrintful|rawTapstitch/i, severity: 'review' },
];
function walk(dir, out=[]) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}
const findings=[];
for (const root of scanRoots) {
  for (const file of walk(root)) {
    const text = readFileSync(file,'utf8');
    const lines = text.split('\n');
    for (const pat of dangerousPatterns) {
      for (let i=0;i<lines.length;i++) {
        if (pat.pattern.test(lines[i])) findings.push({file,lineNumber:i+1,pattern:pat.id,severity:pat.severity,line:lines[i].trim().slice(0,220)});
      }
    }
  }
}
const payload={
  schemaVersion:'velmere.pass2112.privacy-pii-scan.v1',
  generatedAt:new Date().toISOString(),
  status: findings.some(f=>f.severity==='blocker') ? 'BLOCKED_REVIEW_REQUIRED' : 'PASS_WITH_REVIEW_QUEUE',
  summary:{ filesScanned: scanRoots.flatMap(r=>walk(r)).length, findings: findings.length, blockers: findings.filter(f=>f.severity==='blocker').length, review: findings.filter(f=>f.severity==='review').length },
  policy:'No PII/secrets/raw provider payload in public proof, support packets, client bundle, or customer-safe UI.',
  findings: findings.slice(0,200),
};
mkdirSync('reports',{recursive:true});
writeFileSync('reports/PASS2112_PRIVACY_PII_SCAN.json', JSON.stringify(payload,null,2));
console.log(JSON.stringify(payload.summary,null,2));
process.exit(0);
