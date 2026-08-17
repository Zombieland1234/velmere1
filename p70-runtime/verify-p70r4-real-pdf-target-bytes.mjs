import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir=process.env.P70_RESULT_DIR||path.resolve('p70-final-out');
const pdfDir=path.join(outDir,'real-target-audit-pdfs');
const address='0xca11bde05977b3631167028862be2a173976ca11';
const expectedLine=`1. Target: ${address}`;
const expectedHex=Buffer.from(expectedLine,'utf8').toString('hex').toUpperCase();
const tiers=['basic','pro','advanced'];
const locales=['pl','en','de'];
const rows=[];
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
for(const locale of locales){
  for(const tier of tiers){
    const file=`p70-multicall3-${tier}-${locale}.pdf`;
    const p=path.join(pdfDir,file);
    if(!fs.existsSync(p)) throw new Error(`p70r4_pdf_missing:${file}`);
    const bytes=fs.readFileSync(p);
    const ascii=bytes.toString('latin1');
    const targetHexPresent=ascii.includes(expectedHex);
    if(!targetHexPresent) throw new Error(`p70r4_target_not_physically_encoded:${file}`);
    rows.push({file,tier,locale,bytes:bytes.length,sha256:sha(bytes),targetLine:expectedLine,targetHexPresent});
  }
}
if(rows.length!==9) throw new Error(`p70r4_pdf_case_count:${rows.length}`);
for(const locale of locales){
  if(new Set(rows.filter(r=>r.locale===locale).map(r=>r.sha256)).size!==3) throw new Error(`p70r4_tier_pdf_not_distinct:${locale}`);
}
const core={schemaVersion:'velmere.p70r4.real-reference-physical-pdf-target-byte-verification.v1',status:'PASS_P70R4_TARGET_ADDRESS_PHYSICALLY_ENCODED_9_OF_9_NO_PROMOTION',address,expectedLine,expectedHex,pdfCases:rows,customerFinalOutputCredit:0,auditFinalCustomerPdfCredit:0,rightsCredit:0,paidValueCredit:0,saleCredit:0,live:false,worldClassProven:false,truthBoundary:'Physical byte-level verification only: all nine internal real-reference Audit PDFs contain the exact numbered public target line emitted by the customer-safe PDF renderer. This closes the P70 target-identity rendering defect but does not make these internal reference artifacts real customer outputs or prove vulnerability correctness, entitlement, provider rights, paid value, sale, LIVE or WORLD_CLASS readiness.'};
const receipt={...core,integritySha256:sha(Buffer.from(JSON.stringify(core),'utf8'))};
fs.writeFileSync(path.join(outDir,'P70R4_REAL_REFERENCE_PDF_TARGET_BYTES.json'),JSON.stringify(receipt,null,2)+'\n','utf8');
console.log(JSON.stringify({status:receipt.status,pdfCases:rows.length,targetLine:expectedLine,customerFinalOutputs:'0/20',auditFinalCustomerPdfs:'0/3'},null,2));
