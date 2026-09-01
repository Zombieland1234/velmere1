#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  A98BoundaryError,
  buildA98EncryptedEnvelope,
  executeA98MutationLifecycle,
  openA98EncryptedEnvelope,
  parseA98StrictJson,
  sha256Text,
  validateA98DisposableEmail,
  validateA98KmsResponse,
  validateA98SecretSeparation,
  validateA98SignedStorageUrl,
  validateA98Url,
} from "./a98-email-storage-kms-boundary.mjs";

let assertions = 0;
const ok = (value, message) => { assertions += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
function expectCode(fn, code, message) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  ok(caught instanceof A98BoundaryError, `${message}: boundary error`);
  if (caught instanceof A98BoundaryError) equal(caught.code, code, `${message}: code`);
}
async function expectAsyncCode(fn, code, message) {
  let caught = null;
  try { await fn(); } catch (error) { caught = error; }
  ok(caught instanceof A98BoundaryError, `${message}: boundary error`);
  if (caught instanceof A98BoundaryError) equal(caught.code, code, `${message}: code`);
  return caught;
}

const supabaseOrigin = "https://tenant-a98.supabase.co";
const bucket = "velmere-a98-private";
const objectPath = "a98-disposable/11111111-1111-4111-8111-111111111111/object.vlmenc";

// URL and origin boundaries.
equal(validateA98Url("https://preview-a98.vercel.app/", { profile: "staging", requireOriginOnly: true }).origin, "https://preview-a98.vercel.app", "staging origin accepted");
equal(validateA98Url(`${supabaseOrigin}/`, { profile: "supabase", requireOriginOnly: true }).origin, supabaseOrigin, "Supabase origin accepted");
equal(validateA98Url("https://api.resend.com/", { profile: "resend", requireOriginOnly: true }).origin, "https://api.resend.com", "Resend origin accepted");
expectCode(() => validateA98Url("http://preview-a98.vercel.app/", { profile: "staging", requireOriginOnly: true }), "a98_https_required", "HTTP rejected");
expectCode(() => validateA98Url("https://user:pass@preview-a98.vercel.app/", { profile: "staging", requireOriginOnly: true }), "a98_url_credentials_forbidden", "credentials rejected");
expectCode(() => validateA98Url("https://preview-a98.vercel.app/?x=1", { profile: "staging", requireOriginOnly: true }), "a98_origin_only_required", "query rejected on origin");
expectCode(() => validateA98Url("https://preview-a98.vercel.app/#x", { profile: "staging", requireOriginOnly: true }), "a98_url_fragment_forbidden", "fragment rejected");
expectCode(() => validateA98Url("https://127.0.0.1/", { profile: "staging" }), "a98_private_host_forbidden", "private IPv4 rejected");
expectCode(() => validateA98Url("https://[::1]/", { profile: "staging" }), "a98_private_host_forbidden", "private IPv6 rejected");
expectCode(() => validateA98Url("https://production-a98.example/", { profile: "staging", requireOriginOnly: true }), "a98_production_like_host", "production-like host rejected");
expectCode(() => validateA98Url("https://example.com/", { profile: "resend", requireOriginOnly: true }), "a98_resend_host_required", "non-Resend host rejected");
expectCode(() => validateA98Url("https://tenant-a98.supabase.co.evil.test/", { profile: "supabase", requireOriginOnly: true }), "a98_supabase_host_required", "Supabase suffix confusion rejected");

// Signed URL must remain exact same-origin and exact-object.
const signed = `${supabaseOrigin}/storage/v1/object/sign/${bucket}/${objectPath}?token=${"A".repeat(32)}`;
equal(validateA98SignedStorageUrl(signed, { supabaseOrigin, bucket, objectPath }).origin, supabaseOrigin, "signed URL accepted");
expectCode(() => validateA98SignedStorageUrl(`https://evil.test/storage/v1/object/sign/${bucket}/${objectPath}?token=${"A".repeat(32)}`, { supabaseOrigin, bucket, objectPath }), "a98_origin_mismatch", "signed URL SSRF rejected");
expectCode(() => validateA98SignedStorageUrl(`${supabaseOrigin}/storage/v1/object/sign/${bucket}/other?token=${"A".repeat(32)}`, { supabaseOrigin, bucket, objectPath }), "a98_signed_url_path_mismatch", "signed URL object substitution rejected");
expectCode(() => validateA98SignedStorageUrl(`${signed}&token=${"B".repeat(32)}`, { supabaseOrigin, bucket, objectPath }), "a98_signed_url_query_invalid", "duplicate signed token rejected");
expectCode(() => validateA98SignedStorageUrl(`${signed}&redirect=https://evil.test`, { supabaseOrigin, bucket, objectPath }), "a98_signed_url_query_invalid", "unknown signed query rejected");

