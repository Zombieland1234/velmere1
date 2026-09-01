import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
export const OUTPUT_PATH = path.join(
  ROOT,
  "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json",
);

const TIERS = ["basic", "pro", "advanced"];
const GENERATED_AT = "2026-08-13T12:00:00.000Z";
const SOURCE_PATHS = Object.freeze({
  audit: "artifacts/pass36/a82/PASS36_A82_FIXTURE_RUNTIME.json",
  pdf: "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json",
  pdfQa: "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json",
  shield: "artifacts/pass36/a84/PASS36_A84_SHIELD_FULL_CATALOG_RUNTIME.json",
  shieldDepth: "artifacts/closure/p32/runtime/a85-current-byte-runtime.json",
  realMarkets: "artifacts/pass36/a86/PASS36_A86_REAL_MARKETS_CROSS_ASSET_RUNTIME.json",
  impactWhale: "artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json",
  angelRisk: "artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json",
});
const A83_QA_SCHEMA_VERSION = "velmere.pass36.a83.pdf-raster-external-parse-qa.v2";
const A83_MANIFEST_SCHEMA_VERSION = "velmere.pass36.a83.browser-lens-pdf-corpus-manifest.v1";
const A83_PDF_CORPUS_ROOT = "artifacts/pass36/a83/browser-lens-pdf-corpus";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const PRODUCT_ORDER = [
  "audit",
  "pdf",
  "browser",
  "shield",
  "shield-pro",
  "shield-map",
  "real-markets",
  "angel",
  "risk",
  "whale-watch",
  "market-impact",
];

const PRODUCT_NAMES = Object.freeze({
  audit: "Audit",
  pdf: "PDF",
  browser: "Browser",
  shield: "Shield",
  "shield-pro": "Shield Pro",
  "shield-map": "Shield Map",
  "real-markets": "Real Markets",
  angel: "Angel",
  risk: "Risk",
  "whale-watch": "Whale Watch",
  "market-impact": "Market Impact",
});

const OMIT_FEATURE_KEYS = /(?:^|_)(?:sha256|digest|packet_id|packetid|case_id|caseid|tier|integrity|live_proven|liveproven|sale_enabled|saleenabled|paid_gate_eligible|paidgateeligible|customer_value_proven|customervalueproven|production_browser_executed|productionbrowserexecuted|current_public_network_executed|currentpublicnetworkexecuted|provider_rights_approved|providerrightsapproved|exact_a80_candidate_bound|exacta80candidatebound)$/i;

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

function readSource(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    relativePath,
    absolutePath,
    bytes,
    sha256: sha256Bytes(bytes),
    json: JSON.parse(bytes.toString("utf8")),
  };
}

function withoutKey(value, key) {
  const { [key]: _removed, ...payload } = value;
  return payload;
}

function failA83(code) {
  throw new Error(`p36_a83_evidence_invalid:${code}`);
}

function requireA83(condition, code) {
  if (!condition) failA83(code);
}

function readPhysicalA83Pdf(relativePath) {
  requireA83(
    typeof relativePath === "string"
      && relativePath.startsWith(`${A83_PDF_CORPUS_ROOT}/`)
      && relativePath === path.posix.normalize(relativePath)
      && !relativePath.includes("\\"),
    `pdf_path:${String(relativePath)}`,
  );
  const absolutePath = path.resolve(ROOT, relativePath);
  const corpusRoot = path.resolve(ROOT, A83_PDF_CORPUS_ROOT);
  requireA83(absolutePath.startsWith(`${corpusRoot}${path.sep}`), `pdf_path_escape:${relativePath}`);

  let currentPath = ROOT;
  for (const segment of relativePath.split("/")) {
    currentPath = path.join(currentPath, segment);
    const currentStat = fs.lstatSync(currentPath);
    requireA83(!currentStat.isSymbolicLink(), `pdf_path_symlink:${relativePath}`);
  }
  requireA83(fs.lstatSync(absolutePath).isFile(), `pdf_not_regular:${relativePath}`);
  return fs.readFileSync(absolutePath);
}

