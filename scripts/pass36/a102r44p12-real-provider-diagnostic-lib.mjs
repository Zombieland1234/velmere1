import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = path.join(sourceRoot, "config/pass36/a102r44p12-real-provider-diagnostic-policy.json");
const ALLOWED_ASSET_STATES = new Set(["AVAILABLE", "PARTIAL", "CONFLICTED", "RATE_LIMITED", "FAILED"]);
const ALLOWED_PROVIDER_STATES = new Set(["AVAILABLE", "RATE_LIMITED", "UNAVAILABLE", "FAILED", "SCHEMA_REJECTED"]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_RELATIVE = /^(?![./])(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/u;

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const add = (checks, id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

function readStrictJson(file, options = {}) {
  const read = readDescriptorBoundRegularFile(file, {
    maxBytes: options.maxBytes ?? 1024 * 1024,
    errorPrefix: options.errorPrefix ?? "r44p12_json",
  });
  const raw = read.bytes.toString("utf8");
  const value = parseStrictJsonCli(raw, {
    maxBytes: options.maxBytes ?? 1024 * 1024,
    maxDepth: options.maxDepth ?? 64,
    maxNodes: options.maxNodes ?? 500000,
    requireObject: true,
  });
  return { ...read, value };
}

function safeEvidencePath(evidenceRoot, relative, label) {
  invariant(typeof relative === "string" && SAFE_RELATIVE.test(relative) && !relative.includes("\\"), `${label}_relative_path_invalid`);
  const root = path.resolve(evidenceRoot);
  const absolute = path.resolve(root, ...relative.split("/"));
  invariant(absolute.startsWith(`${root}${path.sep}`), `${label}_path_escape`);
  const parentReal = fs.realpathSync(path.dirname(absolute));
  const rootReal = fs.realpathSync(root);
  invariant(parentReal === rootReal || parentReal.startsWith(`${rootReal}${path.sep}`), `${label}_parent_escape`);
  return absolute;
}

export function loadR44P12Policy() {
  return readStrictJson(policyPath, { maxBytes: 256 * 1024, errorPrefix: "r44p12_policy" }).value;
}

export function validateProviderDiagnosticDocuments({ ledger, summary, independent, policy }) {
  const checks = [];
  const expectedAssets = policy.assets;
  const expectedProviders = policy.providers;
  const observations = Array.isArray(ledger?.observations) ? ledger.observations : [];
  const providerRows = observations.flatMap((row) => Array.isArray(row?.providers) ? row.providers : []);
  const uniqueAssets = new Set(observations.map((row) => row?.asset));
  const availableRows = providerRows.filter((row) => row?.state === "AVAILABLE");
  const observedProviderNames = new Set(providerRows.map((row) => row?.provider));

  add(checks, "schema", ledger?.schemaVersion === "velmere.pass36.a102r44p12.real-public-provider-diagnostic.v1");
  add(checks, "asset-denominator", ledger?.denominator?.assets === policy.denominator.assets && observations.length === policy.denominator.assets);
  add(checks, "provider-row-denominator", ledger?.denominator?.providerRows === policy.denominator.providerRows && providerRows.length === policy.denominator.providerRows);
  add(checks, "asset-set-exact", uniqueAssets.size === expectedAssets.length && expectedAssets.every((asset) => uniqueAssets.has(asset)));
  add(checks, "provider-set-exact", observedProviderNames.size === expectedProviders.length && expectedProviders.every((provider) => observedProviderNames.has(provider)));
  add(checks, "two-provider-rows-per-asset", observations.every((row) => Array.isArray(row.providers) && row.providers.length === 2 && new Set(row.providers.map((provider) => provider.provider)).size === 2));
  add(checks, "asset-terminal-states-known", observations.every((row) => ALLOWED_ASSET_STATES.has(row.terminalState)));
  add(checks, "provider-terminal-states-known", providerRows.every((row) => ALLOWED_PROVIDER_STATES.has(row.state)));
  add(checks, "available-provider-identity-exact", availableRows.every((row) => row.identityExact === true));
  add(checks, "available-provider-positive-price", availableRows.every((row) => Number.isFinite(row.priceUsd) && row.priceUsd > 0));
  add(checks, "available-assets-two-prices", observations.filter((row) => row.terminalState === "AVAILABLE").every((row) => row.providers.every((provider) => provider.state === "AVAILABLE" && Number.isFinite(provider.priceUsd) && provider.priceUsd > 0)));
  add(checks, "available-drift-bounded", observations.filter((row) => row.terminalState === "AVAILABLE").every((row) => Number.isFinite(row.crossProviderPriceDriftPct) && row.crossProviderPriceDriftPct >= 0 && row.crossProviderPriceDriftPct <= policy.thresholds.maximumAvailableCrossProviderPriceDriftPct));
  add(checks, "summary-available-assets", ledger?.summary?.availableAssets === policy.denominator.availableAssets && summary?.availableAssets === policy.denominator.availableAssets);
  add(checks, "summary-provider-available", ledger?.summary?.providerAvailableRows === policy.denominator.providerAvailableRows && summary?.providerAvailableRows === policy.denominator.providerAvailableRows && availableRows.length === policy.denominator.providerAvailableRows);
  add(checks, "summary-conflicted-zero", ledger?.summary?.conflictedAssets === policy.denominator.conflictedAssets);
  add(checks, "summary-failed-zero", ledger?.summary?.failedAssets === policy.denominator.failedAssets);
  add(checks, "summary-status", summary?.status === "PASS_DIAGNOSTIC");
  add(checks, "truth-diagnostic-only", ledger?.truthBoundary?.diagnosticOnly === true);
  add(checks, "truth-rights-false", ledger?.truthBoundary?.rightsApprovedCommercialUse === false);
  add(checks, "truth-customer-false", ledger?.truthBoundary?.customerDeliveryCredit === false);
  add(checks, "truth-paid-false", ledger?.truthBoundary?.paidTierCredit === false);
  add(checks, "truth-live-false", ledger?.truthBoundary?.liveCredit === false);
  add(checks, "truth-production-false", ledger?.truthBoundary?.productionApproved === false);
  add(checks, "independent-verifier-pass", independent?.status === "PASS" && independent?.checks === 18 && independent?.passed === 18 && independent?.failed === 0);
  add(checks, "independent-ledger-binding", independent?.ledgerSha256 === policy.externalEvidence.ledgerSha256);
  add(checks, "summary-ledger-binding", summary?.ledgerSha256 === policy.externalEvidence.ledgerSha256);
  add(checks, "no-commercial-promotion", Object.values(policy.truthBoundary).filter((value) => typeof value === "boolean").every((value) => value === false));
  return checks;
}

export function verifyProviderDiagnosticEvidence(evidenceRoot, { enforcePolicyBindings = true } = {}) {
  const root = path.resolve(evidenceRoot);
  invariant(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), "r44p12_evidence_root_invalid");
  const policy = loadR44P12Policy();
  const ledgerPath = safeEvidencePath(root, policy.externalEvidence.ledgerPath, "ledger");
  const summaryPath = safeEvidencePath(root, policy.externalEvidence.summaryPath, "summary");
  const independentPath = safeEvidencePath(root, policy.externalEvidence.independentVerificationPath, "independent");
  const ledgerRead = readStrictJson(ledgerPath, { maxBytes: policy.thresholds.maximumLedgerBytes, maxDepth: 96, maxNodes: 2000000, errorPrefix: "r44p12_ledger" });
  const summaryRead = readStrictJson(summaryPath, { maxBytes: policy.thresholds.maximumSummaryBytes, errorPrefix: "r44p12_summary" });
  const independentRead = readStrictJson(independentPath, { maxBytes: policy.thresholds.maximumSummaryBytes, errorPrefix: "r44p12_independent" });
  const checks = validateProviderDiagnosticDocuments({ ledger: ledgerRead.value, summary: summaryRead.value, independent: independentRead.value, policy });

  if (enforcePolicyBindings) {
    add(checks, "ledger-binding-exact", ledgerRead.binding.byteLength === policy.externalEvidence.ledgerBytes && ledgerRead.binding.sha256 === policy.externalEvidence.ledgerSha256);
    add(checks, "summary-binding-exact", summaryRead.binding.byteLength === policy.externalEvidence.summaryBytes && summaryRead.binding.sha256 === policy.externalEvidence.summarySha256);
    add(checks, "independent-binding-exact", independentRead.binding.byteLength === policy.externalEvidence.independentVerificationBytes && independentRead.binding.sha256 === policy.externalEvidence.independentVerificationSha256);
  }

  const requests = Array.isArray(ledgerRead.value?.requests) ? ledgerRead.value.requests : [];
  add(checks, "requests-present", requests.length >= 16, requests.length);
  let rawBytes = 0;
  let rawFiles = 0;
  const requestKeys = new Set();
  for (const request of requests) {
    const key = `${request.provider}:${request.requestId}:${request.attempt}`;
    add(checks, `request-unique-${requestKeys.size}`, !requestKeys.has(key), key);
    requestKeys.add(key);
    const bodyPath = safeEvidencePath(root, request.bodyPath, "request_body");
    const headersPath = safeEvidencePath(root, request.headersPath, "request_headers");
    const bodyRead = readDescriptorBoundRegularFile(bodyPath, { maxBytes: policy.thresholds.maximumRawBodyBytes, errorPrefix: "r44p12_raw_body" });
    const headersRead = readStrictJson(headersPath, { maxBytes: 64 * 1024, errorPrefix: "r44p12_raw_headers" });
    add(checks, `request-body-binding-${key}`, bodyRead.binding.byteLength === request.bodyBytes && bodyRead.binding.sha256 === request.bodySha256);
    add(checks, `request-header-redaction-${key}`, !Object.keys(headersRead.value).some((name) => /authorization|cookie|api[-_]?key|token|secret/iu.test(name)));
    add(checks, `request-body-sha-format-${key}`, SHA256.test(request.bodySha256));
    rawBytes += bodyRead.binding.byteLength + headersRead.binding.byteLength;
    rawFiles += 2;
  }

  const failed = checks.filter((row) => !row.ok);
  return {
    schemaVersion: "velmere.pass36.a102r44p12.real-provider-diagnostic-verification.v1",
    status: failed.length ? "FAIL_R44P12_REAL_PROVIDER_DIAGNOSTIC" : "PASS_R44P12_REAL_PROVIDER_DIAGNOSTIC_NO_RIGHTS_OR_SALE_CREDIT",
    revisionId: policy.revisionId,
    parentRevisionId: policy.parentRevisionId,
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    checksDetail: checks,
    evidenceRoot: root,
    ledgerBinding: ledgerRead.binding,
    summaryBinding: summaryRead.binding,
    independentBinding: independentRead.binding,
    rawFiles,
    rawBytes,
    denominator: policy.denominator,
    realNetworkObservationCredit: policy.truthBoundary.realNetworkObservationCredit,
    rightsApprovedCommercialUse: false,
    customerDeliveryCredit: false,
    paidTierCredit: false,
    liveCredit: false,
    productionApproved: false,
  };
}
