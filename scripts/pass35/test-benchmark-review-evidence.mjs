#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  BENCHMARK_REVIEW_POLICY,
  benchmarkRowSetSha256,
  evaluateBenchmarkReviewEvidence,
  nativeReviewCaseSetSha256,
  splitRowIdsSha256,
} from "./benchmark-review-evidence.mjs";

const NOW = "2026-07-22T08:00:00.000Z";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const signature = (value) => `https://signatures.example/evidence/${value}`;

function makeBaseline() {
  const splitIds = BENCHMARK_REVIEW_POLICY.benchmark.requiredSplitIds;
  const rows = Array.from(
    { length: BENCHMARK_REVIEW_POLICY.benchmark.requiredRows },
    (_, index) => {
      const groupIndex = Math.floor(index / 10);
      const splitId = splitIds[Math.floor(groupIndex / 90)];
      const number = String(index + 1).padStart(4, "0");
      return {
        rowId: `row-${number}`,
        splitId,
        leakageGroupId: `group-${String(groupIndex + 1).padStart(3, "0")}`,
        sourceId: `source-${number}`,
        providerId: `provider-${(index % 21) + 1}`,
        modelId: `model-${(index % 3) + 1}`,
        renderId: `render-${(index % 2) + 1}`,
        reviewProtocolId: "protocol-v1",
        sourceSha256: hash(`source:${number}`),
        outputSha256: hash(`output:${number}`),
        groundTruthSha256: hash(`ground-truth:${groupIndex + 1}`),
        observedAt: "2026-07-01T00:00:00.000Z",
        expiresAt: "2026-09-20T00:00:00.000Z",
        signatureRef: signature(`benchmark-row-${number}`),
        fixture: false,
        synthetic: false,
      };
    },
  );

  const splits = splitIds.map((splitId) => {
    const splitRows = rows.filter((row) => row.splitId === splitId);
    return {
      splitId,
      rowIdsSha256: splitRowIdsSha256(splitRows.map((row) => row.rowId)),
      leakageGroupIdsSha256: splitRowIdsSha256(
        splitRows.map((row) => row.leakageGroupId),
      ),
      signatureRef: signature(`split-${splitId}`),
    };
  });

  const locales = BENCHMARK_REVIEW_POLICY.nativeReview.requiredLocales;
  const cases = Array.from(
    { length: BENCHMARK_REVIEW_POLICY.nativeReview.requiredCases },
    (_, index) => {
      const row = rows[index];
      const locale = locales[index % locales.length];
      const number = String(index + 1).padStart(3, "0");
      return {
        caseId: `case-${number}`,
        benchmarkRowId: row.rowId,
        locale,
        sourceSha256: row.outputSha256,
        adjudicationSha256: hash(`adjudication:${number}`),
        reviewedAt: "2026-07-10T00:00:00.000Z",
        expiresAt: "2026-08-05T00:00:00.000Z",
        signatureRef: signature(`review-case-${number}`),
        fixture: false,
        synthetic: false,
        reviewer: {
          reviewerId: `native-reviewer-${locale}`,
          organizationId: `native-review-organization-${locale}`,
          nativeLocales: [locale],
          independent: true,
          authoredProduct: false,
          conflictOfInterest: false,
          qualificationRef: `https://credentials.example/reviewers/${locale}`,
          signatureRef: signature(`reviewer-${locale}-${number}`),
        },
      };
    },
  );

  return {
    schemaVersion: "velmere.pass35.benchmark-native-review-evidence.v1",
    candidateId: BENCHMARK_REVIEW_POLICY.candidateId,
    evidenceClass: "REAL_EXTERNAL",
    environment: "INDEPENDENT_EXTERNAL",
    fixture: false,
    synthetic: false,
    detachedSignatureRef: signature("package"),
    organizations: {
      productOwnerOrganizationId: "product-owner-organization",
      modelAuthorOrganizationId: "model-author-organization",
      corpusProducerOrganizationId: "corpus-producer-organization",
    },
    benchmark: {
      fixture: false,
      synthetic: false,
      detachedSignatureRef: signature("benchmark"),
      corpus: {
        corpusId: "canonical-corpus-2026q3",
        version: "2026.07.1",
        originOrganizationId: "corpus-producer-organization",
        evidenceClass: "REAL_EXTERNAL_CORPUS",
        corpusSha256: hash("external-corpus-artifact"),
        identityDocumentSha256: hash("corpus-identity-document"),
        sourceManifestSha256: hash("corpus-source-manifest"),
        issuedAt: "2026-07-01T00:00:00.000Z",
        expiresAt: "2026-09-20T00:00:00.000Z",
        signatureRef: signature("corpus"),
        fixture: false,
        synthetic: false,
      },
      rows,
      splits,
      rowSetSha256: benchmarkRowSetSha256(rows),
    },
    nativeReview: {
      fixture: false,
      synthetic: false,
      detachedSignatureRef: signature("native-review"),
      program: {
        programId: "native-review-program-2026q3",
        organizationId: "review-program-organization",
        evidenceClass: "REAL_EXTERNAL_NATIVE_REVIEW",
        protocolSha256: hash("review-protocol"),
        sourceManifestSha256: hash("review-source-manifest"),
        issuedAt: "2026-07-10T00:00:00.000Z",
        expiresAt: "2026-08-05T00:00:00.000Z",
        signatureRef: signature("review-program"),
        fixture: false,
        synthetic: false,
      },
      cases,
      caseSetSha256: nativeReviewCaseSetSha256(cases),
    },
  };
}

