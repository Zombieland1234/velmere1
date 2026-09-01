#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUTPUT = path.join(ROOT, "artifacts/closure/p36/P36_BOUNDED_CONVERGENCE.json");
const EXPECTED_NODE = "v24.18.0";
const ROUND_COUNT = 3;
const LOADER = "./scripts/pass11/register-offline-ts-loader.mjs";

export const P36_BOUNDED_CONVERGENCE_TESTS = Object.freeze([
  ["dynamic-tier-eligibility", ["--import", LOADER, "tests/security/a102-evidence-availability-dynamic-tier.test.ts"]],
  ["current-eligibility-matrix", ["--import", LOADER, "tests/security/a102-current-evidence-availability-matrix.test.ts"]],
  ["exact-pdf-unit", ["--import", LOADER, "tests/security/a102-exact-customer-pdf-delivery.test.ts"]],
  ["account-parity-contract", ["--import", LOADER, "tests/security/a102-account-artifact-preview-download-parity.test.ts"]],
  ["public-readiness-contract", ["--import", LOADER, "tests/security/a102-public-tier-readiness-contract.test.ts"]],
  ["public-readiness-handler-integration", ["--import", LOADER, "tests/security/a102-p36-public-readiness-handler-integration.test.ts"]],
  ["methodology-binding", ["--import", LOADER, "tests/security/a102-evidence-availability-artifact-methodology-binding.test.ts"]],
  ["exact-pdf-route-integration", ["--import", LOADER, "tests/security/a102-p36-exact-customer-pdf-integration.test.ts"]],
  ["same-input-tier-campaign", ["tests/security/a102-p36-internal-final-tier-campaign.test.mjs"]],
  ["ai-output-revalidation", ["tests/security/a102-p36-ai-final-output-revalidation.test.mjs"]],
  ["browser-tier-profile-contract", ["--import", LOADER, "tests/security/a102-p36-browser-tier-runtime-profiles.test.mjs"]],
]);
export const P36_BOUNDED_CONVERGENCE_TEST_IDS = Object.freeze(
  P36_BOUNDED_CONVERGENCE_TESTS.map(([id]) => id),
);

