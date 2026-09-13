#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const CORPUS_PATH = path.join(root, "evaluation/pass16/worldclass-base-corpus.json");
const MATRIX_PATH = path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl");
const OUTPUT_PATH = path.join(root, ".velmere/pass12-diagnostics/final-180-freeze.json");
const EXPECTED_CORPUS_SHA256 = "c4b4d9b7854c31dd0f8a3b391c0f7b708caa47810819519a14e6254d3dbc9d0e";
const SELECTION_SEED = "velmere-r11b-f12-final180-v1";
const SURFACES = ["shield", "real_markets", "smart_contract_audit"];
const TIERS = ["basic", "pro", "advanced"];
const LOCALES = ["pl", "en", "de"];
const BASE_CASES_PER_SURFACE = 20;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hashObject(value) {
  return sha256(Buffer.from(stable(value), "utf8"));
}
function rank(namespace, row) {
  return sha256(`${SELECTION_SEED}\0${namespace}\0${row.surface}\0${row.id}\0${row.fingerprint}`);
}
function fail(message, detail = undefined) {
  const error = new Error(message);
  if (detail !== undefined) error.detail = detail;
  throw error;
}
function countBy(rows, key) {
  return Object.fromEntries([...rows.reduce((map, row) => map.set(row[key], (map.get(row[key]) ?? 0) + 1), new Map()).entries()].sort());
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const matrixRows = fs.readFileSync(MATRIX_PATH, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));

if (corpus.schemaVersion !== "velmere.pass16.worldclass-corpus.v1") fail("unexpected_corpus_schema", corpus.schemaVersion);
if (corpus.corpusSha256 !== EXPECTED_CORPUS_SHA256) fail("corpus_sha_mismatch", { expected: EXPECTED_CORPUS_SHA256, actual: corpus.corpusSha256 });
if (hashObject(corpus.cases) !== EXPECTED_CORPUS_SHA256) fail("corpus_content_hash_mismatch");
if (matrixRows.length !== 2700) fail("matrix_denominator_mismatch", matrixRows.length);

const selectedGroups = [];
for (const surface of SURFACES) {
  const candidates = corpus.cases
    .filter((row) => row.surface === surface)
    .map((row) => ({ ...row, selectionRankSha256: rank("case", row) }))
    .sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256) || a.id.localeCompare(b.id));
  if (candidates.length !== 50) fail("surface_candidate_denominator_mismatch", { surface, actual: candidates.length, expected: 50 });
  selectedGroups.push(...candidates.slice(0, BASE_CASES_PER_SURFACE));
}

if (selectedGroups.length !== 60) fail("selected_base_case_denominator_mismatch", selectedGroups.length);
if (new Set(selectedGroups.map((row) => row.id)).size !== 60) fail("duplicate_selected_base_case");

const localeOrdered = selectedGroups
  .map((row) => ({ row, localeRankSha256: rank("locale", row) }))
  .sort((a, b) => a.localeRankSha256.localeCompare(b.localeRankSha256) || a.row.id.localeCompare(b.row.id));
const localeByCaseId = new Map(localeOrdered.map((entry, index) => [entry.row.id, LOCALES[index % LOCALES.length]]));

const matrixByKey = new Map(matrixRows.map((row) => [`${row.caseId}\0${row.tier}\0${row.locale}`, row]));
const frozenRows = [];
for (const group of selectedGroups.sort((a, b) => a.surface.localeCompare(b.surface) || a.id.localeCompare(b.id))) {
  const locale = localeByCaseId.get(group.id);
  for (const tier of TIERS) {
    const matrix = matrixByKey.get(`${group.id}\0${tier}\0${locale}`);
    if (!matrix) fail("matrix_row_missing", { caseId: group.id, tier, locale });
    frozenRows.push({
      frozenCaseId: `f12-${String(frozenRows.length + 1).padStart(3, "0")}`,
      matrixId: matrix.matrixId,
      matrixFingerprint: matrix.matrixFingerprint,
      caseId: group.id,
      surface: group.surface,
      category: group.category,
      tier,
      locale,
      input: group.input,
      inputFingerprint: group.fingerprint,
      expectedOutcome: matrix.expectedOutcome,
      mustFailClosedOnMissingEvidence: matrix.mustFailClosedOnMissingEvidence,
      requiresHumanReview: matrix.requiresHumanReview,
      minSourceFamilies: matrix.minSourceFamilies,
      requiredSections: matrix.requiredSections,
      selectionRankSha256: group.selectionRankSha256,
      status: "NOT_EXECUTED",
      evidenceReceipt: null,
    });
  }
}

