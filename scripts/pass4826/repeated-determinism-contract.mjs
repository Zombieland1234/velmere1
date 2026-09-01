import { createHash } from "node:crypto";

export const REPEATED_DETERMINISM_REQUIRED_RUNS = 10;

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const sha256Determinism = (value) => createHash("sha256").update(value).digest("hex");

function digestCount(runs, field) {
  return new Set(runs.map((run) => run[field]).filter((value) => /^[a-f0-9]{64}$/u.test(value ?? ""))).size;
}

export function summarizeRepeatedDeterminism(runs, requiredRunCount = REPEATED_DETERMINISM_REQUIRED_RUNS) {
  if (!Array.isArray(runs)) throw new Error("determinism_runs_invalid");
  if (!Number.isInteger(requiredRunCount) || requiredRunCount < 2) throw new Error("determinism_required_run_count_invalid");
  const passedRuns = runs.filter((run) => run
    && run.exitCode === 0
    && run.timedOut === false
    && run.packageStatus === "PASS"
    && run.verificationStatus === "PASS"
    && /^[a-f0-9]{64}$/u.test(run.sourceDigest ?? "")
    && /^[a-f0-9]{64}$/u.test(run.outputDigest ?? "")
    && /^[a-f0-9]{64}$/u.test(run.releaseDigest ?? ""));
  const uniqueSourceDigestCount = digestCount(passedRuns, "sourceDigest");
  const uniqueOutputDigestCount = digestCount(passedRuns, "outputDigest");
  const uniqueReleaseDigestCount = digestCount(passedRuns, "releaseDigest");
  const failedRunCount = runs.length - passedRuns.length;
  const passed = runs.length === requiredRunCount
    && passedRuns.length === requiredRunCount
    && failedRunCount === 0
    && uniqueSourceDigestCount === 1
    && uniqueOutputDigestCount === 1
    && uniqueReleaseDigestCount === 1;
  return {
    passed,
    requiredRunCount,
    executedRunCount: runs.length,
    passedRunCount: passedRuns.length,
    failedRunCount,
    flakeCount: passed ? 0 : new Set(runs.map((run) => `${run.exitCode}:${run.releaseDigest ?? "missing"}`)).size > 1 ? 1 : 0,
    uniqueSourceDigestCount,
    uniqueOutputDigestCount,
    uniqueReleaseDigestCount,
  };
}

export function sealRepeatedDeterminismEvidence(core) {
  return { ...core, receiptSha256: sha256Determinism(canonical(core)) };
}