const SOURCE_IDENTITY_BUILDER = "scripts/closure/build-p36-source-identity.py";
const MATERIAL_INPUTS = Object.freeze([
  "artifacts/pass36/a82",
  "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json",
  "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json",
  "artifacts/pass36/a83/browser-lens-pdf-corpus",
  "artifacts/pass36/a84",
  "artifacts/closure/p32/runtime/a85-current-byte-runtime.json",
  "artifacts/pass36/a86",
  "artifacts/pass36/a87",
  "artifacts/pass36/a88",
  "artifacts/closure/p35/internal-ai-assessments.jsonl",
  "artifacts/closure/p35/internal-ai-availability-ledger-verifier-receipt.json",
  "artifacts/closure/p36/source-identity.json",
  "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json",
  "artifacts/closure/p36/P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX.json",
  "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json",
  "artifacts/closure/p36/P36_AI_FINAL_OUTPUT_REVALIDATION.json",
  "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json",
  "artifacts/pass35/a45",
  "artifacts/closure/p36/P36_BROWSER_TIER_RUNTIME_PROFILES.json",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function sameCanonical(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

/**
 * Pure, fail-closed validation of the bounded convergence receipt. Filesystem
 * currency is supplied explicitly by the caller so this function can also be
 * mutation-tested without executing or rewriting any shared receipt.
 */
export function validateP36BoundedConvergence(
  receipt,
  {
    expectedSourceAggregateSha256,
    expectedMaterialInputAggregateSha256,
  } = {},
) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  const expectedCreditKeys = [
    "currentFrozenSourceAndMaterialInputsInternalRegression",
    "fullLintPerRound",
    "dualProductionBuildPerRound",
    "browserAcceptancePerRound",
    "externalEvidencePerRound",
    "realCustomerPerRound",
    "independentReviewPerRound",
    "goInternalCredit",
    "goPaidCredit",
    "liveCredit",
  ];

  check(receipt?.schemaVersion === "velmere.p36.bounded-frozen-source-convergence.v1", "schema");
  check(receipt?.state === "PASS_BOUNDED_INTERNAL_FROZEN_SOURCE", "state");
  check(Number.isFinite(Date.parse(receipt?.generatedAt ?? "")), "generated_at");
  check(receipt?.runtime?.node === EXPECTED_NODE, "runtime_node");
  check(isSha256(receipt?.runtime?.executableSha256), "runtime_executable_sha256");
  check(isSha256(receipt?.integritySha256), "integrity_shape");
  if (receipt && typeof receipt === "object" && isSha256(receipt.integritySha256)) {
    const { integritySha256: _integritySha256, ...body } = receipt;
    check(receipt.integritySha256 === sha256(JSON.stringify(canonical(body))), "integrity");
  }
  check(isSha256(expectedSourceAggregateSha256), "expected_source_required");
  check(isSha256(expectedMaterialInputAggregateSha256), "expected_material_required");
  check(receipt?.sourceAggregateSha256 === expectedSourceAggregateSha256, "current_source_binding");
  check(receipt?.materialInputAggregateSha256 === expectedMaterialInputAggregateSha256, "current_material_binding");
  check(receipt?.testDenominatorPerRound === P36_BOUNDED_CONVERGENCE_TEST_IDS.length, "test_denominator");
  check(receipt?.boundedInternalRoundsCompleted === ROUND_COUNT, "bounded_completed");
  check(receipt?.boundedInternalRoundDenominator === ROUND_COUNT, "bounded_denominator");
  check(receipt?.fullReleaseConvergenceRoundsCredited === 0, "full_release_credit");
  check(receipt?.fullReleaseConvergenceRoundDenominator === ROUND_COUNT, "full_release_denominator");
  check(Array.isArray(receipt?.rounds) && receipt.rounds.length === ROUND_COUNT, "round_count");
  check(
    sameCanonical(Object.keys(receipt?.creditBoundary ?? {}).sort(), [...expectedCreditKeys].sort()),
    "credit_boundary_keys",
  );
  check(
    receipt?.creditBoundary?.currentFrozenSourceAndMaterialInputsInternalRegression === true,
    "bounded_internal_credit",
  );
  for (const key of expectedCreditKeys.slice(1)) {
    check(receipt?.creditBoundary?.[key] === false, `noncredit_${key}`);
  }

  const baseline = receipt?.rounds?.[0]?.inputBefore;
  const validateSnapshot = (snapshot, code) => {
    check(snapshot && typeof snapshot === "object", `${code}_missing`);
    check(Number.isSafeInteger(snapshot?.source?.fileCount) && snapshot.source.fileCount > 0, `${code}_source_files`);
    check(Number.isSafeInteger(snapshot?.source?.byteLength) && snapshot.source.byteLength > 0, `${code}_source_bytes`);
    check(isSha256(snapshot?.source?.pathSetSha256), `${code}_source_path_set`);
    check(snapshot?.source?.aggregateSha256 === receipt?.sourceAggregateSha256, `${code}_source_aggregate`);
    check(Number.isSafeInteger(snapshot?.material?.fileCount) && snapshot.material.fileCount > 0, `${code}_material_files`);
    check(Number.isSafeInteger(snapshot?.material?.byteLength) && snapshot.material.byteLength > 0, `${code}_material_bytes`);
    check(snapshot?.material?.aggregateSha256 === receipt?.materialInputAggregateSha256, `${code}_material_aggregate`);
    check(
      snapshot?.aggregateSha256 === sha256(`${snapshot?.source?.aggregateSha256}\0${snapshot?.material?.aggregateSha256}`),
      `${code}_combined_aggregate`,
    );
    check(sameCanonical(snapshot, baseline), `${code}_baseline_match`);
  };

  for (let roundIndex = 0; roundIndex < ROUND_COUNT; roundIndex += 1) {
    const round = receipt?.rounds?.[roundIndex];
    const roundCode = `round_${roundIndex + 1}`;
    check(round?.round === roundIndex + 1, `${roundCode}_identity`);
    check(round?.pass === true, `${roundCode}_pass`);
    check(round?.sourceAndMaterialInputsImmutable === true, `${roundCode}_immutable`);
    validateSnapshot(round?.inputBefore, `${roundCode}_before`);
    validateSnapshot(round?.inputAfter, `${roundCode}_after`);
    check(sameCanonical(round?.inputBefore, round?.inputAfter), `${roundCode}_before_after_match`);
    check(Array.isArray(round?.tests) && round.tests.length === P36_BOUNDED_CONVERGENCE_TEST_IDS.length, `${roundCode}_test_count`);
    for (let testIndex = 0; testIndex < P36_BOUNDED_CONVERGENCE_TEST_IDS.length; testIndex += 1) {
      const test = round?.tests?.[testIndex];
      const testCode = `${roundCode}_test_${testIndex + 1}`;
      check(test?.id === P36_BOUNDED_CONVERGENCE_TEST_IDS[testIndex], `${testCode}_id_order`);
      check(test?.exitCode === 0, `${testCode}_exit_code`);
      check(test?.signal === null, `${testCode}_signal`);
      check(test?.pass === true, `${testCode}_pass`);
      check(test?.inputImmutable === true, `${testCode}_immutable`);
      validateSnapshot(test?.inputBefore, `${testCode}_before`);
      validateSnapshot(test?.inputAfter, `${testCode}_after`);
      check(sameCanonical(test?.inputBefore, test?.inputAfter), `${testCode}_before_after_match`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function materialRows() {
  const rows = [];
  const seen = new Set();
  const visit = (absolute) => {
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const child = path.join(absolute, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`p36_convergence_symlink_forbidden:${path.relative(ROOT, child)}`);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) {
        const relativePath = path.relative(ROOT, child).replaceAll(path.sep, "/");
        const bytes = fs.readFileSync(child);
        if (seen.has(relativePath)) continue;
        seen.add(relativePath);
        rows.push({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) });
      } else throw new Error(`p36_convergence_special_file_forbidden:${path.relative(ROOT, child)}`);
    }
  };
  for (const relative of MATERIAL_INPUTS) {
    const absolute = path.join(ROOT, relative);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`p36_convergence_material_symlink_forbidden:${relative}`);
    if (stat.isDirectory()) visit(absolute);
    else if (stat.isFile()) {
      if (seen.has(relative)) continue;
      seen.add(relative);
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative, byteLength: bytes.byteLength, sha256: sha256(bytes) });
    } else throw new Error(`p36_convergence_material_special_file_forbidden:${relative}`);
  }
  return rows.sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function sourceSnapshot(tempRoot, label) {
  const output = path.join(tempRoot, `${label}-source-identity.json`);
  const execution = spawnSync("python3", [SOURCE_IDENTITY_BUILDER, "--output", output], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (execution.status !== 0 || execution.signal !== null) {
    throw new Error(`p36_convergence_source_identity_failed:${label}:${execution.stderr}`);
  }
  const identity = JSON.parse(fs.readFileSync(output, "utf8"));
  fs.rmSync(output, { force: true });
  return {
    fileCount: identity.fileCount,
    byteLength: identity.payloadBytes,
    pathSetSha256: identity.pathSetSha256,
    aggregateSha256: identity.sourceAggregateSha256,
  };
}

export function materialSnapshot() {
  const rows = materialRows();
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((total, row) => total + row.byteLength, 0),
    aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\n`).join("")),
  };
}

function inputSnapshot(tempRoot, label) {
  const source = sourceSnapshot(tempRoot, label);
  const material = materialSnapshot();
  return {
    source,
    material,
    aggregateSha256: sha256(`${source.aggregateSha256}\0${material.aggregateSha256}`),
  };
}

function compactOutput(value) {
  const clean = String(value ?? "").trim();
  const lines = clean.split(/\r?\n/gu).filter(Boolean);
  return {
    sha256: sha256(clean),
    byteLength: Buffer.byteLength(clean),
    finalLine: lines.at(-1)?.slice(0, 500) ?? null,
  };
}

function runRound(round, tempRoot) {
  const roundBefore = inputSnapshot(tempRoot, `round-${round}-before`);
  const tests = P36_BOUNDED_CONVERGENCE_TESTS.map(([id, args], index) => {
    const inputBefore = inputSnapshot(tempRoot, `round-${round}-test-${index + 1}-before`);
    const testReceiptOutput = path.join(tempRoot, `round-${round}-${id}-receipt.json`);
    const execution = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, P36_TEST_RECEIPT_OUTPUT: testReceiptOutput },
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    });
    const inputAfter = inputSnapshot(tempRoot, `round-${round}-test-${index + 1}-after`);
    return {
      id,
      command: [process.execPath, ...args].map((token) => path.isAbsolute(token)
        ? path.relative(ROOT, token).replaceAll(path.sep, "/")
        : token),
      exitCode: execution.status,
      signal: execution.signal,
      stdout: compactOutput(execution.stdout),
      stderr: compactOutput(execution.stderr),
      inputBefore,
      inputAfter,
      inputImmutable: inputBefore.aggregateSha256 === inputAfter.aggregateSha256,
      pass:
        execution.status === 0
        && execution.signal === null
        && inputBefore.aggregateSha256 === inputAfter.aggregateSha256,
    };
  });
  const roundAfter = inputSnapshot(tempRoot, `round-${round}-after`);
  return {
    round,
    inputBefore: roundBefore,
    tests,
    inputAfter: roundAfter,
  };
}

function main() {
  if (process.version !== EXPECTED_NODE) {
    throw new Error(`p36_convergence_exact_node_required:${process.version}:expected:${EXPECTED_NODE}`);
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-convergence-"));
  const rounds = [];
  try {
    for (let round = 1; round <= ROUND_COUNT; round += 1) {
      const result = runRound(round, tempRoot);
      const immutable = result.inputBefore.aggregateSha256 === result.inputAfter.aggregateSha256;
      const pass = immutable && result.tests.every((test) => test.pass);
      rounds.push({ ...result, sourceAndMaterialInputsImmutable: immutable, pass });
      process.stdout.write(`[p36-convergence] round ${round}/${ROUND_COUNT}: ${pass ? "PASS" : "FAIL"}\n`);
      if (!pass) break;
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  const pass = rounds.length === ROUND_COUNT && rounds.every((round) => round.pass);
  const sourceAggregate = rounds[0]?.inputBefore.source.aggregateSha256 ?? null;
  const materialInputAggregate = rounds[0]?.inputBefore.material.aggregateSha256 ?? null;
  const receipt = {
    schemaVersion: "velmere.p36.bounded-frozen-source-convergence.v1",
    generatedAt: "2026-08-13T18:00:00.000Z",
    state: pass ? "PASS_BOUNDED_INTERNAL_FROZEN_SOURCE" : "FAIL_BOUNDED_INTERNAL_FROZEN_SOURCE",
    runtime: { node: process.version, executableSha256: sha256(fs.readFileSync(process.execPath)) },
    testDenominatorPerRound: P36_BOUNDED_CONVERGENCE_TESTS.length,
    boundedInternalRoundsCompleted: rounds.filter((round) => round.pass).length,
    boundedInternalRoundDenominator: ROUND_COUNT,
    fullReleaseConvergenceRoundsCredited: 0,
    fullReleaseConvergenceRoundDenominator: 3,
    sourceAggregateSha256: sourceAggregate,
    materialInputAggregateSha256: materialInputAggregate,
    rounds,
    creditBoundary: {
      currentFrozenSourceAndMaterialInputsInternalRegression: pass,
      fullLintPerRound: false,
      dualProductionBuildPerRound: false,
      browserAcceptancePerRound: false,
      externalEvidencePerRound: false,
      realCustomerPerRound: false,
      independentReviewPerRound: false,
      goInternalCredit: false,
      goPaidCredit: false,
      liveCredit: false,
    },
    truthBoundary: "Three consecutive green rounds cover the named current-source internal regressions on one immutable source aggregate and one immutable manifest of material artifact inputs. Test-generated receipts are redirected to isolated temporary paths. They are not three full release rounds because lint, both production builds, real Browser acceptance, external evidence, real customers and independent review are not repeated inside every round.",
  };
  receipt.integritySha256 = sha256(JSON.stringify(canonical(receipt)));
  const validation = validateP36BoundedConvergence(receipt, {
    expectedSourceAggregateSha256: sourceAggregate,
    expectedMaterialInputAggregateSha256: materialInputAggregate,
  });
  if (!validation.ok) {
    throw new Error(`p36_convergence_receipt_validation_failed:${validation.errors.join("|")}`);
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (!pass) process.exitCode = 1;
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;
if (invokedAsScript) main();
