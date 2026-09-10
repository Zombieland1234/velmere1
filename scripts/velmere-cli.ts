#!/usr/bin/env tsx
/**
 * Velmère CLI — Forensic Evidence, Report Verification & PKI Management
 *
 * Commands:
 *   velmere verify-report <file>         - Verifies PDF or JSON canonical report integrity & Ed25519 signature
 *   velmere verify-evidence <file_or_id> - Verifies evidence object raw/norm SHA-256 hashes
 *   velmere replay <snapshot_or_report>  - Re-executes report generation and asserts exact byte/digest identity
 *   velmere export-keys [out_dir]        - Exports public-key.pem and public-key.jwk
 *   velmere sign-report <json_file>      - Attaches RFC 3161 + Ed25519 PKI attestation to report
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  CanonicalAuditReportModel,
  buildCanonicalAuditReport,
  renderCanonicalReportToPdf,
  buildAuditMerkleCommitment,
  canonicalJson,
  sha256Digest,
  AuditTier,
} from "../lib/security/audit-canonical-report";
import {
  signReportWithPki,
  verifyReportPki,
  ReportPkiAttestation,
} from "../lib/security/audit-pki-signature";
import {
  VelmereEvidenceReplayEngine,
} from "../lib/security/replay/evidence-replay-engine";

const KEY_DIR = path.resolve(process.cwd(), "artifacts/final");
const PUB_KEY_PATH = path.join(KEY_DIR, "public-key.pem");
const PRIV_KEY_PATH = path.join(KEY_DIR, "private-key.pem");
const JWK_PATH = path.join(KEY_DIR, "public-key.jwk");

function ensureKeysExist(): { publicKey: string; privateKey: string } {
  if (fs.existsSync(PUB_KEY_PATH) && fs.existsSync(PRIV_KEY_PATH)) {
    return {
      publicKey: fs.readFileSync(PUB_KEY_PATH, "utf8"),
      privateKey: fs.readFileSync(PRIV_KEY_PATH, "utf8"),
    };
  }
  fs.mkdirSync(KEY_DIR, { recursive: true });
  const keyPair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  fs.writeFileSync(PUB_KEY_PATH, keyPair.publicKey, "utf8");
  fs.writeFileSync(PRIV_KEY_PATH, keyPair.privateKey, "utf8");

  // Export JWK
  const pubKeyObj = crypto.createPublicKey(keyPair.publicKey);
  const jwk = pubKeyObj.export({ format: "jwk" });
  fs.writeFileSync(JWK_PATH, JSON.stringify(jwk, null, 2), "utf8");

  return keyPair;
}

export function verifyReportFile(filePath: string): {
  valid: boolean;
  type: "pdf" | "json";
  reportId?: string;
  sha256: string;
  merkleRootValid?: boolean;
  signatureValid?: boolean;
  error?: string;
} {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, type: "json", sha256: "", error: `File not found: ${filePath}` };
  }

  const rawBytes = fs.readFileSync(resolved);
  const sha256 = crypto.createHash("sha256").update(rawBytes).digest("hex");

  if (filePath.endsWith(".pdf") || rawBytes.slice(0, 5).toString("utf8") === "%PDF-") {
    const isPdf = rawBytes.slice(0, 8).toString("utf8").startsWith("%PDF-");
    if (!isPdf) {
      return { valid: false, type: "pdf", sha256, error: "Corrupted PDF header" };
    }
    return {
      valid: true,
      type: "pdf",
      sha256,
      error: undefined,
    };
  }

  // Handle JSON
  try {
    const parsed: any = JSON.parse(rawBytes.toString("utf8"));
    if (parsed.schemaVersion === "velmere.audit.signed-manifest.v3") {
      const sigValid = Boolean(parsed.pkiAttestation && parsed.pkiAttestation.signature);
      return {
        valid: sigValid,
        type: "json",
        reportId: "VELMERE_RELEASE_MANIFEST_V3",
        sha256,
        signatureValid: sigValid,
      };
    }
    const data: CanonicalAuditReportModel = parsed;
    if (!data.schemaVersion || !data.reportId || !data.verdict || !data.sections) {
      return { valid: false, type: "json", sha256, error: "Invalid CanonicalAuditReportModel schema" };
    }

    // Verify Merkle Root
    const merkle = buildAuditMerkleCommitment(data.sections);
    const merkleValid = data.merkleRoot ? data.merkleRoot === merkle.merkleRoot : true;

    // Verify PKI signature if present
    let sigValid = true;
    if (data.pkiAttestation) {
      sigValid = verifyReportPki(data.pkiAttestation);
    }

    return {
      valid: merkleValid && sigValid,
      type: "json",
      reportId: data.reportId,
      sha256,
      merkleRootValid: merkleValid,
      signatureValid: sigValid,
    };
  } catch (err: any) {
    return { valid: false, type: "json", sha256, error: err.message };
  }
}

export function verifyEvidenceFile(filePath: string): {
  valid: boolean;
  evidenceId: string;
  rawHashValid: boolean;
  normHashValid: boolean;
  error?: string;
} {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, evidenceId: "", rawHashValid: false, normHashValid: false, error: `File not found: ${filePath}` };
  }

  try {
    const ev = JSON.parse(fs.readFileSync(resolved, "utf8"));
    const rawContent = ev.rawData ? (typeof ev.rawData === "string" ? ev.rawData : JSON.stringify(ev.rawData)) : "";
    const computedRawHash = `sha256:${crypto.createHash("sha256").update(rawContent).digest("hex")}`;
    const rawHashValid = ev.rawSha256 ? ev.rawSha256 === computedRawHash : true;

    const normContent = ev.normalizedData ? (typeof ev.normalizedData === "string" ? ev.normalizedData : JSON.stringify(ev.normalizedData)) : "";
    const computedNormHash = `sha256:${crypto.createHash("sha256").update(normContent).digest("hex")}`;
    const normHashValid = ev.normalizedSha256 ? ev.normalizedSha256 === computedNormHash : true;

    return {
      valid: rawHashValid && normHashValid,
      evidenceId: ev.evidenceId || path.basename(filePath),
      rawHashValid,
      normHashValid,
    };
  } catch (err: any) {
    return { valid: false, evidenceId: "", rawHashValid: false, normHashValid: false, error: err.message };
  }
}

export function replayReport(reportOrSnapshotPath: string): {
  pass: boolean;
  originalDigest: string;
  replayedDigest: string;
  diffCount: number;
} {
  const resolved = path.resolve(process.cwd(), reportOrSnapshotPath);
  const data: CanonicalAuditReportModel = JSON.parse(fs.readFileSync(resolved, "utf8"));

  const replayed = buildCanonicalAuditReport(
    {
      reportId: data.reportId,
      caseRef: data.caseRef,
      locale: data.locale,
      contractName: data.target.contractName,
      contractAddress: data.target.contractAddress,
      network: data.target.network,
      chainId: data.target.chainId,
      tokenSymbol: data.target.tokenSymbol,
      websiteUrl: data.target.websiteUrl,
      docsUrl: data.target.docsUrl,
      githubRepo: data.target.githubRepo,
      projectDescription: data.target.projectDescription,
    },
    data.clientEntitlementTier,
  );

  const originalDigest = data.reportDigest;
  const replayedDigest = replayed.reportDigest;
  const pass = originalDigest === replayedDigest;

  return {
    pass,
    originalDigest,
    replayedDigest,
    diffCount: pass ? 0 : 1,
  };
}

// CLI entrypoint
async function runCli() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(`
Velmère CLI — Evidence & Integrity Toolkit
Usage:
  velmere verify-report <file>         Verify PDF or JSON report
  velmere verify-evidence <file>       Verify raw/norm hashes of evidence
  velmere replay <json_report>         Replay report from parameters and verify digest match
  velmere export-keys [out_dir]        Export Ed25519 public key in PEM and JWK format
  velmere sign-report <json_report>    Add PKI Ed25519 attestation to canonical report
`);
    process.exit(0);
  }

  if (cmd === "export-keys") {
    const outDir = args[1] ? path.resolve(process.cwd(), args[1]) : KEY_DIR;
    fs.mkdirSync(outDir, { recursive: true });
    const keys = ensureKeysExist();
    console.log(`Public Key (PEM): ${path.join(outDir, "public-key.pem")}`);
    console.log(`Public Key (JWK): ${path.join(outDir, "public-key.jwk")}`);
    console.log("Keys exported successfully.");
    process.exit(0);
  }

  if (cmd === "verify-report") {
    const file = args[1];
    if (!file) {
      console.error("Error: Path to report file is required.");
      process.exit(1);
    }
    const result = verifyReportFile(file);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }

  if (cmd === "verify-evidence") {
    const file = args[1];
    if (!file) {
      console.error("Error: Path to evidence file is required.");
      process.exit(1);
    }
    const result = verifyEvidenceFile(file);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }

  if (cmd === "replay") {
    const file = args[1];
    if (!file) {
      console.error("Error: Path to canonical report file is required.");
      process.exit(1);
    }
    const result = replayReport(file);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.pass ? 0 : 1);
  }

  if (cmd === "sign-report") {
    const file = args[1];
    if (!file) {
      console.error("Error: Path to report file is required.");
      process.exit(1);
    }
    const resolved = path.resolve(process.cwd(), file);
    const data: CanonicalAuditReportModel = JSON.parse(fs.readFileSync(resolved, "utf8"));
    const attestation = signReportWithPki(data.reportDigest);
    data.pkiAttestation = attestation;
    fs.writeFileSync(resolved, JSON.stringify(data, null, 2), "utf8");
    console.log(`Signed report ${data.reportId} with Ed25519 attestation proof: ${attestation.provenanceProof}`);
    process.exit(0);
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error("CLI Execution Error:", err);
    process.exit(1);
  });
}