export function validateA83PdfEvidenceOrThrow({
  manifestBytes = fs.readFileSync(path.join(ROOT, SOURCE_PATHS.pdf)),
  qaBytes = fs.readFileSync(path.join(ROOT, SOURCE_PATHS.pdfQa)),
  physicalBytesForPath = readPhysicalA83Pdf,
} = {}) {
  const manifestBuffer = Buffer.from(manifestBytes);
  const qaBuffer = Buffer.from(qaBytes);
  let manifest;
  let qa;
  try {
    manifest = JSON.parse(manifestBuffer.toString("utf8"));
    qa = JSON.parse(qaBuffer.toString("utf8"));
  } catch (error) {
    failA83(`json:${error.message}`);
  }

  requireA83(manifest.schemaVersion === A83_MANIFEST_SCHEMA_VERSION, "manifest_schema");
  requireA83(manifest.integrity?.algorithm === "sha256", "manifest_integrity_algorithm");
  requireA83(SHA256_PATTERN.test(manifest.integrity?.digest ?? ""), "manifest_integrity_shape");
  const manifestCanonicalDigest = sha256Object(withoutKey(manifest, "integrity"));
  requireA83(manifest.integrity.digest === manifestCanonicalDigest, "manifest_integrity_digest");
  requireA83(Array.isArray(manifest.entries) && manifest.entries.length === 450, "manifest_entry_count");
  requireA83(
    manifest.totals?.physicalPdfs === 450 && manifest.totals?.renderedPages === 2100,
    "manifest_totals",
  );
  requireA83(
    manifest.boundaries?.synthetic === true
      && manifest.boundaries?.offline === true
      && manifest.boundaries?.notLive === true
      && manifest.boundaries?.notForSale === true
      && manifest.boundaries?.realPacketCredit === 0
      && manifest.boundaries?.browserCredit === 0
      && manifest.boundaries?.secureDeliveryCredit === 0
      && manifest.boundaries?.accessibilityExternalCredit === 0
      && manifest.boundaries?.comprehensionCredit === 0
      && manifest.boundaries?.paidGateEligible === false
      && manifest.boundaries?.saleEnabled === false,
    "manifest_credit_boundary",
  );

  const entryIds = new Set();
  const entryPaths = new Set();
  const physicalRows = [];
  for (const entry of manifest.entries) {
    requireA83(typeof entry.entryId === "string" && !entryIds.has(entry.entryId), `entry_id:${entry.entryId}`);
    requireA83(typeof entry.path === "string" && !entryPaths.has(entry.path), `entry_path:${entry.entryId}`);
    entryIds.add(entry.entryId);
    entryPaths.add(entry.path);
    requireA83(entry.integrity?.algorithm === "sha256", `entry_integrity_algorithm:${entry.entryId}`);
    requireA83(
      entry.integrity?.digest === sha256Object(withoutKey(entry, "integrity")),
      `entry_integrity_digest:${entry.entryId}`,
    );
    requireA83(
      Number.isInteger(entry.byteLength)
        && entry.byteLength > 0
        && Number.isInteger(entry.pageCount)
        && entry.pageCount > 0
        && SHA256_PATTERN.test(entry.pdfSha256 ?? ""),
      `entry_binding_shape:${entry.entryId}`,
    );
    requireA83(
      entry.fixtureOnly === true
        && entry.realPacketVerified === false
        && entry.rightsApproved === false
        && entry.browserExecuted === false
        && entry.secureDeliveryExecuted === false
        && entry.accessibilityExternallyValidated === false
        && entry.customerComprehensionLabels === 0
        && entry.paidGateEligible === false
        && entry.liveProven === false
        && entry.saleEnabled === false
        && entry.notForSale === true,
      `entry_credit_boundary:${entry.entryId}`,
    );

    const bytes = Buffer.from(physicalBytesForPath(entry.path));
    const actualPdfSha256 = sha256Bytes(bytes);
    requireA83(bytes.subarray(0, 5).toString("ascii") === "%PDF-", `physical_pdf_header:${entry.entryId}`);
    requireA83(
      bytes.byteLength === entry.byteLength && actualPdfSha256 === entry.pdfSha256,
      `physical_pdf_bytes:${entry.entryId}`,
    );
    physicalRows.push({
      entryId: entry.entryId,
      path: entry.path,
      byteLength: bytes.byteLength,
      pdfSha256: actualPdfSha256,
      pageCount: entry.pageCount,
    });
  }
  requireA83(
    physicalRows.reduce((total, row) => total + row.pageCount, 0) === 2100,
    "physical_pdf_page_count",
  );

  requireA83(qa.schemaVersion === A83_QA_SCHEMA_VERSION, "qa_schema");
  requireA83(SHA256_PATTERN.test(qa.integritySha256 ?? ""), "qa_integrity_shape");
  requireA83(
    qa.integritySha256 === sha256Object(withoutKey(qa, "integritySha256")),
    "qa_integrity_digest",
  );
  requireA83(
    qa.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA"
      && qa.pdfCount === 450
      && qa.renderedPageCount === 2100
      && qa.expectedPageCount === 2100
      && qa.failedDocuments === 0
      && Array.isArray(qa.failures)
      && qa.failures.length === 0,
    "qa_pass_denominator",
  );
  requireA83(
    qa.providerCredit === 0
      && qa.externalEvidenceCredit === 0
      && qa.browserCredit === 0
      && qa.secureDeliveryCredit === 0
      && qa.customerComprehensionCredit === 0
      && qa.paidReleaseCredit === 0
      && qa.promotionAllowed === false,
    "qa_credit_boundary",
  );

  const manifestBinding = qa.manifestBinding ?? {};
  requireA83(manifestBinding.path === SOURCE_PATHS.pdf, "qa_manifest_path");
  requireA83(manifestBinding.byteLength === manifestBuffer.byteLength, "qa_manifest_byte_length");
  requireA83(manifestBinding.sha256 === sha256Bytes(manifestBuffer), "qa_manifest_file_sha256");
  requireA83(
    manifestBinding.canonicalIntegrity?.algorithm === "sha256"
      && manifestBinding.canonicalIntegrity?.declaredDigest === manifest.integrity.digest
      && manifestBinding.canonicalIntegrity?.computedDigest === manifestCanonicalDigest
      && manifestBinding.canonicalIntegrity?.verified === true,
    "qa_manifest_canonical_binding",
  );

  const pdfSetBinding = qa.pdfSetBinding ?? {};
  const pdfRows = pdfSetBinding.rows;
  const totalByteLength = physicalRows.reduce((total, row) => total + row.byteLength, 0);
  requireA83(Array.isArray(pdfRows) && pdfRows.length === 450, "qa_pdf_set_rows");
  requireA83(
    pdfSetBinding.entryCount === 450
      && pdfSetBinding.pageCount === 2100
      && pdfSetBinding.totalByteLength === totalByteLength,
    "qa_pdf_set_denominator",
  );
  requireA83(pdfSetBinding.aggregateSha256 === sha256Object(pdfRows), "qa_pdf_set_aggregate");
  requireA83(canonicalJson(pdfRows) === canonicalJson(physicalRows), "qa_pdf_set_exact_rows");

  const raster = qa.rasterEvidenceBinding ?? {};
  const pageRows = raster.pageHashSet?.rows;
  const sheetRows = raster.contactSheetSet?.rows;
  requireA83(Array.isArray(pageRows) && pageRows.length === 2100, "qa_raster_page_rows");
  requireA83(
    raster.pageHashSet?.count === 2100
      && raster.pageHashSet?.aggregateSha256 === sha256Object(pageRows)
      && pageRows.every(
        (row) => entryIds.has(row.entryId)
          && Number.isInteger(row.page)
          && row.page > 0
          && Number.isInteger(row.width)
          && row.width > 0
          && Number.isInteger(row.height)
          && row.height > 0
          && Number.isInteger(row.pngByteLength)
          && row.pngByteLength > 0
          && SHA256_PATTERN.test(row.pngSha256 ?? ""),
      ),
    "qa_raster_page_binding",
  );
  const rasterPageIds = new Set(pageRows.map((row) => `${row.entryId}:${row.page}`));
  requireA83(rasterPageIds.size === 2100, "qa_raster_page_identity");
  for (const row of physicalRows) {
    const boundPageCount = pageRows.filter((page) => page.entryId === row.entryId).length;
    requireA83(boundPageCount === row.pageCount, `qa_raster_entry_pages:${row.entryId}`);
  }
  requireA83(Array.isArray(sheetRows) && sheetRows.length === 9, "qa_contact_sheet_rows");
  requireA83(
    raster.contactSheetSet?.count === 9
      && raster.contactSheetSet?.aggregateSha256 === sha256Object(sheetRows)
      && sheetRows.every(
        (row) => Number.isInteger(row.byteLength)
          && row.byteLength > 0
          && row.documentCount === 50
          && SHA256_PATTERN.test(row.sha256 ?? ""),
      ),
    "qa_contact_sheet_binding",
  );
  const expectedRasterAggregate = sha256Object({
    pageHashSetAggregateSha256: raster.pageHashSet.aggregateSha256,
    contactSheetSetAggregateSha256: raster.contactSheetSet.aggregateSha256,
  });
  requireA83(raster.aggregateSha256 === expectedRasterAggregate, "qa_raster_aggregate");

  const toolchain = qa.toolchainIdentity ?? {};
  const tools = toolchain.tools;
  const expectedToolIds = ["Python", "pypdf", "PyMuPDF", "Pillow", "pdfinfo", "pdftotext", "gs"];
  requireA83(
    Array.isArray(tools)
      && toolchain.toolCount === expectedToolIds.length
      && canonicalJson(tools.map((tool) => tool.id)) === canonicalJson(expectedToolIds)
      && toolchain.aggregateSha256 === sha256Object(tools)
      && tools.every((tool) => SHA256_PATTERN.test(tool.binarySha256 ?? "")),
    "qa_toolchain_binding",
  );

  return {
    manifest,
    qa,
    physicalRows,
    manifestCanonicalDigest,
    pdfSetAggregateSha256: pdfSetBinding.aggregateSha256,
    rasterEvidenceAggregateSha256: raster.aggregateSha256,
    toolchainAggregateSha256: toolchain.aggregateSha256,
  };
}