// Strict JSON semantics.
const parsed = parseA98StrictJson(Buffer.from('{"ok":true,"nested":{"value":1}}'), { requireObject: true });
equal(parsed.nested.value, 1, "strict JSON parses valid object");
expectCode(() => parseA98StrictJson(Buffer.from('{"x":1,"x":2}'), { requireObject: true }), "a98_json_duplicate_key", "duplicate JSON key rejected");
expectCode(() => parseA98StrictJson(Buffer.from('{"__proto__":{"polluted":true}}'), { requireObject: true }), "a98_json_forbidden_key", "dangerous JSON key rejected");
expectCode(() => parseA98StrictJson(Uint8Array.from([0xc3, 0x28]), { requireObject: true }), "a98_json_invalid_utf8", "invalid UTF-8 rejected");
expectCode(() => parseA98StrictJson(Buffer.from('[1,2,3]'), { requireObject: true }), "a98_json_object_required", "object shape enforced");

// KMS request/response and AES-GCM AAD context binding.
const contextDigest = sha256Text("a98-context");
const wrapRequestId = "kms_wrap_a98_0001";
const wrapped = {
  algorithm: "kms-aes256-wrap-v1",
  contextDigest,
  keyId: "kms-key-a98-01",
  requestId: wrapRequestId,
  wrappedKeyBase64: Buffer.from("wrapped-key-material-a98").toString("base64"),
};
equal(validateA98KmsResponse(wrapped, { operation: "wrap", requestId: wrapRequestId, contextDigest }).keyId, "kms-key-a98-01", "KMS wrap response accepted");
expectCode(() => validateA98KmsResponse({ ...wrapped, contextDigest: sha256Text("other") }, { operation: "wrap", requestId: wrapRequestId, contextDigest }), "a98_kms_context_binding_mismatch", "KMS context mismatch rejected");
expectCode(() => validateA98KmsResponse({ ...wrapped, extra: true }, { operation: "wrap", requestId: wrapRequestId, contextDigest }), "a98_kms_response_fields_invalid", "KMS extra field rejected");

const dataKey = crypto.randomBytes(32);
const plaintext = Buffer.from("A98 encrypted storage payload", "utf8");
const envelope = buildA98EncryptedEnvelope({ plaintext, dataKey, wrapped, contextDigest });
const opened = openA98EncryptedEnvelope({ envelopeBytes: envelope, dataKey, expectedContextDigest: contextDigest, expectedKeyId: wrapped.keyId });
equal(opened.toString("utf8"), plaintext.toString("utf8"), "AES-GCM envelope round trip");
expectCode(() => openA98EncryptedEnvelope({ envelopeBytes: envelope, dataKey, expectedContextDigest: sha256Text("wrong-context"), expectedKeyId: wrapped.keyId }), "a98_envelope_context_mismatch", "envelope context substitution rejected");
const tampered = Buffer.from(envelope);
const tamperedJson = JSON.parse(tampered.toString("utf8"));
const cipherBytes = Buffer.from(tamperedJson.ciphertextBase64, "base64");
cipherBytes[0] ^= 1;
tamperedJson.ciphertextBase64 = cipherBytes.toString("base64");
expectCode(() => openA98EncryptedEnvelope({ envelopeBytes: Buffer.from(JSON.stringify(tamperedJson)), dataKey, expectedContextDigest: contextDigest, expectedKeyId: wrapped.keyId }), "a98_envelope_authentication_failed", "ciphertext tamper rejected");

const unwrap = {
  algorithm: "kms-aes256-wrap-v1",
  contextDigest,
  keyId: wrapped.keyId,
  plaintextKeyBase64: dataKey.toString("base64"),
  requestId: "kms_unwrap_a98_0001",
};
equal(validateA98KmsResponse(unwrap, { operation: "unwrap", requestId: unwrap.requestId, contextDigest, expectedKeyId: wrapped.keyId }).keyId, wrapped.keyId, "KMS unwrap exact binding accepted");
expectCode(() => validateA98KmsResponse({ ...unwrap, keyId: "other-key" }, { operation: "unwrap", requestId: unwrap.requestId, contextDigest, expectedKeyId: wrapped.keyId }), "a98_kms_key_binding_mismatch", "KMS key substitution rejected");

