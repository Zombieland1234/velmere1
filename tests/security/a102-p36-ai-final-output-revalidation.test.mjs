import assert from "node:assert/strict";
import fs from "node:fs";

import {
  CAMPAIGN_PATH,
  EXPECTED_ROW_COUNT,
  OUTPUT_PATH,
  ROOT,
  buildPdfPhysicalEvidence,
  buildRevalidation,
  canonicalJson,
  readSourceRows,
  resignRevalidation,
  resignRowBinding,
  sha256Object,
  validateRevalidation,
} from "../../scripts/closure/build-p36-ai-final-output-revalidation.mjs";

const read = (relativePath) =>
  JSON.parse(fs.readFileSync(`${ROOT}/${relativePath}`, "utf8"));
const readBytes = (relativePath) => fs.readFileSync(`${ROOT}/${relativePath}`);
const clone = (value) => structuredClone(value);
const PDF_MANIFEST_PATH = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json";
const PDF_QA_PATH = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json";
const manifestBytes = readBytes(PDF_MANIFEST_PATH);
const qaBytes = readBytes(PDF_QA_PATH);
const jsonBytes = (value) => Buffer.from(JSON.stringify(value), "utf8");
const resignedQaBytes = (value) => {
  const copy = clone(value);
  delete copy.integritySha256;
  copy.integritySha256 = sha256Object(copy);
  return jsonBytes(copy);
};

let checks = 0;
const ok = (condition, message) => {
  checks += 1;
  assert.ok(condition, message);
};

const campaign = read(CAMPAIGN_PATH);
const sourceRows = readSourceRows();
const physicalPdfEvidence = buildPdfPhysicalEvidence({ manifestBytes, qaBytes });
const firstBuild = buildRevalidation();
const secondBuild = buildRevalidation();
const stored = read(OUTPUT_PATH);

ok(canonicalJson(firstBuild) === canonicalJson(secondBuild), "two independent builds must be byte-model deterministic");
ok(canonicalJson(stored) === canonicalJson(firstBuild), "stored receipt must match the current deterministic build");

const validationContext = { campaign, sourceRows, physicalPdfEvidence };
const validation = validateRevalidation(stored, validationContext);
ok(validation.ok, `current revalidation must pass: ${validation.errors.join(",")}`);
ok(stored.executionTruth.rowDenominator === EXPECTED_ROW_COUNT, "denominator must remain 5147");
ok(stored.executionTruth.rowsRebound === EXPECTED_ROW_COUNT, "all 5147 internal rows must be rebound");
ok(stored.rowBindings.length === EXPECTED_ROW_COUNT, "all row bindings must be materialized");
ok(new Set(stored.rowBindings.map((row) => row.rowId)).size === EXPECTED_ROW_COUNT, "row IDs must be unique");
ok(new Set(stored.rowBindings.map((row) => row.profileId)).size === 33, "all 33 product-tier profiles must be covered");
ok(sourceRows.every((row) => stored.rowBindings.some((binding) => binding.rowId === row.rowId)), "source ledger must have no orphan row");
ok(stored.campaignBinding.payloadSha256 === campaign.integrity.payloadSha256, "receipt must bind the current campaign payload SHA");
ok(stored.profileBindingIndex.length === 33, "profile binding index must be complete");
ok(stored.completion.sameInputProfilesBound === 0, "complete V14 same-input credit remains zero");
ok(stored.completion.outputsPresentNotSameInputProfiles === 30, "all present outputs remain outside complete same-input credit");
ok(stored.completion.currentOutputMissingProfiles === 3, "three Browser profiles remain current-output missing");