function stableSort(records, key = "inputKey") {
  return [...records].sort((left, right) => {
    const a = String(left[key] ?? "");
    const b = String(right[key] ?? "");
    return a.localeCompare(b, "en");
  });
}

function flattenFeatureTokens(value, prefix = "output", tokens = new Set()) {
  if (value === null || value === undefined) return tokens;
  if (Array.isArray(value)) {
    for (const item of value) flattenFeatureTokens(item, `${prefix}[]`, tokens);
    return tokens;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value).sort()) {
      if (OMIT_FEATURE_KEYS.test(key.replaceAll(/([a-z])([A-Z])/g, "$1_$2"))) continue;
      flattenFeatureTokens(value[key], `${prefix}.${key}`, tokens);
    }
    return tokens;
  }
  tokens.add(`${prefix}=${String(value)}`);
  return tokens;
}

function decisionOf(output) {
  return (
    output.analysisDecision ??
    output.decision ??
    output.functionalDecision ??
    output.terminal?.functionalDecision ??
    output.map?.functionalDecision ??
    null
  );
}

function buildMatchedGroups(records) {
  const groups = new Map();
  for (const record of records) {
    const bucket = groups.get(record.inputKey) ?? new Map();
    if (bucket.has(record.tier)) throw new Error(`duplicate_tier_record:${record.inputKey}:${record.tier}`);
    bucket.set(record.tier, record);
    groups.set(record.inputKey, bucket);
  }

  const matched = [];
  for (const [inputKey, bucket] of groups.entries()) {
    if (!TIERS.every((tier) => bucket.has(tier))) continue;
    const inputDigests = new Set(TIERS.map((tier) => bucket.get(tier).inputDigest));
    if (inputDigests.size !== 1) continue;
    matched.push({
      inputKey,
      inputDigest: bucket.get("basic").inputDigest,
      outputs: Object.fromEntries(TIERS.map((tier) => [tier, bucket.get(tier).output])),
    });
  }
  return stableSort(matched);
}

function transitionMetric(matchedGroups, fromTier, toTier) {
  let sourceFeatureCount = 0;
  let targetFeatureCount = 0;
  let novelFeatureCount = 0;
  let duplicateFeatureCount = 0;
  let decisionChangeCount = 0;
  let comparableDecisionCount = 0;

  for (const group of matchedGroups) {
    const source = flattenFeatureTokens(group.outputs[fromTier]);
    const target = flattenFeatureTokens(group.outputs[toTier]);
    sourceFeatureCount += source.size;
    targetFeatureCount += target.size;
    for (const token of target) {
      if (source.has(token)) duplicateFeatureCount += 1;
      else novelFeatureCount += 1;
    }
    const fromDecision = decisionOf(group.outputs[fromTier]);
    const toDecision = decisionOf(group.outputs[toTier]);
    if (fromDecision !== null && toDecision !== null) {
      comparableDecisionCount += 1;
      if (fromDecision !== toDecision) decisionChangeCount += 1;
    }
  }

  return {
    status: "MEASURED_INTERNAL_SAME_INPUT",
    fromTier,
    toTier,
    matchedInputCount: matchedGroups.length,
    sourceFeatureCount,
    targetFeatureCount,
    novelFeatureCount,
    noveltyRate: targetFeatureCount === 0 ? 0 : Number((novelFeatureCount / targetFeatureCount).toFixed(6)),
    duplicateFeatureCount,
    duplicationRate: targetFeatureCount === 0 ? 0 : Number((duplicateFeatureCount / targetFeatureCount).toFixed(6)),
    comparableDecisionCount,
    decisionChangeCount,
    decisionChangeRate:
      comparableDecisionCount === 0
        ? null
        : Number((decisionChangeCount / comparableDecisionCount).toFixed(6)),
  };
}

