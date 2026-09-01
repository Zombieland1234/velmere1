import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFile } from "node:fs/promises";
import {
  PASS36_A70_MULTIPART_UPLOAD_BOUNDARY_ID,
  ContactUploadBoundaryError,
  inspectPassiveContactAttachment,
  inspectStrictContactFormData,
  normalizeContactAttachmentFilename,
  validateContactFormContentType,
} from "../../lib/security/multipart-upload-boundary.ts";

const REVISION = "VELMERE_PASS36_A70R0_MULTIPART_UPLOAD_AND_PASSIVE_ATTACHMENT_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectCode = (id, fn, code) => {
  try {
    fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    check(id, error instanceof ContactUploadBoundaryError && error.code === code, error instanceof Error ? error.message : String(error));
  }
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function u32(value) {
  return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}
function concat(...parts) {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.byteLength; }
  return out;
}
function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  return concat(u32(data.byteLength), typeBytes, data, u32(crc32(concat(typeBytes, data))));
}
function validPng(width = 2, height = 2) {
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return concat(
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", Uint8Array.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01])),
    pngChunk("IEND", new Uint8Array(0)),
  );
}
function validJpeg(width = 2, height = 2) {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, (height >>> 8) & 0xff, height & 0xff, (width >>> 8) & 0xff, width & 0xff, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x00,
    0xff, 0xd9,
  ]);
}
const validPdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");

check("boundary_id_exact", PASS36_A70_MULTIPART_UPLOAD_BOUNDARY_ID === "velmere.pass36.a70.multipart-upload-boundary.v1");
check("multipart_boundary_unquoted", validateContactFormContentType("multipart/form-data; boundary=AaB03x").boundary === "AaB03x");
check("multipart_boundary_quoted", validateContactFormContentType('multipart/form-data; boundary="AaB03x"').boundary === "AaB03x");
check("urlencoded_allowed", validateContactFormContentType("application/x-www-form-urlencoded").boundary === null);
expectCode("missing_boundary_rejected", () => validateContactFormContentType("multipart/form-data"), "contact_upload_boundary_invalid");
expectCode("oversized_boundary_rejected", () => validateContactFormContentType(`multipart/form-data; boundary=${"a".repeat(71)}`), "contact_upload_boundary_invalid");
expectCode("content_type_crlf_rejected", () => validateContactFormContentType("multipart/form-data; boundary=x\r\nX: y"), "contact_upload_content_type_invalid");
expectCode("json_content_type_rejected", () => validateContactFormContentType("application/json"), "contact_upload_content_type_invalid");

const cleanForm = new FormData();
cleanForm.set("name", "Maro");
cleanForm.set("email", "m@example.com");
cleanForm.set("subject", "Question");
cleanForm.set("message", "Hello");
const clean = inspectStrictContactFormData(cleanForm);
check("clean_form_fields", clean.fields.name === "Maro" && clean.fields.message === "Hello" && clean.attachment === null);
const duplicate = new FormData(); duplicate.append("message", "a"); duplicate.append("message", "b");
expectCode("duplicate_field_rejected", () => inspectStrictContactFormData(duplicate), "contact_upload_duplicate_field");
const unknown = new FormData(); unknown.set("message", "a"); unknown.set("admin", "true");
expectCode("unknown_field_rejected", () => inspectStrictContactFormData(unknown), "contact_upload_unknown_field");
const fileInText = new FormData(); fileInText.set("message", new File(["x"], "x.txt", { type: "text/plain" }));
expectCode("file_in_text_field_rejected", () => inspectStrictContactFormData(fileInText), "contact_upload_text_field_type_invalid");
const textAttachment = new FormData(); textAttachment.set("message", "a"); textAttachment.set("attachment", "not-a-file");
expectCode("string_attachment_rejected", () => inspectStrictContactFormData(textAttachment), "contact_upload_attachment_type_invalid");
const control = new FormData(); control.set("subject", "bad\u0000subject");
expectCode("field_control_rejected", () => inspectStrictContactFormData(control), "contact_upload_text_field_control_character");
const oversizedText = new FormData(); oversizedText.set("message", "x".repeat(24_001));
expectCode("oversized_text_rejected", () => inspectStrictContactFormData(oversizedText), "contact_upload_text_field_too_large");

check("filename_path_stripped", normalizeContactAttachmentFilename("C:\\fakepath\\proof.pdf") === "proof.pdf");
expectCode("filename_bidi_rejected", () => normalizeContactAttachmentFilename("proof\u202Efdp.exe"), "contact_upload_attachment_name_invalid");
expectCode("filename_no_extension_rejected", () => normalizeContactAttachmentFilename("proof"), "contact_upload_attachment_name_invalid");

