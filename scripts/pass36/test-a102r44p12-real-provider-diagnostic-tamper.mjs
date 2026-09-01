#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { loadR44P12Policy, validateProviderDiagnosticDocuments, verifyProviderDiagnosticEvidence } from "./a102r44p12-real-provider-diagnostic-lib.mjs";

const args = process.argv.slice(2);
const index = args.indexOf("--evidence-root");
if (index < 0 || !args[index + 1] || args.length !== 2) throw new Error("usage: test-a102r44p12-real-provider-diagnostic-tamper.mjs --evidence-root <path>");
const evidenceRoot = path.resolve(args[index + 1]);
const policy = loadR44P12Policy();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(evidenceRoot, rel), "utf8"));
const original = {
  ledger: readJson(policy.externalEvidence.ledgerPath),
  summary: readJson(policy.externalEvidence.summaryPath),
  independent: readJson(policy.externalEvidence.independentVerificationPath),
};
const clone = (value) => structuredClone(value);
const cases = [];
const expectSemanticReject = (id, mutate) => {
  const docs = { ledger: clone(original.ledger), summary: clone(original.summary), independent: clone(original.independent), policy };
  mutate(docs);
  const failed = validateProviderDiagnosticDocuments(docs).filter((row) => !row.ok);
  cases.push({ id, rejected: failed.length > 0, failedChecks: failed.map((row) => row.id) });
};

expectSemanticReject("rights-promotion", ({ ledger }) => { ledger.truthBoundary.rightsApprovedCommercialUse = true; });
expectSemanticReject("paid-promotion", ({ ledger }) => { ledger.truthBoundary.paidTierCredit = true; });
expectSemanticReject("live-promotion", ({ ledger }) => { ledger.truthBoundary.liveCredit = true; });
expectSemanticReject("identity-drift", ({ ledger }) => { ledger.observations[0].providers[0].identityExact = false; });
expectSemanticReject("available-price-missing", ({ ledger }) => { ledger.observations[0].providers[0].priceUsd = null; });
expectSemanticReject("available-drift-over-threshold", ({ ledger }) => { ledger.observations[0].crossProviderPriceDriftPct = 9; });
expectSemanticReject("duplicate-asset", ({ ledger }) => { ledger.observations[1].asset = ledger.observations[0].asset; });
expectSemanticReject("provider-state-unknown", ({ ledger }) => { ledger.observations[0].providers[0].state = "LIVE"; });
expectSemanticReject("summary-count-drift", ({ summary }) => { summary.providerAvailableRows = 29; });
expectSemanticReject("independent-verifier-failed", ({ independent }) => { independent.failed = 1; independent.status = "FAIL"; });

const fullCases = [];
const expectFullReject = (id, mutate) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `velmere-r44p12-${id}-`));
  fs.cpSync(evidenceRoot, temp, { recursive: true, force: false, errorOnExist: true });
  try {
    mutate(temp);
    let rejected = false;
    try { const result = verifyProviderDiagnosticEvidence(temp); rejected = result.failed > 0; }
    catch { rejected = true; }
    fullCases.push({ id, rejected });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
};
expectFullReject("raw-body-mutation", (temp) => {
  const ledger = JSON.parse(fs.readFileSync(path.join(temp, policy.externalEvidence.ledgerPath), "utf8"));
  const body = path.join(temp, ledger.requests[0].bodyPath);
  fs.appendFileSync(body, Buffer.from([0]));
});
expectFullReject("raw-body-missing", (temp) => {
  const ledger = JSON.parse(fs.readFileSync(path.join(temp, policy.externalEvidence.ledgerPath), "utf8"));
  fs.rmSync(path.join(temp, ledger.requests[0].bodyPath));
});
expectFullReject("ledger-path-traversal", (temp) => {
  const p = path.join(temp, policy.externalEvidence.ledgerPath);
  const ledger = JSON.parse(fs.readFileSync(p, "utf8"));
  ledger.requests[0].bodyPath = "../outside.bin";
  fs.writeFileSync(p, JSON.stringify(ledger));
});
expectFullReject("duplicate-json-key", (temp) => {
  const p = path.join(temp, policy.externalEvidence.summaryPath);
  const raw = fs.readFileSync(p, "utf8");
  fs.writeFileSync(p, raw.replace(/^\{/u, '{"status":"PASS_DIAGNOSTIC",'));
});

const baseline = verifyProviderDiagnosticEvidence(evidenceRoot);
const all = [...cases, ...fullCases];
const failedCases = all.filter((row) => !row.rejected);
const result = {
  schemaVersion: "velmere.pass36.a102r44p12.real-provider-diagnostic-tamper.v1",
  status: baseline.failed === 0 && failedCases.length === 0 ? "PASS_R44P12_PROVIDER_TAMPER_TESTS" : "FAIL_R44P12_PROVIDER_TAMPER_TESTS",
  baselinePassed: baseline.failed === 0,
  cases: all.length,
  passed: all.length - failedCases.length,
  failed: failedCases.length,
  rows: all,
};
console.log(JSON.stringify(result, null, 2));
if (result.failed || !result.baselinePassed) process.exit(1);
