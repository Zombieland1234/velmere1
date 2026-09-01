#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contractPath = path.join(root, "config/pass35/a50-transactional-email-private-storage-kms-acceptance.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a50");
const outputJson = path.join(outputDir, "PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE.json");
const outputMd = path.join(outputDir, "PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256Text = (value) => sha256Buffer(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a50-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a50_source_manifest_missing", digest: null, rows: 0 };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const digest = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    const absolute = path.join(root, row.path);
    if (!fs.existsSync(absolute)) return { ok: false, reason: `source_file_missing:${row.path}`, digest: null, rows: manifest.files.length };
    const bytes = fs.readFileSync(absolute);
    const current = sha256Buffer(bytes);
    if (current !== row.sha256 || bytes.byteLength !== row.bytes) return { ok: false, reason: `source_hash_mismatch:${row.path}`, digest: null, rows: manifest.files.length };
    digest.update(row.path); digest.update("\0"); digest.update(current); digest.update("\0");
  }
  return { ok: true, reason: null, digest: digest.digest("hex"), rows: manifest.files.length };
}

function safeUrl(raw, kind) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (fixtureMode && local) return { ok: true, url, hostClass: `fixture_${kind}` };
  if (url.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (local) return { ok: false, reason: "localhost_not_staging" };
  if (kind === "staging") {
    if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
    if (!contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "staging_hostname_hint_missing" };
  }
  if (kind === "supabase" && !host.endsWith(".supabase.co")) return { ok: false, reason: "supabase_host_required" };
  return { ok: true, url, hostClass: kind === "supabase" ? "supabase_project" : kind };
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
  return JSON.parse(text);
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
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    schemaVersion: "velmere.a50.encrypted-object.v1",
    algorithm: "aes-256-gcm",
    kmsAlgorithm: String(wrapped.algorithm ?? "external-kms-wrap"),
    keyId: String(wrapped.keyId ?? "unknown"),
    wrappedKeyBase64: String(wrapped.wrappedKeyBase64),
    contextDigest,
    ivBase64: iv.toString("base64"),
    tagBase64: tag.toString("base64"),
    ciphertextBase64: ciphertext.toString("base64"),
  }), "utf8");
}

function decryptEnvelope(envelopeBytes, key) {
  const envelope = JSON.parse(envelopeBytes.toString("utf8"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tagBase64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertextBase64, "base64")), decipher.final()]);
}

