#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
CHECKS=[]
def check(cid, condition, detail=None):
    row={"id":cid,"status":"PASS" if condition else "FAIL"}
    if detail is not None: row["detail"]=detail
    CHECKS.append(row)
    if not condition: raise AssertionError(f"{cid}: {detail}")
def text(path): return (ROOT/path).read_text(encoding="utf-8")
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

TOKEN="lib/market-integrity/customer-report-exact-pdf-token.ts"
HELPER="lib/market-integrity/real-markets-paid-account-artifact.ts"
PDF_ROUTE="lib/server/market-integrity-route-modules/report-pdf.ts"
REPORT_ROUTE="lib/server/market-integrity-route-modules/report.ts"
P86_BINDING="receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json"
for path in [TOKEN,HELPER,PDF_ROUTE,REPORT_ROUTE,P86_BINDING]: check(f"exists:{path}",(ROOT/path).is_file())
tok,helper,pdf,report=map(text,[TOKEN,HELPER,PDF_ROUTE,REPORT_ROUTE])

# Closed exact-token authority.
check("token:id_v2",'p87-customer-report-exact-pdf-token-v2' in tok)
check("token:prefix_v2",'P87_CUSTOMER_REPORT_EXACT_PDF_TOKEN_PREFIX = "p87v2"' in tok)
check("token:purpose_exact",'customer_market_report_exact_pdf' in tok)
check("token:signature_domain_v2",'velmere:customer-market-report-exact-pdf:v2:' in tok)
check("token:hmac_sha256",'createHmac("sha256"' in tok)
check("token:constant_time_signature",'timingSafeEqual' in tok)
check("token:closed_key_set",'ENVELOPE_KEYS' in tok and 'keys.length !== ENVELOPE_KEYS.length' in tok)
for field in ["accountIdHash","snapshotId","snapshotDigest","payloadDigest","artifactDigest","pdfBlobId","pdfBlobRecordDigest","pdfDigest","pdfByteLength","surface","reportId","rendererId","requestedTier","deliveredTier","locale"]:
    check(f"token:binds:{field}",re.search(rf"\b{re.escape(field)}\b",tok) is not None)
envelope_match = re.search(
    r"export type P87CustomerReportExactPdfEnvelope = \{(?P<body>.*?)\n\};",
    tok,
    re.S,
)
check("token:envelope_type_found", envelope_match is not None)
envelope_body = envelope_match.group("body") if envelope_match else ""
check("token:no_payload_property", not re.search(r"^\s*payload\s*:", envelope_body, re.M))
check("token:no_pdf_bytes_property", not re.search(r"^\s*(?:pdfBytes|bytes)\s*:", envelope_body, re.M))
check("token:compact_limit",'MAX_TOKEN_BYTES = 16 * 1024' in tok)
check("token:envelope_limit",'MAX_ENVELOPE_BYTES = 8 * 1024' in tok)
check("token:ttl_limit",'MAX_TTL_SECONDS = 20 * 60' in tok)
check("token:current_key",'VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_CURRENT' in tok)
check("token:previous_key",'VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_PREVIOUS' in tok)
check("token:key_rotation_id",'VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_PREVIOUS_KEY_ID' in tok)
check("token:account_hash",'hashVelmereAccountBinding' in tok)
check("token:snapshot_exact_marker",'isPass4824ExactPdfAccountCustomerArtifactSnapshot' in tok)
check("token:snapshot_verifier",'verifyPass4822AccountCustomerArtifactSnapshot' in tok)
check("token:snapshot_owner",'verifyPass4822AccountCustomerArtifactOwner' in tok)
check("token:blob_verifier",'verifyPass4824AccountCustomerArtifactPdfBlob' in tok)
check("token:blob_snapshot_assertion",'assertPass4824PdfBlobMatchesSnapshot' in tok)
check("token:basic_rejected",'envelope.requestedTier !== "Basic"' in tok and 'envelope.deliveredTier !== "Basic"' in tok)
check("token:exact_surface_only",'envelope.surface === "shield" || envelope.surface === "real_markets"' in tok)
check("token:issue_after_validations",tok.index('const envelope: P87CustomerReportExactPdfEnvelope') > tok.index('assertPass4824PdfBlobMatchesSnapshot'))
check("token:verify_signature_before_account",tok.index('signatureValid') < tok.index('customer_report_exact_pdf_token_account_mismatch'))