function notMeasuredMetric(reason) {
  return {
    status: reason,
    basicToPro: null,
    proToAdvanced: null,
  };
}

function measuredMetrics(matchedGroups) {
  return {
    status: "MEASURED_INTERNAL_SAME_INPUT",
    basicToPro: transitionMetric(matchedGroups, "basic", "pro"),
    proToAdvanced: transitionMetric(matchedGroups, "pro", "advanced"),
  };
}

function notMeasuredGroundTruth(reason = "NOT_MEASURED_NO_GROUND_TRUTH") {
  return {
    status: reason,
    truePositiveCount: null,
    trueNegativeCount: null,
    falsePositiveCount: null,
    falseNegativeCount: null,
    exactMatchCount: null,
    caseCount: null,
  };
}

function auditGroundTruth(cases, tier) {
  let truePositiveCount = 0;
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let exactMatchCount = 0;
  for (const fixtureCase of cases) {
    const expected = new Set(fixtureCase.labels?.knownFindingIds ?? []);
    const tierOutput = fixtureCase.tiers.find((entry) => entry.tier === tier);
    const actual = new Set(tierOutput?.findingIds ?? []);
    for (const findingId of actual) {
      if (expected.has(findingId)) truePositiveCount += 1;
      else falsePositiveCount += 1;
    }
    for (const findingId of expected) {
      if (!actual.has(findingId)) falseNegativeCount += 1;
    }
    if (
      expected.size === actual.size &&
      [...expected].every((findingId) => actual.has(findingId))
    ) {
      exactMatchCount += 1;
    }
  }
  return {
    status: "MEASURED_FIXTURE_BLIND_FINDING_LABELS",
    truePositiveCount,
    trueNegativeCount: null,
    falsePositiveCount,
    falseNegativeCount,
    exactMatchCount,
    caseCount: cases.length,
  };
}

function a88GroundTruth(packets, tier) {
  const tierPackets = packets.filter((packet) => packet.tier === tier);
  let truePositiveCount = 0;
  let trueNegativeCount = 0;
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let exactMatchCount = 0;
  for (const packet of tierPackets) {
    const expectedPositive = packet.expectedDecision !== "ALLOW_INFORMATIONAL_ANALYSIS";
    const actualPositive = packet.decision !== "ALLOW_INFORMATIONAL_ANALYSIS";
    if (expectedPositive && actualPositive) truePositiveCount += 1;
    else if (!expectedPositive && !actualPositive) trueNegativeCount += 1;
    else if (!expectedPositive && actualPositive) falsePositiveCount += 1;
    else falseNegativeCount += 1;
    if (packet.expectedDecision === packet.decision) exactMatchCount += 1;
  }
  return {
    status: "MEASURED_INTERNAL_EXPECTED_DECISION_LABELS",
    positiveClass: "NON_ALLOW_DECISION",
    truePositiveCount,
    trueNegativeCount,
    falsePositiveCount,
    falseNegativeCount,
    exactMatchCount,
    caseCount: tierPackets.length,
  };
}

function profileFromRecords({
  productId,
  tier,
  source,
  records,
  candidateGroups,
  sameInputGroups,
  completionStatus,
  groundTruth,
  tierMetrics,
}) {
  const tierRecords = stableSort(
    records.filter((record) => record.tier === tier),
  );
  const matchedTierRecords = stableSort(
    sameInputGroups.map((group) => ({
      inputKey: group.inputKey,
      inputDigest: group.inputDigest,
      output: group.outputs[tier],
    })),
  );
  const observedInputs = tierRecords.map(({ inputKey, inputDigest }) => ({ inputKey, inputDigest }));
  const candidateInputs = candidateGroups.map(({ inputKey, inputDigest }) => ({ inputKey, inputDigest }));
  const matchedInputs = sameInputGroups.map(({ inputKey, inputDigest }) => ({ inputKey, inputDigest }));
  return {
    profileId: `${productId}:${tier}`,
    productId,
    tier,
    executionStatus: completionStatus,
    creditClass: "INTERNAL_FIXTURE_OR_OFFLINE_RUNTIME_ONLY",
    sourcePath: source?.relativePath ?? null,
    sourceSha256: source?.sha256 ?? null,
    recordCount: tierRecords.length,
    candidateCrossTierMatchCount: candidateGroups.length,
    matchedSameInputCount: sameInputGroups.length,
    observedInputSetSha256: observedInputs.length > 0 ? sha256Object(observedInputs) : null,
    partialInputIdentitySetSha256:
      candidateInputs.length > 0 ? sha256Object(candidateInputs) : null,
    sameInputSetSha256: matchedInputs.length > 0 ? sha256Object(matchedInputs) : null,
    outputSha256:
      tierRecords.length > 0
        ? sha256Object(tierRecords.map(({ inputKey, inputDigest, output }) => ({ inputKey, inputDigest, output })))
        : null,
    matchedOutputSha256:
      matchedTierRecords.length > 0
        ? sha256Object(matchedTierRecords)
        : null,
    noveltyFromPreviousTier: tierMetrics,
    groundTruth,
    analysisEligibleCredit: false,
    saleEligibleCredit: false,
    realCustomerCredit: 0,
    externalEvidenceCredit: 0,
    willingnessToPayCredit: 0,
  };
}