const browserRows = stored.rowBindings.filter((row) => row.productId === "browser");
const angelRiskRows = stored.rowBindings.filter((row) => row.productId === "angel" || row.productId === "risk");
const pdfRows = stored.rowBindings.filter((row) => row.productId === "pdf");
ok(browserRows.length > 0 && browserRows.every((row) => row.outputBindingState === "INCOMPLETE_CURRENT_OUTPUT_MISSING"), "Browser must stay explicitly incomplete");
ok(browserRows.every((row) => row.profileOutputSha256 === null && !row.sameInputRevalidationComplete), "Browser cannot receive output or same-input credit");
ok(angelRiskRows.length > 0 && angelRiskRows.every((row) => row.outputBindingState === "INCOMPLETE_OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY"), "Angel/Risk must stay explicitly partial-input-identity");
ok(angelRiskRows.every((row) => row.profileOutputSha256 && !row.sameInputRevalidationComplete), "Angel/Risk may bind present output but not same-input credit");
ok(pdfRows.length > 0 && pdfRows.every((row) => row.currentPhysicalPdfBytesBound), "PDF rows must bind current physical PDF bytes");
ok(pdfRows.every((row) => row.physicalPdfBytesSetSha256 === stored.physicalPdfEvidence.tiers[row.tier].byteSetSha256), "PDF rows must bind the exact tier byte-set SHA");
ok(pdfRows.every((row) => row.outputBindingState === "BOUND_CURRENT_PHYSICAL_PDF_BYTES_PARTIAL_INPUT_IDENTITY" && !row.sameInputRevalidationComplete), "physical PDF binding cannot imply complete same-input identity");
ok(stored.physicalPdfEvidence.documentCount === 450 && stored.physicalPdfEvidence.pageCount === 2100, "physical PDF denominator must be 450 documents / 2100 pages");
ok(
  stored.physicalPdfEvidence.qaSchemaVersion === "velmere.pass36.a83.pdf-raster-external-parse-qa.v2",
  "AI revalidation must bind the A83 receipt v2 schema",
);
ok(
  stored.physicalPdfEvidence.qaIntegritySha256 === physicalPdfEvidence.qaIntegritySha256
    && stored.physicalPdfEvidence.pdfSetAggregateSha256 === physicalPdfEvidence.pdfSetAggregateSha256
    && stored.physicalPdfEvidence.manifestCanonicalSha256 === physicalPdfEvidence.manifestCanonicalSha256,
  "AI revalidation must bind QA self-integrity, PDF-set aggregate, and manifest canonical integrity",
);

ok(stored.executionTruth.sourceLedgerLiveModelCalls === 0, "source ledger remains deterministic rubric expansion, not live calls");
ok(stored.executionTruth.revalidationLiveModelCalls === 0, "revalidation must execute zero live model calls");
ok(stored.executionTruth.realCustomers === 0, "revalidation must create zero real-customer credit");
ok(stored.executionTruth.independentReviewers === 0, "revalidation must create zero independent-review credit");
ok(stored.executionTruth.externalProviderEvidenceObservations === 0, "revalidation must create zero external evidence credit");
ok(stored.executionTruth.saleEligibleProfiles === 0, "revalidation must create zero sale eligibility");
ok(stored.rowBindings.every((row) => row.liveModelCalls === 0 && row.newModelReviewExecuted === false), "no row may imply a new model review");
ok(stored.rowBindings.every((row) => Object.values(row.credits).every((credit) => credit === 0)), "no row may imply external, customer, rights, sale, paid, LIVE, or world-class credit");

