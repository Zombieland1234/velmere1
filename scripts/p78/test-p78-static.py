from __future__ import annotations
import json, re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
provider = (root/'lib/security/audit-provider-runtime-client.ts').read_text(encoding='utf-8')
parser = (root/'lib/security/audit-permission-parser.ts').read_text(encoding='utf-8')
extract = (root/'lib/security/contract-source-abi-extraction.ts').read_text(encoding='utf-8')
watch = (root/'lib/security/audit-watch-post-handler.ts').read_text(encoding='utf-8')
checks=[]
def c(name, ok): checks.append({'name':name,'status':'PASS' if ok else 'FAIL'})

# Provider private/public boundary (1-17)
c('private_static_evidence_type_exists', 'export type Pass2572ProviderPrivateStaticEvidence' in provider)
c('private_static_evidence_has_source', 'sourceText?: string;' in provider)
c('private_static_evidence_has_abi', 'abiText?: string;' in provider)
c('private_static_evidence_receipt_index_exists', 'pass2572PrivateStaticEvidenceByReceipt' in provider)
c('private_static_evidence_ttl_bounded', 'PASS2572_PRIVATE_STATIC_EVIDENCE_TTL_MS = 60_000' in provider)
c('private_static_evidence_count_bounded', 'PASS2572_PRIVATE_STATIC_EVIDENCE_MAX_ENTRIES = 32' in provider)
c('private_static_evidence_pruning_exists', 'function prunePass2572PrivateStaticEvidence' in provider)
c('private_static_evidence_store_exists', 'function storePass2572PrivateStaticEvidence' in provider)
c('private_store_requires_confirmed_lane', 'state === "confirmed" && providerReceipt?.bodyDigest && sourceResult.bodyDigest' in provider)
c('private_store_address_bound', 'contractAddress: contractAddress.toLowerCase()' in provider)
c('private_store_chain_bound', 'chainId,' in provider)
c('private_store_response_digest_bound', 'responseDigest: sourceResult.bodyDigest' in provider)
c('public_lane_uses_compact_receipt_only', 'receipt: providerReceipt' in provider)
c('public_lane_does_not_emit_source_field', not re.search(r'return lane\(\{[\s\S]{0,2600}?\bsourceText\s*:', provider[provider.index('async function explorerLane'):]))
c('public_lane_does_not_emit_abi_field', not re.search(r'return lane\(\{[\s\S]{0,2600}?\babiText\s*:', provider[provider.index('async function explorerLane'):]))
c('private_accessor_exists', 'export function readPass2572AuditProviderPrivateStaticEvidence' in provider)
c('private_cache_reset_clears_evidence', 'pass2572PrivateStaticEvidenceByReceipt.clear();' in provider)

# Identity fail-closed accessor (18-24)
c('private_accessor_requires_confirmed', 'lane.state !== "confirmed"' in provider)
c('private_accessor_requires_exact_response', 'lane.identity?.verification !== "exact_response"' in provider)
c('private_accessor_requires_matched', 'lane.identity.matched !== true' in provider)
c('private_accessor_checks_requested_address', 'lane.identity.requestedAddress?.toLowerCase() !== report.target.contractAddress.toLowerCase()' in provider)
c('private_accessor_checks_resolved_address', 'lane.identity.resolvedAddress?.toLowerCase() !== report.target.contractAddress.toLowerCase()' in provider)
c('private_accessor_checks_chain', 'lane.identity.requestedChainId !== report.target.chainId' in provider and 'lane.identity.resolvedChainId !== report.target.chainId' in provider)
c('private_accessor_checks_response_digest', '!/^[a-f0-9]{64}$/i.test(evidence.responseDigest)' in provider)

# Parser and extraction consumption (25-33)
c('parser_imports_private_accessor', 'readPass2572AuditProviderPrivateStaticEvidence' in parser)
c('parser_prefers_explicit_verified_evidence', 'input.verifiedStaticEvidence ??' in parser)
c('parser_fallback_uses_provider_target_chain', 'chain: input.providerRuntime.target.chain' in parser)
c('parser_retains_identity_validation', 'evidence.contractAddress.toLowerCase() !== contractAddress.toLowerCase()' in parser and 'evidence.chain.trim().toLowerCase() !== chain.trim().toLowerCase()' in parser)
c('parser_trusted_corpus_uses_verified_evidence_only', 'const raw = verifiedStaticEvidence(input);' in parser)
c('extract_imports_private_accessor', 'readPass2572AuditProviderPrivateStaticEvidence' in extract)
c('extract_prefers_explicit_verified_evidence', 'input.verifiedStaticEvidence ??' in extract)
c('extract_retains_identity_validation', 'evidence.contractAddress.toLowerCase() !== contractAddress.toLowerCase()' in extract and 'evidence.chain.trim().toLowerCase() !== chain.trim().toLowerCase()' in extract)
c('static_extraction_never_final_signs', 'canFinalSignFromStaticExtraction: false' in extract)

# Customer execution authority plumbing (34-38)
c('audit_watch_imports_authority_builder', 'buildAuditAdjudicatedAuthorityEvidence' in watch)
c('audit_watch_builds_authority_from_current_target', 'authorityEvidencePromise = buildAuditAdjudicatedAuthorityEvidence({' in watch and 'contractAddress: normalized.contractAddress' in watch)
c('audit_watch_binds_docs_and_maintainer', 'docsUrl: normalized.docsUrl' in watch and 'maintainerUrl: normalized.githubUrl' in watch)
c('audit_watch_awaits_authority_before_claim_ledger', watch.index('const [authorityEvidence, pass82CurrentDeploymentQuorum] = await Promise.all([') < watch.index('const pass2574AuditClaimLedger'))
c('audit_watch_passes_authority_to_claim_ledger', re.search(r'buildPass2574AuditClaimLedgerReport\(\{[\s\S]{0,900}?authorityEvidence,', watch) is not None)

assert len(checks)==38, len(checks)
failed=[x for x in checks if x['status']!='PASS']
receipt={
  'schemaVersion':'velmere.p78.real-audit-dataflow-static.v1',
  'status':'PASS' if not failed else 'FAIL',
  'checkCount':len(checks),
  'checks':checks,
  'zeroFakeCredit':{
    'customerFinal':'0/20','auditFinalPdf':'0/3','exactWindows':'WITHHELD',
    'note':'Static source binding proves implementation shape only; runtime, rights, ground truth and final artifact gates remain separate.'
  }
}
out=root/'receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
raise SystemExit(1 if failed else 0)