function normalizeSignedUrl(json, supabaseBase) {
  const raw = json?.signedURL ?? json?.signedUrl ?? json?.signed_url ?? null;
  if (!raw || typeof raw !== "string") return null;
  return new URL(raw, supabaseBase).toString();
}

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  const a49Path = path.join(root, "artifacts/pass35/a49/PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE.json");
  if (fixtureMode) {
    addCheck("precondition-a49-verified", true, { fixture: true, decision: contract.requiredA49Decision }, "FIXTURE_PASS");
  } else if (fs.existsSync(a49Path)) {
    const a49 = JSON.parse(fs.readFileSync(a49Path, "utf8"));
    const a49Decision = a49.decision ?? a49.status ?? null;
    addCheck("precondition-a49-verified", a49Decision === contract.requiredA49Decision, { decision: a49Decision });
  } else addCheck("precondition-a49-verified", false, { reason: "a49_verified_evidence_missing" });

  const npmObserved = currentNpmVersion();
  const runtimeOk = fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm);
  addCheck("runtime-exact", runtimeOk, { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const confirmation = process.env.VELMERE_A50_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const stagingSafety = safeUrl(process.env.VELMERE_A50_STAGING_BASE_URL ?? "", "staging");
  addCheck("staging-url-safety", stagingSafety.ok, stagingSafety.ok ? { hostClass: stagingSafety.hostClass, originSha256: sha256Text(stagingSafety.url.origin) } : { reason: stagingSafety.reason });
  if (!stagingSafety.ok) throw new Error(`unsafe_staging_url:${stagingSafety.reason}`);

  const supabaseSafety = safeUrl(process.env.SUPABASE_URL ?? "", "supabase");
  const projectClassOk = fixtureMode || process.env.VELMERE_A50_SUPABASE_PROJECT_CLASS === "disposable_staging";
  addCheck("supabase-url-safety", supabaseSafety.ok && projectClassOk, supabaseSafety.ok ? { hostClass: supabaseSafety.hostClass, projectClassOk, originSha256: sha256Text(supabaseSafety.url.origin) } : { reason: supabaseSafety.reason, projectClassOk });
  if (!supabaseSafety.ok || !projectClassOk) throw new Error("unsafe_supabase_project");
  const supabaseBase = supabaseSafety.url;

  const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const kmsSecret = process.env.VELMERE_A50_KMS_BEARER_SECRET ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const providerBoundaryOk = fixtureMode || (
    anonKey.length >= 20 && serviceKey.length >= 32 && kmsSecret.length >= contract.storageSafety.minimumKmsSecretLength && resendKey.startsWith(contract.emailSafety.apiKeyPrefix)
    && !/service_role_placeholder|anon_placeholder/iu.test(`${anonKey}:${serviceKey}`)
  );
  addCheck("provider-secret-boundary", providerBoundaryOk, { anonPresent: Boolean(anonKey), servicePresent: Boolean(serviceKey), kmsSecretLengthOk: kmsSecret.length >= contract.storageSafety.minimumKmsSecretLength, resendPrefixOk: resendKey.startsWith(contract.emailSafety.apiKeyPrefix), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const emailA = process.env.VELMERE_A50_TENANT_A_EMAIL ?? "";
  const passwordA = process.env.VELMERE_A50_TENANT_A_PASSWORD ?? "";
  const emailB = process.env.VELMERE_A50_TENANT_B_EMAIL ?? "";
  const passwordB = process.env.VELMERE_A50_TENANT_B_PASSWORD ?? "";
  const tenantA = await supabaseSignIn(supabaseBase, anonKey, emailA, passwordA);
  const tenantB = await supabaseSignIn(supabaseBase, anonKey, emailB, passwordB);
  addCheck("tenant-a-authenticated", tenantA.response.status === 200 && Boolean(tenantA.token && tenantA.userId), { status: tenantA.response.status, userDigest: tenantA.userId ? sha256Text(tenantA.userId) : null });
  addCheck("tenant-b-authenticated", tenantB.response.status === 200 && Boolean(tenantB.token && tenantB.userId) && tenantB.userId !== tenantA.userId, { status: tenantB.response.status, userDigest: tenantB.userId ? sha256Text(tenantB.userId) : null, distinct: tenantB.userId !== tenantA.userId });
  if (!tenantA.token || !tenantB.token || !tenantA.userId || !tenantB.userId) throw new Error("tenant_authentication_failed");

  const bucket = process.env.VELMERE_A50_STORAGE_BUCKET ?? "";
  const bucketTarget = new URL(`/storage/v1/bucket/${encodeURIComponent(bucket)}`, supabaseBase);
  const bucketResult = await request(bucketTarget, { headers: authHeaders(serviceKey, serviceKey, { accept: "application/json" }) });
  const bucketPrivate = bucketResult.response.status === 200 && bucketResult.json?.public === false;
  addCheck("storage-bucket-private", bucketPrivate, { status: bucketResult.response.status, public: bucketResult.json?.public ?? null, bucketDigest: sha256Text(bucket) });

  const plaintextToken = `A50:${crypto.randomBytes(24).toString("hex")}`;
  const plaintext = Buffer.from(JSON.stringify({ schemaVersion: "velmere.a50.disposable-payload.v1", token: plaintextToken, generatedAt: startedAt, padding: crypto.randomBytes(2048).toString("base64") }), "utf8");
  const plaintextSha256 = sha256Buffer(plaintext);
  const dataKey = crypto.randomBytes(32);
  const objectNonce = crypto.randomBytes(12).toString("hex");
  const objectPath = `${contract.storageSafety.objectPrefix}/${tenantA.userId}/${objectNonce}.vlmenc`;
  const context = { purpose: "a50-private-artifact", tenantDigest: sha256Text(tenantA.userId), objectPathDigest: sha256Text(objectPath) };
  const contextDigest = sha256Text(JSON.stringify(context));

  const kmsWrapUrl = safeUrl(process.env.VELMERE_A50_KMS_WRAP_URL ?? "", "kms");
  const kmsUnwrapUrl = safeUrl(process.env.VELMERE_A50_KMS_UNWRAP_URL ?? "", "kms");
  if (!kmsWrapUrl.ok || !kmsUnwrapUrl.ok) throw new Error("kms_url_invalid");
  const wrapped = await kmsCall(kmsWrapUrl.url, kmsSecret, { plaintextKeyBase64: dataKey.toString("base64"), context });
  const wrapOk = wrapped.response.status === 200 && typeof wrapped.json?.wrappedKeyBase64 === "string" && wrapped.json.wrappedKeyBase64.length >= 24 && typeof wrapped.json?.keyId === "string";
  addCheck("kms-wrap-succeeded", wrapOk, { status: wrapped.response.status, keyIdDigest: wrapped.json?.keyId ? sha256Text(wrapped.json.keyId) : null, algorithm: wrapped.json?.algorithm ?? null });
  if (!wrapOk) throw new Error("kms_wrap_failed");

  const envelope = encryptEnvelope(plaintext, dataKey, wrapped.json, contextDigest);
  if (envelope.byteLength > contract.budgets.maximumObjectBytes) throw new Error("encrypted_object_too_large");
  const objectUrl = new URL(`/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, supabaseBase);
  const upload = await request(objectUrl, {
    method: "POST",
    headers: authHeaders(anonKey, tenantA.token, { "content-type": contract.storageSafety.objectContentType, "x-upsert": "false", accept: "application/json" }),
    body: envelope,
  });
  addCheck("storage-encrypted-uploaded", upload.response.status >= 200 && upload.response.status < 300, { status: upload.response.status, objectPathDigest: sha256Text(objectPath), envelopeSha256: sha256Buffer(envelope), bytes: envelope.byteLength });

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
  const unwrapped = await kmsCall(kmsUnwrapUrl.url, kmsSecret, { wrappedKeyBase64: parsedEnvelope.wrappedKeyBase64, context });
  const unwrappedKey = typeof unwrapped.json?.plaintextKeyBase64 === "string" ? Buffer.from(unwrapped.json.plaintextKeyBase64, "base64") : Buffer.alloc(0);
  const unwrapOk = unwrapped.response.status === 200 && unwrappedKey.byteLength === 32;
  addCheck("kms-unwrap-succeeded", unwrapOk, { status: unwrapped.response.status, keyLength: unwrappedKey.byteLength });
  let decrypted = Buffer.alloc(0);
  let decryptError = null;
  if (unwrapOk) {
    try { decrypted = decryptEnvelope(ownerBytes, unwrappedKey); } catch (error) { decryptError = error instanceof Error ? error.message : String(error); }
  }
  addCheck("storage-decryption-exact", unwrapOk && !decryptError && sha256Buffer(decrypted) === plaintextSha256, { plaintextSha256, decryptedSha256: decrypted.byteLength ? sha256Buffer(decrypted) : null, decryptError });
  addCheck("storage-raw-object-not-plaintext", !ownerBytes.includes(Buffer.from(plaintextToken, "utf8")) && !ownerBytes.equals(plaintext), { rawContainsToken: ownerBytes.includes(Buffer.from(plaintextToken, "utf8")), rawEqualsPlaintext: ownerBytes.equals(plaintext) });

  const signUrl = new URL(`/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, supabaseBase);
  const signed = await request(signUrl, {
    method: "POST",
    headers: authHeaders(anonKey, tenantA.token, { "content-type": "application/json", accept: "application/json" }),
    body: JSON.stringify({ expiresIn: fixtureMode ? 1 : contract.budgets.signedUrlExpirySeconds }),
  });
  const signedUrl = normalizeSignedUrl(signed.json, supabaseBase);
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

  const resendBaseRaw = process.env.VELMERE_A50_RESEND_API_BASE ?? contract.emailSafety.apiBase;
  const resendSafety = safeUrl(resendBaseRaw, "resend");
  if (!resendSafety.ok) throw new Error("resend_url_invalid");
  if (!fixtureMode && resendSafety.url.origin !== new URL(contract.emailSafety.apiBase).origin) throw new Error("resend_api_origin_mismatch");
  const from = process.env.VELMERE_A50_EMAIL_FROM ?? "";
  const to = process.env.VELMERE_A50_EMAIL_TO ?? "";
  const messageToken = crypto.randomBytes(16).toString("hex");
  const subject = `${contract.emailSafety.subjectPrefix} ${messageToken.slice(0, 10)}`;
  const text = `Disposable staging acceptance receipt ${messageToken}. No customer data.`;
  const send = await request(new URL("/emails", resendSafety.url), {
    method: "POST",
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json", accept: "application/json", "idempotency-key": `velmere-a50-${sha256Text(messageToken).slice(0, 32)}` },
    body: JSON.stringify({ from, to: [to], subject, text, headers: { "X-Velmere-A50-Receipt": sha256Text(messageToken).slice(0, 24) } }),
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

  const cleanup = await request(objectUrl, { method: "DELETE", headers: authHeaders(serviceKey, serviceKey, { accept: "application/json" }) });
  const cleanupRead = await request(objectUrl, { headers: authHeaders(serviceKey, serviceKey, { accept: "application/octet-stream" }) }, contract.budgets.maximumObjectBytes);
  addCheck("storage-cleanup-complete", [200, 204].includes(cleanup.response.status) && [400, 404].includes(cleanupRead.response.status), { deleteStatus: cleanup.response.status, verifyStatus: cleanupRead.response.status });

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceAfter.ok && sourceBefore.ok && sourceAfter.digest === sourceBefore.digest, { before: sourceBefore.digest, after: sourceAfter.digest, reason: sourceAfter.reason });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : (failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_EMAIL_STORAGE_KMS");
  const report = {
    schemaVersion: "velmere.pass35.a50.transactional-email-private-storage-kms-acceptance.v1",
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

  const suppliedSecrets = [passwordA, passwordB, anonKey, serviceKey, kmsSecret, resendKey, process.env.VELMERE_A50_CONFIRM ?? ""].filter((value) => value.length >= 8);
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
    "# PASS35 A50 — Transactional Email + Private Storage + KMS Acceptance",
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const report = {
    schemaVersion: "velmere.pass35.a50.transactional-email-private-storage-kms-acceptance.v1",
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
    truthBoundary: contract.truthBoundary,
  };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMd, `# PASS35 A50\n\nDecision: **${report.decision}**\n\nFailure: ${message}\n`);
  console.error(JSON.stringify({ decision: report.decision, error: message }, null, 2));
  process.exit(1);
});
