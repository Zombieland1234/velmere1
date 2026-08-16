import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const sourceRoot = process.env.P70_SOURCE_ROOT || process.cwd();
const outDir = process.env.P70_RESULT_DIR || path.resolve(sourceRoot, '../p70-out');
const solcRoot = process.env.P70_SOLC_ROOT;
if (!solcRoot) throw new Error('P70_SOLC_ROOT_required');
fs.mkdirSync(outDir, { recursive: true });
const pdfDir = path.join(outDir, 'real-target-audit-pdfs');
fs.rmSync(pdfDir, { recursive: true, force: true });
fs.mkdirSync(pdfDir, { recursive: true });
const u = (p) => pathToFileURL(path.join(sourceRoot, p)).href;
const shaHex = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha = (b) => `sha256:${shaHex(b)}`;
const canonical = (v) => Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}` : JSON.stringify(v);
const address = '0xca11bde05977b3631167028862be2a173976ca11';
const sourceCommit = 'b667d67ecfa5361a81e8f110234ce242613b0012';
const sourceUrl = `https://raw.githubusercontent.com/mds1/multicall3/${sourceCommit}/src/Multicall3.sol`;
const readmeUrl = `https://raw.githubusercontent.com/mds1/multicall3/${sourceCommit}/README.md`;
const foundryUrl = `https://raw.githubusercontent.com/mds1/multicall3/${sourceCommit}/foundry.toml`;
const reviewSkillUrl = `https://raw.githubusercontent.com/mds1/multicall3/${sourceCommit}/.claude/skills/review-multicall-pr.md`;
const EXPECTED_CAST_TEXT_SHA256='e23dba1cd18a22e11ad869e35e5cd7f8923063be694ddbeb96e6efc47b204fce';
const EXPECTED_CAST_TEXT_BYTES=7619;

const { safeEgressFetch } = await import(u('lib/network/safe-egress.ts'));
const { buildAuditPublicSourceReceiptReport } = await import(u('lib/security/audit-public-source-receipts.ts'));
const { analyzeSolidityCompilerOutputAst, verifySolidityCompilerAstEvidence } = await import(u('lib/security/solidity-compiler-ast-runtime.mjs'));
const { buildAuditCompilerDeploymentBinding, verifyAuditCompilerDeploymentBinding } = await import(u('lib/security/audit-compiler-deployment-binding.mjs'));
const { buildAuditCompilerAstReviewLayer, verifyAuditCompilerAstReviewLayer } = await import(u('lib/security/audit-compiler-ast-review-layer.mjs'));
const { buildAuditCompilerCanonicalPacket, verifyAuditCompilerPacketSet } = await import(u('lib/security/audit-compiler-canonical-packet.mjs'));
const { renderCustomerSafeAuditPdf } = await import(u('lib/security/customer-safe-audit-layout.ts'));