function record(inputKey, inputDigest, tier, output) {
  return { inputKey, inputDigest, tier, output };
}

function productFromRecords({
  productId,
  source,
  records,
  crossTierMatchAllowed = true,
  groundTruthForTier = () => notMeasuredGroundTruth(),
  gapReason = null,
}) {
  const matchedGroups = crossTierMatchAllowed ? buildMatchedGroups(records) : [];
  // These historical/offline receipts bind only partial business identifiers.
  // V14 also requires locale, observation time/freshness, provider set and
  // policy/schema identity. Until all dimensions are present, candidate
  // triplets are useful diagnostics but receive zero same-input credit.
  const candidateGroups = matchedGroups;
  const sameInputGroups = [];
  const complete = false;
  const metrics = complete
    ? measuredMetrics(sameInputGroups)
    : candidateGroups.length > 0
      ? notMeasuredMetric("NOT_MEASURED_COMPLETE_INPUT_IDENTITY_MISSING")
      : notMeasuredMetric(gapReason ?? "NOT_MEASURED_SAME_INPUT_NOT_AVAILABLE");
  const executionStatus = complete
    ? "COMPLETED_SAME_INPUT_INTERNAL"
    : records.length > 0
      ? candidateGroups.length > 0
        ? "OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY_CURRENTLY_UNCREDITED"
        : "OUTPUT_PRESENT_INPUT_NOT_CROSS_TIER_MATCHED"
      : "NOT_EXECUTED_CURRENT_BYTES";
  const tierMetrics = {
    basic: { status: "BASELINE_TIER", transition: null },
    pro: {
      status: metrics.basicToPro ? metrics.status : metrics.status,
      transition: metrics.basicToPro,
    },
    advanced: {
      status: metrics.proToAdvanced ? metrics.status : metrics.status,
      transition: metrics.proToAdvanced,
    },
  };
  const profiles = TIERS.map((tier) =>
    profileFromRecords({
      productId,
      tier,
      source,
      records,
      candidateGroups,
      sameInputGroups,
      completionStatus: executionStatus,
      groundTruth: groundTruthForTier(tier),
      tierMetrics: tierMetrics[tier],
    }),
  );
  return {
    productId,
    productName: PRODUCT_NAMES[productId],
    completionStatus: complete ? "COMPLETED_SAME_INPUT_INTERNAL" : executionStatus,
    sameInputVerified: complete,
    candidateCrossTierMatchCount: candidateGroups.length,
    matchedSameInputCount: sameInputGroups.length,
    partialInputIdentitySetSha256:
      candidateGroups.length > 0
        ? sha256Object(candidateGroups.map(({ inputKey, inputDigest }) => ({ inputKey, inputDigest })))
        : null,
    sourcePath: source?.relativePath ?? null,
    sourceSha256: source?.sha256 ?? null,
    metrics,
    gapReason:
      complete
        ? null
        : gapReason
          ?? "FULL_INPUT_IDENTITY_MISSING_LOCALE_TIME_PROVIDER_SET_POLICY_SCHEMA_AND_CURRENT_SOURCE_BINDING",
    profiles,
  };
}

function emptyProduct(productId, gapReason) {
  return productFromRecords({
    productId,
    source: null,
    records: [],
    crossTierMatchAllowed: false,
    gapReason,
  });
}

