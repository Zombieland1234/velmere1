import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import { evaluateLegacyCompilerCase } from "../../lib/security/solidity-compiler-legacy-evaluation.mjs";
import {
  buildR44P43HoldoutSummary,
  R44P43_SUPPORTED_RULES_BY_CATEGORY,
} from "../../lib/security/r44p43-public-balanced-holdout-evidence.mjs";

process.setMaxListeners(1000);
const require = createRequire(import.meta.url);
const REVISION = "VELMERE_PASS36_A102R44P43_ACTION_REQUIRED_PUBLIC_BALANCED_HOLDOUT_LEGACY_COMPILER_AST_AND_CONTROL_ALERT_RATE_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P41_ACTION_REQUIRED_OFFICIAL_FOUNDRY_INVARIANTS_ANVIL_RAW_RPC_EXACT_OFFLINE_FULL_LINUX_RELEASE_NO_LIVE_CREDIT";
const FIXED_TIME = "2026-08-10T00:00:00.000Z";

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`); }
function fileRow(root, filePath, kind, caseId) {
  const bytes = fs.readFileSync(filePath);
  return { kind, caseId, path: path.relative(root, filePath).replaceAll(path.sep, "/"), byteLength: bytes.length, sha256: sha256(bytes) };
}
function parseArgs(argv) {
  const map = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`unexpected_argument:${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing_argument_value:${key}`);
    map.set(key.slice(2), value); i += 1;
  }
  const required = ["smartbugs-root", "solc-multi-root", "openzeppelin-root", "solc-0-8-24-root", "output"];
  for (const key of required) if (!map.has(key)) throw new Error(`missing_argument:${key}`);
  return Object.fromEntries(map);
}
function compilerVersionFor(row) {
  return String(row?.versionMetadata?.["compiled version"] ?? row?.vulnerabilityMetadata?.pragma ?? "").trim();
}
function categoryFor(row) {
  return String(row?.annotations?.[0] ?? row?.vulnerabilityMetadata?.vulnerabilities?.[0]?.category ?? "UNKNOWN").toUpperCase();
}
function unavailablePositiveCase({ row, category, compilerVersion, sourceBytes, sourceSha256 }) {
  const supportedCategory = Object.hasOwn(R44P43_SUPPORTED_RULES_BY_CATEGORY, category);
  const core = {
    schemaVersion: "velmere.pass36.r44p43.legacy-compiler-evaluation.v1",
    profile: "EXACT_SOLC_JS_STANDARD_JSON_COMPACT_AST",
    caseId: `SMARTBUGS_${String(row.sourcePath).replace(/[^A-Za-z0-9]+/gu, "_").replace(/^_|_$/gu, "").toUpperCase()}`,
    category,
    expectedVersion: compilerVersion,
    compilerVersion: null,
    compilerApi: "UNAVAILABLE",
    resultStatus: supportedCategory ? "WITHHELD_COMPILER_UNAVAILABLE" : "UNSUPPORTED_DETECTOR_FAMILY",
    supportedCategory,
    expectedRuleIds: supportedCategory ? [...R44P43_SUPPORTED_RULES_BY_CATEGORY[category]] : [],
    observedRuleIds: [],
    matchedRuleIds: [],
    sourceMetadata: { sourcePath: row.sourcePath, byteLength: sourceBytes.length, sha256: sourceSha256 },
    compilation: { status: "WITHHELD_COMPILER_UNAVAILABLE", blockers: [`exact_compiler_unavailable:${compilerVersion}`] },
    findingCount: 0,
    findings: [],
    creditBoundary: {
      publicPinnedCorpusCredit: true,
      legacyCompilerAstCredit: false,
      supportedCategoryRecallEligible: false,
      independentGroundTruthCredit: false,
      formalPrecisionCredit: false,
      formalFalsePositiveRateCredit: false,
      severityAccuracyCredit: false,
      realProtocolCredit: false,
      customerCredit: false,
      saleCredit: false,
      liveCredit: false,
      worldClassCredit: false,
    },
    limitations: ["The exact compiler version required by the pinned corpus case is absent, so the result is withheld rather than interpreted as safe."],
  };
  return { ...core, evidenceSha256: sha256(stable(core)) };
}
function importPaths(source) {
  const rows = [];
  const pattern = /\bimport\s+(?:(?:[^;"']+?)\s+from\s+)?["']([^"']+)["']\s*;/gu;
  for (const match of source.matchAll(pattern)) rows.push(match[1]);
  return rows;
}
function collectDependencyClosure(packageRoot, rootPath) {
  const queue = [rootPath];
  const seen = new Set();
  const rows = [];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    const absolute = path.resolve(packageRoot, current);
    const rootResolved = `${path.resolve(packageRoot)}${path.sep}`;
    if (!absolute.startsWith(rootResolved) || !fs.statSync(absolute).isFile()) throw new Error(`control_source_invalid:${current}`);
    const content = fs.readFileSync(absolute, "utf8").replace(/\r\n?/gu, "\n");
    rows.push({ path: current, content });
    for (const imported of importPaths(content)) {
      if (!imported.startsWith(".")) throw new Error(`control_nonrelative_import:${current}:${imported}`);
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(current), imported));
      if (resolved.startsWith("../") || resolved === "..") throw new Error(`control_import_escape:${current}:${imported}`);
      queue.push(resolved);
    }
  }
  return rows.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
}
function loadSolc(root) {
  return require(path.join(root, "node_modules", "solc"));
}

const args = parseArgs(process.argv);
const outputRoot = path.resolve(args.output);
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(outputRoot, "positive-cases"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "control-cases"), { recursive: true });

const smartbugsManifest = readJson(path.join(args["smartbugs-root"], "SMARTBUGS_69_MANIFEST.json"));
const controlManifest = readJson(path.join(args["openzeppelin-root"], "R44P43_OPENZEPPELIN_CONTROL_MANIFEST.json"));
if (smartbugsManifest.cases !== 69) throw new Error(`smartbugs_case_count_invalid:${smartbugsManifest.cases}`);
if (controlManifest.cases !== 29) throw new Error(`control_case_count_invalid:${controlManifest.cases}`);
const smartbugsSourcesRoot = path.join(args["smartbugs-root"], "sources");
const compilerCache = new Map();
const positiveCases = [];
for (const row of smartbugsManifest.rows) {
  const category = categoryFor(row);
  const compilerVersion = compilerVersionFor(row);
  const sourcePath = String(row.sourcePath);
  const absoluteSource = path.join(smartbugsSourcesRoot, sourcePath);
  const sourceBytes = fs.readFileSync(absoluteSource);
  if (sha256(sourceBytes) !== row.sha256) throw new Error(`smartbugs_source_hash_mismatch:${sourcePath}`);
  const source = sourceBytes.toString("utf8").replace(/\r\n?/gu, "\n");
  const caseId = `SMARTBUGS_${sourcePath.replace(/[^A-Za-z0-9]+/gu, "_").replace(/^_|_$/gu, "").toUpperCase()}`;
  const compilerRoot = path.join(args["solc-multi-root"], "compilers", compilerVersion);
  let evidence;
  if (!compilerVersion || !fs.existsSync(compilerRoot)) {
    evidence = unavailablePositiveCase({ row, category, compilerVersion: compilerVersion || "UNKNOWN", sourceBytes, sourceSha256: row.sha256 });
    evidence.caseId = caseId;
    evidence.evidenceSha256 = sha256(stable(Object.fromEntries(Object.entries(evidence).filter(([key]) => key !== "evidenceSha256"))));
  } else {
    let solc = compilerCache.get(compilerVersion);
    if (!solc) { solc = loadSolc(compilerRoot); compilerCache.set(compilerVersion, solc); }
    evidence = evaluateLegacyCompilerCase({
      solc,
      sourceFiles: [{ path: sourcePath, content: source }],
      expectedVersion: compilerVersion,
      caseId,
      category,
      expectedRuleIds: R44P43_SUPPORTED_RULES_BY_CATEGORY[category] ?? [],
      observedAt: FIXED_TIME,
    });
    evidence.sourceMetadata = { sourcePath, byteLength: sourceBytes.length, sha256: row.sha256 };
    evidence.publicLabelMetadata = {
      annotations: row.annotations,
      vulnerabilityMetadata: row.vulnerabilityMetadata,
      versionMetadata: row.versionMetadata,
    };
    const { evidenceSha256: _old, ...withoutHash } = evidence;
    evidence.evidenceSha256 = sha256(stable(withoutHash));
  }
  const filePath = path.join(outputRoot, "positive-cases", `${caseId}.json`);
  writeJson(filePath, evidence);
  positiveCases.push(evidence);
}

const modernSolc = loadSolc(args["solc-0-8-24-root"]);
if (!String(modernSolc.version()).startsWith("0.8.24+commit.e11b9ed9")) throw new Error(`modern_solc_version_invalid:${modernSolc.version()}`);
const controlPackageRoot = path.join(args["openzeppelin-root"], "package");
const controlCases = [];
for (const row of controlManifest.roots) {
  const sourceFiles = collectDependencyClosure(controlPackageRoot, row.rootPath);
  let evidence;
  try {
    const ast = analyzeSolidityCompilerAst({
      solc: modernSolc,
      sourceFiles,
      observedAt: FIXED_TIME,
      settings: { optimizerEnabled: false, optimizerRuns: 200, evmVersion: "paris", metadataBytecodeHash: "none" },
    });
    const rootFindings = ast.findings.filter((finding) => finding.sourcePath === row.rootPath);
    const rootRuleIds = [...new Set(rootFindings.map((finding) => finding.ruleId))].sort();
    const bundleRuleIds = [...new Set(ast.findings.map((finding) => finding.ruleId))].sort();
    const core = {
      schemaVersion: "velmere.pass36.a102r44p43.public-control-candidate.v1",
      caseId: row.caseId,
      rootPath: row.rootPath,
      rootSourceSha256: row.sha256,
      package: controlManifest.package,
      version: controlManifest.version,
      selectionFrozenBeforeAnalyzerExecution: true,
      labelClass: row.labelClass,
      compilationStatus: ast.compilation.status,
      compilerVersion: ast.compiler.version,
      sourceFiles: sourceFiles.length,
      sourceBundleSha256: ast.inputIdentity.sourceBundleSha256,
      rootRuleIds,
      bundleRuleIds,
      rootFindingCount: rootFindings.length,
      bundleFindingCount: ast.findings.length,
      rootFindings,
      bundleFindings: ast.findings,
      compilerEvidenceSha256: ast.evidenceSha256,
      creditBoundary: {
        publicControlCandidateCredit: true,
        independentTrueNegativeCredit: false,
        formalFalsePositiveRateCredit: false,
        formalPrecisionCredit: false,
        customerCredit: false,
        saleCredit: false,
        liveCredit: false,
        worldClassCredit: false,
      },
      limitations: [
        "The selected OpenZeppelin root is a public control candidate, not an independently adjudicated true negative.",
        "Any alert is diagnostic and requires manual review; absence of an alert is not a safety claim.",
      ],
    };
    evidence = { ...core, evidenceSha256: sha256(stable(core)) };
  } catch (error) {
    const core = {
      schemaVersion: "velmere.pass36.a102r44p43.public-control-candidate.v1",
      caseId: row.caseId,
      rootPath: row.rootPath,
      rootSourceSha256: row.sha256,
      package: controlManifest.package,
      version: controlManifest.version,
      selectionFrozenBeforeAnalyzerExecution: true,
      labelClass: row.labelClass,
      compilationStatus: "WITHHELD_HARNESS_OR_COMPILATION_ERROR",
      compilerVersion: String(modernSolc.version()),
      sourceFiles: sourceFiles.length,
      sourceBundleSha256: sha256(stable(sourceFiles)),
      rootRuleIds: [],
      bundleRuleIds: [],
      rootFindingCount: 0,
      bundleFindingCount: 0,
      error: String(error?.stack ?? error),
      creditBoundary: {
        publicControlCandidateCredit: true,
        independentTrueNegativeCredit: false,
        formalFalsePositiveRateCredit: false,
        formalPrecisionCredit: false,
        customerCredit: false,
        saleCredit: false,
        liveCredit: false,
        worldClassCredit: false,
      },
    };
    evidence = { ...core, evidenceSha256: sha256(stable(core)) };
  }
  const filePath = path.join(outputRoot, "control-cases", `${row.caseId}.json`);
  writeJson(filePath, evidence);
  controlCases.push(evidence);
}

const caseIndex = [];
for (const evidence of positiveCases) {
  const filePath = path.join(outputRoot, "positive-cases", `${evidence.caseId}.json`);
  caseIndex.push(fileRow(outputRoot, filePath, "PUBLIC_VULNERABLE_CASE", evidence.caseId));
}
for (const evidence of controlCases) {
  const filePath = path.join(outputRoot, "control-cases", `${evidence.caseId}.json`);
  caseIndex.push(fileRow(outputRoot, filePath, "PUBLIC_CONTROL_CANDIDATE", evidence.caseId));
}
caseIndex.sort((left, right) => Buffer.from(`${left.kind}|${left.caseId}`).compare(Buffer.from(`${right.kind}|${right.caseId}`)));
const summary = buildR44P43HoldoutSummary({
  revisionId: REVISION,
  parentRevisionId: PARENT,
  smartbugsManifest,
  controlManifest,
  positiveCases,
  controlCases,
  caseIndex,
  observedAt: FIXED_TIME,
});
writeJson(path.join(outputRoot, "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json"), summary);
writeJson(path.join(outputRoot, "R44P43_CASE_INDEX.json"), { schemaVersion: "velmere.pass36.a102r44p43.case-index.v1", revisionId: REVISION, rows: caseIndex, aggregateSha256: sha256(stable(caseIndex)) });
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p43.run-receipt.v1",
  revisionId: REVISION,
  status: "PASS_R44P43_PUBLIC_BALANCED_HOLDOUT_DIAGNOSTIC_NO_FORMAL_FPR_OR_PRECISION",
  outputRoot: "CALLER_SUPPLIED_EXTERNAL_OUTPUT",
  positiveCases: positiveCases.length,
  controlCandidates: controlCases.length,
  summarySha256: summary.evidenceSha256,
  observedAt: FIXED_TIME,
  independentGroundTruthCredit: false,
  saleCredit: false,
  liveCredit: false,
  worldClassCredit: false,
};
writeJson(path.join(outputRoot, "R44P43_RUN_RECEIPT.json"), receipt);
console.log(JSON.stringify(receipt));
