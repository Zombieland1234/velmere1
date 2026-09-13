#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const receiptPath = path.join(root, ".velmere/pass23-diagnostics/i18n-release-readiness.json");
const supplementalPath = path.join(root, "config/pass23/i18n-supplemental-value-map.json");
const supplementalRaw = fs.readFileSync(supplementalPath, "utf8");
const supplemental = JSON.parse(supplementalRaw);
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const failures = [];
const rows = Array.isArray(receipt.allIdenticalNonNeutral) ? receipt.allIdenticalNonNeutral : [];
const keys = Array.isArray(supplemental.keys) ? supplemental.keys : [];
const valueMap = supplemental.valueMap && typeof supplemental.valueMap === "object" ? supplemental.valueMap : {};
const sorted = [...keys].sort();
const keyDigest = crypto.createHash("sha256").update(sorted.join("\n")).digest("hex");
const rowByKey = new Map(rows.map((row) => [row.key, row]));
if (receipt.summary?.draftTranslationCount !== 300) failures.push("primary_receipt_translation_count");
if (receipt.summary?.identicalNonNeutral !== 359) failures.push("primary_receipt_identical_denominator");
if (receipt.summary?.criticalIdenticalNonNeutral !== 0) failures.push("primary_receipt_critical_identical_not_zero");
if (receipt.summary?.criticalEnglishLeakCandidates !== 0) failures.push("primary_receipt_critical_leaks_not_zero");
if (supplemental.sourceSubjectSha !== "c9e194e21804c55c27ccecfac537814d62a66493") failures.push("supplemental_source_subject");
if (supplemental.reviewStatus !== "PENDING_NATIVE_REVIEW") failures.push("supplemental_review_false_pass");
if (supplemental.expectedKeyCount !== 359 || keys.length !== 359) failures.push("supplemental_key_denominator");
if (new Set(keys).size !== 359) failures.push("supplemental_duplicate_keys");
if (supplemental.expectedSourceValueCount !== 211 || Object.keys(valueMap).length !== 211) failures.push("supplemental_source_value_denominator");
if (keyDigest !== supplemental.sortedKeySha256) failures.push("supplemental_key_digest");
if (rowByKey.size !== 359) failures.push("primary_receipt_unique_key_denominator");
if (sorted.some((key) => !rowByKey.has(key))) failures.push("supplemental_key_missing_from_red_receipt");
if ([...rowByKey.keys()].some((key) => !keys.includes(key))) failures.push("red_receipt_key_missing_from_supplemental");
for (const key of keys) {
  const source = String(rowByKey.get(key)?.value ?? "").replace(/\s+/gu, " ").trim();
  const mapped = valueMap[source];
  if (!source || !mapped || typeof mapped.pl !== "string" || typeof mapped.de !== "string") { failures.push(`supplemental_source_unmapped:${key}`); continue; }
  const pl = mapped.pl.replace(/\s+/gu, " ").trim();
  const de = mapped.de.replace(/\s+/gu, " ").trim();
  if (!pl || !de) failures.push(`supplemental_translation_empty:${key}`);
  if (new Set([source, pl, de]).size === 1) failures.push(`supplemental_translation_no_effect:${key}`);
}
if (failures.length === 0) {
  const supplementalSha256 = crypto.createHash("sha256").update(supplementalRaw).digest("hex");
  const preRows = receipt.allIdenticalNonNeutral;
  receipt.schemaVersion = "velmere.pass23.i18n-release-readiness.v2";
  receipt.truthBoundary = "Two-stage static locale audit. The preserved primary receipt identified exactly 359 non-critical identical values after the 300-value draft wave. A source-bound supplemental map tied to that exact red subject covers those same 359 keys and is consumed by runtime before explicit release overrides. This closes static identical-value coverage only; all 659 model-assisted draft values remain PENDING_NATIVE_REVIEW and browser overflow execution remains separate. Merchant/legal GO is unchanged.";
  receipt.summary = { ...receipt.summary, primaryDraftTranslationCount: 300, supplementalDraftTranslationCount: 359, supplementalSourceValueCount: 211, supplementalSourceSubjectSha: supplemental.sourceSubjectSha, draftTranslationCount: 659, draftTranslationReviewStatus: "PENDING_NATIVE_REVIEW", preSupplementalIdenticalNonNeutral: 359, identicalNonNeutral: 0 };
  for (const locale of ["pl", "de"]) if (receipt.effectiveCatalogSources?.[locale]) {
    receipt.effectiveCatalogSources[locale].supplementalTranslationPath = "config/pass23/i18n-supplemental-value-map.json";
    receipt.effectiveCatalogSources[locale].supplementalTranslationSha256 = supplementalSha256;
    receipt.effectiveCatalogSources[locale].supplementalTranslationCount = 359;
    receipt.effectiveCatalogSources[locale].supplementalSourceValueCount = 211;
    receipt.effectiveCatalogSources[locale].supplementalSourceSubjectSha = supplemental.sourceSubjectSha;
    receipt.effectiveCatalogSources[locale].translationReviewStatus = "PENDING_NATIVE_REVIEW";
  }
  receipt.preSupplementalIdenticalNonNeutral = preRows;
  receipt.allIdenticalNonNeutral = [];
}
const report = { schemaVersion: "velmere.pass23.i18n-supplemental-effective-verification.v1", sourceSubjectSha: supplemental.sourceSubjectSha ?? null, primaryRedDenominator: rows.length, supplementalKeyDenominator: keys.length, supplementalSourceValueDenominator: Object.keys(valueMap).length, postSupplementalIdenticalNonNeutral: failures.length === 0 ? 0 : null, reviewStatus: supplemental.reviewStatus ?? null, failures, ok: failures.length === 0, truthBoundary: "PASS proves exact set equality between the preserved 359-row red receipt and the source-bound supplemental draft map, plus non-empty PL/DE replacements that break each identical triple. It does not prove native-language quality, legal approval, brand voice, browser rendering or commercial readiness." };
const reportPath = path.join(root, ".velmere/pass23-diagnostics/i18n-supplemental-effective-verification.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length === 0) fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
