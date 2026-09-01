import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateA83PdfEvidenceOrThrow } from "./build-p36-internal-final-tier-campaign.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");

export const SOURCE_LEDGER_PATH = "artifacts/closure/p35/internal-ai-assessments.jsonl";
export const SOURCE_LEDGER_VERIFIER_PATH =
  "artifacts/closure/p35/internal-ai-availability-ledger-verifier-receipt.json";
export const CAMPAIGN_PATH = "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json";
export const OUTPUT_PATH = "artifacts/closure/p36/P36_AI_FINAL_OUTPUT_REVALIDATION.json";
export const EXPECTED_ROW_COUNT = 5147;

const GENERATED_AT = "2026-08-13T12:30:00.000Z";
const PDF_MANIFEST_PATH =
  "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json";
const PDF_QA_PATH =
  "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json";

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sha256Object(value) {
  return sha256Bytes(canonicalJson(value));
}

function readBytes(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(readBytes(relativePath).toString("utf8"));
}

export function readSourceRows() {
  return readBytes(SOURCE_LEDGER_PATH)
    .toString("utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
    } catch (error) {
      throw new Error(`invalid_source_ledger_jsonl:${index + 1}:${error.message}`, { cause: error });
      }
    });
}

function withoutKey(value, key) {
  const { [key]: _removed, ...payload } = value;
  return payload;
}

function validateSourceRowsOrThrow(rows) {
  if (rows.length !== EXPECTED_ROW_COUNT) {
    throw new Error(`source_row_denominator:${rows.length}`);
  }
  const rowIds = new Set();
  for (const row of rows) {
    if (!row.rowId || rowIds.has(row.rowId)) {
      throw new Error(`source_row_identity:${row.rowId ?? "missing"}`);
    }
    rowIds.add(row.rowId);
    // P35 row hashes were serialized by Python, which intentionally preserves
    // numeric tokens such as 1.0 that JavaScript normalizes to 1. The frozen P35
    // verifier is therefore the cross-runtime row-integrity authority here.
    if (!/^[a-f0-9]{64}$/u.test(row.rowSha256 ?? "")) {
      throw new Error(`source_row_digest_shape:${row.rowId}`);
    }
    if (row.executionMode !== "MODEL_AUTHORED_ROLE_RUBRIC_DETERMINISTIC_EXPANSION") {
      throw new Error(`source_execution_mode:${row.rowId}`);
    }
    for (const field of [
      "realCustomerCredit",
      "independentReviewerCredit",
      "professionalLegalDecisionCredit",
      "providerRightsCredit",
      "paidReleaseCredit",
      "worldClassCredit",
      "externalCredit",
      "customerValueCredit",
    ]) {
      if (row[field] !== false) throw new Error(`source_false_credit:${row.rowId}:${field}`);
    }
  }
}

function validateCampaignOrThrow(campaign) {
  if (campaign.schemaVersion !== "velmere.p36.internal-final-tier-campaign.v1") {
    throw new Error("campaign_schema");
  }
  if (campaign.profiles?.length !== 33 || campaign.products?.length !== 11) {
    throw new Error("campaign_denominator");
  }
  if (
    campaign.integrity?.payloadSha256
    !== sha256Object(withoutKey(campaign, "integrity"))
  ) {
    throw new Error("campaign_payload_integrity");
  }
  if (
    campaign.truthBoundary?.realCustomers !== 0
    || campaign.truthBoundary?.independentReviewers !== 0
    || campaign.truthBoundary?.externalProviderEvidenceCredit !== 0
    || campaign.truthBoundary?.saleEligibleProfiles !== 0
    || campaign.truthBoundary?.goPaid !== false
    || campaign.truthBoundary?.live !== false
  ) {
    throw new Error("campaign_false_external_or_sale_credit");
  }
}

