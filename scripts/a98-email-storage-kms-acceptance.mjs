#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";
import {
  buildA98EncryptedEnvelope,
  openA98EncryptedEnvelope,
  parseA98StrictJson,
  validateA98KmsResponse,
  validateA98SignedStorageUrl,
  validateA98Url,
  validateA98DisposableEmail,
  validateA98SecretSeparation,
} from "./pass36/a98-email-storage-kms-boundary.mjs";
import { collect as collectA98Source, payload as a98Payload } from "./pass36/a98-source-boundary.mjs";
import { verifyHistoricalDescendantChain, verifyCurrentAuthority } from "./pass36/historical-descendant-chain-lib.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contractPath = path.join(root, "config/pass36/a98-email-storage-kms-boundary-policy.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const outputDir = path.join(root, "artifacts/pass36/a98");
const outputJson = path.join(outputDir, "PASS36_A98_EMAIL_STORAGE_KMS_ORIGIN_CONTEXT_CLEANUP_AND_DELIVERY_TRUTH_BOUNDARY.json");
const outputMd = path.join(outputDir, "PASS36_A98_EMAIL_STORAGE_KMS_ORIGIN_CONTEXT_CLEANUP_AND_DELIVERY_TRUTH_BOUNDARY.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256Text = (value) => sha256Buffer(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let emergencyCleanup = null;
const sensitiveKeyBuffers = [];
async function confirmEmergencyCleanup() {
  if (!emergencyCleanup) return { attempted: false, succeeded: true, attempts: 0 };
  let attempts = 0;
  let succeeded = false;
  for (; attempts < contract.budgets.cleanupAttempts && !succeeded; attempts += 1) {
    try { succeeded = Boolean(await emergencyCleanup()); } catch { succeeded = false; }
  }
  return { attempted: true, succeeded, attempts };
}
function zeroizeSensitiveKeys() {
  for (const key of sensitiveKeyBuffers) if (key instanceof Uint8Array) key.fill(0);
}

function verifySourceManifest() {
  const file = path.join(root, "config/pass36/a98-current-root-descendant-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a98_descendant_manifest_missing", digest: null, rows: 0 };
  let manifest;
  try { manifest = parseA98StrictJson(fs.readFileSync(file), { maxBytes: 4 * 1024 * 1024, requireObject: true }); }
  catch { return { ok: false, reason: "a98_descendant_manifest_invalid", digest: null, rows: 0 }; }
  const current = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8"));
  if (current.sourceRevisionId === manifest.revisionId) {
    const inventory = collectA98Source(root);
    const observed = a98Payload(inventory.rows);
    const ok = inventory.rejected.length === 0 && JSON.stringify(manifest.payload) === JSON.stringify(observed);
    return { ok, reason: ok ? null : "a98_source_payload_mismatch", digest: observed.aggregateSha256, rows: observed.fileCount, rejected: inventory.rejected };
  }
  const chain = verifyHistoricalDescendantChain(root, "config/pass36/a98-current-root-descendant-manifest.json", current.sourceRevisionId);
  const authority = verifyCurrentAuthority(root);
  const currentManifest = JSON.parse(fs.readFileSync(path.join(root, current.currentRootDescendantManifestPath), "utf8"));
  const ok = chain.ok && authority.ok && currentManifest.revisionId === current.sourceRevisionId;
  return { ok, reason: ok ? null : "a98_historical_descendant_or_current_authority_invalid", digest: currentManifest.payload?.aggregateSha256 ?? null, rows: currentManifest.payload?.fileCount ?? 0, rejected: [], historicalRevisionId: manifest.revisionId, currentRevisionId: current.sourceRevisionId };
}

function safeUrl(raw, kind) {
  try {
    if (kind === "staging") return { ok: true, url: validateA98Url(raw, { profile: "staging", fixtureMode, requireOriginOnly: true }), hostClass: fixtureMode ? "fixture_staging" : "staging" };
    if (kind === "supabase") return { ok: true, url: validateA98Url(raw, { profile: "supabase", fixtureMode, requireOriginOnly: true }), hostClass: fixtureMode ? "fixture_supabase" : "supabase_project" };
    if (kind === "resend") return { ok: true, url: validateA98Url(raw, { profile: "resend", fixtureMode, requireOriginOnly: true }), hostClass: fixtureMode ? "fixture_resend" : "resend" };
    if (kind === "kms") {
      const trustedOrigin = fixtureMode ? null : (process.env.VELMERE_A98_KMS_TRUSTED_ORIGIN ?? "");
      if (!fixtureMode && !trustedOrigin) return { ok: false, reason: "kms_trusted_origin_missing" };
      const url = validateA98Url(raw, { profile: "kms", fixtureMode, trustedOrigin: trustedOrigin || null, allowedPaths: contract.kmsSafety.allowedPaths });
      return { ok: true, url, hostClass: fixtureMode ? "fixture_kms" : "kms" };
    }
    return { ok: false, reason: "unknown_url_profile" };
  } catch (error) {
    return { ok: false, reason: error?.code ?? "invalid_url" };
  }
}

async function boundedBuffer(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("response_body_missing");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error("response_too_large"); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function boundedJson(response, maxBytes = contract.budgets.maximumJsonBytes) {
  const type = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) throw new Error(`non_json_response:${type || "missing"}`);
  const bytes = await boundedBuffer(response, maxBytes);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return parseA98StrictJson(Buffer.from(text, "utf8"), { maxBytes, maxDepth: 24, maxNodes: 10000, requireObject: false });
}

async function request(target, options = {}, maxBytes = contract.budgets.maximumJsonBytes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request_timeout")), contract.budgets.requestTimeoutMs);
  try {
    const response = await fetch(target, { ...options, redirect: options.redirect ?? "manual", cache: "no-store", signal: controller.signal });
    const type = String(response.headers.get("content-type") ?? "").toLowerCase();
    if (type.includes("application/json")) return { response, json: await boundedJson(response, maxBytes), bytes: null };
    return { response, json: null, bytes: await boundedBuffer(response, maxBytes) };
  } finally { clearTimeout(timer); }
}

function authHeaders(apiKey, bearer, extra = {}) {
  return { apikey: apiKey, authorization: `Bearer ${bearer}`, ...extra };
}

async function supabaseSignIn(base, anonKey, email, password) {
  const target = new URL("/auth/v1/token?grant_type=password", base);
  const { response, json } = await request(target, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { response, json, token: json?.access_token ?? null, userId: json?.user?.id ?? null };
}

async function kmsCall(url, secret, body) {
  const { response, json } = await request(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  return { response, json };
}

function encryptEnvelope(plaintext, key, wrapped, contextDigest) {
  return buildA98EncryptedEnvelope({ plaintext, dataKey: key, wrapped, contextDigest });
}

function decryptEnvelope(envelopeBytes, key, contextDigest, keyId) {
  return openA98EncryptedEnvelope({ envelopeBytes, dataKey: key, expectedContextDigest: contextDigest, expectedKeyId: keyId });
}

function normalizeSignedUrl(json, supabaseBase, bucket, objectPath) {
  const raw = json?.signedURL ?? json?.signedUrl ?? json?.signed_url ?? null;
  if (!raw || typeof raw !== "string") return null;
  try { return validateA98SignedStorageUrl(new URL(raw, supabaseBase).toString(), { supabaseOrigin: supabaseBase.origin, bucket, objectPath, fixtureMode }).toString(); }
  catch { return null; }
}

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  const a97Path = path.join(root, "artifacts/pass36/a97/PASS36_A97_STRIPE_TEST_PAYMENT_REFUND_RECONCILIATION_EVIDENCE.json");
  if (fixtureMode) {
    addCheck("precondition-a97-verified", true, { fixture: true, decision: contract.requiredPaymentDecision }, "FIXTURE_PASS");
  } else if (fs.existsSync(a97Path)) {
    const a97 = parseA98StrictJson(fs.readFileSync(a97Path), { maxBytes: 4 * 1024 * 1024, requireObject: true });
    const a97Decision = a97.decision ?? a97.status ?? null;
    addCheck("precondition-a97-verified", a97Decision === contract.requiredPaymentDecision && a97.fixtureMode === false, { decision: a97Decision, fixtureMode: a97.fixtureMode ?? null });
  } else addCheck("precondition-a97-verified", false, { reason: "a97_verified_staging_evidence_missing" });

  const npmObserved = currentNpmVersion();
  const runtimeOk = fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm);
  addCheck("runtime-exact", runtimeOk, { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const confirmation = process.env.VELMERE_A98_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const stagingSafety = safeUrl(process.env.VELMERE_A98_STAGING_BASE_URL ?? "", "staging");
  addCheck("staging-url-safety", stagingSafety.ok, stagingSafety.ok ? { hostClass: stagingSafety.hostClass, originSha256: sha256Text(stagingSafety.url.origin) } : { reason: stagingSafety.reason });
  if (!stagingSafety.ok) throw new Error(`unsafe_staging_url:${stagingSafety.reason}`);

  const supabaseSafety = safeUrl(process.env.SUPABASE_URL ?? "", "supabase");
  const projectClassOk = fixtureMode || process.env.VELMERE_A98_SUPABASE_PROJECT_CLASS === "disposable_staging";
  addCheck("supabase-url-safety", supabaseSafety.ok && projectClassOk, supabaseSafety.ok ? { hostClass: supabaseSafety.hostClass, projectClassOk, originSha256: sha256Text(supabaseSafety.url.origin) } : { reason: supabaseSafety.reason, projectClassOk });
  if (!supabaseSafety.ok || !projectClassOk) throw new Error("unsafe_supabase_project");
  const supabaseBase = supabaseSafety.url;

  const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const kmsWrapSecret = process.env.VELMERE_A98_KMS_WRAP_BEARER_SECRET ?? "";
  const kmsUnwrapSecret = process.env.VELMERE_A98_KMS_UNWRAP_BEARER_SECRET ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";
  let secretSeparationOk;
  try {
    validateA98SecretSeparation({ serviceKey, kmsWrapSecret, kmsUnwrapSecret, resendKey });
    secretSeparationOk = true;
  } catch { secretSeparationOk = false; }
  const providerBoundaryOk = fixtureMode || (
    anonKey.length >= 20 && serviceKey.length >= contract.storageSafety.minimumSecretLength
    && kmsWrapSecret.length >= contract.storageSafety.minimumSecretLength
    && kmsUnwrapSecret.length >= contract.storageSafety.minimumSecretLength
    && resendKey.startsWith(contract.emailSafety.apiKeyPrefix)
    && secretSeparationOk
    && !/service_role_placeholder|anon_placeholder/iu.test(`${anonKey}:${serviceKey}`)
  );
  addCheck("provider-secret-boundary", providerBoundaryOk, { anonPresent: Boolean(anonKey), servicePresent: Boolean(serviceKey), wrapSecretLengthOk: kmsWrapSecret.length >= contract.storageSafety.minimumSecretLength, unwrapSecretLengthOk: kmsUnwrapSecret.length >= contract.storageSafety.minimumSecretLength, secretSeparationOk, resendPrefixOk: resendKey.startsWith(contract.emailSafety.apiKeyPrefix), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const emailA = process.env.VELMERE_A98_TENANT_A_EMAIL ?? "";
  const passwordA = process.env.VELMERE_A98_TENANT_A_PASSWORD ?? "";
  const emailB = process.env.VELMERE_A98_TENANT_B_EMAIL ?? "";
  const passwordB = process.env.VELMERE_A98_TENANT_B_PASSWORD ?? "";
  const tenantA = await supabaseSignIn(supabaseBase, anonKey, emailA, passwordA);
  const tenantB = await supabaseSignIn(supabaseBase, anonKey, emailB, passwordB);
  addCheck("tenant-a-authenticated", tenantA.response.status === 200 && Boolean(tenantA.token && tenantA.userId), { status: tenantA.response.status, userDigest: tenantA.userId ? sha256Text(tenantA.userId) : null });
  addCheck("tenant-b-authenticated", tenantB.response.status === 200 && Boolean(tenantB.token && tenantB.userId) && tenantB.userId !== tenantA.userId, { status: tenantB.response.status, userDigest: tenantB.userId ? sha256Text(tenantB.userId) : null, distinct: tenantB.userId !== tenantA.userId });
  if (!tenantA.token || !tenantB.token || !tenantA.userId || !tenantB.userId) throw new Error("tenant_authentication_failed");

  const bucket = process.env.VELMERE_A98_STORAGE_BUCKET ?? "";
  const bucketTarget = new URL(`/storage/v1/bucket/${encodeURIComponent(bucket)}`, supabaseBase);
  const bucketResult = await request(bucketTarget, { headers: authHeaders(serviceKey, serviceKey, { accept: "application/json" }) });
  const bucketPrivate = bucketResult.response.status === 200 && bucketResult.json?.public === false;
  addCheck("storage-bucket-private", bucketPrivate, { status: bucketResult.response.status, public: bucketResult.json?.public ?? null, bucketDigest: sha256Text(bucket) });

  const plaintextToken = `A98:${crypto.randomBytes(24).toString("hex")}`;
  const plaintext = Buffer.from(JSON.stringify({ schemaVersion: "velmere.a98.disposable-payload.v1", token: plaintextToken, generatedAt: startedAt, padding: crypto.randomBytes(2048).toString("base64") }), "utf8");
  const plaintextSha256 = sha256Buffer(plaintext);
  const dataKey = crypto.randomBytes(32);
  sensitiveKeyBuffers.push(dataKey);
  const objectNonce = crypto.randomBytes(12).toString("hex");
  const objectPath = `${contract.storageSafety.objectPrefix}/${tenantA.userId}/${objectNonce}.vlmenc`;
  const context = { purpose: "a98-private-artifact", tenantDigest: sha256Text(tenantA.userId), objectPathDigest: sha256Text(objectPath) };
  const contextDigest = sha256Text(JSON.stringify(context));

  const kmsWrapUrl = safeUrl(process.env.VELMERE_A98_KMS_WRAP_URL ?? "", "kms");
  const kmsUnwrapUrl = safeUrl(process.env.VELMERE_A98_KMS_UNWRAP_URL ?? "", "kms");
  if (!kmsWrapUrl.ok || !kmsUnwrapUrl.ok) throw new Error("kms_url_invalid");
  const wrapRequestId = `a98-wrap-${crypto.randomBytes(12).toString("hex")}`;
  const wrapped = await kmsCall(kmsWrapUrl.url, kmsWrapSecret, { plaintextKeyBase64: dataKey.toString("base64"), context, contextDigest, requestId: wrapRequestId });
  let wrapOk;
  try { validateA98KmsResponse(wrapped.json, { operation: "wrap", requestId: wrapRequestId, contextDigest }); wrapOk = wrapped.response.status === 200; } catch { wrapOk = false; }
  addCheck("kms-wrap-succeeded", wrapOk, { status: wrapped.response.status, keyIdDigest: wrapped.json?.keyId ? sha256Text(wrapped.json.keyId) : null, algorithm: wrapped.json?.algorithm ?? null, contextBound: wrapped.json?.contextDigest === contextDigest });
  if (!wrapOk) throw new Error("kms_wrap_failed");

  const envelope = encryptEnvelope(plaintext, dataKey, wrapped.json, contextDigest);
  if (envelope.byteLength > contract.budgets.maximumObjectBytes) throw new Error("encrypted_object_too_large");
  const objectUrl = new URL(`/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, supabaseBase);
  const upload = await request(objectUrl, {
    method: "POST",
    headers: authHeaders(anonKey, tenantA.token, { "content-type": contract.storageSafety.objectContentType, "x-upsert": "false", accept: "application/json" }),
    body: envelope,
  });
  const uploadSucceeded = upload.response.status >= 200 && upload.response.status < 300;
  addCheck("storage-encrypted-uploaded", uploadSucceeded, { status: upload.response.status, objectPathDigest: sha256Text(objectPath), envelopeSha256: sha256Buffer(envelope), bytes: envelope.byteLength });
  if (uploadSucceeded) {
    emergencyCleanup = async () => {
      const cleanup = await request(objectUrl, { method: "DELETE", headers: authHeaders(serviceKey, serviceKey, { accept: "application/json" }) });
      const cleanupRead = await request(objectUrl, { headers: authHeaders(serviceKey, serviceKey, { accept: "application/octet-stream" }) }, contract.budgets.maximumObjectBytes);
      return [200, 204, 404].includes(cleanup.response.status) && [400, 404].includes(cleanupRead.response.status);
    };
  }

  const publicRead = await request(objectUrl, { headers: { apikey: anonKey, accept: "application/octet-stream" } }, contract.budgets.maximumObjectBytes);
  addCheck("storage-public-access-denied", [400, 401, 403, 404].includes(publicRead.response.status), { status: publicRead.response.status });

  const tenantBRead = await request(objectUrl, { headers: authHeaders(anonKey, tenantB.token, { accept: "application/octet-stream" }) }, contract.budgets.maximumObjectBytes);
  addCheck("storage-cross-tenant-denied", [400, 401, 403, 404].includes(tenantBRead.response.status), { status: tenantBRead.response.status });

  const listUrl = new URL(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, supabaseBase);
  const tenantBList = await request(listUrl, {
    method: "POST",
    headers: authHeaders(anonKey, tenantB.token, { "content-type": "application/json", accept: "application/json" }),
    body: JSON.stringify({ prefix: `${contract.storageSafety.objectPrefix}/${tenantA.userId}`, limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  const listedRows = Array.isArray(tenantBList.json) ? tenantBList.json : [];
  const isolatedList = [400, 401, 403, 404].includes(tenantBList.response.status) || (tenantBList.response.status === 200 && listedRows.every((row) => !String(row?.name ?? "").includes(objectNonce)));
  addCheck("storage-cross-tenant-list-isolated", isolatedList, { status: tenantBList.response.status, visibleRows: listedRows.length });

  const ownerRead = await request(objectUrl, { headers: authHeaders(anonKey, tenantA.token, { accept: contract.storageSafety.objectContentType }) }, contract.budgets.maximumObjectBytes);
  const ownerBytes = ownerRead.bytes ?? Buffer.from(JSON.stringify(ownerRead.json ?? {}), "utf8");
  addCheck("storage-owner-download-exact", ownerRead.response.status === 200 && sha256Buffer(ownerBytes) === sha256Buffer(envelope), { status: ownerRead.response.status, bytes: ownerBytes.byteLength, envelopeMatch: sha256Buffer(ownerBytes) === sha256Buffer(envelope) });

  const parsedEnvelope = JSON.parse(ownerBytes.toString("utf8"));
  const unwrapRequestId = `a98-unwrap-${crypto.randomBytes(12).toString("hex")}`;
  const unwrapped = await kmsCall(kmsUnwrapUrl.url, kmsUnwrapSecret, { wrappedKeyBase64: parsedEnvelope.wrappedKeyBase64, context, contextDigest, requestId: unwrapRequestId, keyId: parsedEnvelope.keyId });
  let unwrappedKey = Buffer.alloc(0);
  let unwrapOk;
  try {
    validateA98KmsResponse(unwrapped.json, { operation: "unwrap", requestId: unwrapRequestId, contextDigest, expectedKeyId: parsedEnvelope.keyId });
    unwrappedKey = Buffer.from(unwrapped.json.plaintextKeyBase64, "base64");
    sensitiveKeyBuffers.push(unwrappedKey);
    unwrapOk = unwrapped.response.status === 200 && unwrappedKey.byteLength === 32;
  } catch { unwrapOk = false; }
  addCheck("kms-unwrap-succeeded", unwrapOk, { status: unwrapped.response.status, keyLength: unwrappedKey.byteLength });
  let decrypted = Buffer.alloc(0);
  let decryptError = null;
  if (unwrapOk) {
    try { decrypted = decryptEnvelope(ownerBytes, unwrappedKey, contextDigest, parsedEnvelope.keyId); } catch (error) { decryptError = error instanceof Error ? error.message : String(error); }
  }
  addCheck("storage-decryption-exact", unwrapOk && !decryptError && sha256Buffer(decrypted) === plaintextSha256, { plaintextSha256, decryptedSha256: decrypted.byteLength ? sha256Buffer(decrypted) : null, decryptError });
  addCheck("storage-raw-object-not-plaintext", !ownerBytes.includes(Buffer.from(plaintextToken, "utf8")) && !ownerBytes.equals(plaintext), { rawContainsToken: ownerBytes.includes(Buffer.from(plaintextToken, "utf8")), rawEqualsPlaintext: ownerBytes.equals(plaintext) });

  const signUrl = new URL(`/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, supabaseBase);
  const signed = await request(signUrl, {
    method: "POST",
    headers: authHeaders(anonKey, tenantA.token, { "content-type": "application/json", accept: "application/json" }),
    body: JSON.stringify({ expiresIn: fixtureMode ? 1 : contract.budgets.signedUrlExpirySeconds }),
  });
  const signedUrl = normalizeSignedUrl(signed.json, supabaseBase, bucket, objectPath);
  addCheck("storage-signed-url-issued", signed.response.status === 200 && Boolean(signedUrl), { status: signed.response.status, urlDigest: signedUrl ? sha256Text(signedUrl) : null });
  if (signedUrl) {
    const signedBefore = await request(signedUrl, { headers: { accept: contract.storageSafety.objectContentType } }, contract.budgets.maximumObjectBytes);
    const beforeBytes = signedBefore.bytes ?? Buffer.from(JSON.stringify(signedBefore.json ?? {}), "utf8");
    addCheck("storage-signed-url-valid-before-expiry", signedBefore.response.status === 200 && sha256Buffer(beforeBytes) === sha256Buffer(envelope), { status: signedBefore.response.status, digestMatch: sha256Buffer(beforeBytes) === sha256Buffer(envelope) });
    await sleep(fixtureMode ? 1400 : contract.budgets.signedUrlExpirySeconds * 1000 + contract.budgets.signedUrlExpiryGraceMs);
    const signedAfter = await request(signedUrl, { headers: { accept: contract.storageSafety.objectContentType } }, contract.budgets.maximumObjectBytes);
    addCheck("storage-signed-url-expired", [400, 401, 403, 404].includes(signedAfter.response.status), { status: signedAfter.response.status });
  } else {
    addCheck("storage-signed-url-valid-before-expiry", false, { reason: "signed_url_missing" });
    addCheck("storage-signed-url-expired", false, { reason: "signed_url_missing" });
  }

  const resendBaseRaw = process.env.VELMERE_A98_RESEND_API_BASE ?? contract.emailSafety.apiBase;
  const resendSafety = safeUrl(resendBaseRaw, "resend");
  if (!resendSafety.ok) throw new Error("resend_url_invalid");
  if (!fixtureMode && resendSafety.url.origin !== new URL(contract.emailSafety.apiBase).origin) throw new Error("resend_api_origin_mismatch");
  const from = process.env.VELMERE_A98_EMAIL_FROM ?? "";
  const to = process.env.VELMERE_A98_EMAIL_TO ?? "";
  let recipientBound;
  try {
    validateA98DisposableEmail({ address: to, expectedSha256: process.env.VELMERE_A98_EMAIL_TO_SHA256 ?? "", forbiddenDomains: contract.emailSafety.forbiddenRecipientDomains });
    recipientBound = true;
  } catch { recipientBound = false; }
  addCheck("email-recipient-exact-disposable-binding", fixtureMode || recipientBound, { recipientBound, toDigest: to ? sha256Text(to) : null }, fixtureMode ? "FIXTURE_PASS" : undefined);
  if (!fixtureMode && !recipientBound) throw new Error("email_recipient_binding_invalid");
  const messageToken = crypto.randomBytes(16).toString("hex");
  const subject = `${contract.emailSafety.subjectPrefix} ${messageToken.slice(0, 10)}`;
  const text = `Disposable staging acceptance receipt ${messageToken}. No customer data.`;
  const send = await request(new URL("/emails", resendSafety.url), {
    method: "POST",
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json", accept: "application/json", "idempotency-key": `velmere-a98-${sha256Text(messageToken).slice(0, 32)}` },
    body: JSON.stringify({ from, to: [to], subject, text, headers: { "X-Velmere-A98-Receipt": sha256Text(messageToken).slice(0, 24) } }),
  });
  const emailId = typeof send.json?.id === "string" ? send.json.id : null;
  addCheck("email-send-accepted", [200, 201, 202].includes(send.response.status) && Boolean(emailId), { status: send.response.status, emailIdDigest: emailId ? sha256Text(emailId) : null });

  let retrieved = null;
  const emailDeadline = Date.now() + (fixtureMode ? 1800 : contract.budgets.emailDeliveryTimeoutMs);
  while (emailId && Date.now() < emailDeadline) {
    const current = await request(new URL(`/emails/${encodeURIComponent(emailId)}`, resendSafety.url), { headers: { authorization: `Bearer ${resendKey}`, accept: "application/json" } });
    retrieved = current;
    if (current.response.status === 200 && current.json?.last_event === contract.emailSafety.requiredFinalEvent) break;
    await sleep(fixtureMode ? 100 : contract.budgets.emailPollIntervalMs);
  }
  const emailDelivered = retrieved?.response?.status === 200 && retrieved?.json?.last_event === contract.emailSafety.requiredFinalEvent;
  addCheck("email-retrieve-delivered", emailDelivered, { status: retrieved?.response?.status ?? null, lastEvent: retrieved?.json?.last_event ?? null, emailIdDigest: emailId ? sha256Text(emailId) : null });
  const retrievedTo = Array.isArray(retrieved?.json?.to) ? retrieved.json.to.map(String) : [];
  const contentBound = emailDelivered && retrieved?.json?.subject === subject && String(retrieved?.json?.text ?? "").includes(messageToken) && retrievedTo.includes(to) && retrieved?.json?.from === from;
  addCheck("email-content-bound", contentBound, { subjectDigest: sha256Text(subject), toDigest: sha256Text(to), fromDigest: sha256Text(from), bodyTokenPresent: String(retrieved?.json?.text ?? "").includes(messageToken) });

  const cleanupResult = await confirmEmergencyCleanup();
  addCheck("storage-cleanup-complete", cleanupResult.attempted && cleanupResult.succeeded, cleanupResult);
  emergencyCleanup = null;
  zeroizeSensitiveKeys();

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceAfter.ok && sourceBefore.ok && sourceAfter.digest === sourceBefore.digest, { before: sourceBefore.digest, after: sourceAfter.digest, reason: sourceAfter.reason });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : (failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_EMAIL_STORAGE_KMS");
  const report = {
    schemaVersion: "velmere.pass36.a98.email-storage-kms-acceptance.v1",
    revisionId: contract.revisionId,
    generatedAt: nowIso(),
    startedAt,
    fixtureMode,
    decision,
    saleEnabled: false,
    productionEmailProven: false,
    productionStorageProven: false,
    productionKmsProven: false,
    stagingEmailStorageKmsProven: !fixtureMode && failures.length === 0,
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    evidence: {
      sourceDigest: sourceAfter.digest,
      bucketDigest: sha256Text(bucket),
      objectPathDigest: sha256Text(objectPath),
      encryptedObjectSha256: sha256Buffer(envelope),
      plaintextSha256,
      kmsKeyIdDigest: wrapped.json?.keyId ? sha256Text(wrapped.json.keyId) : null,
      emailIdDigest: emailId ? sha256Text(emailId) : null,
      emailToDigest: sha256Text(to),
      emailFromDigest: sha256Text(from),
      emailSubjectDigest: sha256Text(subject),
      signedUrlDigest: signedUrl ? sha256Text(signedUrl) : null,
    },
    failures,
    checks,
    truthBoundary: contract.truthBoundary,
  };

  const suppliedSecrets = [passwordA, passwordB, anonKey, serviceKey, kmsWrapSecret, kmsUnwrapSecret, resendKey, process.env.VELMERE_A98_CONFIRM ?? ""].filter((value) => value.length >= 8);
  const suppliedPii = [emailA, emailB, from, to].filter(Boolean);
  const serializedBeforeRedactionCheck = JSON.stringify(report);
  const leak = [...suppliedSecrets, ...suppliedPii].find((value) => serializedBeforeRedactionCheck.includes(value)) ?? null;
  addCheck("evidence-redaction", !leak, leak ? { leakedValueSha256: sha256Text(leak) } : { secretAndPiiLeak: false });
  report.checks = checks;
  report.failures = checks.filter((row) => !row.ok);
  report.summary = { checks: checks.length, passed: checks.length - report.failures.length, failed: report.failures.length };
  report.decision = fixtureMode ? (report.failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : (report.failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_EMAIL_STORAGE_KMS");
  report.stagingEmailStorageKmsProven = !fixtureMode && report.failures.length === 0;

  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    "# PASS36 A98 — Transactional Email + Private Storage + KMS Acceptance",
    "",
    `- Decision: **${report.decision}**`,
    `- Checks: **${report.summary.passed}/${report.summary.checks}**`,
    `- Fixture mode: **${fixtureMode}**`,
    `- Sale enabled: **false**`,
    `- Production email/storage/KMS proven: **false**`,
    "",
    "## Truth boundary",
    "",
    contract.truthBoundary,
    "",
    "## Failures",
    "",
    ...(report.failures.length ? report.failures.map((row) => `- ${row.id}`) : ["- None"]),
    "",
  ].join("\n");
  fs.writeFileSync(outputMd, md);
  console.log(JSON.stringify({ decision: report.decision, ...report.summary }, null, 2));
  if (report.failures.length) process.exit(1);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const cleanupResult = await confirmEmergencyCleanup();
  zeroizeSensitiveKeys();
  const report = {
    schemaVersion: "velmere.pass36.a98.email-storage-kms-acceptance.v1",
    revisionId: contract.revisionId,
    generatedAt: nowIso(),
    fixtureMode,
    decision: fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED",
    saleEnabled: false,
    productionEmailProven: false,
    productionStorageProven: false,
    productionKmsProven: false,
    stagingEmailStorageKmsProven: false,
    summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: checks.filter((row) => !row.ok).length + 1 },
    failures: [...checks.filter((row) => !row.ok), { id: "unhandled-error", ok: false, status: "FAIL", detail: { message } }],
    checks,
    emergencyCleanup: cleanupResult,
    truthBoundary: contract.truthBoundary,
  };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMd, `# PASS36 A98\n\nDecision: **${report.decision}**\n\nFailure: ${message}\n`);
  console.error(JSON.stringify({ decision: report.decision, error: message }, null, 2));
  process.exit(1);
});
