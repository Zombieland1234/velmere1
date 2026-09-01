import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A70R0_MULTIPART_UPLOAD_AND_PASSIVE_ATTACHMENT_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A69R0_STRUCTURED_DATA_DESERIALIZATION_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a70-multipart-upload-and-passive-attachment-trust-boundary.json");
const state = json("config/pass36/a70-current-state.json");
const receipt = json("config/pass36/a70-multipart-upload-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/multipart-upload-boundary.ts");
const route = read("app/api/contact/message/route.ts");

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active", active === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a70", current.multipartUploadTrustBoundaryRevisionId === REVISION && current.multipartUploadTrustBoundaryImplemented === true);
check("current:a69-retained", current.structuredDataDeserializationTrustBoundaryRevisionId === PARENT && current.structuredDataDeserializationTrustBoundaryImplemented === true);
check("policy:stream-limit", policy.requirements?.actualStreamByteLimitRetained === true);
check("policy:strict-fields", policy.requirements?.strictMultipartBoundary === true && policy.requirements?.unknownAndDuplicateFieldsRejected === true && policy.requirements?.singleAttachmentOnly === true);
check("policy:passive-files", policy.requirements?.passiveAttachmentTypesOnly === true && policy.requirements?.mimeExtensionAndContentAgreement === true && policy.requirements?.trailingPayloadRejected === true);
check("policy:structures", policy.requirements?.pdfActiveContentRejected === true && policy.requirements?.pngCrcAndChunkOrderValidated === true && policy.requirements?.imageDimensionBombRejected === true);
check("policy:idempotency-order", policy.requirements?.idempotencyNotConsumedByInvalidUpload === true);
check("boundary:id", boundary.includes('PASS36_A70_MULTIPART_UPLOAD_BOUNDARY_ID') && boundary.includes('velmere.pass36.a70.multipart-upload-boundary.v1'));
check("boundary:multipart", boundary.includes("contact_upload_boundary_invalid") && boundary.includes("MAX_FORM_ENTRIES"));
check("boundary:duplicates", boundary.includes("contact_upload_duplicate_field") && boundary.includes("contact_upload_unknown_field"));
check("boundary:pdf", boundary.includes("DANGEROUS_PDF_NAMES") && boundary.includes("pdf_no_active_names") && boundary.includes("%%EOF"));
check("boundary:png", boundary.includes("png_crc") && boundary.includes("ALLOWED_PNG_CRITICAL_CHUNKS") && boundary.includes("png_exact_iend"));
check("boundary:jpeg", boundary.includes("jpeg_segment_bounds") && boundary.includes("jpeg_no_trailing_payload"));
check("boundary:dimension", boundary.includes("MAX_IMAGE_PIXELS") && boundary.includes("contact_upload_attachment_dimensions_invalid"));
check("route:imports", route.includes("multipart-upload-boundary"));
check("route:content-type", route.includes("validateContactFormContentType"));
check("route:strict-form", route.includes("inspectStrictContactFormData"));
check("route:passive-attachment", route.includes("inspectPassiveContactAttachment"));
check("route:no-legacy-signature-only", !route.includes("validateContactAttachmentSignature"));
check("route:no-direct-get", !/\.get\(["'](?:name|email|subject|message|attachment)["']\)/u.test(route));
check("route:idempotency-after-validation", route.indexOf("registerPass4394ClientRequestMutation") > route.indexOf("inspectPassiveContactAttachment"));
check("route:safe-filename", route.includes("filename: fileInfo.safeFilename"));
check("route:private-digest-receipt", route.includes("attachmentSha256: fileInfo?.sha256"));
check("test:all-pass", receipt.total >= 40 && receipt.passed === receipt.total && receipt.failed === 0, receipt);
for (const id of [
  "duplicate_field_rejected",
  "unknown_field_rejected",
  "filename_bidi_rejected",
  "pdf_active_javascript_rejected",
  "pdf_trailing_payload_rejected",
  "png_crc_tamper_rejected",
  "png_dimension_bomb_rejected",
  "jpeg_trailing_payload_rejected",
  "idempotency_after_form_validation"
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a70"] === "node --experimental-strip-types scripts/pass36/test-a70-multipart-upload-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a70"] === "node scripts/pass36/verify-a70-multipart-upload-boundary.mjs");
check("package:metadata", pkg.velmereMultipartUploadTrustBoundaryPass === REVISION);
check("truth:no-malware-credit", state.malwareScannerExecuted === false && state.realResendAttachmentDelivered === false && state.productionContactFormExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a70.multipart-upload-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