export function buildPdfPhysicalEvidence({
  manifestBytes = readBytes(PDF_MANIFEST_PATH),
  qaBytes = readBytes(PDF_QA_PATH),
  physicalBytesForPath,
} = {}) {
  const validated = validateA83PdfEvidenceOrThrow({
    manifestBytes,
    qaBytes,
    physicalBytesForPath,
  });
  const { manifest, qa, physicalRows } = validated;
  const manifestByEntryId = new Map(manifest.entries.map((entry) => [entry.entryId, entry]));

  const byTier = Object.fromEntries(
    ["basic", "pro", "advanced"].map((tier) => [tier, []]),
  );
  let pageCount = 0;
  for (const row of physicalRows) {
    const entry = manifestByEntryId.get(row.entryId);
    pageCount += row.pageCount;
    byTier[entry.tier]?.push(row);
  }
  if (pageCount !== 2100) throw new Error(`physical_pdf_page_denominator:${pageCount}`);

  const tierEvidence = Object.fromEntries(
    Object.entries(byTier).map(([tier, entries]) => {
      const sorted = entries.sort((left, right) => left.entryId.localeCompare(right.entryId, "en"));
      if (sorted.length !== 150) throw new Error(`physical_pdf_tier_denominator:${tier}`);
      return [
        tier,
        {
          documentCount: sorted.length,
          pageCount: sorted.reduce((total, entry) => total + entry.pageCount, 0),
          byteSetSha256: sha256Object(sorted),
        },
      ];
    }),
  );

  return {
    manifestPath: PDF_MANIFEST_PATH,
    manifestSha256: sha256Bytes(manifestBytes),
    manifestByteLength: manifestBytes.byteLength,
    manifestCanonicalSha256: validated.manifestCanonicalDigest,
    qaPath: PDF_QA_PATH,
    qaSha256: sha256Bytes(qaBytes),
    qaByteLength: qaBytes.byteLength,
    qaSchemaVersion: qa.schemaVersion,
    qaIntegritySha256: qa.integritySha256,
    pdfSetAggregateSha256: validated.pdfSetAggregateSha256,
    rasterEvidenceAggregateSha256: validated.rasterEvidenceAggregateSha256,
    toolchainAggregateSha256: validated.toolchainAggregateSha256,
    documentCount: 450,
    pageCount: 2100,
    pdfHeaderValidated: 450,
    byteLengthAndSha256Validated: 450,
    fixtureOnly: true,
    browserExecuted: false,
    secureDeliveryExecuted: false,
    externalCustomerCredit: 0,
    tiers: tierEvidence,
  };
}

function outputBindingState(profile) {
  if (profile.productId === "browser") return "INCOMPLETE_CURRENT_OUTPUT_MISSING";
  if (profile.productId === "pdf") {
    return "BOUND_CURRENT_PHYSICAL_PDF_BYTES_PARTIAL_INPUT_IDENTITY";
  }
  return "INCOMPLETE_OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY";
}

export function resignRowBinding(rowBinding) {
  rowBinding.bindingSha256 = sha256Object(withoutKey(rowBinding, "bindingSha256"));
  return rowBinding;
}

function makeRowBinding({ row, campaignFileSha256, campaign, profile, physicalPdfEvidence }) {
  const profileSha256 = sha256Object(profile);
  const state = outputBindingState(profile);
  const outputBindingSha256 = sha256Object({
    profileId: profile.profileId,
    executionStatus: profile.executionStatus,
    sourceSha256: profile.sourceSha256,
    outputSha256: profile.outputSha256,
    matchedOutputSha256: profile.matchedOutputSha256,
    matchedSameInputCount: profile.matchedSameInputCount,
    state,
  });
  const pdfTierEvidence = profile.productId === "pdf"
    ? physicalPdfEvidence.tiers[profile.tier]
    : null;

  return resignRowBinding({
    rowId: row.rowId,
    sourceRowSha256: row.rowSha256,
    sourceRowContentSha256: sha256Object(row),
    sourceAssessmentType: row.assessmentType,
    cohortId: row.cohortId,
    sourceExecutionMode: row.executionMode,
    profileId: profile.profileId,
    productId: profile.productId,
    tier: profile.tier,
    campaignFileSha256,
    campaignPayloadSha256: campaign.integrity.payloadSha256,
    profileSha256,
    profileExecutionStatus: profile.executionStatus,
    profileSourcePath: profile.sourcePath,
    profileSourceSha256: profile.sourceSha256,
    profileOutputSha256: profile.outputSha256,
    profileMatchedOutputSha256: profile.matchedOutputSha256,
    profileMatchedSameInputCount: profile.matchedSameInputCount,
    outputBindingState: state,
    outputBindingSha256,
    sameInputRevalidationComplete: profile.executionStatus === "COMPLETED_SAME_INPUT_INTERNAL",
    currentPhysicalPdfBytesBound: profile.productId === "pdf",
    physicalPdfBytesSetSha256: pdfTierEvidence?.byteSetSha256 ?? null,
    revalidationMode: "DETERMINISTIC_BINDING_ONLY_NO_NEW_MODEL_REVIEW",
    newModelReviewExecuted: false,
    liveModelCalls: 0,
    credits: {
      realCustomer: 0,
      independentReviewer: 0,
      externalEvidence: 0,
      providerRights: 0,
      customerValue: 0,
      saleEligibility: 0,
      paidRelease: 0,
      live: 0,
      worldClass: 0,
    },
  });
}