# Render-once/store-first helper.
check("helper:uses_v2_token",'issueP87CustomerReportExactPdfToken' in helper)
check("helper:no_v1_token",'issuePass4818CustomerReportRenderToken' not in helper)
check("helper:render_once",'buildPass4818CustomerReportArtifact' in helper)
check("helper:exact_store",'storePass4824AccountCustomerArtifactPdfBundle' in helper)
check("helper:stores_rendered_bytes",'pdfBytes: preparedArtifact.rendered.bytes' in helper)
check("helper:store_before_token", helper.index('const stored = await storePass4824AccountCustomerArtifactPdfBundle') < helper.index('const pdfToken = issueP87CustomerReportExactPdfToken'))
check("helper:persistence_reverified",'real_markets_paid_artifact_persistence_mismatch' in helper)
check("helper:token_binding_reverified",'real_markets_paid_artifact_token_binding_mismatch' in helper)
check("helper:surface_bound",'real_markets_paid_artifact_surface_mismatch' in helper)
check("helper:paid_ready_required",'real_markets_paid_artifact_delivery_not_ready' in helper)

# Exact customer download path.
check("pdf_route:exact_token_import",'customer-report-exact-pdf-token' in pdf)
check("pdf_route:exact_dispatch",'isP87CustomerReportExactPdfToken(renderToken)' in pdf)
check("pdf_route:no_direct_renderer_import",'renderCustomerTierPdf' not in pdf)
exact_handler_match = re.search(
    r"export async function handleP87ExactPaidPdf\(.*?\n\}\n\nconst LEGACY_TOKEN_MAX_COMPRESSED_BYTES",
    pdf,
    re.S,
)
check("pdf_route:exact_handler_found", exact_handler_match is not None)
exact_handler = exact_handler_match.group(0) if exact_handler_match else ""
check("pdf_route:no_verified_artifact_bytes_in_exact_path", 'verified.artifact.bytes' not in exact_handler)
check("pdf_route:account_required",'account_session_required_for_exact_paid_artifact' in pdf)
check("pdf_route:production_like",'process.env.VERCEL_ENV === "production"' in pdf)
check("pdf_route:preview_identity_rejected",'productionLike() && isPreviewAccountIdentity(account)' in pdf)
check("pdf_route:owner_boundary",'resolveCustomerOwnedDataBoundary' in pdf)
check("pdf_route:owner_snapshot",'dependencies.getSnapshot' in pdf)
check("pdf_route:owner_blob",'dependencies.getPdfBlob' in pdf)
check("pdf_route:binding_assertion",'assertP87CustomerReportExactPdfBinding' in pdf)
check("pdf_route:paid_entitlement_recheck",'dependencies.resolvePaidAccess' in pdf and 'paid_entitlement_required' in pdf)
check("pdf_route:exact_delivery",'buildExactCustomerPdfDelivery' in pdf)
check("pdf_route:stored_blob_body",'pdfBytes: foundBlob.blob.pdfBytes' in pdf)
check("pdf_route:exact_storage_header",'"x-velmere-pdf-storage": "exact_immutable_blob"' in pdf)
check("pdf_route:byte_identity_header",'"x-velmere-preview-download-parity": "byte-identical-account-blob"' in pdf)
check("pdf_route:token_contract_header",'p87-customer-report-exact-pdf-token-v2' in pdf)
check("pdf_route:legacy_bounded_inflate",'maxOutputLength: LEGACY_TOKEN_MAX_ENVELOPE_BYTES' in pdf)
legacy_handler_match = re.search(
    r"async function handleLegacyBasicPdf\(.*?\n\}\n\nexport async function handleP87CustomerReportPdfPost",
    pdf,
    re.S,
)
check("pdf_route:legacy_handler_found", legacy_handler_match is not None)
legacy_handler = legacy_handler_match.group(0) if legacy_handler_match else ""
check("pdf_route:legacy_paid_prepeek", legacy_handler.index('legacyRequestedTier !== "Basic"') < legacy_handler.index('verifyPass4818CustomerReportRenderToken'))
check("pdf_route:legacy_paid_409",'customer_report_paid_exact_artifact_token_required' in pdf and '{ status: 409' in pdf)
check("pdf_route:legacy_basic_expected_tier",'expectedRequestedTier: "Basic"' in pdf)
check("pdf_route:legacy_basic_nonfinal",'dynamic_unstored_basic_not_final' in pdf)
check("pdf_route:legacy_basic_no_false_parity",'single-response-only-not-final' in pdf)
check("pdf_route:origin_guard",'assertSameOriginRequest' in pdf)
check("pdf_route:bounded_body",'readBoundedJsonBody<RequestBody>' in pdf)
check("pdf_route:rate_limit",'applyApiRateLimit' in pdf)