function buildProducts(sources) {
  const auditRecords = sources.audit.json.cases.flatMap((fixtureCase) =>
    fixtureCase.tiers.map((tierOutput) =>
      record(fixtureCase.caseId, fixtureCase.targetDigest, tierOutput.tier, tierOutput),
    ),
  );
  const shieldRecords = sources.shield.json.packets.map((packet) =>
    record(
      packet.canonicalAssetId,
      sha256Object({ canonicalAssetId: packet.canonicalAssetId, symbol: packet.symbol }),
      packet.tier,
      packet,
    ),
  );
  const pdfEvidence = validateA83PdfEvidenceOrThrow({
    manifestBytes: sources.pdf.bytes,
    qaBytes: sources.pdfQa.bytes,
  });
  const physicalPdfByEntryId = new Map(
    pdfEvidence.physicalRows.map((row) => [row.entryId, row]),
  );
  const pdfRecords = sources.pdf.json.entries.map((entry) => {
    const physicalPdf = physicalPdfByEntryId.get(entry.entryId);
    return record(
      `${entry.caseId}:${entry.locale}`,
      entry.factDigest,
      entry.tier,
      {
        caseId: entry.caseId,
        locale: entry.locale,
        caseClass: entry.caseClass,
        pageCount: entry.pageCount,
        byteLength: entry.byteLength,
        actualPdfSha256: physicalPdf.pdfSha256,
        reportDigest: entry.reportDigest,
        claimSetDigest: entry.claimSetDigest,
        analysisDecision: entry.projections?.find((row) => row.channel === "pdf")?.analysisDecision ?? null,
        pdfSecurity: entry.pdfSecurity,
      },
    );
  });
  const shieldProRecords = sources.shieldDepth.json.packets.map((packet) =>
    record(
      packet.canonicalAssetId,
      sha256Object({ canonicalAssetId: packet.canonicalAssetId, marketIdentity: packet.marketIdentity }),
      packet.tier,
      {
        canonicalAssetId: packet.canonicalAssetId,
        symbol: packet.symbol,
        terminal: packet.terminal,
        entitlement: packet.entitlement,
        blockers: packet.blockers,
        packetDigestSha256: packet.packetDigestSha256,
      },
    ),
  );
  const shieldMapRecords = sources.shieldDepth.json.packets.map((packet) =>
    record(
      packet.canonicalAssetId,
      sha256Object({ canonicalAssetId: packet.canonicalAssetId, marketIdentity: packet.marketIdentity }),
      packet.tier,
      {
        canonicalAssetId: packet.canonicalAssetId,
        symbol: packet.symbol,
        map: packet.map,
        entitlement: packet.entitlement,
        blockers: packet.blockers,
        packetDigestSha256: packet.packetDigestSha256,
      },
    ),
  );
  const realMarketsRecords = sources.realMarkets.json.packets.map((packet) =>
    record(
      packet.canonicalAssetId,
      sha256Object({
        canonicalAssetId: packet.canonicalAssetId,
        symbol: packet.symbol,
        assetClass: packet.assetClass,
      }),
      packet.tier,
      packet,
    ),
  );
  const a87Records = (surface) =>
    sources.impactWhale.json.packets
      .filter((packet) => packet.surface === surface)
      .map((packet) =>
        record(
          packet.canonicalAssetId,
          packet.sourceResultDigestSha256,
          packet.tier,
          packet,
        ),
      );
  const a88Records = (surface) =>
    sources.angelRisk.json.packets
      .filter((packet) => packet.surface === surface)
      .map((packet) =>
        record(packet.caseId, sha256Object({ caseId: packet.caseId }), packet.tier, packet),
      );

  const products = [
    productFromRecords({
      productId: "audit",
      source: sources.audit,
      records: auditRecords,
      groundTruthForTier: (tier) => auditGroundTruth(sources.audit.json.cases, tier),
    }),
    productFromRecords({
      productId: "pdf",
      source: sources.pdf,
      records: pdfRecords,
      gapReason: null,
    }),
    emptyProduct(
      "browser",
      "CURRENT_PRODUCTION_BROWSER_OUTPUT_NOT_EXECUTED; STATIC_OR_FIXTURE_BROWSER_PLANS_RECEIVE_ZERO_CREDIT",
    ),
    productFromRecords({ productId: "shield", source: sources.shield, records: shieldRecords }),
    productFromRecords({
      productId: "shield-pro",
      source: sources.shieldDepth,
      records: shieldProRecords,
    }),
    productFromRecords({
      productId: "shield-map",
      source: sources.shieldDepth,
      records: shieldMapRecords,
    }),
    productFromRecords({
      productId: "real-markets",
      source: sources.realMarkets,
      records: realMarketsRecords,
    }),
    productFromRecords({
      productId: "angel",
      source: sources.angelRisk,
      records: a88Records("angel"),
      crossTierMatchAllowed: false,
      groundTruthForTier: (tier) =>
        a88GroundTruth(
          sources.angelRisk.json.packets.filter((packet) => packet.surface === "angel"),
          tier,
        ),
      gapReason: "A88_HAS_LABELED_TIER_OUTPUTS_BUT_NO_IDENTICAL_INPUT_IDENTITY_ACROSS_ALL_THREE_TIERS",
    }),
    productFromRecords({
      productId: "risk",
      source: sources.angelRisk,
      records: a88Records("risk"),
      crossTierMatchAllowed: false,
      groundTruthForTier: (tier) =>
        a88GroundTruth(
          sources.angelRisk.json.packets.filter((packet) => packet.surface === "risk"),
          tier,
        ),
      gapReason: "A88_HAS_LABELED_TIER_OUTPUTS_BUT_NO_IDENTICAL_INPUT_IDENTITY_ACROSS_ALL_THREE_TIERS",
    }),
    productFromRecords({
      productId: "whale-watch",
      source: sources.impactWhale,
      records: a87Records("whale_watch"),
    }),
    productFromRecords({
      productId: "market-impact",
      source: sources.impactWhale,
      records: a87Records("market_impact"),
    }),
  ];

  const byId = new Map(products.map((product) => [product.productId, product]));
  return PRODUCT_ORDER.map((productId) => byId.get(productId));
}

function withoutIntegrity(campaign) {
  const { integrity: _integrity, ...payload } = campaign;
  return payload;
}

export function resignCampaign(campaign) {
  campaign.integrity = {
    algorithm: "sha256",
    payloadSha256: sha256Object(withoutIntegrity(campaign)),
  };
  return campaign;
}