function withoutIntegrity(revalidation) {
  return withoutKey(revalidation, "integrity");
}

export function resignRevalidation(revalidation) {
  revalidation.integrity = {
    algorithm: "sha256",
    payloadSha256: sha256Object(withoutIntegrity(revalidation)),
  };
  return revalidation;
}

export function buildRevalidation() {
  const sourceLedgerBytes = readBytes(SOURCE_LEDGER_PATH);
  const sourceVerifierBytes = readBytes(SOURCE_LEDGER_VERIFIER_PATH);
  const sourceVerifier = JSON.parse(sourceVerifierBytes.toString("utf8"));
  const sourceLedgerFileSha256 = sha256Bytes(sourceLedgerBytes);
  if (
    sourceVerifier.status !== "PASS"
    || sourceVerifier.checks?.rowCount !== EXPECTED_ROW_COUNT
    || sourceVerifier.checks?.profileCoverage !== 33
    || sourceVerifier.checks?.mutationsDetected !== sourceVerifier.checks?.mutationDenominator
    || sourceVerifier.bindings?.rowsSha256 !== sourceLedgerFileSha256
    || sourceVerifier.integritySha256 !== sha256Object(withoutKey(sourceVerifier, "integritySha256"))
  ) {
    throw new Error("p35_source_ledger_verifier_not_authoritative");
  }
  const rows = readSourceRows();
  validateSourceRowsOrThrow(rows);

  const campaignBytes = readBytes(CAMPAIGN_PATH);
  const campaign = JSON.parse(campaignBytes.toString("utf8"));
  validateCampaignOrThrow(campaign);
  const campaignFileSha256 = sha256Bytes(campaignBytes);
  const physicalPdfEvidence = buildPdfPhysicalEvidence();
  const campaignSourceByPath = new Map(
    campaign.sourceBindings.map((binding) => [binding.path, binding.sha256]),
  );
  if (
    campaignSourceByPath.get(PDF_MANIFEST_PATH) !== physicalPdfEvidence.manifestSha256
    || campaignSourceByPath.get(PDF_QA_PATH) !== physicalPdfEvidence.qaSha256
  ) {
    throw new Error("campaign_a83_source_binding");
  }
  const profileById = new Map(campaign.profiles.map((profile) => [profile.profileId, profile]));

  const rowBindings = rows.map((row) => {
    const profileId = `${row.profile?.product}:${row.profile?.tier}`;
    const profile = profileById.get(profileId);
    if (!profile) throw new Error(`orphan_source_row_profile:${row.rowId}:${profileId}`);
    return makeRowBinding({
      row,
      campaignFileSha256,
      campaign,
      profile,
      physicalPdfEvidence,
    });
  });

  const stateCounts = Object.fromEntries(
    [...new Set(rowBindings.map((row) => row.outputBindingState))]
      .sort()
      .map((state) => [state, rowBindings.filter((row) => row.outputBindingState === state).length]),
  );
  const profileBindingIndex = campaign.profiles.map((profile) => ({
    profileId: profile.profileId,
    productId: profile.productId,
    tier: profile.tier,
    profileSha256: sha256Object(profile),
    executionStatus: profile.executionStatus,
    outputSha256: profile.outputSha256,
    matchedOutputSha256: profile.matchedOutputSha256,
    outputBindingState: outputBindingState(profile),
    rowsBound: rowBindings.filter((row) => row.profileId === profile.profileId).length,
  }));

  return resignRevalidation({
    schemaVersion: "velmere.p36.ai-final-output-revalidation.v1",
    revisionId: "P36_CURRENT_SOURCE_INTERNAL_AI_FINAL_OUTPUT_REBIND",
    generatedAt: GENERATED_AT,
    state: "CURRENT_SOURCE_INTERNAL_BINDING_ONLY_IN_PROGRESS",
    sourceLedger: {
      path: SOURCE_LEDGER_PATH,
      fileSha256: sourceLedgerFileSha256,
      authoritativeRowsSha256: sourceVerifier.bindings.rowsSha256,
      verifierPath: SOURCE_LEDGER_VERIFIER_PATH,
      verifierSha256: sha256Bytes(sourceVerifierBytes),
      verifierIntegritySha256: sourceVerifier.integritySha256,
      verifierStatus: sourceVerifier.status,
      rowCount: rows.length,
      sourceSchemaVersion: "velmere.p35.internal-ai-assessment.v1",
      executionMode: "MODEL_AUTHORED_ROLE_RUBRIC_DETERMINISTIC_EXPANSION",
    },
    campaignBinding: {
      path: CAMPAIGN_PATH,
      fileSha256: campaignFileSha256,
      payloadSha256: campaign.integrity.payloadSha256,
      schemaVersion: campaign.schemaVersion,
      revisionId: campaign.revisionId,
      profileCount: campaign.profiles.length,
    },
    executionTruth: {
      rowsRebound: rowBindings.length,
      rowDenominator: EXPECTED_ROW_COUNT,
      profilesBound: new Set(rowBindings.map((row) => row.profileId)).size,
      profileDenominator: 33,
      sourceLedgerLiveModelCalls: 0,
      revalidationLiveModelCalls: 0,
      newModelReviewsExecuted: 0,
      realCustomers: 0,
      independentReviewers: 0,
      professionalLegalReviewers: 0,
      externalProviderEvidenceObservations: 0,
      providerRightsApprovals: 0,
      saleEligibleProfiles: 0,
      paidTransactions: 0,
      willingnessToPayObservations: 0,
    },
    completion: {
      rowBindingStates: stateCounts,
      sameInputProfilesBound: profileBindingIndex.filter(
        (profile) => profile.executionStatus === "COMPLETED_SAME_INPUT_INTERNAL",
      ).length,
      outputsPresentNotSameInputProfiles: profileBindingIndex.filter(
        (profile) =>
          profile.executionStatus === "OUTPUT_PRESENT_INPUT_NOT_CROSS_TIER_MATCHED"
          || profile.executionStatus === "OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY_CURRENTLY_UNCREDITED",
      ).length,
      currentOutputMissingProfiles: profileBindingIndex.filter(
        (profile) => profile.executionStatus === "NOT_EXECUTED_CURRENT_BYTES",
      ).length,
      finalCustomerValueHoldoutsClosed: 0,
      realExternalTracksClosed: 0,
    },
    physicalPdfEvidence,
    profileBindingIndex,
    rowBindings,
    validationPolicy: {
      deterministicBuildsRequired: 2,
      falsePromotionMutationMinimum: 12,
      orphanRowsAllowed: 0,
      falseExternalCustomerSaleCreditsAllowed: 0,
    },
    truthBoundary: {
      statement:
        "P36 deterministically rebinds the exact, P35-verifier-authenticated 5,147-row ledger file to current campaign/profile/output digests. No profile currently satisfies complete V14 same-input identity. It does not rerun a model, inspect a real customer's output, create independent review, prove value, approve provider rights, or enable sale.",
      browser:
        "All Browser profiles remain incomplete because current output bytes are missing.",
      angelRisk:
        "Angel and Risk outputs are bound, but their inputs are not identical across Basic, Pro, and Advanced; same-input credit remains zero.",
      pdf:
        "PDF rows are bound to 450 current physical internal-fixture PDF files and their exact byte hashes, but the source receipt lacks complete V14 input identity; same-input, browser delivery, secure delivery, external-customer and sale credit remain zero.",
      liveModelCalls: 0,
      realCustomerCredit: 0,
      independentReviewerCredit: 0,
      externalEvidenceCredit: 0,
      providerRightsCredit: 0,
      customerValueCredit: 0,
      saleEligibilityCredit: 0,
      paidReleaseCredit: 0,
      liveCredit: 0,
      worldClassCredit: 0,
    },
  });
}

