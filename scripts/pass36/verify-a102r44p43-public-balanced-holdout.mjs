import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLegacyCompilerCase } from "../../lib/security/solidity-compiler-legacy-evaluation.mjs";
import { verifyR44P43HoldoutSummary } from "../../lib/security/r44p43-public-balanced-holdout-evidence.mjs";

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]; const value = argv[i + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) throw new Error(`invalid_argument:${key}`);
    out[key.slice(2)] = value; i += 1;
  }
  for (const key of ["evidence-root", "smartbugs-root", "openzeppelin-root"]) if (!out[key]) throw new Error(`missing_argument:${key}`);
  return out;
}
function verifyEvidenceHash(value) {
  const { evidenceSha256, ...core } = value;
  return evidenceSha256 === sha256(stable(core));
}

export function verifyEvidenceDirectory({ evidenceRoot, smartbugsRoot, openzeppelinRoot }) {
  const checks = [];
  const check = (id, ok, detail = undefined) => checks.push({ id, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) });
  const summary = readJson(path.join(evidenceRoot, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"));
  const index = readJson(path.join(evidenceRoot, "R44P43_CASE_INDEX.json"));
  const smartbugsManifest = readJson(path.join(smartbugsRoot, "SMARTBUGS_69_MANIFEST.json"));
  const controlManifest = readJson(path.join(openzeppelinRoot, "R44P43_OPENZEPPELIN_CONTROL_MANIFEST.json"));
  const positiveCases = [];
  const controlCases = [];
  for (const row of index.rows ?? []) {
    const filePath = path.resolve(evidenceRoot, row.path);
    check(`index-path:${row.caseId}`, filePath.startsWith(`${path.resolve(evidenceRoot)}${path.sep}`));
    check(`index-file:${row.caseId}`, fs.existsSync(filePath) && fs.statSync(filePath).isFile());
    if (!fs.existsSync(filePath)) continue;
    const bytes = fs.readFileSync(filePath);
    check(`index-bytes:${row.caseId}`, bytes.length === row.byteLength, { expected: row.byteLength, actual: bytes.length });
    check(`index-sha:${row.caseId}`, sha256(bytes) === row.sha256);
    const value = JSON.parse(bytes.toString("utf8"));
    check(`index-case-id-match:${row.caseId}`, value.caseId === row.caseId, { indexCaseId: row.caseId, evidenceCaseId: value.caseId });
    check(`evidence-sha:${row.caseId}`, verifyEvidenceHash(value));
    if (row.kind === "PUBLIC_VULNERABLE_CASE") {
      check(`legacy-shape:${row.caseId}`, verifyLegacyCompilerCase(value) || value.compilation?.status === "WITHHELD_COMPILER_UNAVAILABLE");
      positiveCases.push(value);
    } else if (row.kind === "PUBLIC_CONTROL_CANDIDATE") {
      check(`control-schema:${row.caseId}`, value.schemaVersion === "velmere.pass36.a102r44p43.public-control-candidate.v1");
      check(`control-no-formal-credit:${row.caseId}`, value.creditBoundary?.independentTrueNegativeCredit === false && value.creditBoundary?.formalFalsePositiveRateCredit === false);
      controlCases.push(value);
    } else check(`index-kind:${row.caseId}`, false, row.kind);
  }
  check("index-row-count", (index.rows ?? []).length === 98, (index.rows ?? []).length);
  check("unique-index-case-ids", new Set((index.rows ?? []).map((row) => row.caseId)).size === (index.rows ?? []).length);
  check("unique-index-paths", new Set((index.rows ?? []).map((row) => row.path)).size === (index.rows ?? []).length);
  check("positive-count", positiveCases.length === 69, positiveCases.length);
  check("control-count", controlCases.length === 29, controlCases.length);
  const smartByPath = new Map(smartbugsManifest.rows.map((row) => [row.sourcePath, row]));
  for (const row of positiveCases) {
    const sourcePath = row.sourceMetadata?.sourcePath;
    const manifestRow = smartByPath.get(sourcePath);
    check(`positive-source-manifest:${row.caseId}`, Boolean(manifestRow));
    if (manifestRow) check(`positive-source-hash:${row.caseId}`, row.sourceMetadata?.sha256 === manifestRow.sha256);
  }
  const controlById = new Map(controlManifest.roots.map((row) => [row.caseId, row]));
  for (const row of controlCases) {
    const manifestRow = controlById.get(row.caseId);
    check(`control-manifest:${row.caseId}`, Boolean(manifestRow));
    if (manifestRow) {
      check(`control-root-path:${row.caseId}`, row.rootPath === manifestRow.rootPath);
      check(`control-root-sha:${row.caseId}`, row.rootSourceSha256 === manifestRow.sha256);
    }
  }
  const summaryResult = verifyR44P43HoldoutSummary({ summary, positiveCases, controlCases, smartbugsManifest, controlManifest });
  for (const row of summaryResult.checks) check(`summary:${row.id}`, row.ok, row.detail);
  const failed = checks.filter((row) => !row.ok);
  return {
    schemaVersion: "velmere.pass36.a102r44p43.evidence-verification.v1",
    status: failed.length ? "FAIL_R44P43_PUBLIC_BALANCED_HOLDOUT_EVIDENCE" : "PASS_R44P43_PUBLIC_BALANCED_HOLDOUT_EVIDENCE",
    ok: failed.length === 0,
    checks,
    failed,
    positiveCases: positiveCases.length,
    controlCases: controlCases.length,
    summaryEvidenceSha256: summary.evidenceSha256,
    independentGroundTruthCredit: false,
    formalBalancedMetricCredit: false,
    saleCredit: false,
    liveCredit: false,
    worldClassCredit: false,
  };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv);
  const result = verifyEvidenceDirectory({ evidenceRoot: path.resolve(args["evidence-root"]), smartbugsRoot: path.resolve(args["smartbugs-root"]), openzeppelinRoot: path.resolve(args["openzeppelin-root"]) });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) { fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true }); fs.writeFileSync(path.resolve(args.output), text); }
  process.stdout.write(text);
  process.exit(result.ok ? 0 : 1);
}
