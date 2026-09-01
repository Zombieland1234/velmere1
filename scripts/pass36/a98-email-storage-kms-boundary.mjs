#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

export const A98_BOUNDARY_ID = "velmere.pass36.a98.email-storage-kms-boundary.v1";
const HEX64 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class A98BoundaryError extends Error {
  constructor(code, detail = null) {
    super(detail == null ? code : `${code}:${String(detail)}`);
    this.name = "A98BoundaryError";
    this.code = code;
    this.detail = detail;
  }
}

export const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const sha256Text = (value) => sha256Bytes(Buffer.from(String(value), "utf8"));

function hasControlOrBidi(value) {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (
      point <= 0x1f
      || (point >= 0x7f && point <= 0x9f)
      || (point >= 0x202a && point <= 0x202e)
      || (point >= 0x2066 && point <= 0x2069)
    ) return true;
  }
  return false;
}

function assertNoControl(value, code = "a98_control_or_bidi_rejected") {
  if (hasControlOrBidi(value)) throw new A98BoundaryError(code);
}

function isPrivateIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}
function isPrivateIpv6(address) {
  const value = address.toLowerCase().split("%", 1)[0];
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/u.test(value) || value.startsWith("ff");
}
function isPrivateLiteral(hostname) {
  const normalized = hostname.replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
  const family = net.isIP(normalized);
  return family === 4 ? isPrivateIpv4(normalized) : family === 6 ? isPrivateIpv6(normalized) : false;
}
function isLoopbackLiteral(hostname) {
  const normalized = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function validateA98Url(raw, {
  profile,
  fixtureMode = false,
  trustedOrigin = null,
  allowedPaths = null,
  requireOriginOnly = false,
} = {}) {
  if (typeof raw !== "string" || raw.length < 1 || raw.length > 2048) throw new A98BoundaryError("a98_url_invalid");
  assertNoControl(raw, "a98_url_control_or_bidi");
  let url;
  try { url = new URL(raw); } catch { throw new A98BoundaryError("a98_url_invalid"); }
  if (url.username || url.password) throw new A98BoundaryError("a98_url_credentials_forbidden");
  if (url.hash) throw new A98BoundaryError("a98_url_fragment_forbidden");
  const loopback = isLoopbackLiteral(url.hostname);
  if (fixtureMode && loopback) {
    if (!/^https?:$/u.test(url.protocol)) throw new A98BoundaryError("a98_fixture_protocol_invalid");
  } else {
    if (url.protocol !== "https:") throw new A98BoundaryError("a98_https_required");
    if (url.port) throw new A98BoundaryError("a98_explicit_port_forbidden");
    if (loopback || isPrivateLiteral(url.hostname)) throw new A98BoundaryError("a98_private_host_forbidden");
  }
  if (requireOriginOnly && (url.pathname !== "/" || url.search)) throw new A98BoundaryError("a98_origin_only_required");
  if (trustedOrigin) {
    let trusted;
    try { trusted = new URL(trustedOrigin); } catch { throw new A98BoundaryError("a98_trusted_origin_invalid"); }
    if (url.origin !== trusted.origin) throw new A98BoundaryError("a98_origin_mismatch");
  }
  if (Array.isArray(allowedPaths) && !allowedPaths.includes(url.pathname)) throw new A98BoundaryError("a98_path_not_allowed", url.pathname);
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (profile === "supabase" && !(fixtureMode && loopback) && !host.endsWith(".supabase.co")) throw new A98BoundaryError("a98_supabase_host_required");
  if (profile === "resend" && !(fixtureMode && loopback) && host !== "api.resend.com") throw new A98BoundaryError("a98_resend_host_required");
  if (profile === "staging" && !(fixtureMode && loopback)) {
    if (["prod", "production", "live", "www"].some((token) => host.includes(token))) throw new A98BoundaryError("a98_production_like_host");
    if (!["staging", "preview", "vercel.app", "pages.dev", "netlify.app"].some((token) => host.includes(token))) throw new A98BoundaryError("a98_staging_hint_missing");
  }
  return url;
}

export function validateA98SignedStorageUrl(raw, { supabaseOrigin, bucket, objectPath, fixtureMode = false } = {}) {
  if (!bucket || !objectPath) throw new A98BoundaryError("a98_signed_url_subject_missing");
  const expectedPrefix = `/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const url = validateA98Url(raw, { profile: "supabase", fixtureMode, trustedOrigin: supabaseOrigin });
  if (url.pathname !== expectedPrefix) throw new A98BoundaryError("a98_signed_url_path_mismatch");
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 1 || keys[0] !== "token" || url.searchParams.getAll("token").length !== 1) throw new A98BoundaryError("a98_signed_url_query_invalid");
  const token = url.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9._~-]{16,1024}$/u.test(token)) throw new A98BoundaryError("a98_signed_url_token_invalid");
  return url;
}

function scanJsonString(raw, state) {
  const start = state.index;
  if (raw[state.index] !== '"') throw new A98BoundaryError("a98_json_invalid");
  state.index += 1;
  while (state.index < raw.length) {
    const char = raw[state.index];
    if (char === "\\") { state.index += 2; continue; }
    state.index += 1;
    if (char === '"') {
      try { return JSON.parse(raw.slice(start, state.index)); } catch { throw new A98BoundaryError("a98_json_invalid"); }
    }
  }
  throw new A98BoundaryError("a98_json_invalid");
}
function skipWs(raw, state) { while (state.index < raw.length && /\s/u.test(raw[state.index])) state.index += 1; }
function countNode(state) { state.nodes += 1; if (state.nodes > state.maxNodes) throw new A98BoundaryError("a98_json_nodes_exceeded"); }
function scanJsonValue(raw, state, depth) {
  if (depth > state.maxDepth) throw new A98BoundaryError("a98_json_depth_exceeded");
  countNode(state); skipWs(raw, state);
  const char = raw[state.index];
  if (char === "{") return scanJsonObject(raw, state, depth);
  if (char === "[") return scanJsonArray(raw, state, depth);
  if (char === '"') { scanJsonString(raw, state); return; }
  const start = state.index;
  while (state.index < raw.length && !/[\s,}\]]/u.test(raw[state.index])) state.index += 1;
  if (state.index === start) throw new A98BoundaryError("a98_json_invalid");
}
function scanJsonObject(raw, state, depth) {
  state.index += 1; skipWs(raw, state); const keys = new Set();
  if (raw[state.index] === "}") { state.index += 1; return; }
  while (state.index < raw.length) {
    skipWs(raw, state); const key = scanJsonString(raw, state);
    if (keys.has(key)) throw new A98BoundaryError("a98_json_duplicate_key", String(key).slice(0, 128));
    if (FORBIDDEN_JSON_KEYS.has(key)) throw new A98BoundaryError("a98_json_forbidden_key", key);
    keys.add(key); skipWs(raw, state);
    if (raw[state.index] !== ":") throw new A98BoundaryError("a98_json_invalid");
    state.index += 1; scanJsonValue(raw, state, depth + 1); skipWs(raw, state);
    if (raw[state.index] === ",") { state.index += 1; continue; }
    if (raw[state.index] === "}") { state.index += 1; return; }
    throw new A98BoundaryError("a98_json_invalid");
  }
  throw new A98BoundaryError("a98_json_invalid");
}
function scanJsonArray(raw, state, depth) {
  state.index += 1; skipWs(raw, state);
  if (raw[state.index] === "]") { state.index += 1; return; }
  while (state.index < raw.length) {
    scanJsonValue(raw, state, depth + 1); skipWs(raw, state);
    if (raw[state.index] === ",") { state.index += 1; continue; }
    if (raw[state.index] === "]") { state.index += 1; return; }
    throw new A98BoundaryError("a98_json_invalid");
  }
  throw new A98BoundaryError("a98_json_invalid");
}
export function parseA98StrictJson(bytes, { maxBytes = 1024 * 1024, maxDepth = 24, maxNodes = 10000, requireObject = false } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes) throw new A98BoundaryError("a98_json_size_invalid");
  let raw;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new A98BoundaryError("a98_json_invalid_utf8"); }
  const state = { index: 0, nodes: 0, maxDepth, maxNodes };
  skipWs(raw, state); scanJsonValue(raw, state, 0); skipWs(raw, state);
  if (state.index !== raw.length) throw new A98BoundaryError("a98_json_invalid");
  let value; try { value = JSON.parse(raw); } catch { throw new A98BoundaryError("a98_json_invalid"); }
  if (requireObject && (!value || typeof value !== "object" || Array.isArray(value))) throw new A98BoundaryError("a98_json_object_required");
  return value;
}

function decodeCanonicalBase64(value, expectedBytes = null, maxBytes = 2 * 1024 * 1024) {
  if (typeof value !== "string" || value.length < 4 || value.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) throw new A98BoundaryError("a98_base64_invalid");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new A98BoundaryError("a98_base64_noncanonical");
  if (expectedBytes != null && bytes.byteLength !== expectedBytes) throw new A98BoundaryError("a98_base64_length_invalid");
  if (bytes.byteLength > maxBytes) throw new A98BoundaryError("a98_base64_too_large");
  return bytes;
}

export function validateA98KmsResponse(value, { operation, requestId, contextDigest, expectedKeyId = null } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new A98BoundaryError("a98_kms_response_invalid");
  const allowed = operation === "wrap"
    ? ["algorithm", "contextDigest", "keyId", "requestId", "wrappedKeyBase64"]
    : ["algorithm", "contextDigest", "keyId", "plaintextKeyBase64", "requestId"];
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(allowed.sort())) throw new A98BoundaryError("a98_kms_response_fields_invalid");
  if (!SAFE_ID.test(String(value.requestId ?? "")) || value.requestId !== requestId) throw new A98BoundaryError("a98_kms_request_binding_mismatch");
  if (!HEX64.test(String(value.contextDigest ?? "")) || value.contextDigest !== contextDigest) throw new A98BoundaryError("a98_kms_context_binding_mismatch");
  if (!SAFE_ID.test(String(value.keyId ?? "")) || (expectedKeyId && value.keyId !== expectedKeyId)) throw new A98BoundaryError("a98_kms_key_binding_mismatch");
  if (!SAFE_ID.test(String(value.algorithm ?? ""))) throw new A98BoundaryError("a98_kms_algorithm_invalid");
  if (operation === "wrap") decodeCanonicalBase64(value.wrappedKeyBase64, null, 64 * 1024);
  else decodeCanonicalBase64(value.plaintextKeyBase64, 32, 32);
  return value;
}

export function buildA98EncryptedEnvelope({ plaintext, dataKey, wrapped, contextDigest }) {
  if (!(plaintext instanceof Uint8Array) || plaintext.byteLength < 1 || plaintext.byteLength > 1024 * 1024) throw new A98BoundaryError("a98_plaintext_invalid");
  if (!(dataKey instanceof Uint8Array) || dataKey.byteLength !== 32) throw new A98BoundaryError("a98_data_key_invalid");
  if (!HEX64.test(contextDigest)) throw new A98BoundaryError("a98_context_digest_invalid");
  validateA98KmsResponse(wrapped, { operation: "wrap", requestId: wrapped.requestId, contextDigest });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(dataKey), iv);
  cipher.setAAD(Buffer.from(contextDigest, "ascii"));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    schemaVersion: "velmere.a98.encrypted-object.v1",
    algorithm: "aes-256-gcm",
    kmsAlgorithm: wrapped.algorithm,
    keyId: wrapped.keyId,
    wrappedKeyBase64: wrapped.wrappedKeyBase64,
    contextDigest,
    ivBase64: iv.toString("base64"),
    tagBase64: tag.toString("base64"),
    ciphertextBase64: ciphertext.toString("base64"),
  }), "utf8");
}

export function openA98EncryptedEnvelope({ envelopeBytes, dataKey, expectedContextDigest, expectedKeyId }) {
  const envelope = parseA98StrictJson(envelopeBytes, { maxBytes: 2 * 1024 * 1024, requireObject: true });
  const allowed = ["algorithm", "ciphertextBase64", "contextDigest", "ivBase64", "keyId", "kmsAlgorithm", "schemaVersion", "tagBase64", "wrappedKeyBase64"];
  if (JSON.stringify(Object.keys(envelope).sort()) !== JSON.stringify(allowed.sort())) throw new A98BoundaryError("a98_envelope_fields_invalid");
  if (envelope.schemaVersion !== "velmere.a98.encrypted-object.v1" || envelope.algorithm !== "aes-256-gcm") throw new A98BoundaryError("a98_envelope_schema_invalid");
  if (envelope.contextDigest !== expectedContextDigest) throw new A98BoundaryError("a98_envelope_context_mismatch");
  if (envelope.keyId !== expectedKeyId) throw new A98BoundaryError("a98_envelope_key_mismatch");
  if (!(dataKey instanceof Uint8Array) || dataKey.byteLength !== 32) throw new A98BoundaryError("a98_data_key_invalid");
  const iv = decodeCanonicalBase64(envelope.ivBase64, 12, 12);
  const tag = decodeCanonicalBase64(envelope.tagBase64, 16, 16);
  const ciphertext = decodeCanonicalBase64(envelope.ciphertextBase64, null, 1024 * 1024 + 32);
  decodeCanonicalBase64(envelope.wrappedKeyBase64, null, 64 * 1024);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(dataKey), iv);
  decipher.setAAD(Buffer.from(expectedContextDigest, "ascii"));
  decipher.setAuthTag(tag);
  try { return Buffer.concat([decipher.update(ciphertext), decipher.final()]); }
  catch { throw new A98BoundaryError("a98_envelope_authentication_failed"); }
}

export function validateA98DisposableEmail({ address, expectedSha256, forbiddenDomains = [] } = {}) {
  if (typeof address !== "string" || address.length > 254 || hasControlOrBidi(address)) throw new A98BoundaryError("a98_email_invalid");
  if (!/^[^\s@<>]+@[^\s@<>]+$/u.test(address)) throw new A98BoundaryError("a98_email_invalid");
  const domain = address.split("@").at(-1).toLowerCase();
  if (forbiddenDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) throw new A98BoundaryError("a98_email_domain_forbidden");
  if (!HEX64.test(expectedSha256 ?? "") || sha256Text(address) !== expectedSha256) throw new A98BoundaryError("a98_email_identity_mismatch");
  return { addressSha256: expectedSha256, domainSha256: sha256Text(domain) };
}

export function validateA98SecretSeparation(namedSecrets) {
  const rows = Object.entries(namedSecrets ?? {});
  if (rows.length < 4) throw new A98BoundaryError("a98_secret_denominator_incomplete");
  const seen = new Map();
  for (const [name, value] of rows) {
    if (typeof value !== "string" || value.length < 32 || hasControlOrBidi(value)) throw new A98BoundaryError("a98_secret_invalid", name);
    const digest = sha256Text(value);
    if (seen.has(digest)) throw new A98BoundaryError("a98_secret_reuse", `${seen.get(digest)}:${name}`);
    seen.set(digest, name);
  }
  return rows.map(([name, value]) => ({ name, sha256: sha256Text(value) }));
}

export async function executeA98MutationLifecycle({ upload, sendEmail, cleanup, zeroize = [], requireCleanup = true } = {}) {
  let mutationStarted = false;
  let cleanupAttempted = false;
  let cleanupSucceeded = false;
  let uploadResult = null;
  let emailResult = null;
  let failure = null;
  try {
    uploadResult = await upload();
    mutationStarted = true;
    emailResult = await sendEmail();
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (mutationStarted && requireCleanup) {
      cleanupAttempted = true;
      for (let attempt = 1; attempt <= 3 && !cleanupSucceeded; attempt += 1) {
        try { cleanupSucceeded = Boolean(await cleanup({ attempt })); } catch { cleanupSucceeded = false; }
      }
    }
    for (const value of zeroize) if (value instanceof Uint8Array) value.fill(0);
  }
  if (failure) {
    const error = new A98BoundaryError("a98_lifecycle_failed", failure);
    error.receipt = { mutationStarted, cleanupAttempted, cleanupSucceeded, uploadResult, emailResult, failure };
    throw error;
  }
  if (mutationStarted && requireCleanup && !cleanupSucceeded) {
    const error = new A98BoundaryError("a98_cleanup_not_confirmed");
    error.receipt = { mutationStarted, cleanupAttempted, cleanupSucceeded, uploadResult, emailResult, failure: "a98_cleanup_not_confirmed" };
    throw error;
  }
  return { mutationStarted, cleanupAttempted, cleanupSucceeded, uploadResult, emailResult, failure };
}