function resealBenchmark(evidence) {
  evidence.benchmark.rowSetSha256 = benchmarkRowSetSha256(
    evidence.benchmark.rows,
  );
  for (const split of evidence.benchmark.splits) {
    const rows = evidence.benchmark.rows.filter(
      (row) => row.splitId === split.splitId,
    );
    split.rowIdsSha256 = splitRowIdsSha256(rows.map((row) => row.rowId));
    split.leakageGroupIdsSha256 = splitRowIdsSha256(
      rows.map((row) => row.leakageGroupId),
    );
  }
}

function resealReviews(evidence) {
  evidence.nativeReview.caseSetSha256 = nativeReviewCaseSetSha256(
    evidence.nativeReview.cases,
  );
}

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "velmere-pass35-hg04-hg10-"));
const mutationResults = [];

try {
  const baseline = makeBaseline();
  const baselinePath = path.join(tempRoot, "structural-fixture.json");
  writeFileSync(baselinePath, `${JSON.stringify(baseline)}\n`);
  const loadedBaseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const passing = evaluateBenchmarkReviewEvidence(loadedBaseline, { now: NOW });
  assert.equal(passing.ok, true, passing.errors.join("\n"));
  assert.equal(passing.status, "PASS_METADATA_STRUCTURE_REQUIRES_CRYPTOGRAPHIC_VERIFICATION");
  assert.equal(passing.gates.HG04.structurallyEligibleRows, 2700);
  assert.equal(passing.gates.HG10.structurallyEligibleCases, 300);
  assert.equal(passing.gates.HG04.creditedRows, 0);
  assert.equal(passing.gates.HG10.creditedCases, 0);
  assert.equal(passing.credit.totalStructurallyEligible, 3000);
  assert.equal(passing.credit.totalCredited, 0);
  assert.equal(passing.verifiedDenominatorIncrement, 0);

  const mutations = [
    ["missing_corpus_identity", (value) => { delete value.benchmark.corpus.corpusId; }],
    ["wrong_benchmark_count", (value) => { value.benchmark.rows.pop(); resealBenchmark(value); }],
    ["wrong_native_review_count", (value) => { value.nativeReview.cases.pop(); resealReviews(value); }],
    ["cross_split_leakage", (value) => { value.benchmark.rows[900].leakageGroupId = value.benchmark.rows[0].leakageGroupId; resealBenchmark(value); }],
    ["duplicate_row_id", (value) => { value.benchmark.rows[1].rowId = value.benchmark.rows[0].rowId; resealBenchmark(value); }],
    ["fixture_row", (value) => { value.benchmark.rows[10].fixture = true; resealBenchmark(value); }],
    ["synthetic_case", (value) => { value.nativeReview.cases[10].synthetic = true; resealReviews(value); }],
    ["invalid_source_hash", (value) => { value.benchmark.rows[20].sourceSha256 = "not-a-hash"; resealBenchmark(value); }],
    ["unbound_row_set", (value) => { value.benchmark.rowSetSha256 = hash("different-row-set"); }],
    ["unbound_case_set", (value) => { value.nativeReview.caseSetSha256 = hash("different-case-set"); }],
    ["local_signature_ref", (value) => { value.benchmark.rows[30].signatureRef = "fixture://local-signature"; resealBenchmark(value); }],
    ["expired_row", (value) => { value.benchmark.rows[40].expiresAt = "2026-07-21T00:00:00.000Z"; resealBenchmark(value); }],
    ["ttl_too_long", (value) => { value.nativeReview.cases[40].expiresAt = "2026-12-31T00:00:00.000Z"; resealReviews(value); }],
    ["reviewer_same_as_product_owner", (value) => { value.nativeReview.cases[50].reviewer.organizationId = value.organizations.productOwnerOrganizationId; resealReviews(value); }],
    ["reviewer_not_independent", (value) => { value.nativeReview.cases[60].reviewer.independent = false; resealReviews(value); }],
    ["reviewer_not_native", (value) => { value.nativeReview.cases[70].reviewer.nativeLocales = ["de"]; resealReviews(value); }],
    ["reviewer_conflict", (value) => { value.nativeReview.cases[80].reviewer.conflictOfInterest = true; resealReviews(value); }],
    ["reviewer_authored_product", (value) => { value.nativeReview.cases[90].reviewer.authoredProduct = true; resealReviews(value); }],
    ["review_source_not_bound", (value) => { value.nativeReview.cases[100].sourceSha256 = hash("wrong-output"); resealReviews(value); }],
    ["unknown_benchmark_row", (value) => { value.nativeReview.cases[110].benchmarkRowId = "row-does-not-exist"; resealReviews(value); }],
    ["future_review", (value) => { value.nativeReview.cases[120].reviewedAt = "2027-01-01T00:00:00.000Z"; value.nativeReview.cases[120].expiresAt = "2027-01-10T00:00:00.000Z"; resealReviews(value); }],
    ["missing_required_locale", (value) => { for (const reviewCase of value.nativeReview.cases) { if (reviewCase.locale === "de") { reviewCase.locale = "en"; reviewCase.reviewer.nativeLocales = ["en"]; } } resealReviews(value); }],
  ];

  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(baseline);
    mutate(candidate);
    const candidatePath = path.join(tempRoot, `${name}.json`);
    writeFileSync(candidatePath, `${JSON.stringify(candidate)}\n`);
    const result = evaluateBenchmarkReviewEvidence(
      JSON.parse(readFileSync(candidatePath, "utf8")),
      { now: NOW },
    );
    assert.equal(result.ok, false, `${name} must fail closed`);
    assert.equal(result.status, "FAIL_CLOSED_ZERO_CREDIT", name);
    assert.equal(result.gates.HG04.creditedRows, 0, `${name}: HG04 credit`);
    assert.equal(result.gates.HG10.creditedCases, 0, `${name}: HG10 credit`);
    assert.equal(result.credit.totalCredited, 0, `${name}: total credit`);
    assert.ok(result.errors.length > 0, `${name}: must explain blocker`);
    mutationResults.push(name);
  }

  const cliMutation = structuredClone(baseline);
  cliMutation.fixture = true;
  const cliInput = path.join(tempRoot, "cli-fixture.json");
  const cliOutput = path.join(tempRoot, "cli-receipt.json");
  writeFileSync(cliInput, `${JSON.stringify(cliMutation)}\n`);
  const cli = spawnSync(
    process.execPath,
    [
      path.resolve("scripts/pass35/benchmark-review-evidence.mjs"),
      "--input",
      cliInput,
      "--output",
      cliOutput,
      "--now",
      NOW,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(cli.status, 1);
  const cliReceipt = JSON.parse(readFileSync(cliOutput, "utf8"));
  assert.equal(cliReceipt.status, "FAIL_CLOSED_ZERO_CREDIT");
  assert.equal(cliReceipt.credit.totalCredited, 0);
  assert.equal(cliReceipt.promotionAllowed, false);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(
  `PASS PASS35 HG04/HG10 evidence verifier: baseline structure + ${mutationResults.length} fail-closed mutations`,
);
console.log(
  "TEST-ONLY FIXTURES: no generated row, review, identity, signature or receipt is retained or eligible as canonical evidence",
);
