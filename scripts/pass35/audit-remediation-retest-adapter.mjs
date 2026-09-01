import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/iu;
const CASE_REF = /^AUD-[A-Z0-9-]{8,64}$/u;
const FINDING_ID = /^FIND-[A-Z0-9-]{6,64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const CONTROL_ID = /^A(?:0[1-9]|1[0-7])$/u;
const REQUIRED_RETESTS = ["A05", "A07", "A08", "A09", "A10"];

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function digest(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!DIGEST.test(text)) return null;
  return text.startsWith("sha256:") ? text : `sha256:${text}`;
}
function insideRoot(root, relative, code) {
  if (typeof relative !== "string" || !relative.trim() || path.isAbsolute(relative)) throw new Error(code);
  const resolved = path.resolve(root, relative);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(code);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) throw new Error(`${code}_missing`);
  return resolved;
}

function validateCase(input) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(input?.schemaVersion === "velmere.pass35.audit-a8-remediation-retest-case.v1", "a8_retest_schema_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(input?.inputClass), "a8_retest_input_class_invalid");
  add(CASE_REF.test(String(input?.caseRef ?? "")), "a8_retest_case_ref_invalid");
  add(FINDING_ID.test(String(input?.findingId ?? "")), "a8_retest_finding_id_invalid");
  add(ISO.test(String(input?.observedAt ?? "")), "a8_retest_observed_at_invalid");
  add(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(input?.originalSeverity), "a8_retest_severity_invalid");
  for (const field of ["originalFindingReceiptSha256", "originalSourceSha256", "originalRuntimeBytecodeSha256", "patchCommitSha256", "patchedSourceSha256", "patchedRuntimeBytecodeSha256", "regressionPlanSha256"]) {
    add(digest(input?.[field]) !== null, `a8_retest_${field}_invalid`);
  }
  add(digest(input?.originalSourceSha256) !== digest(input?.patchedSourceSha256), "a8_retest_source_unchanged");
  add(digest(input?.originalRuntimeBytecodeSha256) !== digest(input?.patchedRuntimeBytecodeSha256), "a8_retest_bytecode_unchanged");
  const required = Array.isArray(input?.requiredRetestControls) ? input.requiredRetestControls : [];
  add(new Set(required).size === required.length, "a8_retest_required_control_duplicate");
  for (const control of REQUIRED_RETESTS) add(required.includes(control), `a8_retest_required_control_missing:${control}`);
  for (const control of required) add(CONTROL_ID.test(String(control)), "a8_retest_required_control_invalid");
  const receipts = Array.isArray(input?.retestReceipts) ? input.retestReceipts : [];
  add(receipts.length >= required.length, "a8_retest_receipt_count_invalid");
  add(new Set(receipts.map((row) => row?.controlId)).size === receipts.length, "a8_retest_receipt_duplicate_control");
  for (const row of receipts) {
    add(CONTROL_ID.test(String(row?.controlId ?? "")), "a8_retest_receipt_control_invalid");
    add(typeof row?.receiptPath === "string" && row.receiptPath.length > 0, "a8_retest_receipt_path_invalid");
    add(digest(row?.expectedFileSha256) !== null, "a8_retest_receipt_file_digest_invalid");
    add(digest(row?.expectedEmbeddedReceiptSha256) !== null, "a8_retest_receipt_embedded_digest_invalid");
  }
  for (const control of required) add(receipts.some((row) => row?.controlId === control), `a8_retest_receipt_missing:${control}`);
  if (input?.reviewerAttestationSha256 != null) add(digest(input.reviewerAttestationSha256) !== null, "a8_retest_reviewer_attestation_invalid");
  return [...new Set(blockers)].sort();
}

