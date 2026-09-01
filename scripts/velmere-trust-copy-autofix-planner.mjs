#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const policy = JSON.parse(fs.readFileSync('config/velmere-pass2166-2170-final-five.policy.json','utf8'));
const exts = new Set(['.ts','.tsx','.js','.jsx','.md','.json']);
const skipParts = new Set(['node_modules','.next','.git','reports','scripts','docs','supabase','visual-receipts']);
const replacements = new Map(policy.publicHypeTerms.map((x)=>[x.term.toLowerCase(), x]));
function walk(dir){
  const out=[];
  if(!fs.existsSync(dir)) return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipParts.has(ent.name)) continue;
    const p=path.join(dir, ent.name);
    if(ent.isDirectory()) out.push(...walk(p));
    else if(exts.has(path.extname(ent.name))) out.push(p);
  }
  return out;
}
const files = [...new Set(policy.scanTargets.flatMap(walk))];
const findings=[];
for(const file of files){
  let text;
  try { text=fs.readFileSync(file,'utf8'); } catch { continue; }
  const lower=text.toLowerCase();
  for(const [term, meta] of replacements.entries()){
    let idx=lower.indexOf(term);
    while(idx !== -1){
      const line = text.slice(0,idx).split(/\r?\n/).length;
      const snippet = text.slice(Math.max(0,idx-50), Math.min(text.length, idx+term.length+50)).replace(/\s+/g,' ').trim();
      const isInternalGuard = /no roi|anti[- ]hype|guardrail|policy|do not|bez fake|nie wpisujemy/i.test(snippet);
      findings.push({file,line,term:meta.term,severity:isInternalGuard?'informational_guard':meta.severity,safeReplacement:meta.safeReplacement,snippet});
      idx=lower.indexOf(term, idx+term.length);
    }
  }
}
const blockers=findings.filter(f=>f.severity==='blocker');
const ownerReview=findings.filter(f=>f.severity==='owner_review');
const informational=findings.filter(f=>f.severity==='informational_guard');
const patchPlan = ownerReview.concat(blockers).slice(0,200).map(f=>({file:f.file,line:f.line,replace:f.term,with:f.safeReplacement,reason:'public trust-copy should not overpromise without receipt evidence'}));
const result={
  pass:'PASS2166',
  name:'Trust copy auto-fix planner',
  status:blockers.length ? 'BLOCKED_COPY_REVIEW' : ownerReview.length ? 'PASS_WITH_OWNER_REVIEW' : 'PASS',
  scannedFiles:files.length,
  findingCount:findings.length,
  blockers:blockers.length,
  ownerReview:ownerReview.length,
  informationalGuard:informational.length,
  patchPlan,
  generatedAt:new Date().toISOString()
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2166_TRUST_COPY_AUTOFIX_PLANNER.json', JSON.stringify(result,null,2));
fs.writeFileSync('docs/trust/PASS2166_TRUST_COPY_AUTOFIX_PLAN.md', `# PASS2166 Trust copy auto-fix plan\n\nStatus: ${result.status}\n\nScanned files: ${result.scannedFiles}\n\nFindings: ${result.findingCount}\n\nBlockers: ${result.blockers}\n\nOwner review: ${result.ownerReview}\n\n## Patch plan\n\n${patchPlan.map(p=>`- ${p.file}:${p.line} — replace \`${p.replace}\` with \`${p.with}\`.`).join('\n') || '- No patch required.'}\n`);
console.log(JSON.stringify(result,null,2));
if(blockers.length) process.exitCode=0;