const pdf = inspectPassiveContactAttachment({ bytes: validPdf, declaredContentType: "application/pdf", filename: "proof.pdf", maxBytes: 1024 });
check("passive_pdf_accepted", pdf.kind === "pdf" && pdf.structuralChecks.includes("pdf_no_active_names") && /^[a-f0-9]{64}$/u.test(pdf.sha256));
expectCode("pdf_active_javascript_rejected", () => inspectPassiveContactAttachment({ bytes: new TextEncoder().encode("%PDF-1.4\n<< /Java#53cript 1 >>\n%%EOF\n"), declaredContentType: "application/pdf", filename: "proof.pdf", maxBytes: 1024 }), "contact_upload_attachment_active_content");
expectCode("pdf_open_action_rejected", () => inspectPassiveContactAttachment({ bytes: new TextEncoder().encode("%PDF-1.4\n<< /OpenAction 1 >>\n%%EOF\n"), declaredContentType: "application/pdf", filename: "proof.pdf", maxBytes: 1024 }), "contact_upload_attachment_active_content");
expectCode("pdf_missing_eof_rejected", () => inspectPassiveContactAttachment({ bytes: new TextEncoder().encode("%PDF-1.4\n1 0 obj\nendobj\n"), declaredContentType: "application/pdf", filename: "proof.pdf", maxBytes: 1024 }), "contact_upload_attachment_structure_invalid");
expectCode("pdf_trailing_payload_rejected", () => inspectPassiveContactAttachment({ bytes: new TextEncoder().encode("%PDF-1.4\n%%EOF\n<script>"), declaredContentType: "application/pdf", filename: "proof.pdf", maxBytes: 1024 }), "contact_upload_attachment_structure_invalid");
expectCode("pdf_extension_mismatch_rejected", () => inspectPassiveContactAttachment({ bytes: validPdf, declaredContentType: "application/pdf", filename: "proof.png", maxBytes: 1024 }), "contact_upload_attachment_media_mismatch");

const png = validPng();
const pngResult = inspectPassiveContactAttachment({ bytes: png, declaredContentType: "image/png", filename: "proof.png", maxBytes: 4096 });
check("structured_png_accepted", pngResult.kind === "png" && pngResult.width === 2 && pngResult.height === 2 && pngResult.structuralChecks.includes("png_crc"));
const corruptPng = png.slice(); corruptPng[corruptPng.length - 5] ^= 1;
expectCode("png_crc_tamper_rejected", () => inspectPassiveContactAttachment({ bytes: corruptPng, declaredContentType: "image/png", filename: "proof.png", maxBytes: 4096 }), "contact_upload_attachment_structure_invalid");
expectCode("png_trailing_payload_rejected", () => inspectPassiveContactAttachment({ bytes: concat(png, Uint8Array.from([1, 2, 3])), declaredContentType: "image/png", filename: "proof.png", maxBytes: 4096 }), "contact_upload_attachment_structure_invalid");
expectCode("png_dimension_bomb_rejected", () => inspectPassiveContactAttachment({ bytes: validPng(12_001, 1), declaredContentType: "image/png", filename: "proof.png", maxBytes: 4096 }), "contact_upload_attachment_dimensions_invalid");

const jpeg = validJpeg();
const jpegResult = inspectPassiveContactAttachment({ bytes: jpeg, declaredContentType: "image/jpeg", filename: "proof.jpg", maxBytes: 4096 });
check("structured_jpeg_accepted", jpegResult.kind === "jpeg" && jpegResult.width === 2 && jpegResult.height === 2 && jpegResult.structuralChecks.includes("jpeg_no_trailing_payload"));
expectCode("jpeg_trailing_payload_rejected", () => inspectPassiveContactAttachment({ bytes: concat(jpeg, Uint8Array.from([1])), declaredContentType: "image/jpeg", filename: "proof.jpg", maxBytes: 4096 }), "contact_upload_attachment_structure_invalid");
expectCode("jpeg_dimension_bomb_rejected", () => inspectPassiveContactAttachment({ bytes: validJpeg(12_001, 1), declaredContentType: "image/jpeg", filename: "proof.jpg", maxBytes: 4096 }), "contact_upload_attachment_dimensions_invalid");
expectCode("attachment_size_limit_rejected", () => inspectPassiveContactAttachment({ bytes: png, declaredContentType: "image/png", filename: "proof.png", maxBytes: 8 }), "contact_upload_attachment_too_large");

const route = await readFile("app/api/contact/message/route.ts", "utf8");
check("route_imports_upload_boundary", route.includes("multipart-upload-boundary"));
check("route_validates_content_type", route.includes("validateContactFormContentType"));
check("route_validates_form_entries", route.includes("inspectStrictContactFormData"));
check("route_validates_passive_bytes", route.includes("inspectPassiveContactAttachment"));
check("route_no_legacy_signature_only", !route.includes("validateContactAttachmentSignature"));
check("route_no_direct_form_get", !/\.get\(["'](?:name|email|subject|message|attachment)["']\)/u.test(route));
check("idempotency_after_form_validation", route.indexOf("registerPass4394ClientRequestMutation") > route.indexOf("inspectPassiveContactAttachment"));
check("provider_uses_safe_filename", route.includes("filename: fileInfo.safeFilename"));
check("receipt_uses_content_digest", route.includes("attachmentSha256: fileInfo?.sha256"));
check("response_does_not_expose_digest", !/file:\s*fileInfo[^\n]*sha256/u.test(route));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a70.multipart-upload-boundary-test.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