export function executeRemediationRetestAdapter({ rootPath = process.cwd(), casePath, caseInput }) {
  const root = path.resolve(rootPath);
  const blockers = validateCase(caseInput);
  let caseFileSha256 = null;
  try {
    const absoluteCasePath = insideRoot(root, casePath, "a8_retest_case_path_outside_root");
    const bytes = readFileSync(absoluteCasePath);
    caseFileSha256 = sha256(bytes);
    const disk = JSON.parse(bytes.toString("utf8"));
    if (sha256(stable(disk)) !== sha256(stable(caseInput))) blockers.push("a8_retest_case_file_content_mismatch");
  } catch (error) { blockers.push(error instanceof Error ? error.message : String(error)); }

  const normalizedReceipts = [];
  for (const row of caseInput?.retestReceipts ?? []) {
    try {
      const absolute = insideRoot(root, row.receiptPath, "a8_retest_receipt_path_outside_root");
      const bytes = readFileSync(absolute);
      const fileSha256 = sha256(bytes);
      const parsed = JSON.parse(bytes.toString("utf8"));
      const embedded = digest(parsed?.receiptSha256);
      const status = parsed?.status ?? parsed?.execution?.status ?? null;
      const realCaseExecution = parsed?.realCaseExecution === true || parsed?.execution?.realCaseExecution === true;
      const paidGateEligible = parsed?.paidGateEligible === true || parsed?.execution?.paidGateEligible === true;
      if (fileSha256 !== digest(row.expectedFileSha256)) blockers.push(`a8_retest_receipt_file_digest_mismatch:${row.controlId}`);
      if (embedded !== digest(row.expectedEmbeddedReceiptSha256)) blockers.push(`a8_retest_receipt_embedded_digest_mismatch:${row.controlId}`);
      if (!String(status ?? "").includes("VERIFIED")) blockers.push(`a8_retest_receipt_not_verified:${row.controlId}`);
      normalizedReceipts.push({
        controlId: row.controlId,
        receiptPathSha256: sha256(row.receiptPath),
        fileSha256,
        embeddedReceiptSha256: embedded,
        status,
        realCaseExecution,
        paidGateEligible,
      });
    } catch (error) {
      blockers.push(`${row?.controlId ?? "UNKNOWN"}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (caseInput?.inputClass === "CUSTOMER_SUPPLIED_VERIFIED") {
    if (!caseInput?.reviewerAttestationSha256) blockers.push("a8_retest_verified_case_reviewer_attestation_missing");
    if (normalizedReceipts.some((row) => row.realCaseExecution !== true)) blockers.push("a8_retest_verified_case_requires_real_retests");
  }
  const uniqueBlockers = [...new Set(blockers)].sort();
  const allRequiredPresent = REQUIRED_RETESTS.every((control) => normalizedReceipts.some((row) => row.controlId === control));
  const localRetestContractVerified = uniqueBlockers.length === 0 && allRequiredPresent;
  const closureEligible = localRetestContractVerified
    && caseInput?.inputClass === "CUSTOMER_SUPPLIED_VERIFIED"
    && normalizedReceipts.every((row) => row.realCaseExecution === true && row.paidGateEligible === true)
    && digest(caseInput?.reviewerAttestationSha256) !== null;
  const core = {
    schemaVersion: "velmere.pass35.audit-a8-remediation-retest-receipt.v1",
    familyId: "remediation_retest_local_contract",
    caseRef: caseInput?.caseRef ?? null,
    findingId: caseInput?.findingId ?? null,
    inputClass: caseInput?.inputClass ?? null,
    originalSeverity: caseInput?.originalSeverity ?? null,
    caseFileSha256,
    originalBinding: {
      findingReceiptSha256: digest(caseInput?.originalFindingReceiptSha256),
      sourceSha256: digest(caseInput?.originalSourceSha256),
      runtimeBytecodeSha256: digest(caseInput?.originalRuntimeBytecodeSha256),
    },
    patchBinding: {
      patchCommitSha256: digest(caseInput?.patchCommitSha256),
      patchedSourceSha256: digest(caseInput?.patchedSourceSha256),
      patchedRuntimeBytecodeSha256: digest(caseInput?.patchedRuntimeBytecodeSha256),
      regressionPlanSha256: digest(caseInput?.regressionPlanSha256),
    },
    retestControls: [...new Set(caseInput?.requiredRetestControls ?? [])].sort(),
    retestReceiptCount: normalizedReceipts.length,
    retestReceipts: normalizedReceipts.sort((a, b) => a.controlId.localeCompare(b.controlId)),
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED_LOCAL_RETEST_CONTRACT",
    assuranceClass: "LOCAL_CONTRACT",
    localRetestContractVerified,
    closureEligible,
    signedClosure: false,
    realCaseExecution: false,
    paidGateEligible: false,
    fullAuditClaimAllowed: false,
    promotionAllowed: false,
    blockers: uniqueBlockers,
    limitations: [
      "The fixture proves receipt-chain integrity and finding-by-finding retest gating only; it does not prove a real vulnerability was fixed.",
      "A signed closure requires exact customer source/bytecode, real applicable retests, regression evidence and qualified reviewer attestation.",
    ],
    truthBoundary: "A8 may prove the local A15 remediation/retest evidence-chain contract only. Synthetic receipts cannot close a customer finding, authorize Advanced delivery or count as independent retest evidence.",
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
