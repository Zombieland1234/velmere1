#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const reportRoots = [
  path.join(root, "reports", "smart_contract"),
  path.join(root, "reports", "shield"),
  path.join(root, "reports", "real_markets"),
];
const receiptPath = path.join(root, "artifacts", "r10", "R10_CORPUS_INTEGRITY_MIGRATION_RECEIPT.json");
const LOCAL_KEY_SEED = "VELMERE_LOCAL_REPORT_INTEGRITY_ED25519_V2";
const LOCAL_SIGNATURE_PREFIX = "VLM-LOCAL-INTEGRITY-V1|SHA-256|";
const PKCS8_ED25519_SEED_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function localIntegrityKeyPair() {
  const seed = crypto.createHash("sha256").update(LOCAL_KEY_SEED).digest();
  const privateKeyDer = Buffer.concat([PKCS8_ED25519_SEED_PREFIX, seed]);
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: "der", type: "pkcs8" });
  const publicKey = crypto.createPublicKey(privateKey);
  return { privateKey, publicKey };
}

function normalizeReportDigest(value) {
  const text = String(value ?? "").trim();
  if (/^sha256:[a-f0-9]{64}$/i.test(text)) return text.toLowerCase();
  if (/^[a-f0-9]{64}$/i.test(text)) return `sha256:${text.toLowerCase()}`;
  return null;
}

function localAttestation(reportDigest, observedAt) {
  const { privateKey, publicKey } = localIntegrityKeyPair();
  const message = Buffer.from(`${LOCAL_SIGNATURE_PREFIX}${reportDigest}`, "utf8");
  return {
    schemaVersion: "velmere.report-local-integrity.v2",
    attestationType: "LOCAL_INTEGRITY_ATTESTATION",
    signerIdentity: "Velmère Local Integrity Signer / Engine v2.4",
    signatureAlgorithm: "Ed25519",
    digestAlgorithm: "SHA-256",
    reportDigest,
    signature: crypto.sign(null, message, privateKey).toString("base64"),
    publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    scope: "FILE_INTEGRITY_ONLY",
    externalTimestampVerified: false,
    contentTruthVerified: false,
    observedAt,
    note: "Local cryptographic integrity attestation only. It is not an RFC 3161 timestamp and does not verify the truth, completeness, or authority of report content.",
  };
}

function collectJsonFiles(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collectJsonFiles(full, output);
    else if (entry.isFile() && entry.name.endsWith(".json")) output.push(full);
  }
  return output;
}

function oldTimestamp(value) {
  const candidates = [
    value?.pkiAttestation?.timestampToken?.time,
    value?.pkiAttestation?.observedAt,
    value?.generatedAt,
    value?.createdAt,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && Number.isFinite(new Date(candidate).getTime())) {
      return new Date(candidate).toISOString();
    }
  }
  return "1970-01-01T00:00:00.000Z";
}

const stats = {
  scannedJson: 0,
  changedJson: 0,
  localAttestationsMigrated: 0,
  provenancePlaceholdersMigrated: 0,
  skippedMissingReportDigest: 0,
};
const changes = [];

for (const file of reportRoots.flatMap((dir) => collectJsonFiles(dir)).sort()) {
  stats.scannedJson += 1;
  const raw = fs.readFileSync(file, "utf8");
  const value = JSON.parse(raw);
  let changed = false;
  const relative = path.relative(root, file).replaceAll(path.sep, "/");

  const pki = value?.pkiAttestation;
  const isLegacyPseudoTsa = pki && (
    pki.schemaVersion === "velmere.pki.rfc3161.v1" ||
    /RFC\s*3161|Trusted Authority|Root CA/i.test(JSON.stringify(pki))
  );
  if (isLegacyPseudoTsa) {
    const reportDigest = normalizeReportDigest(pki.reportDigest ?? value.reportDigest ?? value.contentDigest);
    if (!reportDigest) {
      stats.skippedMissingReportDigest += 1;
      throw new Error(`r10_migration_missing_report_digest:${relative}`);
    }
    value.pkiAttestation = localAttestation(reportDigest, oldTimestamp(value));
    stats.localAttestationsMigrated += 1;
    changed = true;
  }

  if (value?.dataProvenance?.provenanceHash === "0xprovenance_root") {
    const provenancePayload = { ...value.dataProvenance };
    delete provenancePayload.provenanceHash;
    delete provenancePayload.provenanceIntegrityScope;
    delete provenancePayload.externalProvenanceVerified;
    value.dataProvenance.provenanceHash = `sha256:${sha256Hex(canonicalJson(provenancePayload))}`;
    value.dataProvenance.provenanceIntegrityScope = "LOCAL_RECORD_ONLY";
    value.dataProvenance.externalProvenanceVerified = false;
    stats.provenancePlaceholdersMigrated += 1;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    stats.changedJson += 1;
    changes.push(relative);
  }
}

// Targeted fail-closed verification: the migration is incomplete if any report JSON
// still contains the legacy pseudo-TSA/root-CA semantics or placeholder provenance.
const residual = [];
for (const file of reportRoots.flatMap((dir) => collectJsonFiles(dir)).sort()) {
  const text = fs.readFileSync(file, "utf8");
  if (/Velmère RFC 3161 Trusted Authority|Velmère Root CA v1|"provenanceHash"\s*:\s*"0xprovenance_root"/.test(text)) {
    residual.push(path.relative(root, file).replaceAll(path.sep, "/"));
  }
}
if (residual.length) {
  throw new Error(`r10_migration_residual_legacy_integrity:${residual.length}:${residual.slice(0, 10).join(",")}`);
}

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
const receipt = {
  schemaVersion: "velmere.r10.corpus-integrity-migration.v1",
  context: "R10_CANDIDATE_NO_RELEASE_CREDIT",
  generatedAt: new Date().toISOString(),
  stats,
  changedFiles: changes,
  residualLegacyIntegrityFiles: residual,
  passed: residual.length === 0 && stats.skippedMissingReportDigest === 0,
  limitations: [
    "This migration proves only removal of legacy pseudo-TSA/root-CA semantics and placeholder provenance hashes from report JSON.",
    "It does not prove report-content correctness, external timestamp authority, external provenance authority, market-data licensing, or production readiness.",
    "Real Markets canonical instrument identity is intentionally handled by a separate reviewed migration.",
  ],
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`R10 corpus integrity migration: ${receipt.passed ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(stats));
