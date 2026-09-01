import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OUTPUT_PATH,
  ROOT,
  buildCampaign,
  canonicalJson,
  resignCampaign,
  sha256Object,
  validateA83PdfEvidenceOrThrow,
  validateCampaign,
} from "../../scripts/closure/build-p36-internal-final-tier-campaign.mjs";

const PDF_MANIFEST_PATH = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json";
const PDF_QA_PATH = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json";
const manifestBytes = fs.readFileSync(`${ROOT}/${PDF_MANIFEST_PATH}`);
const qaBytes = fs.readFileSync(`${ROOT}/${PDF_QA_PATH}`);
const jsonBytes = (value) => Buffer.from(JSON.stringify(value), "utf8");
const resignedQaBytes = (value) => {
  const copy = structuredClone(value);
  delete copy.integritySha256;
  copy.integritySha256 = sha256Object(copy);
  return jsonBytes(copy);
};

let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

const firstBuild = buildCampaign();
const secondBuild = buildCampaign();
check(canonicalJson(firstBuild) === canonicalJson(secondBuild), "two in-memory builds must be byte-model identical");

const a83Evidence = validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes });
check(
  a83Evidence.qa.schemaVersion === "velmere.pass36.a83.pdf-raster-external-parse-qa.v2",
  "campaign must consume the A83 receipt v2 schema",
);
check(a83Evidence.physicalRows.length === 450, "A83 receipt must bind all 450 physical PDF rows");
check(
  a83Evidence.physicalRows.reduce((total, row) => total + row.pageCount, 0) === 2100,
  "A83 receipt must bind all 2100 physical PDF pages",
);

const campaign = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
const rebuilt = secondBuild;
const validation = validateCampaign(campaign, { expectedCampaign: rebuilt });
check(validation.valid, `campaign validation failed: ${validation.errors.join(",")}`);
check(canonicalJson(campaign) === canonicalJson(rebuilt), "persisted campaign must equal current-source recomputation");
check(campaign.products.length === 11, "all 11 products must be mapped");
check(campaign.profiles.length === 33, "all 33 product/tier profiles must be mapped");
check(campaign.completion.sameInputProductsCompleted === 0, "no product has complete V14 input identity");
check(campaign.completion.sameInputProfilesCompleted === 0, "no profile receives full same-input credit");
check(campaign.completion.partialInputIdentityProducts === 8, "eight products have diagnostic partial-identity triplets");
check(campaign.completion.partialInputIdentityProfiles === 24, "24 profiles have diagnostic partial-identity triplets");
check(campaign.completion.outputsPresentButNotSameInputProfiles === 30, "all present outputs stay outside full same-input credit");
check(campaign.completion.currentOutputMissingProfiles === 3, "the Browser current output gap remains explicit");
check(campaign.truthBoundary.saleEligibleProfiles === 0, "internal campaign cannot enable sale");
check(campaign.truthBoundary.realCustomers === 0, "internal campaign cannot create real customers");
check(campaign.truthBoundary.externalProviderEvidenceCredit === 0, "offline runtime cannot create external provider evidence");
check(campaign.truthBoundary.willingnessToPayObservations === 0, "offline runtime cannot create WTP evidence");
check(campaign.sourceBindings.length === 8, "eight exact source JSON files must be bound");
check(campaign.sourceBindings.every((binding) => /^[a-f0-9]{64}$/.test(binding.sha256)), "all source hashes must be SHA-256");
check(campaign.profiles.every((profile) => profile.profileId === `${profile.productId}:${profile.tier}`), "profile identity must be explicit");
check(campaign.profiles.every((profile) => profile.saleEligibleCredit === false), "no profile can receive sale credit");
check(
  campaign.products
    .filter((product) => product.candidateCrossTierMatchCount > 0)
    .every((product) => product.metrics.status === "NOT_MEASURED_COMPLETE_INPUT_IDENTITY_MISSING"),
  "partial-identity products must not publish novelty or tier-value metrics",
);
check(
  campaign.profiles
    .filter((profile) => profile.productId === "audit")
    .every((profile) => Number.isInteger(profile.groundTruth.falsePositiveCount) && Number.isInteger(profile.groundTruth.falseNegativeCount)),
  "Audit FN/FP must bind explicit fixture labels",
);
check(
  campaign.profiles
    .filter((profile) => ["angel", "risk"].includes(profile.productId))
    .every((profile) => profile.groundTruth.status === "MEASURED_INTERNAL_EXPECTED_DECISION_LABELS"),
  "Angel/Risk FN/FP may use their explicit expected-decision labels without same-input credit",
);
check(
  campaign.profiles
    .filter((profile) => profile.productId === "browser")
    .every((profile) => profile.outputSha256 === null && profile.groundTruth.falsePositiveCount === null),
  "Browser missing bytes and unmeasured FN/FP must remain null",
);
check(
  campaign.profiles
    .filter((profile) => profile.productId === "pdf")
    .every((profile) =>
      profile.recordCount === 150
      && profile.candidateCrossTierMatchCount === 150
      && profile.matchedSameInputCount === 0
      && profile.sameInputSetSha256 === null
      && profile.outputSha256),
  "all 450 current physical PDFs bind candidate triplets without full same-input credit",
);

