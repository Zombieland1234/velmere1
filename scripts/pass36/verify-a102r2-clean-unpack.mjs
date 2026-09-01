#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  REV,
  collect,
  payload,
} from "./a102r2-source-boundary.mjs";

const root = process.cwd();
const receiptIndex = process.argv.indexOf("--receipt-dir");
const receiptRoot = receiptIndex >= 0
  ? path.resolve(process.argv[receiptIndex + 1] ?? "")
  : null;
if (!receiptRoot) throw new Error("a102r2_receipt_dir_required");
if (receiptRoot === root || receiptRoot.startsWith(`${root}${path.sep}`)) {
  throw new Error("a102r2_receipt_dir_must_be_external");
}
fs.mkdirSync(receiptRoot, { recursive: true });

const npmCli = path.resolve(
  process.env.VELMERE_EXACT_NPM_CLI ?? "",
);
const npmCache = path.resolve(
  process.env.VELMERE_EXACT_NPM_CACHE ?? "",
);
if (!fs.statSync(npmCli, { throwIfNoEntry: false })?.isFile()) {
  throw new Error("a102r2_exact_npm_cli_required");
}
if (!fs.statSync(npmCache, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error("a102r2_external_npm_cache_required");
}
if (
  npmCache === root
  || npmCache.startsWith(`${root}${path.sep}`)
) {
  throw new Error("a102r2_npm_cache_inside_source");
}

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const safeId = (value) => value.replace(/[^a-z0-9_.-]+/giu, "_");
const archiveManifestPath = path.join(
  root,
  "_velmere/PASS36_A102R2_SOURCE_ONLY_MANIFEST.json",
);
const runtimeState = JSON.parse(
  fs.readFileSync(
    path.join(root, "config/pass36/a102r2-action-required-current-state.json"),
    "utf8",
  ),
);
const runtimeTruth = {
  nodeVersion: process.version.replace(/^v/u, ""),
  nodeExecutableSha256: sha256(fs.readFileSync(process.execPath)),
  npmCliSha256: sha256(fs.readFileSync(npmCli)),
};
const exactRuntime =
  runtimeTruth.nodeVersion === runtimeState.runtimeTruth.observedNodeVersion
  && runtimeTruth.nodeExecutableSha256
    === runtimeState.runtimeTruth.observedNodeBinarySha256
  && runtimeTruth.npmCliSha256
    === runtimeState.runtimeTruth.observedNpmCliSha256;
if (!exactRuntime) {
  throw new Error(`a102r2_exact_runtime_mismatch:${JSON.stringify(runtimeTruth)}`);
}

function snapshotDeclaredArchivePayload() {
  const manifestBytes = fs.readFileSync(archiveManifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  const observed = [];
  for (const entry of entries) {
    if (
      typeof entry?.path !== "string"
      || entry.path.startsWith("/")
      || entry.path.includes("\\")
      || entry.path.split("/").some((segment) =>
        segment === "" || segment === "." || segment === "..")
    ) {
      throw new Error(`a102r2_archive_manifest_path_unsafe:${entry?.path}`);
    }
    const absolute = path.resolve(root, ...entry.path.split("/"));
    if (!absolute.startsWith(`${root}${path.sep}`)) {
      throw new Error(`a102r2_archive_manifest_path_escape:${entry.path}`);
    }
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`a102r2_archive_manifest_non_regular:${entry.path}`);
    }
    const bytes = fs.readFileSync(absolute);
    observed.push({
      path: entry.path,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      mode: stat.mode & 0o111 ? 0o100755 : 0o100644,
    });
  }
  return {
    archiveManifestSha256: sha256(manifestBytes),
    fileCount: observed.length,
    byteLength: observed.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(observed.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(
      observed.map((row) =>
        `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n"),
    ),
  };
}

function parseLastJson(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {
    const decoderStarts = [];
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === "{") decoderStarts.push(index);
    }
    for (const index of decoderStarts.reverse()) {
      try {
        return JSON.parse(text.slice(index));
      } catch {
        // Continue until the final complete JSON object is found.
      }
    }
    return null;
  }
}

const baseEnv = {
  PATH: [
    path.dirname(process.execPath),
    path.dirname(npmCli),
    "/usr/bin",
    "/bin",
  ].join(path.delimiter),
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  TZ: "UTC",
  CI: "1",
  NO_COLOR: "1",
  NODE_ENV: "test",
  VELMERE_A102R2_CLEAN_UNPACK: "1",
  VELMERE_A95_NO_WRITE: "1",
};

const steps = [
  {
    id: "a58_release_integrity_literal_first_child",
    command: [process.execPath, "scripts/pass36/verify-a58-release-integrity.mjs"],
    expected: "PASS_RELEASE_INTEGRITY_NO_PROMOTION",
    a58: true,
    timeout: 900_000,
  },
  {
    id: "npm_ci_exact_runtime_online_allowed",
    command: [
      process.execPath,
      npmCli,
      "ci",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--prefer-offline",
      "--cache",
      npmCache,
    ],
    timeout: 1_200_000,
  },
  {
    id: "a102r2_authority_descendant",
    command: [
      process.execPath,
      "scripts/pass36/verify-a102r2-action-required-authority.mjs",
    ],
    expected:
      "PASS_A102R2_ACTION_REQUIRED_AUTHORITY_NO_REAL_OR_STAGING_CREDIT",
    timeout: 900_000,
  },
  {
    id: "a88r2_actual_handler_behavioral_mutations",
    command: [
      process.execPath,
      "--import",
      "./scripts/pass11/register-offline-ts-loader.mjs",
      "scripts/pass36/test-a88r2-behavioral-handler-mutations.ts",
    ],
    expected:
      "PASS_A88R2_LOCAL_ACTUAL_HANDLER_RESIGNED_SEMANTIC_MUTATIONS_NO_PROMOTION",
    env: {
      VELMERE_A88R2_OUTPUT_DIR: path.join(receiptRoot, "a88r2"),
    },
    timeout: 1_200_000,
  },
  {
    id: "a88r2_receipt_reproducibility",
    command: [
      process.execPath,
      "--import",
      "./scripts/pass11/register-offline-ts-loader.mjs",
      "scripts/pass36/verify-a88r2-materials-receipt.ts",
    ],
    expected:
      "PASS_A88R2_MATERIALS_RECEIPT_LOCAL_REPRODUCIBILITY_NO_AUTHENTICITY_CREDIT",
    env: {
      VELMERE_A88R2_OUTPUT_DIR: path.join(receiptRoot, "a88r2"),
    },
    timeout: 600_000,
  },
  {
    id: "current_root_30_of_30",
    command: [
      process.execPath,
      "scripts/pass6/run-critical-offline-gate.mjs",
      "--lineage-mode",
      "current-root",
    ],
    expected: "PASS_CODE_ONLY_ACTION_REQUIRED_CHECKPOINT",
    timeout: 1_800_000,
  },
  {
    id: "lint_zero_errors_zero_warnings",
    command: [process.execPath, npmCli, "run", "lint"],
    timeout: 1_800_000,
  },
  {
    id: "typescript_zero_diagnostics",
    command: [process.execPath, npmCli, "run", "typecheck:direct"],
    timeout: 1_800_000,
  },
  {
    id: "production_smoke_behavior_and_output_preflight",
    command: [
      process.execPath,
      npmCli,
      "run",
      "test:production-smoke-contract",
    ],
    timeout: 600_000,
  },
  {
    id: "webpack_build",
    command: [process.execPath, npmCli, "run", "build:webpack"],
    timeout: 2_400_000,
  },
  {
    id: "webpack_production_next_start_smoke",
    command: [
      process.execPath,
      npmCli,
      "run",
      "smoke:production:webpack",
    ],
    timeout: 1_200_000,
  },
  {
    id: "turbopack_build",
    command: [process.execPath, npmCli, "run", "build:turbopack"],
    timeout: 2_400_000,
  },
  {
    id: "turbopack_production_next_start_smoke",
    command: [
      process.execPath,
      npmCli,
      "run",
      "smoke:production:turbopack",
    ],
    timeout: 1_200_000,
  },
  {
    id: "route_ast_exact_project_typescript_reparse",
    command: [
      process.execPath,
      "scripts/pass15/verify-route-export-ast-registry.mjs",
      "--reparse",
      "--output",
      path.join(receiptRoot, "route-ast-exact-reparse.json"),
    ],
    expected:
      "PASS_ROUTE_EXPORT_AST_REGISTRY_EXACT_REPARSE",
    timeout: 600_000,
  },
  {
    id: "route_dispatch_full_denominator",
    command: [
      process.execPath,
      "scripts/pass15/verify-route-dispatch-consolidation.mjs",
      "--output",
      path.join(receiptRoot, "route-dispatch-verification.json"),
    ],
    timeout: 900_000,
  },
  {
    id: "route_dispatch_manifest_tamper_rejection",
    command: [
      process.execPath,
      "scripts/pass15/test-route-dispatch-manifest-tamper.mjs",
    ],
    expected: "PASS",
    timeout: 600_000,
  },
  {
    id: "product_tier_contract",
    command: [
      process.execPath,
      "scripts/pass35/test-product-tier-content-contract.mjs",
    ],
    timeout: 900_000,
  },
  {
    id: "retained_pdf_summary",
    command: [
      process.execPath,
      "scripts/pass36/verify-a94r2-retained-pdf-summary.mjs",
    ],
    expected:
      "PASS_A94R2_RETAINED_PDF_SUMMARY_SYNTHETIC_ONLY_NO_SALE_CREDIT",
    timeout: 600_000,
  },
  {
    id: "source_integrity_audit",
    command: [
      process.execPath,
      "scripts/a44-source-integrity-audit.mjs",
    ],
    timeout: 1_200_000,
  },
];

function runStep(step, index) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const executed = spawnSync(step.command[0], step.command.slice(1), {
    cwd: root,
    env: { ...baseEnv, ...(step.env ?? {}) },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: step.timeout,
    killSignal: "SIGKILL",
  });
  const stdout = executed.stdout ?? "";
  const stderr = executed.stderr ?? "";
  const stdoutName = `${String(index).padStart(2, "0")}-${safeId(step.id)}.stdout.log`;
  const stderrName = `${String(index).padStart(2, "0")}-${safeId(step.id)}.stderr.log`;
  fs.writeFileSync(path.join(receiptRoot, stdoutName), stdout);
  fs.writeFileSync(path.join(receiptRoot, stderrName), stderr);
  const parsed = parseLastJson(stdout);
  const parsedStatus = parsed?.status ?? parsed?.decision ?? null;
  let passed =
    executed.status === 0
    && !executed.error
    && executed.signal === null;
  if (step.expected) passed &&= parsedStatus === step.expected;
  if (step.a58) {
    passed &&=
      parsed?.summary?.blockingFailed === 0
      && parsed?.promotionAllowed === false
      && parsed?.saleEnabled === false
      && parsed?.liveProven === false;
  }
  if (step.id === "current_root_30_of_30") {
    passed &&=
      parsed?.suiteCount === 30
      && parsed?.passedSuiteCount === 30
      && parsed?.failedSuiteCount === 0
      && parsed?.sourceImmutable === true;
  }
  return {
    index,
    id: step.id,
    command: step.command,
    startedAt,
    durationMs: Date.now() - started,
    timeoutMs: step.timeout,
    exitCode: executed.status,
    signal: executed.signal,
    spawnError: executed.error?.message ?? null,
    parsedStatus,
    stdoutBytes: Buffer.byteLength(stdout),
    stdoutSha256: sha256(stdout),
    stdoutLog: stdoutName,
    stderrBytes: Buffer.byteLength(stderr),
    stderrSha256: sha256(stderr),
    stderrLog: stderrName,
    passed,
  };
}

const beforeInventory = collect(root);
if (beforeInventory.rejected.length) {
  throw new Error(
    `a102r2_clean_unpack_rejected_before:${JSON.stringify(beforeInventory.rejected)}`,
  );
}
const before = payload(beforeInventory.rows);
const declaredBefore = snapshotDeclaredArchivePayload();
const results = [];
for (const [offset, step] of steps.entries()) {
  const result = runStep(step, offset + 1);
  results.push(result);
  if (!result.passed) break;
}
const afterInventory = collect(root);
const after = payload(afterInventory.rows);
const declaredAfter = snapshotDeclaredArchivePayload();
const sourceImmutable =
  afterInventory.rejected.length === 0
  && JSON.stringify(before) === JSON.stringify(after)
  && JSON.stringify(declaredBefore) === JSON.stringify(declaredAfter);
const allStepsPassed =
  results.length === steps.length
  && results.every((row) => row.passed);
const a58LiteralFirstChild =
  results[0]?.id === "a58_release_integrity_literal_first_child";
const passed =
  exactRuntime
  && sourceImmutable
  && allStepsPassed
  && a58LiteralFirstChild;
const receipt = {
  schemaVersion: "velmere.pass36.a102r2.clean-unpack-verification.v1",
  revisionId: REV,
  status: passed
    ? "ACTION_REQUIRED_A102R2_CLEAN_UNPACK_LOCAL_CONTRACT_NO_EXACT_BROWSER_OR_REAL_CREDIT"
    : "FAIL_A102R2_CLEAN_UNPACK_LOCAL_CONTRACT",
  localContractPassed: passed,
  a58LiteralFirstChild,
  dependencyInstallNetworkMode: "ONLINE_ALLOWED_PREFER_OFFLINE",
  exactRuntime,
  runtimeTruth,
  sourceBefore: before,
  sourceAfter: after,
  declaredArchivePayloadBefore: declaredBefore,
  declaredArchivePayloadAfter: declaredAfter,
  sourceImmutable,
  requiredSteps: steps.length,
  executedSteps: results.length,
  passedSteps: results.filter((row) => row.passed).length,
  failedSteps: results.filter((row) => !row.passed).map((row) => row.id),
  steps: results,
  notExecutedOrNotCredited: [
    ["official_node_npm_archive_provenance", "NOT_PROVEN"],
    ["historical_827_dependency_denominator", "0_OF_827_POLICY_CREDIT_CURRENT_LOCKFILE_654_OF_654"],
    ["exact_playwright_chromium_148_0_7778_96_revision_1223", "NOT_AVAILABLE"],
    ["exact_browser_rows", "0_OF_54_CREDIT"],
    ["a77r1_a80r1_exact_release", "0_OF_4_CREDIT"],
    ["real_a102_observation_windows", "0_OF_3_OVER_AT_LEAST_72_HOURS"],
    ["real_staging", "0_OF_10"],
    ["real_data_rights_legal_customer_assurance", "BLOCKED_EXTERNAL"],
  ].map(([gate, status]) => ({ gate, status })),
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
fs.writeFileSync(
  path.join(receiptRoot, "PASS36_A102R2_CLEAN_UNPACK_RECEIPT.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (!passed) process.exitCode = 1;