export function validateCampaign(campaign, { expectedCampaign = null } = {}) {
  const errors = [];
  const fail = (condition, code) => {
    if (!condition) errors.push(code);
  };

  fail(campaign.schemaVersion === "velmere.p36.internal-final-tier-campaign.v1", "schema_version");
  fail(campaign.state === "CURRENT_SOURCE_INTERNAL_ONLY_IN_PROGRESS", "state_boundary");
  fail(campaign.integrity?.algorithm === "sha256", "integrity_algorithm");
  fail(
    campaign.integrity?.payloadSha256 === sha256Object(withoutIntegrity(campaign)),
    "integrity_payload_digest",
  );
  fail(Array.isArray(campaign.products) && campaign.products.length === 11, "product_denominator");
  fail(Array.isArray(campaign.profiles) && campaign.profiles.length === 33, "profile_denominator");
  fail(
    JSON.stringify(campaign.products?.map((product) => product.productId)) === JSON.stringify(PRODUCT_ORDER),
    "product_order_or_identity",
  );

  const profileIds = new Set(campaign.profiles?.map((profile) => profile.profileId));
  fail(profileIds.size === 33, "profile_identity_uniqueness");
  for (const productId of PRODUCT_ORDER) {
    for (const tier of TIERS) fail(profileIds.has(`${productId}:${tier}`), `missing_profile:${productId}:${tier}`);
  }

  const truth = campaign.truthBoundary ?? {};
  fail(truth.realCustomers === 0, "real_customer_false_promotion");
  fail(truth.independentReviewers === 0, "independent_reviewer_false_promotion");
  fail(truth.externalProviderEvidenceCredit === 0, "external_evidence_false_promotion");
  fail(truth.providerRightsApprovedAssets === 0, "provider_rights_false_promotion");
  fail(truth.willingnessToPayObservations === 0, "wtp_false_promotion");
  fail(truth.saleEligibleProfiles === 0, "sale_profile_false_promotion");
  fail(truth.goPaid === false && truth.live === false && truth.worldClassProven === false, "release_false_promotion");

  const completedProducts = campaign.products?.filter((product) => product.sameInputVerified).length ?? -1;
  const completedProfiles =
    campaign.profiles?.filter((profile) => profile.executionStatus === "COMPLETED_SAME_INPUT_INTERNAL").length ?? -1;
  fail(campaign.completion?.sameInputProductsCompleted === completedProducts, "completion_product_count");
  fail(campaign.completion?.sameInputProfilesCompleted === completedProfiles, "completion_profile_count");
  fail(completedProducts === 0, "p36_full_input_identity_product_false_promotion");
  fail(completedProfiles === 0, "p36_full_input_identity_profile_false_promotion");
  fail(campaign.completion?.profilesExplicitlyMapped === 33, "mapped_profile_count");

  for (const product of campaign.products ?? []) {
    const profiles = (campaign.profiles ?? []).filter((profile) => profile.productId === product.productId);
    fail(profiles.length === 3, `tier_denominator:${product.productId}`);
    if (product.sameInputVerified) {
      fail(product.matchedSameInputCount > 0, `matched_input_count:${product.productId}`);
      fail(
        profiles.every(
          (profile) =>
            profile.executionStatus === "COMPLETED_SAME_INPUT_INTERNAL" &&
            profile.sameInputSetSha256 &&
            profile.outputSha256 &&
            profile.matchedOutputSha256,
        ),
        `completed_profile_binding:${product.productId}`,
      );
      fail(
        new Set(profiles.map((profile) => profile.sameInputSetSha256)).size === 1,
        `same_input_digest_parity:${product.productId}`,
      );
      fail(product.metrics?.status === "MEASURED_INTERNAL_SAME_INPUT", `metrics_status:${product.productId}`);
    } else {
      fail(product.matchedSameInputCount === 0, `unverified_same_input_count:${product.productId}`);
      fail(
        profiles.every(
          (profile) =>
            profile.matchedSameInputCount === 0
            && profile.sameInputSetSha256 === null
            && profile.matchedOutputSha256 === null
            && profile.executionStatus !== "COMPLETED_SAME_INPUT_INTERNAL",
        ),
        `unverified_same_input_binding:${product.productId}`,
      );
    }
  }

  for (const productId of ["browser"]) {
    const product = campaign.products?.find((entry) => entry.productId === productId);
    const profiles = campaign.profiles?.filter((profile) => profile.productId === productId) ?? [];
    fail(product?.sameInputVerified === false, `current_gap_promoted:${productId}`);
    fail(product?.completionStatus === "NOT_EXECUTED_CURRENT_BYTES", `current_gap_status:${productId}`);
    fail(
      profiles.every(
        (profile) =>
          profile.recordCount === 0 &&
          profile.outputSha256 === null &&
          profile.sameInputSetSha256 === null,
      ),
      `current_gap_output_fabricated:${productId}`,
    );
  }

  const pdf = campaign.products?.find((entry) => entry.productId === "pdf");
  const pdfProfiles = campaign.profiles?.filter((profile) => profile.productId === "pdf") ?? [];
  fail(pdf?.sameInputVerified === false, "current_pdf_false_same_input_promotion");
  fail(pdf?.candidateCrossTierMatchCount === 150, "current_pdf_candidate_triplet_denominator");
  fail(pdf?.matchedSameInputCount === 0, "current_pdf_same_input_must_remain_zero");
  fail(
    pdfProfiles.every(
      (profile) =>
        profile.recordCount === 150
        && profile.candidateCrossTierMatchCount === 150
        && profile.matchedSameInputCount === 0
        && profile.sameInputSetSha256 === null
        && profile.outputSha256,
    ),
    "current_pdf_profile_binding",
  );

  for (const profile of campaign.profiles ?? []) {
    fail(profile.saleEligibleCredit === false, `profile_sale_credit:${profile.profileId}`);
    fail(profile.realCustomerCredit === 0, `profile_customer_credit:${profile.profileId}`);
    fail(profile.externalEvidenceCredit === 0, `profile_external_credit:${profile.profileId}`);
    fail(profile.willingnessToPayCredit === 0, `profile_wtp_credit:${profile.profileId}`);
    if (profile.groundTruth?.status?.startsWith("NOT_MEASURED")) {
      fail(profile.groundTruth.falsePositiveCount === null, `fabricated_fp:${profile.profileId}`);
      fail(profile.groundTruth.falseNegativeCount === null, `fabricated_fn:${profile.profileId}`);
    } else {
      fail(Number.isInteger(profile.groundTruth?.falsePositiveCount), `missing_fp:${profile.profileId}`);
      fail(Number.isInteger(profile.groundTruth?.falseNegativeCount), `missing_fn:${profile.profileId}`);
    }
  }

  for (const binding of campaign.sourceBindings ?? []) {
    const absolutePath = path.join(ROOT, binding.path);
    fail(fs.existsSync(absolutePath), `source_missing:${binding.path}`);
    if (fs.existsSync(absolutePath)) {
      fail(sha256Bytes(fs.readFileSync(absolutePath)) === binding.sha256, `source_digest:${binding.path}`);
    }
  }

  if (expectedCampaign) {
    fail(
      canonicalJson(campaign) === canonicalJson(expectedCampaign),
      "current_source_recomputed_campaign_mismatch",
    );
  }

  return { valid: errors.length === 0, errors };
}

