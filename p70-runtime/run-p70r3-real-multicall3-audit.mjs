import fs from 'node:fs';
import path from 'node:path';

const sourcePath=path.resolve('p70-runtime/test-p70-real-multicall3-audit.mjs');
let source=fs.readFileSync(sourcePath,'utf8').replace(/\r\n?/g,'\n');

const oldImport="const { renderCustomerSafeAuditPdf } = await import(u('lib/security/customer-safe-audit-layout.ts'));";
const newImport="const { buildCustomerSafeAuditPdfPlan, renderCustomerSafeAuditPdf } = await import(u('lib/security/customer-safe-audit-layout.ts'));";
if(!source.includes(oldImport)) throw new Error('p70r3_layout_import_preimage_missing');
source=source.replace(oldImport,newImport);

const oldEndpoints="const rpcEndpoints=['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com','https://eth.llamarpc.com'];";
const newEndpoints="const rpcEndpoints=['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com','https://eth.llamarpc.com','https://1rpc.io/eth','https://eth.drpc.org','https://rpc.flashbots.net'];";
if(!source.includes(oldEndpoints)) throw new Error('p70r3_expanded_rpc_preimage_missing');
source=source.replace(oldEndpoints,newEndpoints);

const oldGate="const successful=rpcRows.filter(r=>r.status==='PASS');\nif (successful.length<2)";
const newGate="const successful=rpcRows.filter(r=>r.status==='PASS');\nfs.writeFileSync(path.join(outDir,'P70R3_RPC_PROVIDER_DIAGNOSTIC.json'),JSON.stringify({capturedAt:new Date().toISOString(),providers:rpcRows},null,2)+'\\n');\nif (successful.length<2)";
if(!source.includes(oldGate)) throw new Error('p70r3_rpc_diagnostic_preimage_missing');
source=source.replace(oldGate,newGate);

const oldTarget="    `Target: Ethereum mainnet ${address}`,";
const newTarget="    `Target: ${address}`,\n    `Chain: Ethereum mainnet`,";
if(!source.includes(oldTarget)) throw new Error('p70r3_target_section_preimage_missing');
source=source.replace(oldTarget,newTarget);

const oldRender="  const pdf=renderCustomerSafeAuditPdf(layout);\n  if (pdf.unsupportedGlyphReplacements!==0) throw new Error(`pdf_glyph_replacement:${tier}:${locale}`);";
const newRender="  const planned=buildCustomerSafeAuditPdfPlan(layout);\n  const numberedTarget=`1. Target: ${address}`;\n  const planRows=planned.plan.pages.flatMap(page=>page.rows).map(row=>String(row.text));\n  const targetLinePresent=planRows.some(line=>line.toLowerCase()===numberedTarget.toLowerCase());\n  if(!targetLinePresent) throw new Error(`real_reference_target_not_in_pdf_plan:${tier}:${locale}:${JSON.stringify(planRows)}`);\n  const pdf=renderCustomerSafeAuditPdf(layout);\n  if (pdf.renderPlanDigest!==planned.plan.planDigest) throw new Error(`real_reference_render_plan_parity:${tier}:${locale}`);\n  if (pdf.unsupportedGlyphReplacements!==0) throw new Error(`pdf_glyph_replacement:${tier}:${locale}`);";
if(!source.includes(oldRender)) throw new Error('p70r3_render_preimage_missing');
source=source.replace(oldRender,newRender);

const oldPush="  pdfCases.push({tier,locale,file,pdfDigest:pdf.pdfDigest,pdfByteLength:pdf.pdfByteLength,pageCount:pdf.pageCount,layoutDigest:pdf.layoutDigest,renderPlanDigest:pdf.renderPlanDigest});";
const newPush="  pdfCases.push({tier,locale,file,pdfDigest:pdf.pdfDigest,pdfByteLength:pdf.pdfByteLength,pageCount:pdf.pageCount,layoutDigest:pdf.layoutDigest,renderPlanDigest:pdf.renderPlanDigest,targetLinePresent:true,targetPlanLine:numberedTarget});";
if(!source.includes(oldPush)) throw new Error('p70r3_pdf_case_preimage_missing');
source=source.replace(oldPush,newPush);

const oldEvidence="realTargetAuditPdfCases:9,vulnerabilityGroundTruthCredit:0";
const newEvidence="realTargetAuditPdfCases:9,realTargetAuditPdfTargetLineCases:pdfCases.filter(x=>x.targetLinePresent===true).length,vulnerabilityGroundTruthCredit:0";
if(!source.includes(oldEvidence)) throw new Error('p70r3_evidence_credit_preimage_missing');
source=source.replace(oldEvidence,newEvidence);

const oldLog="pdfCases:pdfCases.length,vulnerabilityGroundTruth:0";
const newLog="pdfCases:pdfCases.length,targetLineCases:pdfCases.filter(x=>x.targetLinePresent===true).length,vulnerabilityGroundTruth:0";
if(!source.includes(oldLog)) throw new Error('p70r3_log_preimage_missing');
source=source.replace(oldLog,newLog);

const dataUrl=`data:text/javascript;base64,${Buffer.from(source,'utf8').toString('base64')}`;
await import(dataUrl);