const mutations = [
  ["real_customer_false_promotion", (copy) => { copy.truthBoundary.realCustomers = 1; }],
  ["sale_false_promotion", (copy) => { copy.truthBoundary.saleEligibleProfiles = 1; }],
  ["external_evidence_false_promotion", (copy) => { copy.truthBoundary.externalProviderEvidenceCredit = 1; }],
  ["wtp_false_promotion", (copy) => { copy.truthBoundary.willingnessToPayObservations = 1; }],
  ["pdf_completion_false_promotion", (copy) => {
    copy.products.find((product) => product.productId === "pdf").sameInputVerified = true;
  }],
  ["browser_output_fabrication", (copy) => {
    copy.profiles.find((profile) => profile.profileId === "browser:basic").outputSha256 = "f".repeat(64);
  }],
  ["profile_denominator_drift", (copy) => { copy.profiles.pop(); }],
  ["source_digest_tamper", (copy) => { copy.sourceBindings[0].sha256 = "0".repeat(64); }],
  ["same_input_parity_tamper", (copy) => {
    copy.profiles.find((profile) => profile.profileId === "audit:advanced").sameInputSetSha256 = "1".repeat(64);
  }],
  ["fabricated_fn_without_ground_truth", (copy) => {
    copy.profiles.find((profile) => profile.profileId === "shield:basic").groundTruth.falseNegativeCount = 0;
  }],
  ["completion_count_tamper", (copy) => { copy.completion.sameInputProductsCompleted = 11; }],
  ["release_false_promotion", (copy) => { copy.truthBoundary.goPaid = true; }],
];

let detected = 0;
for (const [name, mutate] of mutations) {
  const copy = structuredClone(campaign);
  mutate(copy);
  resignCampaign(copy);
  const result = validateCampaign(copy, { expectedCampaign: rebuilt });
  assert.equal(result.valid, false, `mutation not detected: ${name}`);
  detected += 1;
}
check(detected === mutations.length, "all false-promotion and binding mutations must be detected");

const parsedQa = JSON.parse(qaBytes.toString("utf8"));
const parsedManifest = JSON.parse(manifestBytes.toString("utf8"));
const firstPdfPath = parsedManifest.entries[0].path;
const a83Mutations = [
  ["QA self integrity", () => {
    const qa = structuredClone(parsedQa);
    qa.status = "PASS_TAMPERED";
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: jsonBytes(qa) });
  }],
  ["manifest canonical integrity", () => {
    const manifest = structuredClone(parsedManifest);
    manifest.boundaries.browserCredit = 1;
    validateA83PdfEvidenceOrThrow({ manifestBytes: jsonBytes(manifest), qaBytes });
  }],
  ["manifest raw file binding", () => {
    const qa = structuredClone(parsedQa);
    qa.manifestBinding.sha256 = "0".repeat(64);
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["PDF row exact binding", () => {
    const qa = structuredClone(parsedQa);
    qa.pdfSetBinding.rows[0].byteLength += 1;
    qa.pdfSetBinding.aggregateSha256 = sha256Object(qa.pdfSetBinding.rows);
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["PDF set canonical aggregate", () => {
    const qa = structuredClone(parsedQa);
    qa.pdfSetBinding.aggregateSha256 = "1".repeat(64);
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["physical PDF bytes", () => {
    validateA83PdfEvidenceOrThrow({
      manifestBytes,
      qaBytes,
      physicalBytesForPath: (relativePath) => {
        const bytes = fs.readFileSync(`${ROOT}/${relativePath}`);
        return relativePath === firstPdfPath ? Buffer.concat([bytes, Buffer.from("tamper")]) : bytes;
      },
    });
  }],
  ["zero-credit boundary", () => {
    const qa = structuredClone(parsedQa);
    qa.externalEvidenceCredit = 1;
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["raster canonical aggregate", () => {
    const qa = structuredClone(parsedQa);
    qa.rasterEvidenceBinding.aggregateSha256 = "2".repeat(64);
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
  ["toolchain canonical aggregate", () => {
    const qa = structuredClone(parsedQa);
    qa.toolchainIdentity.aggregateSha256 = "3".repeat(64);
    validateA83PdfEvidenceOrThrow({ manifestBytes, qaBytes: resignedQaBytes(qa) });
  }],
];

let a83Detected = 0;
for (const [name, mutate] of a83Mutations) {
  assert.throws(mutate, /p36_a83_evidence_invalid:/u, `A83 evidence mutation not detected: ${name}`);
  a83Detected += 1;
}
check(a83Detected === a83Mutations.length, "all A83 receipt/manifest/physical binding mutations must fail closed");

console.log(
  JSON.stringify({
    status: "PASS_P36_INTERNAL_FINAL_TIER_CAMPAIGN",
    checks,
    profiles: "33/33",
    sameInputProducts: "0/11",
    sameInputProfiles: "0/33",
    partialInputIdentityProfiles: "24/33",
    browserCurrentGaps: "3/3 profiles explicit",
    falsePromotionMutations: `${detected}/${mutations.length}`,
    a83EvidenceMutations: `${a83Detected}/${a83Mutations.length}`,
    realCustomerCredit: 0,
    saleEligibleProfiles: 0,
    payloadSha256: campaign.integrity.payloadSha256,
  }),
);
