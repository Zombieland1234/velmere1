#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const file = "config/pass21/provider-commercial-rights-registry.json";
const registryPath = path.join(root, file);
const registryBytes = fs.readFileSync(registryPath);
const registry = JSON.parse(registryBytes.toString("utf8"));

const errors = [];
const warnings = [];
const ids = new Set();
let externalVerified = 0;
let codePresent = 0;
let boundEvidenceCount = 0;
let referenceOnlyCount = 0;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isDigest(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

for (const p of registry.providers ?? []) {
  if (!p.id || ids.has(p.id)) errors.push(`duplicate_or_missing_id:${p.id}`);
  ids.add(p.id);

  if (p.technicalState === "CODE_PRESENT") codePresent++;
  for (const rel of p.integrationPaths ?? []) {
    if (!fs.existsSync(path.join(root, rel))) errors.push(`missing_integration:${p.id}:${rel}`);
  }

  const evidence = p.evidence ?? [];
  const grantsAnyCustomerRight = Boolean(
    p.commercialUseAllowed || p.redistributionAllowed || p.displayUseAllowed || p.modelTrainingAllowed,
  );

  if (p.rightsState === "VERIFIED") externalVerified++;
  if (grantsAnyCustomerRight && p.rightsState !== "VERIFIED") {
    errors.push(`rights_without_verification:${p.id}`);
  }
  if (p.rightsState === "VERIFIED" && evidence.length === 0) {
    errors.push(`verified_without_evidence:${p.id}`);
  }

  let providerBoundEvidence = 0;
  for (const e of evidence) {
    const hasPath = typeof e?.path === "string" && e.path.trim().length > 0;
    const hasHash = isDigest(e?.sha256);

    // A URL/label/terms note is useful research context, but it is not a byte-bound
    // rights receipt. Keep it visible as REFERENCE_ONLY and grant it zero rights credit.
    if (!hasPath && !hasHash) {
      referenceOnlyCount++;
      warnings.push(`reference_only_evidence:${p.id}:${e?.type ?? "unknown"}`);
      continue;
    }

    if (!hasPath || !hasHash) {
      errors.push(`incomplete_bound_evidence:${p.id}:${e?.type ?? "unknown"}`);
      continue;
    }

    const abs = path.join(root, e.path);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      errors.push(`missing_evidence_file:${p.id}:${e.path}`);
      continue;
    }

    const actual = sha256(fs.readFileSync(abs));
    if (actual.toLowerCase() !== e.sha256.toLowerCase()) {
      errors.push(`evidence_hash_mismatch:${p.id}:${e.path}`);
      continue;
    }

    boundEvidenceCount++;
    providerBoundEvidence++;
  }

  if (p.rightsState === "VERIFIED" && providerBoundEvidence === 0) {
    errors.push(`verified_without_byte_bound_evidence:${p.id}`);
  }
}

const required = [
  "binance", "coingecko", "coinbase", "kraken", "alpha_vantage", "twelve_data", "polygon",
  "coinmarketcap", "defillama", "etherscan", "alchemy", "quicknode", "gemini", "openai",
  "angel_external", "printful", "tapstitch", "contrado", "stripe", "supabase", "resend",
];
for (const id of required) if (!ids.has(id)) errors.push(`missing_required_provider:${id}`);

const dataSummary = JSON.parse(
  fs.readFileSync(path.join(root, "evaluation/pass20/data-field-provider-license-summary.json"), "utf8"),
);
if (
  dataSummary.providerBoundCells !== 0 ||
  dataSummary.licenseVerifiedCells !== 0 ||
  dataSummary.sellEligibleCells !== 0
) {
  errors.push("pass20_zero_truth_changed_without_provider_receipts");
}

const result = {
  schemaVersion: "velmere.pass21.provider-rights-audit.v2",
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  providers: ids.size,
  codePresent,
  externalRightsVerified: externalVerified,
  commerciallyEnabledProviders: (registry.providers ?? []).filter((p) => p.commercialUseAllowed).length,
  boundEvidenceCount,
  referenceOnlyCount,
  providerBoundCells: dataSummary.providerBoundCells,
  licenseVerifiedCells: dataSummary.licenseVerifiedCells,
  sellEligibleCells: dataSummary.sellEligibleCells,
  errors,
  warnings,
  registrySha256: sha256(registryBytes),
  status:
    errors.length > 0
      ? "REGISTRY_EVIDENCE_INTEGRITY_FAIL"
      : externalVerified === 0
        ? "REGISTRY_INTEGRITY_PASS_EXTERNAL_RIGHTS_ZERO_NO_GO_PAID"
        : "PARTIAL_RIGHTS_BYTE_BOUND",
  truthBoundary:
    "URL/label/terms references are research context only. Commercial/display/PDF/redistribution rights receive credit only from byte-bound evidence with a matching SHA-256 and an explicit VERIFIED rights state. API access alone grants no rights.",
};

const out = path.join(root, ".velmere/pass21-diagnostics/provider-rights-audit.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
