#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const registryPath = path.join(root, "config/pass21/provider-commercial-rights-registry.json");
const manifestPath = path.join(root, "config/pass22/provider-rights-evidence-manifest.json");
const outputPath = path.join(root, ".velmere/pass22-diagnostics/provider-rights-evidence-audit.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const providerIds = new Set(registry.providers.map((provider) => provider.id));
const errors = [];
const seenEvidence = new Set();
const seenProviders = new Set();
const now = Date.parse(process.env.VELMERE_EVIDENCE_NOW ?? "2026-07-20T14:30:00.000Z");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const shaPattern = /^[a-f0-9]{64}$/u;
const evidencePattern = /^pre_[a-f0-9]{24}$/u;
const kinds = new Set(["SIGNED_CONTRACT", "ORDER_FORM", "TERMS_SNAPSHOT", "DPA", "LICENSE_ADDENDUM"]);
const decisions = new Set(["APPROVED", "REJECTED", "NEEDS_CLARIFICATION"]);

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function validateEvidence(row, index) {
  const prefix = `evidence[${index}]`;
  if (!row || typeof row !== "object" || Array.isArray(row)) return errors.push(`${prefix}:not_object`);
  if (row.schemaVersion !== "velmere.pass22.provider-rights-evidence.v1") errors.push(`${prefix}:schema_version`);
  if (!providerIds.has(row.providerId)) errors.push(`${prefix}:unknown_provider`);
  if (!evidencePattern.test(row.evidenceId ?? "")) errors.push(`${prefix}:evidence_id`);
  if (seenEvidence.has(row.evidenceId)) errors.push(`${prefix}:duplicate_evidence_id`);
  seenEvidence.add(row.evidenceId);
  if (seenProviders.has(row.providerId)) errors.push(`${prefix}:duplicate_provider_evidence`);
  seenProviders.add(row.providerId);
  if (!kinds.has(row.documentKind)) errors.push(`${prefix}:document_kind`);
  if (!shaPattern.test(row.documentSha256 ?? "")) errors.push(`${prefix}:document_sha256`);
  if (row.sourceLocationHash != null && !shaPattern.test(row.sourceLocationHash)) errors.push(`${prefix}:source_location_hash`);
  if (!validDate(row.capturedAt) || !validDate(row.effectiveAt)) errors.push(`${prefix}:date`);
  if (row.expiresAt != null && !validDate(row.expiresAt)) errors.push(`${prefix}:expiry_date`);
  if (!decisions.has(row.reviewDecision)) errors.push(`${prefix}:decision`);
  if (!row.reviewer || !shaPattern.test(row.reviewer.reviewerIdHash ?? "") || !validDate(row.reviewer.reviewedAt)) errors.push(`${prefix}:reviewer`);
  const rights = row.rights ?? {};
  for (const key of ["displayUseAllowed", "commercialUseAllowed", "redistributionAllowed", "modelTrainingAllowed"]) {
    if (typeof rights[key] !== "boolean") errors.push(`${prefix}:right_${key}`);
  }
  if (row.reviewDecision === "APPROVED") {
    if (row.reviewer?.legalReview !== true) errors.push(`${prefix}:approved_without_legal_review`);
    if (Date.parse(row.effectiveAt) > now) errors.push(`${prefix}:not_yet_effective`);
    if (row.expiresAt != null && Date.parse(row.expiresAt) <= now) errors.push(`${prefix}:expired`);
    if (row.documentKind === "DPA" && (rights.displayUseAllowed || rights.commercialUseAllowed || rights.redistributionAllowed)) {
      errors.push(`${prefix}:dpa_cannot_grant_product_rights`);
    }
    if (rights.redistributionAllowed && !rights.commercialUseAllowed) errors.push(`${prefix}:redistribution_without_commercial_use`);
  } else if (Object.values(rights).some(Boolean)) {
    errors.push(`${prefix}:non_approved_rights_must_be_false`);
  }
}

if (manifest.schemaVersion !== "velmere.pass22.provider-rights-evidence-manifest.v1") errors.push("manifest:schema_version");
if (!Array.isArray(manifest.evidence)) errors.push("manifest:evidence_not_array");
for (const [index, row] of (manifest.evidence ?? []).entries()) validateEvidence(row, index);
const approved = (manifest.evidence ?? []).filter((row) => row.reviewDecision === "APPROVED");
const commerciallyEnabled = approved.filter((row) => row.rights?.commercialUseAllowed === true);
const report = {
  schemaVersion: "velmere.pass22.provider-rights-evidence-audit.v1",
  generatedAt: "2026-07-20T14:30:00.000Z",
  ok: errors.length === 0,
  providersRegistered: registry.providers.length,
  evidenceRecords: manifest.evidence?.length ?? 0,
  approvedEvidenceRecords: approved.length,
  commerciallyEnabledProviders: commerciallyEnabled.length,
  externalRightsVerified: approved.length,
  errors,
  registrySha256: sha256(fs.readFileSync(registryPath)),
  manifestSha256: sha256(fs.readFileSync(manifestPath)),
  status: approved.length === 0 ? "EVIDENCE_PIPELINE_READY_RIGHTS_ZERO_NO_GO_PAID" : errors.length === 0 ? "REVIEWED_EVIDENCE_PRESENT_REQUIRES_STAGING_BINDING" : "FAIL",
  truthBoundary: "Schema-valid evidence proves only the reviewed rights stated in the record. The clean source does not embed raw agreements, and no provider is enabled without external document-hash verification and staging configuration."
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
