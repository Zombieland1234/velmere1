import fs from 'node:fs';
import path from 'node:path';
import { buildAuditAdjudicatedAuthorityEvidence } from '../p73diag-work/source/lib/security/audit-adjudicated-authority-evidence';

const OUT=process.env.P73_RESULT_DIR || path.resolve('p73diag-out');
fs.mkdirSync(OUT,{recursive:true});

async function main(){
  const evidence=await buildAuditAdjudicatedAuthorityEvidence({
    chain:'ancient8',
    contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',
  });
  const result={
    schemaVersion:'velmere.p73r4.authority-runtime-diagnostic.v1',
    status:'PASS_DIAGNOSTIC_ZERO_CREDIT',
    evidence,
    credit:{customerFinalOutput:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},
    truthBoundary:'Diagnostic only. The evidence object is emitted to identify the fail-closed blocker in P73R4R2. No product or release credit.'
  };
  fs.writeFileSync(path.join(OUT,'P73R4_AUTHORITY_RUNTIME_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch((error)=>{console.error(error);process.exit(1)});
