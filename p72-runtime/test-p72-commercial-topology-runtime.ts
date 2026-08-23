import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

async function main(){
  const root=process.env.P72_SOURCE_ROOT || process.cwd();
  const out=process.env.P72_RESULT_DIR || process.cwd();
  const mod=(p:string)=>import(pathToFileURL(path.join(root,p)).href);
  const commercial=await mod('lib/commerce/vlm-commercial-readiness.ts');
  const fields=await mod('lib/commerce/vlm-field-level-readiness.ts');
  const checks:any[]=[];const check=(id:string,v:any,d?:any)=>{assert.ok(v,id);checks.push({id,passed:true,...(d===undefined?{}:{detail:d})});};
  const evidence:any={};
  const matrix=commercial.buildVlmCommercialReadinessMatrix({locale:'en',evidenceByFamily:evidence});
  check('matrix:exact-20-rows',matrix.length===20,matrix.length);
  const fams=[...new Set(matrix.map((x:any)=>x.family))].sort();
  check('matrix:exact-10-families',fams.length===10,fams);
  check('matrix:no-pdf-family',!fams.includes('pdf') && !matrix.some((x:any)=>x.family==='pdf'),fams);
  check('matrix:shield-pro-independent',fams.includes('shield-pro') && matrix.filter((x:any)=>x.family==='shield-pro').length===3);
  const standalone=matrix.filter((x:any)=>x.standaloneProduct===true);
  const tiered=matrix.filter((x:any)=>x.standaloneProduct!==true);
  check('matrix:15-tiered',tiered.length===15,tiered.map((x:any)=>[x.family,x.customerFacingTier]));
  check('matrix:5-standalone',standalone.length===5,standalone.map((x:any)=>x.family));
  check('matrix:standalone-no-customer-tier',standalone.every((x:any)=>x.customerFacingTier===null),standalone.map((x:any)=>[x.family,x.customerFacingTier,x.tier]));
  check('matrix:standalone-unique',new Set(standalone.map((x:any)=>x.family)).size===5);
  check('matrix:no-row-ready-on-empty-evidence',matrix.every((x:any)=>x.readyForReleaseReview===false && x.saleEnabled===false && x.live===false));

  const productDefs=fields.VLM_FIELD_DEFINITIONS.filter((x:any)=>x.family!=='pdf-artifact');
  check('fields:no-pdf-product-family',!productDefs.some((x:any)=>x.family==='pdf'));
  const pdfBasic=fields.fieldsForVlmArtifact('pdf-artifact','basic');
  const pdfPro=fields.fieldsForVlmArtifact('pdf-artifact','pro');
  const pdfAdv=fields.fieldsForVlmArtifact('pdf-artifact','advanced');
  check('fields:pdf-artifact-exists',pdfBasic.length>0 && pdfPro.length>0 && pdfAdv.length>0,{basic:pdfBasic.length,pro:pdfPro.length,advanced:pdfAdv.length});
  const sp=fields.VLM_FIELD_DEFINITIONS.filter((x:any)=>x.family==='shield-pro');
  check('fields:shield-pro-nine',sp.length===9,sp.map((x:any)=>x.id));
  const auditManual=fields.VLM_FIELD_DEFINITIONS.find((x:any)=>x.id==='manual_quality_control');
  const auditAdj=fields.VLM_FIELD_DEFINITIONS.find((x:any)=>x.id==='independent_adjudication');
  check('fields:audit-qc-automated-derived',auditManual?.sourceClass==='VELMERE_DERIVED',auditManual);
  check('fields:audit-adjudication-automated-derived',auditAdj?.sourceClass==='VELMERE_DERIVED',auditAdj);
  const inferred=commercial.evaluateVlmCommercialReadiness({family:'shield-pro',tier:'advanced',locale:'en',evidence:{gates:{source_authority:true,full_typecheck:true}}});
  const spDerived=inferred.fieldReadiness.fields.filter((x:any)=>x.fieldId.startsWith('shield_pro_') && x.sourceClass==='VELMERE_DERIVED');
  check('fields:shield-pro-derived-fail-closed',spDerived.length>0 && spDerived.every((x:any)=>x.availability==='BLOCKED_DATA' && x.directlyReady===false),spDerived);
  const result={schemaVersion:'velmere.p72.commercial-topology-runtime.v1',status:'PASS',checkCount:checks.length,checks};
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'P72_COMMERCIAL_TOPOLOGY_RUNTIME_TEST.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
