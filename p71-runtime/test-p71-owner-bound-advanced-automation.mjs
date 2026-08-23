import fs from 'node:fs';
import crypto from 'node:crypto';

const path=(await import('node:path')).default;
const sourceRoot=process.env.P71_SOURCE_ROOT || process.cwd();
const resultDir=process.env.P71_RESULT_DIR || process.cwd();
const v16Override=process.env.P71_V16_PATH;
const v17Override=process.env.P71_V17_PATH;
const srcPath=(p)=>path.join(sourceRoot,p);
const read=(p)=>fs.readFileSync(p,'utf8').replace(/\r\n?/g,'\n');
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];
function check(id, ok, detail=''){ checks.push({id,passed:Boolean(ok),detail}); if(!ok) throw new Error(`${id}: ${detail}`); }

const productOnly=process.env.P71_PRODUCT_ONLY==='1';
if(!productOnly){
  const v16Path=v16Override || srcPath('VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt');
  const v17Path=v17Override || srcPath('VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt');
  const v16=read(v16Path), v17=read(v17Path);
  check('history:v16-byte-preserved', sha(fs.readFileSync(v16Path))==='67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9', sha(fs.readFileSync(v16Path)));
  check('authority:v17-topology', v17.includes('canonical product families = 10;') && v17.includes('customer-facing rows = 20;') && v17.includes('current product execution profiles = 20;') && v17.includes('material paid transitions = 10.'), '10/20/20/10');
  check('authority:v17-pdf-not-family', v17.includes('PDF is not a family, SKU or independent sale row.'), 'pdf artifact');
  check('authority:v17-advanced-automation', v17.includes('CURRENT ADVANCED AUTOMATION COVENANT') && v17.includes('may not require a human/operator allocation'), 'advanced automation covenant');
  check('authority:v17-no-stale-current-denominators', !/all 17 customer-facing|17-row customer|all 33 internal|33-profile internal|all 11 product families|11 families × 50/u.test(v17), 'legacy denominators absent from current rules');
}else{
  checks.push({id:'authority:byte-rebind-deferred-to-final-package',passed:true,detail:'Exact Windows validates product bytes only; V16/V17 byte rebound is proved by final SOURCE_ONLY manifest/package.'});
}

const intake=read(srcPath('lib/server/security-route-modules/audit-intake.ts'));
check('audit:intake-no-manual-allocation', !intake.includes('manual-review allocation') && intake.includes('deeper automated evidence/retest pipeline'), 'intake copy');
const vault=read(srcPath('lib/security/audit-intake-case-vault.ts'));
check('audit:queue-canonical-automation', vault.includes('record.tier === "advanced" ? "advanced_automation" : "pro_review"') && !vault.includes('record.tier === "advanced" ? "advanced_human_review" : "pro_review"'), 'queue lane');
const history=read(srcPath('lib/security/audit-case-customer-history.ts'));
check('audit:history-new-write-legacy-read', history.includes('return record.tier === "advanced" ? "advanced_automation" : "pro_review"') && history.includes('"advanced_human_review"'), 'legacy compatibility');
const orchestration=read(srcPath('lib/security/audit-review-orchestration.ts'));
check('audit:orchestration-automation-mode', orchestration.includes('"advanced_automation"') && !orchestration.includes('"advanced_human"'), 'processing mode');
check('audit:optional-human-qa-only', orchestration.includes('optional internal QA metadata') && orchestration.includes('optional_internal_qa_assignment'), 'human review not product gate');
const flow=read(srcPath('lib/security/audit-review-flow.ts'));
check('audit:review-flow-automated', flow.includes('Deeper automated evidence checks') && flow.includes('automated evidence, conflict, remediation and retest gates') && !flow.includes('Manual-assisted checklist'), 'review flow');
check('audit:advanced-no-stale-price-label', !flow.includes('Velmère Advanced Audit — 149€') && flow.includes('Velmère Advanced Audit — not for sale'), 'availability copy');
const paid=read(srcPath('lib/commerce/vlm-paid-access.ts'));
check('commerce:advanced-current-scope-automated', paid.includes('accessScope: "audit_advanced_analysis"') && paid.includes('| "audit_advanced_human_review";'), 'current semantic + legacy parser');
const portal=read(srcPath('components/account/AuditCasesPortalClient.tsx'));
check('ui:portal-automation-plus-legacy', portal.includes('advanced_automation: "Advanced · automated analysis"') && portal.includes('advanced_human_review: "Advanced · legacy record"'), 'current/legacy distinction');

const result={schemaVersion:'velmere.p71.owner-bound-advanced-automation-static.v1',status:'PASS',checkCount:checks.length,checks};
fs.mkdirSync(resultDir,{recursive:true});
fs.writeFileSync(path.join(resultDir,'P71_OWNER_BOUND_ADVANCED_AUTOMATION_STATIC_TEST.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