// Disposable recipient and secret separation.
const recipient = "a98-disposable@example.invalid";
const emailReceipt = validateA98DisposableEmail({ address: recipient, expectedSha256: sha256Text(recipient), forbiddenDomains: ["gmail.com", "outlook.com"] });
equal(emailReceipt.addressSha256, sha256Text(recipient), "exact disposable recipient binding");
expectCode(() => validateA98DisposableEmail({ address: "person@gmail.com", expectedSha256: sha256Text("person@gmail.com"), forbiddenDomains: ["gmail.com"] }), "a98_email_domain_forbidden", "consumer mailbox rejected");
expectCode(() => validateA98DisposableEmail({ address: recipient, expectedSha256: sha256Text("other@example.invalid") }), "a98_email_identity_mismatch", "recipient substitution rejected");
const secretRows = validateA98SecretSeparation({
  supabaseService: "S".repeat(40),
  kmsWrap: "W".repeat(40),
  kmsUnwrap: "U".repeat(40),
  resend: "R".repeat(40),
});
equal(secretRows.length, 4, "four distinct secrets accepted");
expectCode(() => validateA98SecretSeparation({ a: "X".repeat(40), b: "X".repeat(40), c: "C".repeat(40), d: "D".repeat(40) }), "a98_secret_reuse", "secret reuse rejected");

// Mutation lifecycle: cleanup is mandatory after upload on success and failure.
{
  const zero = crypto.randomBytes(32);
  let cleanupCalls = 0;
  const result = await executeA98MutationLifecycle({
    upload: async () => ({ uploaded: true }),
    sendEmail: async () => ({ delivered: true }),
    cleanup: async () => { cleanupCalls += 1; return cleanupCalls === 2; },
    zeroize: [zero],
  });
  ok(result.mutationStarted, "successful lifecycle starts mutation");
  ok(result.cleanupAttempted && result.cleanupSucceeded, "successful lifecycle confirms cleanup");
  equal(cleanupCalls, 2, "cleanup retries until confirmation");
  ok(zero.every((value) => value === 0), "data key zeroized after success");
}
{
  const zero = crypto.randomBytes(32);
  let cleanupCalls = 0;
  const caught = await expectAsyncCode(() => executeA98MutationLifecycle({
    upload: async () => ({ uploaded: true }),
    sendEmail: async () => { throw new Error("provider_email_failure"); },
    cleanup: async () => { cleanupCalls += 1; return true; },
    zeroize: [zero],
  }), "a98_lifecycle_failed", "email failure lifecycle");
  equal(cleanupCalls, 1, "email failure still cleans storage");
  ok(caught?.receipt?.cleanupSucceeded === true, "failure receipt confirms cleanup");
  ok(zero.every((value) => value === 0), "data key zeroized after failure");
}
{
  let cleanupCalls = 0;
  const caught = await expectAsyncCode(() => executeA98MutationLifecycle({
    upload: async () => ({ uploaded: true }),
    sendEmail: async () => ({ delivered: true }),
    cleanup: async () => { cleanupCalls += 1; return false; },
  }), "a98_cleanup_not_confirmed", "unconfirmed cleanup");
  equal(cleanupCalls, 3, "cleanup uses bounded three attempts");
  ok(caught?.receipt?.cleanupSucceeded === false, "cleanup failure remains explicit");
}
{
  let cleanupCalls = 0;
  const caught = await expectAsyncCode(() => executeA98MutationLifecycle({
    upload: async () => { throw new Error("upload_rejected"); },
    sendEmail: async () => ({ delivered: true }),
    cleanup: async () => { cleanupCalls += 1; return true; },
  }), "a98_lifecycle_failed", "pre-mutation upload failure");
  equal(cleanupCalls, 0, "upload failure performs no false cleanup mutation");
  ok(caught?.receipt?.mutationStarted === false, "upload failure remains pre-mutation");
}

console.log(JSON.stringify({
  status: "PASS_A98_EMAIL_STORAGE_KMS_BOUNDARY_LOCAL_ONLY",
  assertions,
  signedUrlExternalOriginCalls: 0,
  realStorageMutations: 0,
  realKmsCalls: 0,
  realEmails: 0,
  stagingCredit: false,
  saleEnabled: false,
}, null, 2));
