#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  inspectHistoricalSparseEdgeLedger,
  sha256,
  verifyHistoricalDescendantChain,
} from "./historical-descendant-chain-lib.mjs";

const REVISION = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const R36_REVISION = "VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT";
const R38_REVISION = "VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT";
const R36_PATH = "config/pass36/a102r36-current-root-descendant-manifest.json";
const R38_PATH = "config/pass36/a102r38-current-root-descendant-manifest.json";
const R38_STATE_PATH = "config/pass36/a102r38-action-required-current-state.json";
const LEDGER_PATH = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const sourceRoot = process.cwd();
const results = [];

function add(id, passed, detail = null) {
  results.push({ id, passed: Boolean(passed), detail });
  assert.ok(passed, id);
}

function copy(root, relativePath) {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, relativePath), destination);
}

function writeJson(root, relativePath, value) {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resignLedger(ledger) {
  const core = { ...ledger };
  delete core.ledgerDigestSha256;
  ledger.ledgerDigestSha256 = sha256(canonicalJson(core));
}

function fixture(mutator = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r41-sparse-edge-"));
  for (const relativePath of [R36_PATH, R38_PATH, R38_STATE_PATH, LEDGER_PATH]) copy(root, relativePath);
  writeJson(root, "config/pass35/current-revision.json", {
    sourceRevisionId: R38_REVISION,
    currentRootDescendantManifestPath: R38_PATH,
  });
  mutator(root);
  return root;
}

function verify(root) {
  try {
    return verifyHistoricalDescendantChain(root, R36_PATH, R38_REVISION);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const validRoot = fixture();
const validLedger = inspectHistoricalSparseEdgeLedger(validRoot);
const valid = verify(validRoot);
add("exact_single_edge_ledger_admitted", valid.ok && validLedger.ok, validLedger);
add(
  "exact_r36_to_r38_transition_is_explicit",
  valid.checks.some((row) => row.id === "chain:step-1:transition" && row.passed && row.detail?.historicalSparseEdgeApplied === true),
);

for (const [id, mutate] of [
  ["missing_ledger_rejected", (root) => fs.rmSync(path.join(root, LEDGER_PATH))],
  ["ledger_digest_tamper_rejected", (root) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));
    ledger.edges[0].externalCheckpoint.sourceArchiveByteLength += 1;
    writeJson(root, LEDGER_PATH, ledger);
  }],
  ["fabricated_r37_manifest_rejected", (root) => {
    const document = {
      revisionId: "VELMERE_PASS36_A102R37_FAKE_INTERNAL_AUTHORITY",
      parentRevisionId: R36_REVISION,
      claims: { liveProven: false, saleEnabled: false },
    };
    document.manifestDigestSha256 = sha256(canonicalJson(document));
    writeJson(root, "config/pass36/a102r37-current-root-descendant-manifest.json", document);
  }],
  ["wildcard_edge_rejected_after_resign", (root) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));
    ledger.edges[0].parent.revisionId = "*";
    resignLedger(ledger);
    writeJson(root, LEDGER_PATH, ledger);
  }],
  ["second_edge_rejected_after_resign", (root) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));
    ledger.edges.push(structuredClone(ledger.edges[0]));
    ledger.edgeCount = 2;
    resignLedger(ledger);
    writeJson(root, LEDGER_PATH, ledger);
  }],
  ["wrong_external_identity_rejected_after_resign", (root) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));
    ledger.edges[0].externalCheckpoint.sourceArchiveSha256 = "0".repeat(64);
    resignLedger(ledger);
    writeJson(root, LEDGER_PATH, ledger);
  }],
  ["promotion_claim_rejected_after_resign", (root) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));
    ledger.edges[0].saleEnabled = true;
    resignLedger(ledger);
    writeJson(root, LEDGER_PATH, ledger);
  }],
  ["historical_parent_rewrite_rejected", (root) => {
    const parent = JSON.parse(fs.readFileSync(path.join(root, R36_PATH), "utf8"));
    parent.claims.saleEnabled = true;
    const core = { ...parent };
    delete core.manifestDigestSha256;
    parent.manifestDigestSha256 = sha256(canonicalJson(core));
    writeJson(root, R36_PATH, parent);
  }],
  ["historical_parent_missing_rejected", (root) => fs.rmSync(path.join(root, R36_PATH))],
]) {
  const report = verify(fixture(mutate));
  add(id, report.ok === false, report.checks.filter((row) => !row.passed));
}

const failed = results.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r41.historical-sparse-edge-ledger-test.v1",
  revisionId: REVISION,
  status: failed.length === 0 ? "PASS_EXACT_SINGLE_HISTORICAL_EXCEPTION_NO_AUTHORITY_OR_PROMOTION" : "FAIL",
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  checks: results,
  externalPackageMayDefineSourceAuthority: false,
  fabricatedR37ManifestAllowed: false,
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
