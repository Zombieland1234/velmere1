#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4355";
// Backward compatibility marker for PASS4354 diagnose: velmere.pass4354.operator_signed_live_proof_manifest_receipt_bound.v1
const OUT_DIR = path.join("artifacts", "live-receipts", "operator");
const FAIL_DIR = path.join("artifacts", "failure-artifacts", "operator");
const SIGNED_MANIFEST = path.join(OUT_DIR, "VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json");
const UNSIGNED_MANIFEST = path.join(OUT_DIR, "VELMERE_OPERATOR_LIVE_PROOF_MANIFEST_UNSIGNED.json");
const FAILURE_ARTIFACT = path.join(FAIL_DIR, "VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST_FAILURE.json");
const REQUIRED_RECEIPTS = [
  ["node24_environment", ".velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.json"],
  ["npm_ci", ".velmere-final-check-logs/npm-clean-install-receipt.json"],
  ["full_typecheck", ".velmere-final-check-logs/typecheck-receipt.json"],
  ["production_build", ".velmere-final-check-logs/build-receipt.json"],
  ["lint", ".velmere-final-check-logs/lint-receipt.json"],
  ["public_proof_route_smoke_local", "artifacts/live-receipts/proof-api/route-smoke/local-server-smoke-summary.json"],
  ["public_proof_route_smoke_hosted", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json"],
  ["public_proof_route_smoke_hosted_freshness", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json"],
  ["provider_live_data_smoke", "artifacts/live-receipts/provider-live-data-smoke/provider-smoke-summary.json"],
  ["payment_entitlement_replay", "artifacts/live-receipts/payment-entitlement-replay/payment-replay-summary.json"],
  ["pdf_angel_same_payload_parity", "artifacts/live-receipts/pdf-angel-parity/pdf-angel-parity-summary.json"],
  ["ai_audit_eval_pl_en_de", "artifacts/live-receipts/ai-audit-eval/ai-audit-eval-pl-en-de-summary.json"],
  ["domain_live_receipt_matrix", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json"],
  ["zero_skip_receipt_coverage", "artifacts/live-receipts/zero-skip-coverage/zero-skip-coverage-summary.json"],
  ["required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/required-live-receipt-bundle-summary.json"],
  ["materialized_required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/materialized/materialized-required-live-receipt-bundle-summary.json"],
];
const FORBIDDEN_TOKENS = [
  "rawcustomerevidence",
  "customeremail",
  "walletaddress",
  "stripecustomerid",
  "paymentintent",
  "authorization",
  "set-cookie",
  "providersecret",
  "privatekey",
  "seedphrase",
  "access_token",
  "refresh_token",
  "sk_live_",
  "sk_test_",
  "whsec_",
];

function parseArgs(argv) {
  const out = { mode: "assemble", manifest: SIGNED_MANIFEST, allowBlockedSignature: false };
  for (const arg of argv) {
    if (arg === "--verify") out.mode = "verify";
    else if (arg === "--assemble") out.mode = "assemble";
    else if (arg === "--allow-blocked-signature") out.allowBlockedSignature = true;
    else if (arg.startsWith("--manifest=")) out.manifest = arg.slice("--manifest=".length) || SIGNED_MANIFEST;
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
}

function publicLeakTokens(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_TOKENS.filter((token) => lower.includes(token));
}

function publicKeyFingerprint(publicKeyPem) {
  return sha256(publicKeyPem.replace(/\r/g, "").trim()).slice(0, 24);
}

function rowForReceipt([lane, receiptPath]) {
  const content = read(receiptPath);
  const exists = Boolean(content);
  const leaks = exists ? publicLeakTokens(content) : [];
  let parsedOk = false;
  let receiptOk = false;
  if (exists) {
    try {
      const parsed = JSON.parse(content);
      parsedOk = true;
      receiptOk = parsed.ok === true || parsed.status === "PASS" || parsed.bundleReady === true;
    } catch {
      parsedOk = false;
    }
  }
  return {
    lane,
    receiptPath,
    exists,
    parsedOk,
    receiptOk,
    sha256: exists ? sha256(content) : null,
    bytes: exists ? Buffer.byteLength(content, "utf8") : 0,
    safePublicFieldsOnly: leaks.length === 0,
    publicLeakTokens: leaks,
    status: !exists ? "missing" : leaks.length ? "executed_fail" : receiptOk ? "executed_pass" : "executed_fail",
    requiredForPublicTopkaLive: true,
  };
}

function unsignedManifest() {
  const rows = REQUIRED_RECEIPTS.map(rowForReceipt);
  const failedRows = rows.filter((row) => row.status !== "executed_pass");
  return {
    schema: "velmere.pass4355.operator_signed_live_proof_manifest_domain_receipt_bound.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    noVisualChanges: true,
    signatureAlgorithm: "Ed25519",
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    allRequiredReceiptsPassed: failedRows.length === 0,
    failedLaneCount: failedRows.length,
    requiredReceiptRows: rows,
    requiredBeforePublicTopkaLive: [
      "all required receipt rows executed_pass",
      "Ed25519 operator signature present",
      "signature verifies against public key",
      "public redaction scan clean",
      "hosted public proof API route smoke receipt attached",
      "hosted proof freshness/expiry/replay receipt attached and green",
      "materialized required live receipt bundle attached and green",
      "payment/provider/PDF-Angel/AI eval receipts attached and green",
      "zero-skip receipt coverage attached and green",
    ],
    liveBlockedReasons: failedRows.length === 0
      ? ["operator_signature_missing_until_manifest_signed"]
      : failedRows.map((row) => `${row.lane}_${row.status}`),
  };
}

function signingPayload(manifest) {
  const clean = { ...manifest };
  delete clean.signature;
  return stableStringify(clean);
}

function signManifest(manifest, privateKeyPem, operatorId, publicKeyPem) {
  const payload = signingPayload(manifest);
  const signature = crypto.sign(null, Buffer.from(payload, "utf8"), crypto.createPrivateKey(privateKeyPem)).toString("base64");
  return {
    ...manifest,
    signature: {
      algorithm: "Ed25519",
      signedAtIso: new Date().toISOString(),
      operatorId,
      publicKeyFingerprint: publicKeyFingerprint(publicKeyPem),
      payloadSha256: sha256(payload),
      valueBase64: signature,
    },
  };
}

function verifyManifestObject(manifest, publicKeyPem) {
  if (!manifest || typeof manifest !== "object") return { ok: false, reason: "manifest_not_object" };
  if (!manifest.signature || typeof manifest.signature !== "object") return { ok: false, reason: "signature_missing" };
  if (manifest.signature.algorithm !== "Ed25519") return { ok: false, reason: "unexpected_signature_algorithm" };
  const payload = signingPayload(manifest);
  const expectedPayloadSha = sha256(payload);
  if (manifest.signature.payloadSha256 !== expectedPayloadSha) return { ok: false, reason: "payload_sha_mismatch", expectedPayloadSha };
  const verified = crypto.verify(
    null,
    Buffer.from(payload, "utf8"),
    crypto.createPublicKey(publicKeyPem),
    Buffer.from(String(manifest.signature.valueBase64 || ""), "base64"),
  );
  if (!verified) return { ok: false, reason: "signature_invalid" };
  if (manifest.publicTopkaLiveAllowed !== false || manifest.claimAllowed !== false) return { ok: false, reason: "claim_flags_must_remain_false_until_external_release" };
  const rows = Array.isArray(manifest.requiredReceiptRows) ? manifest.requiredReceiptRows : [];
  const badRows = rows.filter((row) => row.status !== "executed_pass" || row.safePublicFieldsOnly !== true);
  if (badRows.length) return { ok: false, reason: "required_rows_not_all_green", badRows: badRows.map((row) => row.lane) };
  return { ok: true, reason: "signature_verified_and_required_rows_green", expectedPayloadSha };
}

function fail(reason, detail) {
  const artifact = {
    schema: "velmere.pass4348.operator_signed_live_manifest_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    reason,
    detail,
  };
  writeJson(FAILURE_ARTIFACT, artifact);
  console.error(`${PASS_ID} operator-signed manifest FAIL: ${reason}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exitCode = 1;
}

function assemble(args) {
  const candidate = unsignedManifest();
  writeJson(UNSIGNED_MANIFEST, candidate);
  const privateKeyPem = process.env.VELMERE_OPERATOR_SIGNING_PRIVATE_KEY_PEM || "";
  const publicKeyPem = process.env.VELMERE_OPERATOR_SIGNING_PUBLIC_KEY_PEM || "";
  const operatorId = process.env.VELMERE_OPERATOR_ID || "";
  const missingEnv = [
    ["VELMERE_OPERATOR_ID", operatorId],
    ["VELMERE_OPERATOR_SIGNING_PRIVATE_KEY_PEM", privateKeyPem],
    ["VELMERE_OPERATOR_SIGNING_PUBLIC_KEY_PEM", publicKeyPem],
  ].filter(([, value]) => !value).map(([key]) => key);
  const badRows = candidate.requiredReceiptRows.filter((row) => row.status !== "executed_pass" || row.safePublicFieldsOnly !== true);
  if (badRows.length && !args.allowBlockedSignature) {
    fail("required_receipts_missing_or_failed", { unsignedManifest: UNSIGNED_MANIFEST, badRows: badRows.map((row) => ({ lane: row.lane, status: row.status, receiptPath: row.receiptPath })) });
    return;
  }
  if (missingEnv.length) {
    fail("operator_signing_env_missing", { missingEnv, unsignedManifest: UNSIGNED_MANIFEST });
    return;
  }
  try {
    const signed = signManifest(candidate, privateKeyPem, operatorId, publicKeyPem);
    const verification = verifyManifestObject(signed, publicKeyPem);
    if (!verification.ok) {
      fail("self_verification_failed", verification);
      return;
    }
    writeJson(SIGNED_MANIFEST, signed);
    console.log(`${PASS_ID} operator-signed manifest PASS: ${SIGNED_MANIFEST}`);
  } catch (error) {
    fail("operator_signature_exception", { message: error instanceof Error ? error.message : String(error) });
  }
}

function verify(args) {
  const publicKeyPem = process.env.VELMERE_OPERATOR_SIGNING_PUBLIC_KEY_PEM || "";
  if (!publicKeyPem) {
    fail("operator_public_key_env_missing", { missingEnv: ["VELMERE_OPERATOR_SIGNING_PUBLIC_KEY_PEM"] });
    return;
  }
  const text = read(args.manifest);
  if (!text) {
    fail("signed_manifest_missing", { manifest: args.manifest });
    return;
  }
  const leaks = publicLeakTokens(text);
  if (leaks.length) {
    fail("signed_manifest_public_redaction_failed", { leaks });
    return;
  }
  try {
    const manifest = JSON.parse(text);
    const verification = verifyManifestObject(manifest, publicKeyPem);
    if (!verification.ok) {
      fail("signed_manifest_verification_failed", verification);
      return;
    }
    console.log(`${PASS_ID} operator-signed manifest verify PASS: ${args.manifest}`);
  } catch (error) {
    fail("signed_manifest_parse_or_verify_exception", { message: error instanceof Error ? error.message : String(error) });
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.mode === "verify") verify(args);
else assemble(args);