export function validateRevalidation(
  revalidation,
  {
    campaign = readJson(CAMPAIGN_PATH),
    sourceRows = readSourceRows(),
    physicalPdfEvidence = buildPdfPhysicalEvidence(),
  } = {},
) {
  const errors = [];
  const fail = (condition, code) => {
    if (!condition) errors.push(code);
  };

  const campaignFileSha256 = sha256Bytes(readBytes(CAMPAIGN_PATH));
  const currentSourceLedgerBytes = readBytes(SOURCE_LEDGER_PATH);
  const currentSourceVerifierBytes = readBytes(SOURCE_LEDGER_VERIFIER_PATH);
  const currentSourceVerifier = JSON.parse(currentSourceVerifierBytes.toString("utf8"));
  const currentSourceLedgerSha256 = sha256Bytes(currentSourceLedgerBytes);
  const campaignByProfile = new Map(campaign.profiles.map((profile) => [profile.profileId, profile]));
  const sourceById = new Map(sourceRows.map((row) => [row.rowId, row]));
  const bindings = Array.isArray(revalidation.rowBindings) ? revalidation.rowBindings : [];

  fail(revalidation.schemaVersion === "velmere.p36.ai-final-output-revalidation.v1", "schema_version");
  fail(revalidation.state === "CURRENT_SOURCE_INTERNAL_BINDING_ONLY_IN_PROGRESS", "state_boundary");
  fail(revalidation.sourceLedger?.rowCount === EXPECTED_ROW_COUNT, "source_denominator");
  fail(
    currentSourceVerifier.bindings?.rowsSha256 === currentSourceLedgerSha256,
    "source_verifier_rows_file_binding",
  );
  fail(currentSourceVerifier.status === "PASS", "source_verifier_status");
  fail(
    currentSourceVerifier.integritySha256
      === sha256Object(withoutKey(currentSourceVerifier, "integritySha256")),
    "source_verifier_payload_integrity",
  );
  fail(revalidation.sourceLedger?.fileSha256 === currentSourceLedgerSha256, "source_ledger_file_sha256");
  fail(
    revalidation.sourceLedger?.authoritativeRowsSha256 === currentSourceLedgerSha256,
    "source_ledger_authoritative_rows_sha256",
  );
  fail(
    revalidation.sourceLedger?.verifierSha256 === sha256Bytes(currentSourceVerifierBytes),
    "source_verifier_file_sha256",
  );
  fail(
    revalidation.sourceLedger?.verifierIntegritySha256 === currentSourceVerifier.integritySha256,
    "source_verifier_integrity_binding",
  );
  fail(revalidation.executionTruth?.rowsRebound === EXPECTED_ROW_COUNT, "executed_denominator");
  fail(bindings.length === EXPECTED_ROW_COUNT, "binding_denominator");
  fail(revalidation.executionTruth?.profilesBound === 33, "profile_coverage");
  fail(revalidation.campaignBinding?.fileSha256 === campaignFileSha256, "campaign_file_sha256");
  fail(
    revalidation.campaignBinding?.payloadSha256 === campaign.integrity?.payloadSha256,
    "campaign_payload_sha256",
  );
  fail(
    revalidation.integrity?.payloadSha256 === sha256Object(withoutIntegrity(revalidation)),
    "revalidation_payload_integrity",
  );
  fail(
    canonicalJson(revalidation.physicalPdfEvidence) === canonicalJson(physicalPdfEvidence),
    "current_a83_physical_evidence_binding",
  );
  const campaignSourceByPath = new Map(
    campaign.sourceBindings?.map((binding) => [binding.path, binding.sha256]) ?? [],
  );
  fail(
    campaignSourceByPath.get(PDF_MANIFEST_PATH) === physicalPdfEvidence.manifestSha256
      && campaignSourceByPath.get(PDF_QA_PATH) === physicalPdfEvidence.qaSha256,
    "campaign_a83_source_binding",
  );

  const bindingRowIds = new Set();
  const boundProfiles = new Set();
  for (const binding of bindings) {
    const source = sourceById.get(binding.rowId);
    const profile = campaignByProfile.get(binding.profileId);
    fail(!bindingRowIds.has(binding.rowId), `duplicate_row:${binding.rowId}`);
    bindingRowIds.add(binding.rowId);
    if (!source) {
      errors.push(`orphan_row:${binding.rowId}`);
      continue;
    }
    if (!profile) {
      errors.push(`orphan_profile:${binding.rowId}:${binding.profileId}`);
      continue;
    }
    boundProfiles.add(binding.profileId);
    fail(binding.sourceRowSha256 === source.rowSha256, `source_row_sha:${binding.rowId}`);
    fail(binding.sourceRowContentSha256 === sha256Object(source), `source_row_content_sha:${binding.rowId}`);
    fail(binding.profileId === `${source.profile.product}:${source.profile.tier}`, `source_profile_map:${binding.rowId}`);
    fail(binding.campaignFileSha256 === campaignFileSha256, `row_campaign_file_sha:${binding.rowId}`);
    fail(binding.campaignPayloadSha256 === campaign.integrity.payloadSha256, `row_campaign_payload_sha:${binding.rowId}`);
    fail(binding.profileSha256 === sha256Object(profile), `profile_sha:${binding.rowId}`);
    fail(binding.profileExecutionStatus === profile.executionStatus, `profile_status:${binding.rowId}`);
    fail(binding.profileOutputSha256 === profile.outputSha256, `profile_output_sha:${binding.rowId}`);
    fail(binding.profileMatchedOutputSha256 === profile.matchedOutputSha256, `matched_output_sha:${binding.rowId}`);
    fail(binding.bindingSha256 === sha256Object(withoutKey(binding, "bindingSha256")), `row_binding_sha:${binding.rowId}`);
    fail(binding.revalidationMode === "DETERMINISTIC_BINDING_ONLY_NO_NEW_MODEL_REVIEW", `binding_mode:${binding.rowId}`);
    fail(binding.newModelReviewExecuted === false, `new_model_review:${binding.rowId}`);
    fail(binding.liveModelCalls === 0, `live_model_call:${binding.rowId}`);
    fail(Object.values(binding.credits ?? {}).every((credit) => credit === 0), `false_credit:${binding.rowId}`);

    if (profile.productId === "browser") {
      fail(profile.executionStatus === "NOT_EXECUTED_CURRENT_BYTES", `browser_campaign_status:${binding.rowId}`);
      fail(binding.outputBindingState === "INCOMPLETE_CURRENT_OUTPUT_MISSING", `browser_binding_state:${binding.rowId}`);
      fail(binding.sameInputRevalidationComplete === false, `browser_same_input_credit:${binding.rowId}`);
      fail(binding.profileOutputSha256 === null, `browser_output_sha:${binding.rowId}`);
    } else {
      fail(
        profile.executionStatus === "OUTPUT_PRESENT_INPUT_NOT_CROSS_TIER_MATCHED"
          || profile.executionStatus === "OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY_CURRENTLY_UNCREDITED",
        `partial_identity_campaign_status:${binding.rowId}`,
      );
      fail(
        binding.outputBindingState === "INCOMPLETE_OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY"
          || binding.outputBindingState === "BOUND_CURRENT_PHYSICAL_PDF_BYTES_PARTIAL_INPUT_IDENTITY",
        `partial_identity_binding_state:${binding.rowId}`,
      );
      fail(binding.sameInputRevalidationComplete === false, `partial_identity_same_input_credit:${binding.rowId}`);
    }

    if (profile.productId === "pdf") {
      fail(binding.currentPhysicalPdfBytesBound === true, `pdf_physical_binding:${binding.rowId}`);
      fail(
        binding.outputBindingState === "BOUND_CURRENT_PHYSICAL_PDF_BYTES_PARTIAL_INPUT_IDENTITY",
        `pdf_binding_state:${binding.rowId}`,
      );
      fail(typeof binding.physicalPdfBytesSetSha256 === "string", `pdf_byte_set_sha:${binding.rowId}`);
    } else {
      fail(binding.currentPhysicalPdfBytesBound === false, `non_pdf_physical_credit:${binding.rowId}`);
      fail(binding.physicalPdfBytesSetSha256 === null, `non_pdf_byte_set_sha:${binding.rowId}`);
    }
  }

  fail(bindingRowIds.size === EXPECTED_ROW_COUNT, "unique_row_denominator");
  fail(boundProfiles.size === 33, "bound_profile_denominator");
  fail([...sourceById.keys()].every((rowId) => bindingRowIds.has(rowId)), "source_row_orphans");
  fail(revalidation.executionTruth?.sourceLedgerLiveModelCalls === 0, "source_live_model_credit");
  fail(revalidation.executionTruth?.revalidationLiveModelCalls === 0, "revalidation_live_model_credit");
  fail(revalidation.executionTruth?.newModelReviewsExecuted === 0, "new_model_review_credit");
  fail(revalidation.executionTruth?.realCustomers === 0, "real_customer_credit");
  fail(revalidation.executionTruth?.independentReviewers === 0, "independent_reviewer_credit");
  fail(revalidation.executionTruth?.externalProviderEvidenceObservations === 0, "external_evidence_credit");
  fail(revalidation.executionTruth?.saleEligibleProfiles === 0, "sale_credit");
  fail(revalidation.executionTruth?.paidTransactions === 0, "paid_credit");
  fail(revalidation.completion?.sameInputProfilesBound === 0, "same_input_profile_false_promotion");
  fail(revalidation.completion?.outputsPresentNotSameInputProfiles === 30, "partial_identity_profile_denominator");
  fail(revalidation.completion?.currentOutputMissingProfiles === 3, "missing_output_profile_denominator");
  fail(revalidation.truthBoundary?.realCustomerCredit === 0, "truth_real_customer_credit");
  fail(revalidation.truthBoundary?.independentReviewerCredit === 0, "truth_independent_reviewer_credit");
  fail(revalidation.truthBoundary?.externalEvidenceCredit === 0, "truth_external_credit");
  fail(revalidation.truthBoundary?.saleEligibilityCredit === 0, "truth_sale_credit");
  fail(revalidation.physicalPdfEvidence?.documentCount === 450, "pdf_document_denominator");
  fail(revalidation.physicalPdfEvidence?.pageCount === 2100, "pdf_page_denominator");
  fail(revalidation.physicalPdfEvidence?.externalCustomerCredit === 0, "pdf_external_credit");
  fail(revalidation.physicalPdfEvidence?.browserExecuted === false, "pdf_browser_credit");
  fail(revalidation.physicalPdfEvidence?.secureDeliveryExecuted === false, "pdf_secure_delivery_credit");

  return { ok: errors.length === 0, errors };
}

export function writeRevalidation() {
  const revalidation = buildRevalidation();
  const validation = validateRevalidation(revalidation);
  if (!validation.ok) throw new Error(`p36_ai_revalidation_invalid:${validation.errors.join(",")}`);
  const absoluteOutput = path.join(ROOT, OUTPUT_PATH);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(revalidation, null, 2)}\n`, "utf8");
  return revalidation;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = writeRevalidation();
  process.stdout.write(
    `P36 AI final-output revalidation: ${result.executionTruth.rowsRebound}/${result.executionTruth.rowDenominator} rows; ${result.executionTruth.profilesBound}/33 profiles; live model calls 0; real customers 0; independent reviewers 0\n`,
  );
}
