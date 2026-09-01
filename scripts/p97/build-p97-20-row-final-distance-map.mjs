#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
const topology = await import("../../lib/product/vlm-canonical-product-topology.ts");
const products = topology.VLM_CANONICAL_CUSTOMER_PRODUCTS;

const rows = {
  "audit-basic": [
    "CUSTOMER_AUTHORIZED_CURRENT_DEPLOYMENT_INPUT",
    "DEPLOYMENT_BOUND_GROUND_TRUTH_AND_CURRENTNESS",
    "FIELD_LEVEL_RIGHTS",
    "DEPLOYED_IMMUTABLE_PDF_AND_READ_PATH",
    "AUTHORIZATION_PRIVACY_ISOLATION",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "audit-pro": [
    "CUSTOMER_AUTHORIZED_CURRENT_DEPLOYMENT_INPUT",
    "FIVE_LIVE_FOUR_STRICT_THREE_FAMILY_EVIDENCE",
    "FIELD_LEVEL_COMMERCIAL_DISPLAY_PDF_RETENTION_RIGHTS",
    "CURRENT_EXPLOITABILITY_AND_RETEST_BASIS",
    "DEPLOYED_IMMUTABLE_PDF_ACCOUNT_READ_PATH",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "MATERIAL_PRO_VALUE",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS_FINAL_ADJUDICATION",
  ],
  "audit-advanced": [
    "CUSTOMER_AUTHORIZED_CURRENT_DEPLOYMENT_INPUT",
    "SIX_LIVE_FIVE_STRICT_FOUR_FAMILY_EVIDENCE",
    "ADDITIONAL_INDEPENDENT_STRICT_CAPABLE_RIGHTS_SAFE_SOURCE",
    "FIELD_LEVEL_COMMERCIAL_DISPLAY_PDF_RETENTION_RIGHTS",
    "CURRENT_EXPLOITABILITY_ATTACK_PATH_RETEST",
    "DEPLOYED_IMMUTABLE_PDF_ACCOUNT_READ_PATH",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "MATERIAL_ADVANCED_VALUE",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS_FINAL_ADJUDICATION",
  ],
  "browser-basic": [
    "REAL_CUSTOMER_AUTHORIZED_CURRENT_INPUT_AND_RIGHTS",
    "AUTHORIZED_DURABLE_STORE_AND_DEPLOYED_REPLAY",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N_CROSS_BROWSER",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "browser-pro": [
    "REAL_CUSTOMER_AUTHORIZED_CURRENT_INPUT_AND_RIGHTS",
    "AUTHORIZED_DURABLE_STORE_ACCOUNT_ARTIFACT_AND_DEPLOYED_REPLAY",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "MATERIAL_PRO_VALUE_MATCHED_INPUT",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N_CROSS_BROWSER",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "browser-advanced": [
    "REAL_CUSTOMER_AUTHORIZED_CURRENT_INPUT_AND_RIGHTS",
    "AUTHORIZED_DURABLE_STORE_ACCOUNT_ARTIFACT_AND_DEPLOYED_REPLAY",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "ADVANCED_PROVENANCE_CONFLICT_WORKSPACE_VALUE",
    "MATERIAL_ADVANCED_VALUE_MATCHED_INPUT",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N_CROSS_BROWSER",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-basic": [
    "REAL_CURRENT_EVIDENCE_AND_RIGHTS",
    "RISK_LOGIC_GROUND_TRUTH_AND_CALIBRATION",
    "DEPLOYED_CUSTOMER_ROUTE_FAIL_CLOSED",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-pro": [
    "REAL_CURRENT_EVIDENCE_AND_RIGHTS",
    "RISK_LOGIC_GROUND_TRUTH_AND_CALIBRATION",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "MATERIAL_PRO_VALUE_MATCHED_INPUT",
    "DEPLOYED_CUSTOMER_ROUTE_FAIL_CLOSED",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-advanced": [
    "REAL_CURRENT_EVIDENCE_AND_RIGHTS",
    "RISK_LOGIC_GROUND_TRUTH_AND_CALIBRATION",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "ADVANCED_CROSS_SOURCE_SCENARIO_VALUE",
    "MATERIAL_ADVANCED_VALUE_MATCHED_INPUT",
    "DEPLOYED_CUSTOMER_ROUTE_FAIL_CLOSED",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-pro-basic": [
    "REAL_INVESTIGATOR_FUNCTIONALITY_AND_DATA",
    "AUTHORIZATION_CASE_BOUNDARIES",
    "PROVIDER_FAILURE_CONCURRENCY_RECOVERY",
    "DEPLOYED_CUSTOMER_WORKFLOW",
    "ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-pro-pro": [
    "REAL_INVESTIGATOR_FUNCTIONALITY_AND_DATA",
    "AUTHORIZATION_ENTITLEMENT_CASE_BOUNDARIES",
    "PROVIDER_FAILURE_CONCURRENCY_RECOVERY",
    "MATERIAL_PRO_WORKFLOW_VALUE",
    "DEPLOYED_CUSTOMER_WORKFLOW",
    "ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-pro-advanced": [
    "REAL_INVESTIGATOR_FUNCTIONALITY_AND_DATA",
    "AUTHORIZATION_ENTITLEMENT_CASE_BOUNDARIES",
    "PROVIDER_FAILURE_CONCURRENCY_RECOVERY",
    "ADVANCED_CASE_ADJUDICATION_EXPORT_HANDOFF",
    "MATERIAL_ADVANCED_WORKFLOW_VALUE",
    "DEPLOYED_CUSTOMER_WORKFLOW",
    "ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "real-markets-basic": [
    "REAL_CURRENT_MARKET_FIELDS_AND_SEMANTIC_CLASSES",
    "FIELD_LEVEL_RIGHTS_CURRENTNESS_SESSION_TIME",
    "DEPLOYED_DURABLE_ARTIFACT_AND_CUSTOMER_ROUTE",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "real-markets-pro": [
    "REAL_CURRENT_MULTI_SOURCE_MARKET_FIELDS",
    "FIELD_LEVEL_COMMERCIAL_RIGHTS_CURRENTNESS",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "MATERIAL_PRO_VALUE_MATCHED_INPUT",
    "DEPLOYED_DURABLE_ARTIFACT_AND_CUSTOMER_ROUTE",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "real-markets-advanced": [
    "REAL_CURRENT_MULTI_SOURCE_MARKET_FIELDS",
    "FIELD_LEVEL_COMMERCIAL_RIGHTS_CURRENTNESS",
    "ENTITLEMENT_AUTHORIZATION_ISOLATION",
    "ADVANCED_SCENARIO_CONFLICT_DECISION_VALUE",
    "MATERIAL_ADVANCED_VALUE_MATCHED_INPUT",
    "DEPLOYED_DURABLE_ARTIFACT_AND_CUSTOMER_ROUTE",
    "RENDERED_BROWSER_ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "shield-map": [
    "REAL_NODE_EDGE_SOURCE_AND_SEMANTICS",
    "RIGHTS_CURRENTNESS_CONFIDENCE",
    "IDENTITY_CONFLICT_AND_PRIVACY_BOUNDARIES",
    "DEPLOYED_INTERACTIVE_CUSTOMER_ROUTE",
    "ACCESSIBILITY_I18N_MOBILE",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "market-impact": [
    "LEGAL_CURRENT_ORDER_BOOK_OR_NO_USABLE_ORDER_BOOK",
    "MODEL_DOMAIN_CALIBRATION_AND_UNCERTAINTY",
    "MANIPULATION_THIN_BOOK_STALE_NEGATIVES",
    "RIGHTS_VENUE_SNAPSHOT_TIME",
    "DEPLOYED_CUSTOMER_ROUTE",
    "ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "whale-watch": [
    "REAL_CHAIN_BLOCK_FINALITY_REORG_EVIDENCE",
    "LABEL_RIGHTS_AND_IDENTITY_UNCERTAINTY",
    "BRIDGE_INTERNAL_SPAM_DOUBLE_COUNT_NEGATIVES",
    "DEPLOYED_CUSTOMER_ROUTE",
    "ACCESSIBILITY_I18N",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "angel": [
    "REAL_EVIDENCE_AND_TOOL_BOUNDARY",
    "MODEL_PROMPT_TOOL_RETRIEVAL_VERSION_BINDING",
    "CORRECTNESS_GROUNDEDNESS_HALLUCINATION_EVAL",
    "PROMPT_INJECTION_DATA_EXFILTRATION_TOOL_MISUSE",
    "PL_EN_DE_LONG_CONTEXT_CONSISTENCY",
    "DEPLOYED_CUSTOMER_ROUTE_PRIVACY",
    "WHOLE_PROJECT_BUILD_EXACT_WINDOWS",
    "FINAL_ADJUDICATION",
  ],
  "risk-indicator": [
    "AUTHORIZED_STAGING_MIGRATIONS_SERVICE_ROLE_RLS",
    "TWO_JWT_CROSS_ACCOUNT_ROLLBACK_CONCURRENCY",
    "DEPLOYED_REQUEST_BOUND_HTTP_BROWSER_ACCESSIBILITY",
    "REAL_CUSTOMER_INPUT_EXACT_ENGINEERING_FINAL_ADJUDICATION",
  ],
};

const evidence = {
  "audit-basic": ["P78-P90 customer path and local immutable PDF receipts"],
  "audit-pro": ["P89/P90 evidence-dimension and rights gates"],
  "audit-advanced": ["P89/P90 evidence-dimension and rights gates"],
  "browser-basic": ["Current Lens route/client", "P97 durable-store-first source/runtime/static proof"],
  "browser-pro": ["Current Lens route/client", "P97 durable-store-first applies to all depths"],
  "browser-advanced": ["Current Lens route/client", "P97 durable-store-first applies to all depths"],
  "real-markets-basic": ["P87 exact immutable Real Markets PDF bounded proof"],
  "real-markets-pro": ["P87 exact immutable Real Markets PDF bounded proof"],
  "real-markets-advanced": ["P87 exact immutable Real Markets PDF bounded proof"],
  "risk-indicator": ["P91-P96 event/history/customer integrity receipts", "P97 external blocker confirmation"],
};

const mapped = products.map((product) => {
  const gates = rows[product.productId];
  if (!gates) throw new Error(`missing_final_distance_row:${product.productId}`);
  const externallyBlocked = product.productId === "risk-indicator";
  const selected = product.productId === "browser-basic";
  return {
    productId: product.productId,
    displayName: product.displayName,
    family: product.family,
    tier: product.tier,
    customerFinal: false,
    currentState: "WITHHELD",
    finalDistanceGateGroupCount: gates.length,
    remainingCriticalGateGroups: gates,
    externalBlockerConfirmed: externallyBlocked,
    selectedIndependentWorkstream: selected,
    evidenceReferences: evidence[product.productId] ?? ["Current SOURCE_ONLY implementation and inherited bounded receipts; no complete deployed customer chain"],
  };
});
if (mapped.length !== 20 || new Set(mapped.map((row) => row.productId)).size !== 20) throw new Error("canonical_20_row_denominator_mismatch");
if (Object.keys(rows).length !== 20) throw new Error("distance_map_row_count_mismatch");

const sorted = [...mapped].sort((a, b) => a.finalDistanceGateGroupCount - b.finalDistanceGateGroupCount || a.productId.localeCompare(b.productId));
const receipt = {
  schemaVersion: "velmere.p97.current-20-row-final-distance-map.v1",
  generatedAt: "2026-08-21T08:00:00.000Z",
  status: "PASS_ALL_20_ROWS_CLASSIFIED_NO_FINAL_PROMOTION",
  denominator: { canonicalFamilies: 10, customerFacingRows: 20, currentExecutionProfiles: 20, materialPaidTransitions: 10 },
  method: {
    classification: "SOURCE_DERIVED_ESTIMATE_NOT_RELEASE_SCORE",
    unit: "remaining critical gate groups",
    warning: "Counts are prioritization aids, not completion percentages. A smaller count does not override a hard external blocker or prove quality.",
  },
  priorityDecision: {
    closestOverall: "risk-indicator",
    closestOverallBlocker: "EXTERNAL_BLOCKER_CONFIRMED",
    selectedIndependentRow: "browser-basic",
    selectionReason: "Browser Basic had a production-reachable final-artifact defect that could be repaired without imitating staging. It also avoids further local-only Risk History polishing.",
    browserBasicDistanceBeforeP97SourceRepair: 6,
    browserBasicDistanceAfterP97SourceRepair: 5,
  },
  rows: mapped,
  sortedPriority: sorted.map((row) => ({ productId: row.productId, gateGroups: row.finalDistanceGateGroupCount, externalBlockerConfirmed: row.externalBlockerConfirmed })),
  numerators: { customerFinal: "0/20", auditFinalPdf: "0/3", saleEligible: "0/20", paidValue: "0/10" },
  truthBoundary: "All 20 canonical customer rows are classified from current source and inherited bounded receipts. The gate-group count is a prioritization estimate only. No row receives FINAL, sale eligibility, deployment, rights, Browser or exact-Windows credit.",
};
for (const relative of ["receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json", "artifacts/closure/p97r1/P97R1_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json"]) {
  await mkdir(new URL(`../../${relative.substring(0, relative.lastIndexOf("/"))}/`, import.meta.url), { recursive: true });
  await writeFile(new URL(`../../${relative}`, import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, rows: receipt.rows.length, priorityDecision: receipt.priorityDecision }));