async function safeText(url) {
  const parsed = new URL(url);
  const response = await safeEgressFetch(url, { method:'GET', cache:'no-store', headers:{accept:'text/plain,*/*;q=0.2','user-agent':'Velmere-P70-Real-Audit/1.0'} }, {
    allowedHosts:[parsed.hostname], allowSubdomains:false, allowedMethods:['GET'], maxRedirects:0, timeoutMs:10000, maxRequestBytes:0, maxResponseBytes:2_000_000, operation:'p70_real_audit_public_source'
  });
  if (!response.ok) throw new Error(`source_fetch_${response.status}:${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { url, status:response.status, bytes, text:new TextDecoder().decode(bytes), sha256:sha(bytes), byteLength:bytes.byteLength, contentType:response.headers.get('content-type')||'' };
}

async function rpcCall(endpoint, method, params, id) {
  const url = new URL(endpoint);
  const body = JSON.stringify({jsonrpc:'2.0',id,method,params});
  const response = await safeEgressFetch(endpoint, { method:'POST', cache:'no-store', headers:{'content-type':'application/json',accept:'application/json','user-agent':'Velmere-P70-Real-Audit/1.0'}, body }, {
    allowedHosts:[url.hostname], allowSubdomains:false, allowedMethods:['POST'], maxRedirects:0, timeoutMs:10000, maxRequestBytes:16_384, maxResponseBytes:2_000_000, operation:`p70_rpc_${url.hostname}_${method}`
  });
  if (!response.ok) throw new Error(`rpc_http_${response.status}:${url.hostname}:${method}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (payload?.jsonrpc!=='2.0'||payload?.id!==id||payload?.error!=null) throw new Error(`rpc_invalid:${url.hostname}:${method}`);
  return {result:payload.result, responseBytes:bytes.byteLength, responseSha256:sha(bytes)};
}

async function rpcProvider(endpoint) {
  const host = new URL(endpoint).hostname;
  const started = Date.now();
  try {
    const chain = await rpcCall(endpoint,'eth_chainId',[],1);
    const block = await rpcCall(endpoint,'eth_blockNumber',[],2);
    const code = await rpcCall(endpoint,'eth_getCode',[address,'latest'],3);
    const runtime = String(code.result||'').toLowerCase();
    if (chain.result!=='0x1') throw new Error(`chain_id_mismatch:${chain.result}`);
    if (!/^0x(?:[0-9a-f]{2})+$/.test(runtime)||runtime==='0x') throw new Error('runtime_missing');
    const blockNumber = Number.parseInt(String(block.result),16);
    const codeBytes = Buffer.from(runtime.slice(2),'hex');
    const castText = Buffer.from(`${runtime}\n`,'utf8');
    return {host,endpoint,status:'PASS',blockNumber,runtimeByteLength:codeBytes.length,runtimeBytecodeSha256:sha(codeBytes),castTextBytes:castText.length,castTextSha256:shaHex(castText),responseDigests:[chain.responseSha256,block.responseSha256,code.responseSha256],latencyMs:Date.now()-started,runtime};
  } catch (error) {
    return {host,endpoint,status:'FAIL',error:error instanceof Error?error.message:String(error),latencyMs:Date.now()-started};
  }
}

const [src, readme, foundry, reviewSkill] = await Promise.all([safeText(sourceUrl),safeText(readmeUrl),safeText(foundryUrl),safeText(reviewSkillUrl)]);
if (!src.text.includes('SPDX-License-Identifier: MIT') || !src.text.includes('pragma solidity 0.8.12;') || !src.text.includes('contract Multicall3')) throw new Error('official_source_identity_failed');
if (!readme.text.toLowerCase().includes(address) || !reviewSkill.text.includes(EXPECTED_CAST_TEXT_SHA256) || !reviewSkill.text.includes('7,619')) throw new Error('official_deployment_reference_failed');
if (!/solc\s*=\s*"0\.8\.12"/.test(foundry.text) || !/optimizer_runs\s*=\s*10_000_000/.test(foundry.text)) throw new Error('official_compiler_settings_failed');

const rpcEndpoints=['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com','https://eth.llamarpc.com'];
const rpcRows=await Promise.all(rpcEndpoints.map(rpcProvider));
const successful=rpcRows.filter(r=>r.status==='PASS');
if (successful.length<2) throw new Error(`rpc_quorum_insufficient:${successful.length}`);
const hashes=new Set(successful.map(r=>r.runtimeBytecodeSha256));
if (hashes.size!==1) throw new Error('rpc_runtime_disagreement');
for (const row of successful) {
  if (row.castTextBytes!==EXPECTED_CAST_TEXT_BYTES || row.castTextSha256!==EXPECTED_CAST_TEXT_SHA256) throw new Error(`official_runtime_reference_mismatch:${row.host}:${row.castTextBytes}:${row.castTextSha256}`);
}
const selected=successful[0];

const publicSourceReceipts = await buildAuditPublicSourceReceiptReport({
  githubUrl: sourceUrl,
  docsUrl: readmeUrl,
  website: `https://github.com/mds1/multicall3/tree/${sourceCommit}`,
  contractAddress: address,
  chain: 'ethereum',
});
if (publicSourceReceipts.summary.contentBound < 2) throw new Error(`public_source_receipts_insufficient:${publicSourceReceipts.summary.contentBound}`);
if (!publicSourceReceipts.receipts.some(r=>r.licenseSignals.includes('MIT'))) throw new Error('mit_license_signal_missing');
if (!publicSourceReceipts.receipts.some(r=>r.identity.exactAddressPresent)) throw new Error('source_identity_address_binding_missing');

const requireSolc=createRequire(path.join(solcRoot,'package.json'));
const solc=requireSolc('solc');
const compilerVersion=String(solc.version());
if (!compilerVersion.startsWith('0.8.12+commit.f00d7308')) throw new Error(`solc_version_mismatch:${compilerVersion}`);
const sourceFiles=[{path:'src/Multicall3.sol',content:src.text.replace(/\r\n?/g,'\n')}];
const compilerInput={language:'Solidity',sources:{'src/Multicall3.sol':{content:sourceFiles[0].content}},settings:{optimizer:{enabled:true,runs:10000000},evmVersion:'london',outputSelection:{'*':{'':['ast'],'*':['abi','storageLayout','ir','irOptimized','evm.bytecode.object','evm.deployedBytecode.object','evm.methodIdentifiers']}}}};
const compilerOutput=JSON.parse(solc.compile(JSON.stringify(compilerInput)));
const compilerErrors=(compilerOutput.errors||[]).filter(x=>x.severity==='error');
if (compilerErrors.length) throw new Error(`solc_compile_errors:${compilerErrors.map(x=>x.errorCode||x.type).join(',')}`);
const compilerEvidence=analyzeSolidityCompilerOutputAst({compilerOutput,sourceFiles,compilerVersion,expectedCompilerVersionPrefix:compilerVersion,observedAt:new Date().toISOString(),profile:'P70_REAL_DEPLOYED_MULTICALL3_PINNED_OFFICIAL_SOURCE'});
const compilerVerify=verifySolidityCompilerAstEvidence(compilerEvidence,sourceFiles);
if (!compilerVerify.ok) throw new Error(`compiler_evidence_verify_failed:${JSON.stringify(compilerVerify.failed)}`);
const binding=buildAuditCompilerDeploymentBinding({evidence:compilerEvidence,sourceFiles,sourcePath:'src/Multicall3.sol',contractName:'Multicall3',deployedRuntimeBytecode:selected.runtime,chainId:'1',address,blockNumber:selected.blockNumber,evidenceClass:'PUBLIC_REAL_REFERENCE_MULTI_PROVIDER_CURRENT'});
if (!verifyAuditCompilerDeploymentBinding(binding) || !['EXACT_MATCH','MATCH_AFTER_SOLIDITY_METADATA_STRIP'].includes(binding.status)) throw new Error(`deployment_binding_failed:${binding.status}:${binding.blockers.join(',')}`);
const reviewLayer=buildAuditCompilerAstReviewLayer({evidence:compilerEvidence,sourceFiles,deploymentBinding:binding});
if (!verifyAuditCompilerAstReviewLayer(reviewLayer)) throw new Error('review_layer_invalid');
const caseRef='AUD-P70-MULTICALL3-ETHEREUM';
const packets=['basic','pro','advanced'].map(tier=>buildAuditCompilerCanonicalPacket({tier,caseRef,reviewLayer,deploymentBinding:binding,locale:'en'}));
const packetVerification=verifyAuditCompilerPacketSet(packets);
if (packetVerification.failed!==0) throw new Error(`packet_set_failed:${JSON.stringify(packetVerification.rows)}`);

const localeCopy={
 en:{title:'Velmère Audit - Real deployed reference target',summary:'Current public-chain evidence bound to pinned official source and compiler output.',status:'INTERNAL_REAL_REFERENCE_ONLY',next:'Do not treat this internal reference run as a customer certification or sale-ready audit.'},
 pl:{title:'Velmère Audit - rzeczywisty wdrożony kontrakt referencyjny',summary:'Aktualne dane z publicznego chaina związane z przypiętym oficjalnym źródłem i wynikiem kompilatora.',status:'INTERNAL_REAL_REFERENCE_ONLY',next:'Nie traktuj tego wewnętrznego testu referencyjnego jako certyfikatu klienta ani audytu gotowego do sprzedaży.'},
 de:{title:'Velmère Audit - realer bereitgestellter Referenzvertrag',summary:'Aktuelle Public-Chain-Evidenz ist an gepinnte offizielle Source- und Compiler-Ausgabe gebunden.',status:'INTERNAL_REAL_REFERENCE_ONLY',next:'Diesen internen Referenzlauf nicht als Kundenzertifikat oder verkaufsfertiges Audit behandeln.'},
};
const pdfCases=[];
for (const locale of ['pl','en','de']) for (const tier of ['basic','pro','advanced']) {
  const packet=packets.find(p=>p.tier===tier);
  const findingLines=packet.findings.slice(0,8).map((f,i)=>`${i+1}. ${String(f.severity).toUpperCase()} ${f.title} [${f.ruleId}]${tier==='basic'?'':` - ${f.safeRemediation||'Remediation evidence required.'}`}`);
  const sections=[
    `Target: Ethereum mainnet ${address}`,
    `Official source commit: ${sourceCommit}`,
    `Source bytes: ${src.byteLength}; source SHA-256: ${src.sha256}`,
    `RPC quorum: ${successful.length}/${rpcRows.length}; runtime bytes: ${selected.runtimeByteLength}; runtime SHA-256: ${selected.runtimeBytecodeSha256}`,
    `Official repository runtime reference: ${EXPECTED_CAST_TEXT_SHA256}; text bytes ${EXPECTED_CAST_TEXT_BYTES}`,
    `Compiler: ${compilerVersion}; optimizer runs: 10000000; deployment binding: ${binding.status}`,
    `Compiler-backed review signals: ${packet.findingCount}; confidence: NOT_CALIBRATED`,
    ...findingLines,
  ];
  if (tier!=='basic') sections.push(`Public source receipts: ${publicSourceReceipts.summary.contentBound} content-bound; exact-address receipts: ${publicSourceReceipts.summary.exactIdentityBound}; MIT signal detected.`);
  if (tier==='advanced') sections.push('Advanced remains NOT_FOR_SALE. Independent ground truth, exploitability, customer entitlement, provider rights and final route parity remain unproven.');
  const layout={reportId:`p70-${tier}-${locale}-${shaHex(Buffer.from(caseRef)).slice(0,12)}`,requestId:`p70-real-reference-${tier}-${locale}`,locale,title:localeCopy[locale].title,summary:localeCopy[locale].summary,status:localeCopy[locale].status,projectName:'Multicall3',reviewLevel:tier.toUpperCase(),sections,nextSteps:[localeCopy[locale].next,'Obtain independent adjudication before promoting any compiler-backed signal to a vulnerability claim.','Bind final customer entitlement and preview/download route bytes before any customer-final credit.'],forbidden:['guaranteed secure','certified safe','exploit instructions','sale-ready claim','live production claim'],customerBoundary:'Real deployed public reference target. Current source/bytecode identity evidence is real; customer, paid-value, provider-rights, sale and LIVE proof are not.',refreshedAt:new Date().toISOString()};
  const pdf=renderCustomerSafeAuditPdf(layout);
  if (pdf.unsupportedGlyphReplacements!==0) throw new Error(`pdf_glyph_replacement:${tier}:${locale}`);
  const file=`p70-multicall3-${tier}-${locale}.pdf`;
  fs.writeFileSync(path.join(pdfDir,file),Buffer.from(pdf.bytes));
  pdfCases.push({tier,locale,file,pdfDigest:pdf.pdfDigest,pdfByteLength:pdf.pdfByteLength,pageCount:pdf.pageCount,layoutDigest:pdf.layoutDigest,renderPlanDigest:pdf.renderPlanDigest});
}
for (const locale of ['pl','en','de']) if (new Set(pdfCases.filter(x=>x.locale===locale).map(x=>x.pdfDigest)).size!==3) throw new Error(`tier_pdf_not_distinct:${locale}`);

const evidenceCore={schemaVersion:'velmere.p70.real-deployed-audit-reference-evidence.v1',capturedAt:new Date().toISOString(),target:{name:'Multicall3',chain:'ethereum',chainId:'1',address,sourceRepo:'mds1/multicall3',sourceCommit},officialSource:{sourceUrl,sourceBytes:src.byteLength,sourceSha256:src.sha256,readmeSha256:readme.sha256,foundryConfigSha256:foundry.sha256,reviewSkillSha256:reviewSkill.sha256,license:'MIT',compilerVersion,optimizerRuns:10000000},chainEvidence:{providers:rpcRows,successfulProviders:successful.length,independentRuntimeHashes:hashes.size,selectedBlockNumber:selected.blockNumber,runtimeByteLength:selected.runtimeByteLength,runtimeBytecodeSha256:selected.runtimeBytecodeSha256,officialCastTextBytes:EXPECTED_CAST_TEXT_BYTES,officialCastTextSha256:EXPECTED_CAST_TEXT_SHA256},publicSourceReceipts,compilerEvidenceSha256:compilerEvidence.evidenceSha256,deploymentBinding:binding,reviewLayerSha256:reviewLayer.reviewLayerSha256,packetVerification,packets:packets.map(p=>({tier:p.tier,availability:p.availability,findingCount:p.findingCount,findingIdentitySha256:p.findingIdentitySha256,severitySha256:p.severitySha256,packetSha256:p.packetSha256})),pdfCases,credit:{realDeployedReferenceTarget:1,realChainProviderQuorum:true,sourceRuntimeBinding:true,compilerAstReviewLayer:true,realTargetAuditPdfCases:9,customerFinalOutputs:0,auditFinalCustomerPdfs:0,rightsPassed:'2/203 inherited only from P69R2 ECB; P70 adds no rights credit',paidValueTransitions:'0/10',saleEligibleRows:'0/20',live:false,worldClassProven:false},truthBoundary:'P70 proves one real deployed public reference target can be bound from pinned official source through current multi-provider chain runtime, exact compiler evidence, deployment bytecode match, tier packet generation and 9 customer-safe PDF artifacts. The run is internal reference evidence, not a real customer entitlement or final customer route. It grants zero customer-final, Audit-final-PDF, provider-rights, paid-value, sale, LIVE or WORLD_CLASS credit.'};
const evidence={...evidenceCore,integritySha256:sha(Buffer.from(canonical(evidenceCore),'utf8'))};
fs.writeFileSync(path.join(outDir,'P70_REAL_DEPLOYED_AUDIT_REFERENCE_EVIDENCE.json'),JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'P70_COMPILER_EVIDENCE.json'),JSON.stringify(compilerEvidence,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'P70_DEPLOYMENT_BINDING.json'),JSON.stringify(binding,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'P70_PUBLIC_SOURCE_RECEIPTS.json'),JSON.stringify(publicSourceReceipts,null,2)+'\n');
console.log(JSON.stringify({status:'PASS_P70_REAL_DEPLOYED_AUDIT_REFERENCE_NO_PROMOTION',target:address,rpcQuorum:`${successful.length}/${rpcRows.length}`,runtimeByteLength:selected.runtimeByteLength,deploymentBinding:binding.status,compilerFindings:compilerEvidence.findings.length,pdfCases:pdfCases.length,customerFinalOutputs:'0/20',auditFinalPdfs:'0/3'},null,2));
