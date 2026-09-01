import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildCurrentEvidenceAvailabilityMatrix } from "../../lib/commerce/vlm-current-evidence-availability-matrix.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "artifacts/closure/p35/current-evidence-availability-matrix.json");
const EVALUATED_AT = "2026-08-13T05:30:00.000Z";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}
function sha(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

const matrix = buildCurrentEvidenceAvailabilityMatrix({ locale: "en", evaluatedAt: EVALUATED_AT });
if (matrix.denominator !== 33 || matrix.products !== 11 || matrix.tiersPerProduct !== 3) {
  throw new Error("p35_evidence_availability_denominator_drift");
}
const output = {
  ...matrix,
  revision: "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY",
  creditClass: "CURRENT_SOURCE_INTERNAL_POLICY_EXECUTION_ONLY",
  implementationState: {
    eligibilityCore: "IMPLEMENTED_AND_TESTED_INTERNAL",
    publicReadinessProjection: "IMPLEMENTED_AND_TESTED_INTERNAL",
    publicCheckout: "FAIL_CLOSED_CURRENT_CATALOG",
    providerRights: "EXTERNAL_OPEN",
    finalTierValueHoldout: "NOT_RUN",
    realCustomerValue: "NOT_RUN",
    productionRuntime: "NOT_RUN",
  },
};
output.integritySha256 = sha(output);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "PASS_P35_EVIDENCE_AVAILABILITY_MATRIX_BUILT",
  denominator: output.denominator,
  analysisEligibleProfileCount: output.analysisEligibleProfileCount,
  saleEligibleProfileCount: output.saleEligibleProfileCount,
  integritySha256: output.integritySha256,
  output: path.relative(ROOT, OUT).replaceAll(path.sep, "/"),
}));
