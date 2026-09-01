#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const failures = [];
const checks = [];
const surfaces = ["shield", "real_markets", "smart_contract_audit", "lens_pdf", "vlm_brain", "angel"];
const tiers = ["basic", "pro", "advanced"];
function record(name, ok, detail = undefined) {
  checks.push({ name, ok, ...(detail === undefined ? {} : { detail }) });
  if (!ok) failures.push({ name, detail });
}
function uniqueStrings(values) { return Array.isArray(values) && values.every((v) => typeof v === "string" && v.length > 0) && new Set(values).size === values.length; }

record("schema", contract.schemaVersion === "velmere.pass16.worldclass-output-contract.v1", contract.schemaVersion);
record("common_fields", uniqueStrings(contract.commonRequiredFields) && contract.commonRequiredFields.length >= 12, contract.commonRequiredFields);
record("status_set", JSON.stringify(contract.statuses) === JSON.stringify(["passed", "blocked", "failed"]));
record("surface_set", JSON.stringify(Object.keys(contract.surfaceRequirements).sort()) === JSON.stringify([...surfaces].sort()));
record("locale_set", JSON.stringify(contract.localeRequirements.supported) === JSON.stringify(["pl", "en", "de"]));
record("no_silent_fallback", contract.localeRequirements.silentEnglishFallbackForbidden === true);
for (const tier of tiers) {
  const row = contract.tierRequirements[tier];
  record(`${tier}:exists`, Boolean(row));
  record(`${tier}:required_fields`, uniqueStrings(row?.requiredFields) && row.requiredFields.length > 0, row?.requiredFields);
  record(`${tier}:source_floor`, Number.isInteger(row?.minimumIndependentSourceFamilies) && row.minimumIndependentSourceFamilies >= 1, row?.minimumIndependentSourceFamilies);
}
record("pro_fail_closed", contract.tierRequirements.pro.mustBlockOnMissingEvidence === true);
record("advanced_fail_closed", contract.tierRequirements.advanced.mustBlockOnMissingEvidence === true);
record("tier_value_differentiation", contract.tierRequirements.pro.mustDifferMateriallyFromBasic === true && contract.tierRequirements.advanced.mustDifferMateriallyFromPro === true);
for (const surface of surfaces) {
  record(`${surface}:fields`, uniqueStrings(contract.surfaceRequirements[surface]) && contract.surfaceRequirements[surface].length >= 5, contract.surfaceRequirements[surface]);
}
record("advanced_audit_human_review", contract.advancedAuditHumanReview.required === true && uniqueStrings(contract.advancedAuditHumanReview.requiredFields));
record("advanced_audit_approved_only", JSON.stringify(contract.advancedAuditHumanReview.allowedReviewStatusForRelease) === JSON.stringify(["approved"]));
record("pdf_parity", contract.pdfParityRule.required === true && contract.pdfParityRule.condition.includes("previewHash") && contract.pdfParityRule.condition.includes("accountCopyHash"));

for (const row of corpus.cases) {
  for (const tier of tiers) {
    const expected = row.expectedByTier[tier];
    record(`${row.id}:${tier}:source_floor_compatible`, expected.minSourceFamilies >= contract.tierRequirements[tier].minimumIndependentSourceFamilies, {
      corpus: expected.minSourceFamilies,
      contract: contract.tierRequirements[tier].minimumIndependentSourceFamilies,
    });
    if (tier !== "basic") record(`${row.id}:${tier}:corpus_fail_closed`, expected.mustFailClosedOnMissingEvidence === true);
    if (row.surface === "smart_contract_audit" && tier === "advanced") record(`${row.id}:advanced_review`, expected.requiresHumanReview === true);
  }
}

const result = {
  schemaVersion: "velmere.pass16.worldclass-output-contract-verification.v1",
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: failures.length, surfaces: surfaces.length, tiers: tiers.length },
  truthBoundary: "Static contract verification only. No product output is evaluated by this script.",
  failures,
};
const out = path.join(root, ".velmere/pass16-diagnostics/worldclass-output-contract-verification.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (!result.ok) process.exit(1);
