import { createHash } from "node:crypto";

export const BUILD_BINDING_SCHEMA = "velmere.pass4826.build-output-binding.v1";
export const DUAL_BUILD_GATE_SCHEMA = "velmere.pass4826.dual-build-output-gate.v2";
export const BUILD_ENGINES = Object.freeze(["webpack", "turbopack"]);

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const digest = (value) => /^[a-f0-9]{64}$/u.test(String(value ?? "").replace(/^sha256:/u, ""));

export function sealBuildBinding(core) {
  return { ...core, receiptSha256: sha256(canonical(core)) };
}

export function evaluateDualBuildGate(currentSourceTreeSha256, receipts, externalEvidence = {}) {
  const results = BUILD_ENGINES.map((engine) => {
    const receipt = receipts?.[engine] ?? null;
    const errors = [];
    const check = (condition, code) => { if (!condition) errors.push(code); };
    check(receipt && typeof receipt === "object" && !Array.isArray(receipt), "receipt_missing_or_invalid");
    if (receipt && typeof receipt === "object") {
      check(receipt.schemaVersion === BUILD_BINDING_SCHEMA, "schema_mismatch");
      check(receipt.engine === engine, "engine_mismatch");
      check(receipt.status === "PASS", "status_not_pass");
      check(receipt.buildSucceeded === true, "build_not_succeeded");
      check(receipt.buildReceiptBound === true, "build_receipt_not_bound");
      check(receipt.outputUnchanged === true, "output_changed");
      check(receipt.exactRuntime === true, "runtime_not_exact");
      check(receipt.sourceUnchanged === true, "source_changed");
      check(receipt.sourceTreeSha256 === currentSourceTreeSha256, "source_not_current");
      check(receipt.postRunSourceTreeSha256 === currentSourceTreeSha256, "post_source_not_current");
      check(digest(receipt.output?.sha256), "output_digest_invalid");
      check(Number.isInteger(receipt.output?.fileCount) && receipt.output.fileCount > 0, "output_file_count_invalid");
      check(Number.isInteger(receipt.output?.byteLength) && receipt.output.byteLength > 0, "output_byte_length_invalid");
      const external = externalEvidence?.[engine] ?? null;
      check(external && typeof external === "object" && external.ok === true, "external_evidence_not_verified");
      for (const error of Array.isArray(external?.errors) ? external.errors : []) errors.push(`evidence:${error}`);
      check(digest(receipt.receiptSha256), "receipt_checksum_invalid");
      if (digest(receipt.receiptSha256)) {
        const core = { ...receipt };
        delete core.receiptSha256;
        check(receipt.receiptSha256.replace(/^sha256:/u, "") === sha256(canonical(core)), "receipt_checksum_mismatch");
      }
    }
    return { engine, passed: errors.length === 0, errors: [...new Set(errors)], outputSha256: receipt?.output?.sha256 ?? null };
  });
  const blockers = results.flatMap((result) => result.errors.map((error) => `${result.engine}:${error}`));
  const passed = blockers.length === 0;
  return {
    schemaVersion: DUAL_BUILD_GATE_SCHEMA,
    status: passed ? "PASS" : "FAIL",
    ok: passed,
    dualBuildGatePassed: passed,
    currentSourceTreeSha256,
    requiredEngines: [...BUILD_ENGINES],
    results,
    blockers,
    crossEngineByteEqualityRequired: false,
    sameEngineRepeatedRunDeterminismRequiredSeparately: true,
  };
}

export function sealDualBuildGate(core) {
  return { ...core, receiptSha256: sha256(canonical(core)) };
}