export function buildCampaign() {
  const sources = Object.fromEntries(
    Object.entries(SOURCE_PATHS).map(([key, relativePath]) => [key, readSource(relativePath)]),
  );
  const products = buildProducts(sources);
  const profiles = products.flatMap((product) => product.profiles);
  const sourceBindings = Object.values(sources)
    .map((source) => ({ path: source.relativePath, sha256: source.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const sameInputProductsCompleted = products.filter((product) => product.sameInputVerified).length;
  const sameInputProfilesCompleted = profiles.filter(
    (profile) => profile.executionStatus === "COMPLETED_SAME_INPUT_INTERNAL",
  ).length;
  const outputsPresentButNotSameInputProfiles = profiles.filter(
    (profile) =>
      profile.executionStatus === "OUTPUT_PRESENT_INPUT_NOT_CROSS_TIER_MATCHED"
      || profile.executionStatus === "OUTPUT_PRESENT_PARTIAL_INPUT_IDENTITY_CURRENTLY_UNCREDITED",
  ).length;
  const partialInputIdentityProducts = products.filter(
    (product) => product.candidateCrossTierMatchCount > 0 && !product.sameInputVerified,
  ).length;
  const partialInputIdentityProfiles = profiles.filter(
    (profile) => profile.candidateCrossTierMatchCount > 0 && profile.matchedSameInputCount === 0,
  ).length;
  const currentOutputMissingProfiles = profiles.filter(
    (profile) => profile.executionStatus === "NOT_EXECUTED_CURRENT_BYTES",
  ).length;

  const campaign = {
    schemaVersion: "velmere.p36.internal-final-tier-campaign.v1",
    revisionId: "P36_INTERNAL_FINAL_TIER_VALUE_CURRENT_SOURCE",
    generatedAt: GENERATED_AT,
    state: "CURRENT_SOURCE_INTERNAL_ONLY_IN_PROGRESS",
    creditClass: "INTERNAL_FIXTURE_OR_OFFLINE_RUNTIME_REVALIDATION_ONLY",
    truthBoundary: {
      internalFixtureOrOfflineRuntimeOnly: true,
      realCustomers: 0,
      independentReviewers: 0,
      externalProviderEvidenceCredit: 0,
      providerRightsApprovedAssets: 0,
      willingnessToPayObservations: 0,
      saleEligibleProfiles: 0,
      goPaid: false,
      live: false,
      worldClassProven: false,
      statement:
        "No profile currently satisfies the complete V14 same-input identity. Partial business-key triplets are diagnostic only and are not real-customer, provider-rights, WTP, paid-release, LIVE, or world-class proof.",
    },
    methodology: {
      productDenominator: 11,
      tiers: TIERS,
      comparisonRule: "IDENTICAL_INPUT_IDENTITY_REQUIRED_ACROSS_BASIC_PRO_ADVANCED",
      requiredInputIdentityDimensions: [
        "product_subject_and_source",
        "locale",
        "observation_time_and_freshness",
        "provider_set",
        "policy_schema_and_revision",
      ],
      sourceBinding: "SHA256_EXACT_SOURCE_JSON",
      outputBinding: "SHA256_CANONICAL_SELECTED_RUNTIME_OUTPUTS",
      noveltyRule: "TARGET_FEATURE_TOKENS_ABSENT_FROM_PREVIOUS_TIER",
      duplicationRule: "TARGET_FEATURE_TOKENS_ALREADY_PRESENT_IN_PREVIOUS_TIER",
      decisionChangeRule: "EXACT_DECISION_STRING_CHANGE_ON_MATCHED_INPUT",
      falsePositiveFalseNegativeRule:
        "MEASURE_ONLY_WHERE_EXPLICIT_FIXTURE_OR_EXPECTED_DECISION_GROUND_TRUTH_EXISTS; OTHERWISE_NULL",
    },
    completion: {
      productsExplicitlyMapped: products.length,
      profilesExplicitlyMapped: profiles.length,
      sameInputProductsCompleted,
      sameInputProductsDenominator: 11,
      sameInputProfilesCompleted,
      sameInputProfilesDenominator: 33,
      partialInputIdentityProducts,
      partialInputIdentityProfiles,
      outputsPresentButNotSameInputProfiles,
      currentOutputMissingProfiles,
      finalCustomerValueHoldoutsClosed: 0,
      realExternalTracksClosed: 0,
    },
    sourceBindings,
    products: products.map(({ profiles: _profiles, ...product }) => product),
    profiles,
  };
  resignCampaign(campaign);
  const validation = validateCampaign(campaign);
  if (!validation.valid) throw new Error(`p36_campaign_invalid:${validation.errors.join(",")}`);
  return campaign;
}

export function writeCampaign(outputPath = OUTPUT_PATH) {
  const campaign = buildCampaign();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(campaign, null, 2)}\n`, "utf8");
  return campaign;
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  const campaign = writeCampaign();
  console.log(
    JSON.stringify({
      status: "PASS_P36_INTERNAL_FINAL_TIER_CAMPAIGN_BUILT",
      profiles: `${campaign.completion.profilesExplicitlyMapped}/33`,
      sameInputProducts: `${campaign.completion.sameInputProductsCompleted}/11`,
      sameInputProfiles: `${campaign.completion.sameInputProfilesCompleted}/33`,
      currentOutputMissingProfiles: campaign.completion.currentOutputMissingProfiles,
      saleEligibleProfiles: campaign.truthBoundary.saleEligibleProfiles,
      realCustomerCredit: campaign.truthBoundary.realCustomers,
      output: path.relative(ROOT, OUTPUT_PATH).replaceAll(path.sep, "/"),
      payloadSha256: campaign.integrity.payloadSha256,
    }),
  );
}
