#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCurrentEvidenceAvailabilityMatrix } from "../../lib/commerce/vlm-current-evidence-availability-matrix.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUTPUT = path.join(ROOT, "artifacts/closure/p36/P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX.json");
const EVALUATED_AT = "2026-08-13T18:30:00.000Z";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

const matrix = buildCurrentEvidenceAvailabilityMatrix({ locale: "en", evaluatedAt: EVALUATED_AT });
if (matrix.denominator !== 33 || matrix.products !== 11 || matrix.tiersPerProduct !== 3) {
  throw new Error("p36_current_evidence_availability_denominator_drift");
}
if (matrix.profiles.some((profile) => profile.receipt.saleEligible !== false)) {
  throw new Error("p36_current_evidence_availability_sale_false_promotion");
}
if (
  matrix.evidenceAuthority.schemaVersion !== "velmere.p36.current-commercial-evidence.v1"
  || matrix.evidenceAuthority.saleEnabled !== false
  || matrix.evidenceAuthority.live !== false
  || matrix.evidenceAuthority.productionApproved !== false
  || matrix.evidenceAuthority.realCustomerCases !== 0
  || matrix.evidenceAuthority.independentlyReviewedCases !== 0
  || matrix.evidenceAuthority.rightsApprovedRows !== 0
) {
  throw new Error("p36_current_evidence_availability_authority_false_promotion");
}

const payload = {
  ...matrix,
  revision: "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
  state: "CURRENT_SOURCE_INTERNAL_ONLY_IN_PROGRESS",
  creditClass: "CURRENT_SOURCE_INTERNAL_POLICY_EXECUTION_ONLY",
  implementationState: {
    eligibilityCore: "IMPLEMENTED_AND_TESTED_INTERNAL",
    publicReadinessProjection: "IMPLEMENTED_AND_TESTED_INTERNAL",
    publicCheckout: "FAIL_CLOSED_CURRENT_CATALOG",
    exactLinuxBuildAndBrowser: "BOUND_BY_SEPARATE_CURRENT_P36_RECEIPTS",
    exactWindows: "OPEN_REQUIRED_FOR_GO_INTERNAL",
    providerRights: "EXTERNAL_OPEN_REQUIRED_FOR_PAID",
    finalCustomerValueHoldout: "NOT_RUN",
    realCustomerValue: "NOT_RUN",
    productionRuntime: "NOT_RUN",
  },
  truthBoundary: "P36 current-source internal eligibility projection. Analysis eligibility is distinct from release and sale eligibility. It grants no current provider rights/data, final customer-value holdout, exact Windows, staging, real customer, GO_PAID or LIVE credit.",
};
payload.integritySha256 = digest(payload);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  status: "PASS_P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX_BUILT",
  denominator: payload.denominator,
  analysisEligibleProfileCount: payload.analysisEligibleProfileCount,
  saleEligibleProfileCount: payload.saleEligibleProfileCount,
  integritySha256: payload.integritySha256,
  output: path.relative(ROOT, OUTPUT).replaceAll(path.sep, "/"),
})}\n`);