const failures = [];
function check(name, ok, detail = undefined) {
  if (!ok) failures.push({ name, ...(detail === undefined ? {} : { detail }) });
}
check("frozen_rows_180", frozenRows.length === 180, frozenRows.length);
check("unique_matrix_ids_180", new Set(frozenRows.map((row) => row.matrixId)).size === 180);
check("unique_frozen_case_ids_180", new Set(frozenRows.map((row) => row.frozenCaseId)).size === 180);
check("base_groups_60", new Set(frozenRows.map((row) => row.caseId)).size === 60);
check("surface_distribution", stable(countBy(frozenRows, "surface")) === stable({ shield: 60, real_markets: 60, smart_contract_audit: 60 }), countBy(frozenRows, "surface"));
check("tier_distribution", stable(countBy(frozenRows, "tier")) === stable({ basic: 60, pro: 60, advanced: 60 }), countBy(frozenRows, "tier"));
check("locale_distribution", stable(countBy(frozenRows, "locale")) === stable({ pl: 60, en: 60, de: 60 }), countBy(frozenRows, "locale"));
check("all_not_executed", frozenRows.every((row) => row.status === "NOT_EXECUTED" && row.evidenceReceipt === null));
check("matrix_identity_bound", frozenRows.every((row) => {
  const matrix = matrixByKey.get(`${row.caseId}\0${row.tier}\0${row.locale}`);
  return matrix && matrix.matrixId === row.matrixId && matrix.matrixFingerprint === row.matrixFingerprint && matrix.inputFingerprint === row.inputFingerprint;
}));
for (const caseId of new Set(frozenRows.map((row) => row.caseId))) {
  const rows = frozenRows.filter((row) => row.caseId === caseId);
  check(`case_group:${caseId}`, rows.length === 3 && new Set(rows.map((row) => row.tier)).size === 3 && new Set(rows.map((row) => row.locale)).size === 1);
}

const manifestCore = {
  schemaVersion: "velmere.pass12.final-180-freeze.v1",
  status: "FROZEN_NOT_EXECUTED",
  executionCredit: false,
  sourceCorpus: {
    path: "evaluation/pass16/worldclass-base-corpus.json",
    corpusSha256: EXPECTED_CORPUS_SHA256,
    baseDenominator: 300,
    expandedMatrixDenominator: 2700,
  },
  selection: {
    algorithm: "SHA256_SEEDED_RANK_WITHOUT_REPLACEMENT",
    seed: SELECTION_SEED,
    surfaces: SURFACES,
    candidateCasesPerSurface: 50,
    selectedCasesPerSurface: BASE_CASES_PER_SURFACE,
    selectedBaseCases: 60,
    tiers: TIERS,
    localeAssignment: "GLOBAL_SHA256_RANK_ROUND_ROBIN",
    locales: LOCALES,
    expectedRows: 180,
  },
  rows: frozenRows,
};
const manifestSha256 = hashObject(manifestCore);
const receipt = {
  ...manifestCore,
  manifestSha256,
  checks: {
    total: failures.length + 9 + new Set(frozenRows.map((row) => row.caseId)).size,
    failed: failures.length,
    ok: failures.length === 0,
  },
  failures,
  truthBoundary: "This freezes a deterministic 180-row R11B F12 denominator before canonical product execution. It does not claim any of the 180 outputs were generated, rendered, visually reviewed, provider-verified, staging-tested or release-approved. Historical R8/R9 180 evidence is not transferred to these rows.",
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: receipt.status,
  manifestSha256,
  selectedBaseCases: 60,
  frozenRows: frozenRows.length,
  surfaceDistribution: countBy(frozenRows, "surface"),
  tierDistribution: countBy(frozenRows, "tier"),
  localeDistribution: countBy(frozenRows, "locale"),
  failedChecks: failures.length,
}, null, 2));
if (failures.length) process.exit(1);