const mutations = [
  ["schema", (receipt) => { receipt.schemaVersion = "velmere.p36.ai-final-output-revalidation.v999"; }],
  ["source denominator", (receipt) => { receipt.sourceLedger.rowCount = EXPECTED_ROW_COUNT - 1; }],
  ["source ledger file SHA", (receipt) => { receipt.sourceLedger.fileSha256 = "9".repeat(64); }],
  ["executed denominator", (receipt) => { receipt.executionTruth.rowsRebound = EXPECTED_ROW_COUNT - 1; }],
  ["campaign file SHA", (receipt) => { receipt.campaignBinding.fileSha256 = "0".repeat(64); }],
  ["campaign payload SHA", (receipt) => { receipt.campaignBinding.payloadSha256 = "1".repeat(64); }],
  ["A83 receipt integrity binding", (receipt) => {
    receipt.physicalPdfEvidence.qaIntegritySha256 = "4".repeat(64);
  }],
  ["duplicate row", (receipt) => { receipt.rowBindings[1] = clone(receipt.rowBindings[0]); }],
  ["orphan row", (receipt) => {
    receipt.rowBindings[0].rowId = "p36-orphan-row";
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["orphan profile", (receipt) => {
    receipt.rowBindings[0].profileId = "unknown:basic";
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["profile digest", (receipt) => {
    receipt.rowBindings[0].profileSha256 = "2".repeat(64);
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["output digest", (receipt) => {
    receipt.rowBindings[0].profileOutputSha256 = "3".repeat(64);
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["live model call", (receipt) => {
    receipt.rowBindings[0].liveModelCalls = 1;
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["external row credit", (receipt) => {
    receipt.rowBindings[0].credits.externalEvidence = 1;
    resignRowBinding(receipt.rowBindings[0]);
  }],
  ["browser same-input promotion", (receipt) => {
    const row = receipt.rowBindings.find((candidate) => candidate.productId === "browser");
    row.sameInputRevalidationComplete = true;
    resignRowBinding(row);
  }],
  ["angel same-input promotion", (receipt) => {
    const row = receipt.rowBindings.find((candidate) => candidate.productId === "angel");
    row.sameInputRevalidationComplete = true;
    resignRowBinding(row);
  }],
  ["PDF byte binding removal", (receipt) => {
    const row = receipt.rowBindings.find((candidate) => candidate.productId === "pdf");
    row.currentPhysicalPdfBytesBound = false;
    resignRowBinding(row);
  }],
  ["real-customer promotion", (receipt) => { receipt.executionTruth.realCustomers = 1; }],
  ["independent reviewer promotion", (receipt) => { receipt.executionTruth.independentReviewers = 1; }],
  ["sale promotion", (receipt) => { receipt.executionTruth.saleEligibleProfiles = 1; }],
];

let detected = 0;
for (const [label, mutate] of mutations) {
  const receipt = clone(stored);
  mutate(receipt);
  resignRevalidation(receipt);
  const result = validateRevalidation(receipt, validationContext);
  if (!result.ok) detected += 1;
  ok(!result.ok, `false-promotion mutation must be detected: ${label}`);
}
ok(detected === mutations.length && detected >= 12, "all mutations must be detected and denominator must be at least 12");

const mutatedSourceRows = clone(sourceRows);
mutatedSourceRows[0].assessment = `${mutatedSourceRows[0].assessment ?? ""} tampered`;
const sourceContentMutation = validateRevalidation(stored, {
  campaign,
  sourceRows: mutatedSourceRows,
  physicalPdfEvidence,
});
ok(!sourceContentMutation.ok && sourceContentMutation.errors.some((error) => error.startsWith("source_row_content_sha:")), "source row content mutation with unchanged legacy rowSha must be detected");

const parsedQa = JSON.parse(qaBytes.toString("utf8"));
const a83ConsumerMutations = [
  ["receipt schema", () => {
    const qa = clone(parsedQa);
    qa.schemaVersion = "velmere.pass36.a83.pdf-raster-external-parse-qa.v999";
    buildPdfPhysicalEvidence({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["manifest raw binding", () => {
    const qa = clone(parsedQa);
    qa.manifestBinding.byteLength += 1;
    buildPdfPhysicalEvidence({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["PDF row binding", () => {
    const qa = clone(parsedQa);
    qa.pdfSetBinding.rows[0].pdfSha256 = "5".repeat(64);
    qa.pdfSetBinding.aggregateSha256 = sha256Object(qa.pdfSetBinding.rows);
    buildPdfPhysicalEvidence({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["zero-credit boundary", () => {
    const qa = clone(parsedQa);
    qa.paidReleaseCredit = 1;
    buildPdfPhysicalEvidence({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
];
let a83Detected = 0;
for (const [label, mutate] of a83ConsumerMutations) {
  assert.throws(mutate, /p36_a83_evidence_invalid:/u, `AI A83 consumer mutation not detected: ${label}`);
  a83Detected += 1;
}
ok(a83Detected === a83ConsumerMutations.length, "AI consumer must fail closed on all A83 binding mutations");

console.log(
  `P36 AI final-output revalidation: PASS (${checks}/${checks}); rows ${EXPECTED_ROW_COUNT}/${EXPECTED_ROW_COUNT}; mutations ${detected}/${mutations.length}; A83 mutations ${a83Detected}/${a83ConsumerMutations.length}; deterministic 2/2`,
);
