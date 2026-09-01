#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const V16 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt";
const V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt";
const TOPOLOGY_TS = "lib/product/vlm-canonical-product-topology.ts";
const MATRIX_TS = "lib/commerce/vlm-current-evidence-availability-matrix.ts";
const SKU_TRUTH_TS = "lib/commerce/vlm-current-sku-truth.ts";
const POLICY = "config/p39/p39-v16-authority-topology-policy.json";
const RECONCILIATION = "config/p39/p39-v16-product-topology-reconciliation.json";
const CONTINUITY = "config/p39/p39-v15-to-v16-continuity-audit.json";
const EXPECTED_V16_SHA256 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9";
const EXPECTED_V15_SHA256 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0";
const REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION";
const GENERATED_AT = "2026-08-14T05:05:00.000Z";

const bytes = (rel) => fs.readFileSync(path.join(ROOT, rel));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const binding = (rel) => {
  const data = bytes(rel);
  return { path: rel, byteLength: data.length, sha256: sha256(data) };
};
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function integrity(value) {
  return sha256(Buffer.from(JSON.stringify(stable(value))));
}
function writeIntegrityJson(rel, value) {
  const payload = structuredClone(value);
  payload.integritySha256 = integrity(payload);
  const target = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (binding(V16).sha256 !== EXPECTED_V16_SHA256) throw new Error("v16_owner_bytes_changed");
if (binding(V15).sha256 !== EXPECTED_V15_SHA256) throw new Error("v15_historical_bytes_changed");

const topologyUrl = `${pathToFileURL(path.join(ROOT, TOPOLOGY_TS)).href}?sha=${binding(TOPOLOGY_TS).sha256}`;
const topology = await import(topologyUrl);
const {
  VLM_CANONICAL_CUSTOMER_PRODUCTS,
  VLM_CANONICAL_PRODUCT_FAMILIES,
  VLM_INTERNAL_EXECUTION_PROFILES,
  VLM_CONTEXT_TRANSITIONS,
  VLM_V16_TOPOLOGY_DENOMINATORS,
  VLM_PRODUCT_TAXONOMY_RULES,
} = topology;

const expected = {
  customerFacingRows: 17,
  productFamilies: 11,
  explicitlyTieredRows: 9,
  standaloneRows: 8,
  internalExecutionProfiles: 33,
  contextTransitions: 22,
  deltaRequiredTransitions: 6,
  notApplicableNoPaidDeltaClaimTransitions: 16,
};
for (const [key, value] of Object.entries(expected)) {
  if (VLM_V16_TOPOLOGY_DENOMINATORS[key] !== value) throw new Error(`topology_denominator_drift:${key}`);
}
if (VLM_CANONICAL_CUSTOMER_PRODUCTS.length !== 17) throw new Error("customer_rows_not_17");
if (VLM_CANONICAL_PRODUCT_FAMILIES.length !== 11) throw new Error("families_not_11");
if (VLM_INTERNAL_EXECUTION_PROFILES.length !== 33) throw new Error("profiles_not_33");
if (VLM_CONTEXT_TRANSITIONS.length !== 22) throw new Error("transitions_not_22");

writeIntegrityJson(POLICY, {
  schemaVersion: "velmere.p39.v16-authority-topology-policy.v2",
  revision: REVISION,
  generatedAt: GENERATED_AT,
  state: "CURRENT_SOURCE_ONLY_IN_PROGRESS",
  releaseState: "NO_GO",
  parentRoot: "R44P46",
  parentCheckpoint: "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
  authority: {
    candidate: binding(V16),
    previousHistorical: binding(V15),
    bindingRule: "V16 becomes current authority only after exact copy, authority manifest, regenerated source/path identity, affected policy/schema/receipt bindings, current validation, and deterministic 2/2 SOURCE_ONLY packaging with CRC.",
    candidateStateBeforePackage: "EXACT_WORKING_SOURCE_BINDING_PENDING_FINAL_P39_PACKAGE_RECEIPT",
  },
  sourceBindings: {
    topology: binding(TOPOLOGY_TS),
    availabilityMatrix: binding(MATRIX_TS),
    currentSkuTruth: binding(SKU_TRUTH_TS),
  },
  topologyRules: {
    productFamilies: 11,
    customerFacingRows: 17,
    internalExecutionProfiles: 33,
    contextTransitions: 22,
    deltaRequiredTransitions: 6,
    notApplicableNoPaidDeltaClaimTransitions: 16,
    saleEligibilityDenominator: "17_REAL_CUSTOMER_FACING_ROWS_ONLY",
    internalExecutionProfilesAreSaleableSkus: false,
    standaloneContextDeltaRequiresCurrentCatalogClaim: true,
    truthInvariantAcrossContexts: true,
    safetyInvariantAcrossContexts: true,
  },
  runtimeTarget: {
    requiredNode: "24.18.0",
    requiredNpm: "11.16.0",
    requiredFinalPlatform: "Windows",
    currentPassExecutablePlatform: "linux-x64",
    toolcacheArchiveOrigin: "github-actions/actions-node-versions release asset",
    toolcacheArchiveSha256: "efced36c041a7a43e8b4a4b35cb929bef7747c1c7442e693901a0b4f06467e1d",
    toolcacheArchiveByteLength: 57653661,
    exactLinuxExecutionMayEarn: [
      "exact Node 24.18.0 and npm 11.16.0 linux-x64 runtime identity",
      "authority/topology/current-matrix verifier execution",
    ],
    exactLinuxExecutionCannotEarn: [
      "Windows execution",
      "dependency closure",
      "typecheck/lint/dual-build",
      "Browser or PDF closure",
      "GO_INTERNAL",
    ],
  },
  creditBoundary: {
    authorityWorkingBindingCredit: true,
    topologyDefinitionCredit: true,
    exactLinuxRuntimeCreditOnlyAfterRuntimeReceipt: false,
    exactWindowsCredit: false,
    productExecutionCredit: false,
    sourceRightsCredit: false,
    valueCredit: false,
    saleCredit: false,
    goInternalCredit: false,
    goPaidCredit: false,
    liveCredit: false,
    worldClassProvenCredit: false,
  },
});

const reconciliation = writeIntegrityJson(RECONCILIATION, {
  schemaVersion: "velmere.p39.v16-product-topology-reconciliation.v2",
  revision: REVISION,
  generatedAt: GENERATED_AT,
  state: "IMPLEMENTED_AND_TESTED_INTERNAL_TOPOLOGY_RECONCILIATION",
  parentRoot: "R44P46",
  authority: binding(V16),
  previousAuthorityRetainedHistorically: binding(V15),
  denominators: VLM_V16_TOPOLOGY_DENOMINATORS,
  customerFacingRows: VLM_CANONICAL_CUSTOMER_PRODUCTS.map((row) => ({
    rowId: row.productId,
    family: row.family,
    customerFacingType: row.productClass === "TIERED_REPORT_PRODUCT"
      ? "EXPLICITLY_TIERED_PRODUCT_FAMILY"
      : "STANDALONE_PRODUCT_FAMILY",
    tier: row.tier,
    saleEligibilityApplies: true,
    currentOutputAuditState: "NOT_EXECUTED_CURRENT_V16",
    currentClosurePercent: 0,
    currentSaleEligible: false,
  })),
  productFamilies: VLM_CANONICAL_PRODUCT_FAMILIES,
  internalExecutionProfiles: VLM_INTERNAL_EXECUTION_PROFILES.map((profile) => ({
    ...profile,
    executionState: "NOT_EXECUTED_CURRENT_V16",
    valueState: profile.valueApplicability ?? (
      profile.context === "BASIC_CONTEXT"
        ? "INDEPENDENTLY_USEFUL_BASELINE_NOT_EXECUTED"
        : profile.deltaRequiredByCatalog
          ? "REQUIRED_DELTA_NOT_EXECUTED"
          : "NOT_APPLICABLE_NO_PAID_DELTA_CLAIM"
    ),
  })),
  contextTransitions: VLM_CONTEXT_TRANSITIONS,
  mandatoryFamiliesPresent: ["market-impact", "whale-watch", "shield-map", "angel", "risk-indicator"],
  rules: VLM_PRODUCT_TAXONOMY_RULES,
  denominatorsCurrentReceipt: {
    customerFacingRowsReconciled: "17/17",
    internalProfilesDefined: "33/33",
    transitionApplicabilityClassified: "22/22",
    catalogRequiredTransitions: "6/22",
    notApplicableNoPaidDeltaClaim: "16/22",
    catalogRequiredTransitionsValuePassed: "0/6",
    internalProfilesPhysicallyExecutedCurrentV16: "0/33",
    customerOutputsPhysicallyAuditedCurrentV16: "0/17",
    saleEligibleCustomerRows: "0/17",
  },
  creditBoundary: {
    topologyReconciliationCredit: true,
    executionCoverageCredit: false,
    productQualityCredit: false,
    materialValueCredit: false,
    saleEligibilityCredit: false,
    goInternalCredit: false,
    goPaidCredit: false,
    worldClassCredit: false,
  },
  truthBoundary: "This receipt reconciles the V16 product and denominator topology only: 11 families, 17 real customer-facing rows, 33 internal contexts and 22 transitions. It does not prove current customer outputs, factual quality, source rights, material paid value, Browser/PDF execution, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN.",
});

writeIntegrityJson(CONTINUITY, {
  schemaVersion: "velmere.p39.v15-to-v16-continuity-audit.v2",
  revision: REVISION,
  generatedAt: GENERATED_AT,
  result: "V16_SUBSUMES_V15_NO_OWNER_DIRECTIVE_TEXT_AMENDMENT_REQUIRED",
  v15: { ...binding(V15), status: "HISTORICAL_RETAINED" },
  v16: { ...binding(V16), status: "BOUND_BY_P39_ON_SUCCESSFUL_PACKAGE_VERIFICATION" },
  valuableV15RequirementsPreservedOrExpandedInV16: [
    "FREE_LEGAL_FIRST_AND_ZERO_DEFAULT_EXTERNAL_SPEND",
    "CURRENT_HISTORICAL_CONFLICTED_UNAVAILABLE_TRUTH",
    "EXACT_CURRENT_SOURCE_RUNTIME_BUILD_BROWSER_PDF_ORDER",
    "SAME_INPUT_EXACT_OUTPUT_BYTES_AND_HOLDOUT_DISCIPLINE",
    "BASIC_INDEPENDENT_VALUE_AND_MATERIAL_PAID_DELTA",
    "FIELD_LEVEL_SOURCE_RIGHTS_AND_FRESHNESS",
    "SEPARATE_INTERNAL_AI_AND_REAL_EXTERNAL_PROOF",
    "100_PERSONAS_24_CHECKPOINTS_100_JOURNEYS_2400_OBSERVATIONS",
    "50_REVIEWERS_AND_30_ATTACKERS_600_ATTACKS",
    "FREE_REAL_PILOT_AFTER_INTERNAL_AND_AI_CLOSURE",
    "THREE_CLEAN_CONVERGENCE_ROUNDS",
    "EXACTLY_THREE_MAIN_HANDOFF_FILES",
    "NO_MAGIC_READINESS_PERCENT",
    "WORLD_CLASS_REQUIRES_REAL_EXTERNAL_EVIDENCE",
  ],
  v15ErrorsCorrectedByV16: [
    "FIVE_CORE_PRODUCT_COMPRESSION_TO_ALL_11_FAMILIES",
    "FIFTEEN_ROW_DENOMINATOR_TO_17_CUSTOMER_ROWS_PLUS_33_INTERNAL_CONTEXTS",
    "THIRTY_THREE_CONTEXTS_NO_LONGER_TREATED_AS_SALEABLE_SKUS",
    "STANDALONE_DUPLICATION_NO_LONGER_AUTOMATIC_FAILURE_WITHOUT_CATALOG_DELTA_CLAIM",
    "2400_JOURNEYS_WORDING_CORRECTED_TO_100_JOURNEYS_AND_2400_OBSERVATIONS",
  ],
  textChangesAppliedToV16: false,
  reasonNoAmendmentWasAdded: "V16 already retains every material V15 control identified by the continuity audit and is stricter. Duplicate prose would increase authority ambiguity without closing a real gap.",
  truthBoundary: "This is an authority continuity and omission audit, not product, legal, customer, sale or world-class proof.",
});

console.log(JSON.stringify({
  status: "PASS_P39_V16_TOPOLOGY_BUILT",
  node: process.version,
  policySha256: sha256(bytes(POLICY)),
  reconciliationSha256: sha256(bytes(RECONCILIATION)),
  continuitySha256: sha256(bytes(CONTINUITY)),
  customerRows: reconciliation.denominators.customerFacingRows,
  families: reconciliation.denominators.productFamilies,
  internalProfiles: reconciliation.denominators.internalExecutionProfiles,
  transitions: reconciliation.denominators.contextTransitions,
  requiredTransitions: reconciliation.denominators.deltaRequiredTransitions,
  notApplicableTransitions: reconciliation.denominators.notApplicableNoPaidDeltaClaimTransitions,
}, null, 2));
