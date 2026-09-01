#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const corpusPath = path.join(root, "evaluation/pass16/worldclass-base-corpus.json");
const matrixPath = path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl");
const csvPath = path.join(root, "evaluation/pass16/worldclass-2700-matrix.csv");
const summaryPath = path.join(root, "evaluation/pass16/worldclass-2700-summary.json");
const contractsPath = path.join(root, "evaluation/pass16/smart-contract-fixture-manifest.json");
const policyPath = path.join(root, "config/pass16/worldclass-evaluation-policy.json");

const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const contractManifest = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const matrix = fs.readFileSync(matrixPath, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const csvLines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/u);

const failures = [];
const checks = [];
function hashBytes(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hashObject(value) { return hashBytes(Buffer.from(stable(value), "utf8")); }
function record(name, ok, detail = undefined) {
  checks.push({ name, ok, ...(detail === undefined ? {} : { detail }) });
  if (!ok) failures.push({ name, detail });
}

const surfaces = ["shield", "real_markets", "smart_contract_audit", "lens_pdf", "vlm_brain", "angel"];
const tiers = ["basic", "pro", "advanced"];
const locales = ["pl", "en", "de"];
record("corpus_schema", corpus.schemaVersion === "velmere.pass16.worldclass-corpus.v1", corpus.schemaVersion);
record("base_case_count", corpus.cases.length === 300, corpus.cases.length);
record("surface_set", JSON.stringify([...new Set(corpus.cases.map((row) => row.surface))].sort()) === JSON.stringify([...surfaces].sort()));
record("tier_set", JSON.stringify(corpus.tiers) === JSON.stringify(tiers), corpus.tiers);
record("locale_set", JSON.stringify(corpus.locales) === JSON.stringify(locales), corpus.locales);
record("corpus_hash", hashObject(corpus.cases) === corpus.corpusSha256, { expected: corpus.corpusSha256, actual: hashObject(corpus.cases) });

const ids = new Set();
const fingerprints = new Set();
for (const surface of surfaces) {
  const rows = corpus.cases.filter((row) => row.surface === surface);
  record(`${surface}:count_50`, rows.length === 50, rows.length);
  record(`${surface}:category_diversity`, new Set(rows.map((row) => row.category)).size >= 4, new Set(rows.map((row) => row.category)).size);
}
for (const row of corpus.cases) {
  const prefixOk = row.id.startsWith(`${row.surface}-`);
  record(`${row.id}:id_prefix`, prefixOk);
  record(`${row.id}:unique_id`, !ids.has(row.id)); ids.add(row.id);
  record(`${row.id}:unique_fingerprint`, !fingerprints.has(row.fingerprint)); fingerprints.add(row.fingerprint);
  record(`${row.id}:fingerprint_valid`, hashObject({
    surface: row.surface,
    category: row.category,
    input: row.input,
    adversarialFlags: row.adversarialFlags,
    evidencePolicy: row.evidencePolicy,
    expectedByTier: row.expectedByTier,
  }) === row.fingerprint);
  record(`${row.id}:locales_exact`, JSON.stringify(row.localePolicy?.requiredLocales) === JSON.stringify(locales));
  record(`${row.id}:no_english_fallback`, row.localePolicy?.mustNotFallbackToEnglish === true);
  for (const tier of tiers) {
    const expected = row.expectedByTier?.[tier];
    record(`${row.id}:${tier}:expectation`, Boolean(expected));
    if (!expected) continue;
    record(`${row.id}:${tier}:outcome`, typeof expected.outcome === "string" && expected.outcome.length > 2);
    record(`${row.id}:${tier}:sections`, Array.isArray(expected.requiredSections) && expected.requiredSections.length >= 4, expected.requiredSections);
    record(`${row.id}:${tier}:source_floor`, Number.isInteger(expected.minSourceFamilies) && expected.minSourceFamilies >= 1, expected.minSourceFamilies);
    if (tier !== "basic") record(`${row.id}:${tier}:paid_fail_closed`, expected.mustFailClosedOnMissingEvidence === true);
    if (row.surface === "smart_contract_audit" && tier === "advanced") {
      record(`${row.id}:${tier}:human_review`, expected.requiresHumanReview === true);
    }
  }
  const basic = row.expectedByTier.basic;
  const pro = row.expectedByTier.pro;
  const advanced = row.expectedByTier.advanced;
  record(`${row.id}:tier_value_not_identical`, stable(basic) !== stable(pro) && stable(pro) !== stable(advanced));
}

record("matrix_count", matrix.length === 2700, matrix.length);
record("csv_count", csvLines.length === 2701, csvLines.length);
const matrixIds = new Set();
const coverage = new Map();
for (const row of matrix) {
  record(`${row.matrixId}:unique`, !matrixIds.has(row.matrixId)); matrixIds.add(row.matrixId);
  record(`${row.matrixId}:not_executed`, row.status === "NOT_EXECUTED" && row.evidenceReceipt === null, { status: row.status, evidenceReceipt: row.evidenceReceipt });
  const base = corpus.cases.find((item) => item.id === row.caseId);
  record(`${row.matrixId}:base_exists`, Boolean(base));
  if (!base) continue;
  const expected = base.expectedByTier[row.tier];
  record(`${row.matrixId}:surface_match`, row.surface === base.surface);
  record(`${row.matrixId}:category_match`, row.category === base.category);
  record(`${row.matrixId}:input_fingerprint`, row.inputFingerprint === base.fingerprint);
  record(`${row.matrixId}:outcome_match`, row.expectedOutcome === expected.outcome);
  record(`${row.matrixId}:tier_known`, tiers.includes(row.tier));
  record(`${row.matrixId}:locale_known`, locales.includes(row.locale));
  const fingerprintPayload = {
    matrixId: row.matrixId,
    caseId: row.caseId,
    surface: row.surface,
    category: row.category,
    tier: row.tier,
    locale: row.locale,
    inputFingerprint: row.inputFingerprint,
    expectedOutcome: row.expectedOutcome,
    mustFailClosedOnMissingEvidence: row.mustFailClosedOnMissingEvidence,
    requiresHumanReview: row.requiresHumanReview,
    minSourceFamilies: row.minSourceFamilies,
    requiredSections: row.requiredSections,
  };
  record(`${row.matrixId}:fingerprint`, hashObject(fingerprintPayload) === row.matrixFingerprint);
  coverage.set(row.caseId, (coverage.get(row.caseId) ?? 0) + 1);
}
record("matrix_all_cases_nine_rows", [...coverage.values()].length === 300 && [...coverage.values()].every((count) => count === 9), {
  coveredCases: coverage.size,
  nonNine: [...coverage.entries()].filter(([, count]) => count !== 9).slice(0, 20),
});
record("summary_prepared", summary.status === "PREPARED_NOT_EXECUTED" && summary.executedCanonicalCases === 0);
record("summary_hash", summary.corpusSha256 === corpus.corpusSha256);
record("policy_surfaces", JSON.stringify(policy.surfaces) === JSON.stringify(surfaces));
record("policy_no_fixture_live_claim", policy.releaseRules?.all?.includes("never count") === true);

record("contract_manifest_count", contractManifest.fixtures.length === 50, contractManifest.fixtures.length);
record("contract_manifest_hash", hashObject(contractManifest.fixtures) === contractManifest.manifestSha256);
const contractShas = new Set();
let vulnerable = 0;
let clean = 0;
let ambiguous = 0;
for (const fixture of contractManifest.fixtures) {
  const absolute = path.join(root, fixture.file);
  record(`${fixture.id}:exists`, fs.existsSync(absolute), fixture.file);
  if (!fs.existsSync(absolute)) continue;
  const bytes = fs.readFileSync(absolute);
  const text = bytes.toString("utf8");
  record(`${fixture.id}:sha`, hashBytes(bytes) === fixture.sha256);
  record(`${fixture.id}:unique_source`, !contractShas.has(fixture.sha256)); contractShas.add(fixture.sha256);
  record(`${fixture.id}:license_and_pragma`, text.startsWith("// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;"));
  if (fixture.cleanControl) clean += 1;
  else if (fixture.ambiguousControl) ambiguous += 1;
  else if (fixture.expectedFindings.length > 0) vulnerable += 1;
  record(`${fixture.id}:expected_findings_shape`, Array.isArray(fixture.expectedFindings));
}
record("contract_control_balance", vulnerable >= 20 && clean >= 15 && ambiguous >= 1, { vulnerable, clean, ambiguous });

const result = {
  schemaVersion: "velmere.pass16.worldclass-corpus-verification.v1",
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  summary: {
    baseCases: corpus.cases.length,
    expandedCases: matrix.length,
    surfaces: surfaces.length,
    contracts: contractManifest.fixtures.length,
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
    canonicalExecuted: 0,
  },
  truthBoundary: "This verifies corpus integrity and acceptance contracts only. It does not execute product outputs and does not prove build, browser, PDF, staging or LIVE behavior.",
  failures,
};
const out = path.join(root, ".velmere/pass16-diagnostics/worldclass-corpus-verification.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (!result.ok) process.exit(1);