# Direct report route must persist exact paid bytes before token authority.
check("report_route:paid_helper_import",'createPass4823RealMarketsPaidAccountArtifact' in report)
check("report_route:no_direct_snapshot_builder",'buildPass4822AccountCustomerArtifactSnapshot' not in report)
check("report_route:no_direct_pdf_store",'storePass4824AccountCustomerArtifactPdfBundle' not in report)
check("report_route:no_prepared_v1_paid_artifact",'preparedCustomerReportArtifact' not in report)
check("report_route:basic_v1_only",'if (reportTier === "Basic")' in report and 'requestedTier: "Basic"' in report)
check("report_route:paid_account_required",'account_session_required_for_paid_artifact' in report)
check("report_route:explicit_tier_mismatch_block",'paid_tier_exact_artifact_delivery_mismatch' in report)
check("report_route:paid_helper_called",'const paidArtifact = await createPass4823RealMarketsPaidAccountArtifact' in report)
check("report_route:paid_token_from_stored_helper",'customerReportPdfToken = paidArtifact.pdfToken' in report)
check("report_route:account_artifact_from_stored_helper",'accountCustomerArtifact = paidArtifact.accountArtifact' in report)
check("report_route:no_silent_advanced_to_pro_artifact",'exact_paid_artifact_must_match_the_explicitly_accepted_tier' in report)

# Authority/history boundaries.
binding=json.loads(text(P86_BINDING))
check("authority:master_v2_bound",binding.get('status','').startswith('BOUND'))
check("authority:no_unseen_tail_invented",binding.get('captureBoundary',{}).get('unreceivedOrTruncatedTailInvented') is False)
check("authority:topology_unchanged",binding.get('authority',{}).get('changesCanonicalProductTopology') is False)
check("history:p87_active_current",text('VELMERE_ACTIVE_PASS.txt').strip()=='P87R1')
check("history:v17_present",(ROOT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt').is_file())

receipt={
 "schemaVersion":"velmere.p87.real-markets-exact-pdf-static.v1",
 "status":"PASS" if all(c['status']=='PASS' for c in CHECKS) else "FAIL",
 "checks":{"total":len(CHECKS),"passed":sum(c['status']=='PASS' for c in CHECKS),"failed":sum(c['status']=='FAIL' for c in CHECKS),"rows":CHECKS},
 "changedProductionFiles":[TOKEN,HELPER,PDF_ROUTE,REPORT_ROUTE],
 "sourceSha256":{p:sha(p) for p in [TOKEN,HELPER,PDF_ROUTE,REPORT_ROUTE]},
 "truthBoundary":"Static source-order and closed-contract proof only. It does not establish deployed HTTP, authorized database/JWT/RLS, current market truth, rights, Customer FINAL, sale eligibility, build or exact Windows.",
}
out=ROOT/'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_STATIC.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(receipt,indent=2)+"\n",encoding='utf-8')
print(json.dumps({"status":receipt['status'],"passed":receipt['checks']['passed'],"total":receipt['checks']['total']},indent=2))
