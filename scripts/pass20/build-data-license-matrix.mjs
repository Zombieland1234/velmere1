#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass20/data-commercialization-policy.json"), "utf8"));
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const outputDirectory = path.join(root, "evaluation/pass20");
fs.mkdirSync(outputDirectory, { recursive: true });
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function sha256(value) { return createHash("sha256").update(typeof value === "string" ? value : canonical(value)).digest("hex"); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function profileFor(fieldId) {
  const entries = Object.entries(policy.fieldProfiles).sort((a, b) => b[0].length - a[0].length);
  const match = entries.find(([prefix]) => fieldId.startsWith(prefix));
  if (!match) throw new Error(`No PASS20 field profile for ${fieldId}`);
  return match[1];
}
function identityFor(row) {
  const input = row.input ?? {};
  if (row.surface === "shield" || row.surface === "real_markets") return `${String(input.assetClass ?? "unknown").toLowerCase()}:${String(input.symbol ?? row.id).toLowerCase()}`;
  if (row.surface === "smart_contract_audit") return `contract-fixture:${String(input.fixtureSha256 ?? row.fingerprint)}`;
  if (row.surface === "lens_pdf") return `${String(input.reportKind ?? "report")}:${String(input.entity ?? row.id).toLowerCase()}`;
  if (row.surface === "vlm_brain") return `brain:${String(input.topic ?? row.id)}`;
  return `angel:${row.id}`;
}
const rows = [];
for (const caseRow of corpus.cases) {
  for (const tier of policy.releaseRules ? ["basic", "pro", "advanced"] : []) {
    const fields = policy.surfaceFields?.[caseRow.surface]?.[tier];
    if (!Array.isArray(fields) || !fields.length) throw new Error(`Missing fields for ${caseRow.surface}/${tier}`);
    const tierRule = policy.releaseRules[tier];
    const caseTier = caseRow.expectedByTier?.[tier] ?? {};
    for (const fieldId of fields) {
      const profile = profileFor(fieldId);
      const freshnessClass = profile.freshnessClass;
      const maxAgeSeconds = Number(policy.freshnessSeconds[freshnessClass]);
      const requiredSourceFamilies = unique([...(profile.sourceFamilies ?? []), ...(caseRow.evidencePolicy?.requiredFamilies ?? [])]);
      const specialGates = tier === "advanced" ? (policy.advancedSpecialGates?.[caseRow.surface] ?? []) : [];
      const minimumIndependentFamilies = Math.max(Number(tierRule.minimumIndependentFamilies ?? 1), Number(caseTier.minSourceFamilies ?? 1));
      const canonicalIdentity = identityFor(caseRow);
      const cellBase = { caseId: caseRow.id, surface: caseRow.surface, tier, fieldId, canonicalIdentity };
      rows.push({
        schemaVersion: "velmere.pass20.data-license-cell.v1",
        cellId: sha256(cellBase),
        ...cellBase,
        category: caseRow.category,
        freshnessClass,
        maxAgeSeconds,
        requiredSourceFamilies,
        minimumIndependentFamilies,
        allowedLicenseStates: tierRule.allowedLicenseStates,
        requiresCommercialRights: Boolean(tierRule.requiresCommercialRights),
        requiresEntitlement: Boolean(tierRule.requiresEntitlement),
        specialGates,
        currentEvidenceStatus: "missing_provider_bound_evidence",
        currentLicenseStatus: "unverified",
        currentProviderBoundEvidenceRows: 0,
        currentSellEligible: false,
        truthBoundary: "Prepared requirement cell only; it is not a provider observation, license grant, rendered artifact, staging or LIVE proof."
      });
    }
  }
}
rows.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.tier.localeCompare(b.tier) || a.fieldId.localeCompare(b.fieldId));
const ids = new Set(rows.map((row) => row.cellId));
if (ids.size !== rows.length) throw new Error("Duplicate PASS20 data/license cell ID");
const jsonl = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
const countsBySurfaceTier = {};
for (const row of rows) {
  const key = `${row.surface}:${row.tier}`;
  countsBySurfaceTier[key] = (countsBySurfaceTier[key] ?? 0) + 1;
}
const summary = {
  schemaVersion: "velmere.pass20.data-license-matrix-summary.v1",
  generatedAt: "2026-07-20T12:00:00.000Z",
  truthBoundary: policy.truthBoundary,
  corpusSha256: corpus.corpusSha256,
  policySha256: sha256(policy),
  matrixSha256: sha256(jsonl),
  baseCases: corpus.cases.length,
  surfaces: unique(corpus.cases.map((row) => row.surface)).length,
  tiers: 3,
  requirementCells: rows.length,
  providerBoundCells: 0,
  licenseVerifiedCells: 0,
  sellEligibleCells: 0,
  countsBySurfaceTier,
  status: "PREPARED_REQUIREMENTS_NO_PROVIDER_BOUND_EVIDENCE",
  releaseEligibility: { basic: false, pro: false, advanced: false }
};
fs.writeFileSync(path.join(outputDirectory, "data-field-provider-license-matrix.jsonl"), jsonl, "utf8");
fs.writeFileSync(path.join(outputDirectory, "data-field-provider-license-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ baseCases: summary.baseCases, requirementCells: summary.requirementCells, providerBoundCells: 0, sellEligibleCells: 0, matrixSha256: summary.matrixSha256 }, null, 2));
