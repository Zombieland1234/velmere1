#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
  A94R1_MANIFEST_PATH,
  A94R1_PACKAGE_MANIFEST_PATH,
  A94R1_PARENT,
  A94R1_REVISION,
  buildA94R1Payload,
  canonicalJson,
  collectA94R1PackagedTreeRows,
  collectA94R1SourceRows,
  digestValid,
  inspectA94R1RuntimeNodeModules,
  readJson,
  sha256,
} from "./a94r1-source-boundary.mjs";

const root = path.resolve(process.cwd());
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const ACTION_REQUIRED_LOCAL_EXIT = 2;
const ACTION_REQUIRED_CLOSURE_EXIT = 3;
const TS_LOADER = "./scripts/pass11/register-offline-ts-loader.mjs";

const a58Step = {
  id: "a58_release_integrity_literal_first_step",
  command: process.execPath,
  args: ["scripts/pass36/verify-a58-release-integrity.mjs"],
  timeoutMs: 5 * 60 * 1000,
  expectedContract:
    "exit 0; a PASS-class status; zero blocking failures; promotion, LIVE and sale remain explicitly false",
  validateParsed(parsed) {
    const noPromotion =
      (parsed?.promotionAllowed === false ||
        parsed?.productionApproved === false) &&
      parsed?.promotionAllowed !== true &&
      parsed?.productionApproved !== true;
    const noLive =
      (parsed?.liveProven === false || parsed?.live === false) &&
      parsed?.liveProven !== true &&
      parsed?.live !== true;
    return (
      typeof parsed?.status === "string" &&
      parsed.status.startsWith("PASS") &&
      parsed.summary?.blockingFailed === 0 &&
      noPromotion &&
      noLive &&
      parsed.saleEnabled === false
    );
  },
};

const authorityStep = {
  id: "a94r1_authority_and_descendant_verifier",
  command: process.execPath,
  args: ["scripts/pass36/verify-a94r1-action-required-authority.mjs"],
  timeoutMs: 3 * 60 * 1000,
  expectedStatus:
    "PASS_A94R1_ACTION_REQUIRED_AUTHORITY_NO_PASS_CREDIT",
};

const safeLocalSteps = [
  {
    id: "a94r1_source_clean_boundary",
    command: process.execPath,
    args: ["scripts/pass36/test-a94r1-source-clean-boundary.mjs"],
    timeoutMs: 2 * 60 * 1000,
    expectedStatus: "PASS_LOCAL_BEHAVIOR",
    requiresNodeModules: false,
  },
  {
    id: "a78r3_sparse_nonpass_lineage_truth",
    command: process.execPath,
    args: ["scripts/pass36/test-historical-descendant-sparse-checkpoint.mjs"],
    timeoutMs: 2 * 60 * 1000,
    expectedStatus: "PASS",
    requiresNodeModules: false,
  },
  {
    id: "a78r3_critical_gate_checkpoint_truth",
    command: process.execPath,
    args: ["scripts/pass6/test-critical-offline-gate-checkpoint-truth.mjs"],
    timeoutMs: 2 * 60 * 1000,
    expectedStatus: "PASS",
    requiresNodeModules: false,
  },
  {
    id: "typecheck_no_emit",
    command: process.execPath,
    args: [
      "node_modules/typescript/bin/tsc",
      "--noEmit",
      "--incremental",
      "false",
      "--pretty",
      "false",
    ],
    timeoutMs: 12 * 60 * 1000,
  },
  {
    id: "a94_css_parser_corruption_and_tailwind",
    command: process.execPath,
    args: ["scripts/pass36/test-a94-css-parser-corruption-boundary.mjs"],
    timeoutMs: 4 * 60 * 1000,
    expectedStatus: "PASS_LOCAL_BEHAVIOR",
  },
  {
    id: "a90_api_edge_behavior",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a90-api-edge-boundary.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a90_provider_route_budgets",
    command: process.execPath,
    args: ["--import", TS_LOADER, "scripts/pass36/test-a90-provider-route-budgets.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a90_a92_runtime_boundaries",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a90-a92-runtime-boundaries.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a91_request_content_boundaries",
    command: process.execPath,
    args: ["--import", TS_LOADER, "scripts/pass36/test-a91-request-content-boundaries.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a91_contact_route_behavior",
    command: process.execPath,
    args: ["--import", TS_LOADER, "scripts/pass36/test-a91-contact-route-behavior.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a91_durable_file_boundary",
    command: process.execPath,
    args: ["scripts/pass36/test-a91-durable-file-boundary.mjs"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a91_raster_container_boundary",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a91-raster-container-boundary.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a91_product_image_boundary",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a91-product-image-boundary.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a93_sanitized_build_environment",
    command: process.execPath,
    args: ["scripts/deployment/test-sanitized-build-environment.mjs"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a93_segmented_build_integrity",
    command: process.execPath,
    args: ["scripts/deployment/test-segmented-build-integrity.mjs"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a94_production_smoke_network_contract",
    command: process.execPath,
    args: [
      "--import",
      TS_LOADER,
      "scripts/deployment/test-production-smoke-contract.mjs",
    ],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a94_analysis_client_boundary",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a94-analysis-client-boundary.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a94_focus_locale_metadata",
    command: process.execPath,
    args: [
      "--import",
      "tsx",
      "tests/accessibility/a94-focus-locale-metadata.test.ts",
    ],
    timeoutMs: 2 * 60 * 1000,
  },
  {
    id: "a94_denominator_truth_boundary",
    command: process.execPath,
    args: ["--import", TS_LOADER, "tests/security/a94-denominator-truth-boundary.test.ts"],
    timeoutMs: 2 * 60 * 1000,
  },
];

const explicitlyNotExecuted = [
  {
    gate: "npm_ci_exact_official_inputs",
    status: "NOT_EXECUTED_BY_CONTROLLER",
    reason:
      "Dependencies must be provisioned before this read-only verification run; exact official Node, npm, lockfile CAS and Chromium provenance remain A78R1 gates.",
  },
  {
    gate: "full_eslint",
    status: "NOT_REEXECUTED_BY_CLEAN_CONTROLLER",
    reason:
      "The final full-denominator lint run belongs to the hash-bound external MATERIALS receipt; this bounded clean controller does not reexecute it or grant exact-release credit.",
  },
  {
    gate: "webpack_and_turbopack_production_builds",
    status: "NOT_REEXECUTED_BY_CLEAN_CONTROLLER",
    reason:
      "Both local build modes belong to the hash-bound external MATERIALS receipt; they are not exact A79R1 evidence and are not reexecuted by this controller.",
  },
  {
    gate: "production_next_start_and_runtime_smoke",
    status: "NOT_REEXECUTED_BY_CLEAN_CONTROLLER",
    reason:
      "The local production runtime smokes belong to the hash-bound external MATERIALS receipt; no production server is started by this bounded clean controller.",
  },
  {
    gate: "playwright_browser_pl_en_de_desktop_mobile",
    status: "NOT_EXECUTED",
    reason:
      "No exact Playwright Chromium input or browser session is invoked.",
  },
  {
    gate: "current_root_30_of_30_on_final_bytes",
    status: "NOT_REEXECUTED_BY_CLEAN_CONTROLLER",
    reason:
      "The local 30/30 execution belongs to the hash-bound external MATERIALS receipt; this sparse ACTION_REQUIRED checkpoint still does not claim exact release closure.",
  },
  {
    gate: "a77r1_to_a80r1_exact_release_closure",
    status: "NOT_EXECUTED",
    reason:
      "Exact official toolchain, build, browser and frozen-candidate evidence is absent.",
  },
  {
    gate: "staging_real_data_provider_rights_legal_customer_assurance",
    status: "BLOCKED_EXTERNAL",
    reason:
      "No external account, provider-rights, signed legal, customer-cohort or independent-assurance evidence is created by local tests.",
  },
];

function safeChildEnvironment() {
  const environment = {
    CI: "1",
    NO_COLOR: "1",
    NODE_ENV: "test",
    TZ: "UTC",
    VELMERE_A94R1_CLEAN_UNPACK: "1",
  };
  for (const name of [
    "PATH",
    "LANG",
    "LC_ALL",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SystemRoot",
    "ComSpec",
    "PATHEXT",
  ]) {
    if (typeof process.env[name] === "string") {
      environment[name] = process.env[name];
    }
  }
  return environment;
}

function terminateProcessTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32") {
      process.kill(-child.pid, "SIGKILL");
    } else {
      child.kill("SIGKILL");
    }
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The process already exited.
    }
  }
}

function parseJsonObject(text) {
  try {
    const value = JSON.parse(text.trim());
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

function executeChild(step) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const started = process.hrtime.bigint();
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let overflowStream = null;
    let timedOut = false;
    let settled = false;
    let timer = null;

    const child = spawn(step.command, step.args, {
      cwd: root,
      detached: process.platform !== "win32",
      env: safeChildEnvironment(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const consume = (target, chunk) => {
      const byteLength = chunk.length;
      if (target === "stdout") stdoutBytes += byteLength;
      else stderrBytes += byteLength;
      if (
        stdoutBytes > MAX_OUTPUT_BYTES ||
        stderrBytes > MAX_OUTPUT_BYTES
      ) {
        overflowStream = target;
        terminateProcessTree(child);
        return;
      }
      (target === "stdout" ? stdout : stderr).push(chunk);
    };

    const finish = (exitCode, signal, spawnError = null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const stdoutText = Buffer.concat(stdout).toString("utf8");
      const stderrText = Buffer.concat(stderr).toString("utf8");
      const parsed = parseJsonObject(stdoutText);
      const basePassed =
        exitCode === 0 &&
        signal === null &&
        spawnError === null &&
        !timedOut &&
        overflowStream === null;
      const passed =
        basePassed &&
        (!step.expectedStatus ||
          parsed?.status === step.expectedStatus) &&
        (!step.validateParsed || step.validateParsed(parsed));
      resolve({
        id: step.id,
        command: path.basename(step.command),
        args: step.args,
        startedAt,
        elapsedMs: Number(
          (process.hrtime.bigint() - started) / 1_000_000n,
        ),
        exitCode,
        signal,
        timedOut,
        overflowStream,
        spawnError: spawnError?.message ?? null,
        stdoutBytes,
        stderrBytes,
        stdoutSha256: sha256(stdoutText),
        stderrSha256: sha256(stderrText),
        parsedStatus: parsed?.status ?? null,
        expectedStatus: step.expectedStatus ?? null,
        expectedContract: step.expectedContract ?? null,
        passed,
        stdoutText,
        stderrText,
      });
    };

    child.stdout?.on("data", (chunk) => consume("stdout", chunk));
    child.stderr?.on("data", (chunk) => consume("stderr", chunk));
    child.once("error", (error) => finish(null, null, error));
    child.once("close", (code, signal) =>
      finish(code, signal, null),
    );
    timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
    }, step.timeoutMs);
    timer.unref?.();
  });
}

function parseReceiptDirectoryArgument() {
  const args = process.argv.slice(2);
  if (
    args.length !== 2 ||
    args[0] !== "--receipt-dir" ||
    !path.isAbsolute(args[1])
  ) {
    throw new Error(
      "usage: verify-a94r1-clean-unpack.mjs --receipt-dir /absolute/path/outside/source",
    );
  }
  const requested = path.resolve(args[1]);
  const metadata = lstatSync(requested);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("a94r1_receipt_root_must_be_real_directory");
  }
  const receiptRoot = realpathSync(requested);
  const relative = path.relative(root, receiptRoot);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  ) {
    throw new Error(
      "a94r1_receipt_root_must_be_outside_source_root",
    );
  }
  const runDirectory = mkdtempSync(
    path.join(receiptRoot, "a94r1-clean-unpack-"),
  );
  chmodSync(runDirectory, 0o700);
  return { receiptRoot, runDirectory };
}

function writeExclusive(relativePath, content, runDirectory) {
  const absolute = path.join(runDirectory, relativePath);
  writeFileSync(absolute, content, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return {
    path: relativePath,
    byteLength: Buffer.byteLength(content),
    sha256: sha256(content),
  };
}

function persistStepLogs(result, runDirectory) {
  const stdoutFile = writeExclusive(
    `${result.id}.stdout.log`,
    result.stdoutText,
    runDirectory,
  );
  const stderrFile = writeExclusive(
    `${result.id}.stderr.log`,
    result.stderrText,
    runDirectory,
  );
  const { stdoutText, stderrText, ...publicResult } = result;
  return {
    ...publicResult,
    logs: { stdout: stdoutFile, stderr: stderrFile },
  };
}

function sourceFingerprint() {
  const inventory = collectA94R1SourceRows(root);
  return {
    payload: buildA94R1Payload(inventory.rows),
    rejected: inventory.rejected,
  };
}

function packagedTreeFingerprint() {
  const inventory = collectA94R1PackagedTreeRows(root);
  const criticalPaths = new Set([
    A94R1_MANIFEST_PATH,
    A94R1_PACKAGE_MANIFEST_PATH,
    A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
  ]);
  return {
    payload: inventory.payload,
    criticalFiles: inventory.rows.filter((row) =>
      criticalPaths.has(row.path),
    ),
    rejected: inventory.rejected,
    forbidden: inventory.forbidden,
    requiredMissing: inventory.requiredMissing,
  };
}

function inlineResult(id, checks, detail) {
  const failures = checks.filter((row) => !row.passed);
  const stdoutText = `${JSON.stringify(
    {
      status: failures.length
        ? `FAIL_${id.toUpperCase()}`
        : `PASS_${id.toUpperCase()}_NO_PROMOTION`,
      checks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      failures,
      detail,
    },
    null,
    2,
  )}\n`;
  return {
    id,
    command: "IN_PROCESS_READ_ONLY_CHECK",
    args: [],
    startedAt: null,
    elapsedMs: 0,
    exitCode: failures.length ? 1 : 0,
    signal: null,
    timedOut: false,
    overflowStream: null,
    spawnError: null,
    stdoutBytes: Buffer.byteLength(stdoutText),
    stderrBytes: 0,
    stdoutSha256: sha256(stdoutText),
    stderrSha256: sha256(""),
    parsedStatus: failures.length
      ? `FAIL_${id.toUpperCase()}`
      : `PASS_${id.toUpperCase()}_NO_PROMOTION`,
    expectedStatus: `PASS_${id.toUpperCase()}_NO_PROMOTION`,
    passed: failures.length === 0,
    stdoutText,
    stderrText: "",
  };
}

function evaluateNoPromotionTruth() {
  const authority = readJson(
    root,
    "config/pass36/current-release-authority.json",
  );
  const mirror = readJson(root, "config/pass35/current-revision.json");
  const legacy = readJson(root, "config/current-release.json");
  const state = readJson(
    root,
    "config/pass36/a94r1-action-required-current-state.json",
  );
  const manifest = readJson(root, A94R1_MANIFEST_PATH);
  const active = readFileSync(
    path.join(root, "VELMERE_ACTIVE_PASS.txt"),
    "utf8",
  ).trim();
  const checks = [];
  const add = (id, passed, detail = null) =>
    checks.push({ id, passed: Boolean(passed), detail });

  add("active_revision", active === A94R1_REVISION, active);
  add(
    "authority_revision_and_parent",
    authority.authorityRevisionId === A94R1_REVISION &&
      authority.currentSource?.revisionId === A94R1_REVISION &&
      authority.parentRevisionId === A94R1_PARENT,
    {
      authorityRevisionId: authority.authorityRevisionId,
      sourceRevisionId: authority.currentSource?.revisionId,
      parentRevisionId: authority.parentRevisionId,
    },
  );
  add(
    "authority_no_promotion",
    authority.claims?.checkpointClass ===
      "ACTION_REQUIRED_NON_PASS" &&
      authority.claims?.a90ToA94PassCredit === false &&
      authority.claims?.decision === "NO_GO" &&
      authority.claims?.liveProven === false &&
      authority.claims?.saleEnabled === false &&
      authority.claims?.worldClassProven === false,
    authority.claims,
  );
  add(
    "mirror_no_promotion",
    mirror.sourceRevisionId === A94R1_REVISION &&
      mirror.parentSourceRevisionId === A94R1_PARENT &&
      mirror.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
      mirror.a90ToA94PassCredit === false &&
      mirror.liveProven === false &&
      mirror.saleEnabled === false &&
      mirror.worldClassProven === false,
    {
      sourceRevisionId: mirror.sourceRevisionId,
      parentSourceRevisionId: mirror.parentSourceRevisionId,
      checkpointClass: mirror.checkpointClass,
      liveProven: mirror.liveProven,
      saleEnabled: mirror.saleEnabled,
      worldClassProven: mirror.worldClassProven,
    },
  );
  add(
    "legacy_pointer_no_promotion",
    legacy.notAuthoritativeCurrentSourcePointer === true &&
      legacy.authoritativeCurrentSourceRevisionId ===
        A94R1_REVISION &&
      legacy.productionPromotionAllowed === false,
    {
      notAuthoritative:
        legacy.notAuthoritativeCurrentSourcePointer,
      authoritativeCurrentSourceRevisionId:
        legacy.authoritativeCurrentSourceRevisionId,
      productionPromotionAllowed:
        legacy.productionPromotionAllowed,
    },
  );
  add(
    "state_no_pass_or_promotion",
    state.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
      state.completedThrough === 89 &&
      Object.values(state.passCredit ?? {}).every(
        (value) => value === false,
      ) &&
      state.promotion?.live === false &&
      state.promotion?.saleEnabled === false &&
      state.promotion?.productionApproved === false &&
      state.promotion?.worldClassProven === false,
    {
      checkpointClass: state.checkpointClass,
      completedThrough: state.completedThrough,
      passCredit: state.passCredit,
      promotion: state.promotion,
    },
  );
  add(
    "state_local_verification_truth",
    state.localVerification?.fullLintPassed === true &&
      state.localVerification?.productionRuntimeSmokePassed === true &&
      state.localVerification?.currentRoot30Of30PassedOnFinalBytes ===
        true &&
      state.localVerification?.cleanUnpackPassed === false &&
      state.localVerification?.sourceFrozen === true &&
      state.localVerification?.browserExecuted === false,
    state.localVerification,
  );
  add(
    "state_no_exact_or_browser_credit",
    ["A77R1", "A78R1", "A79R1", "A80R1"].every(
      (passId) => state.passCredit?.[passId] === false,
    ) &&
      authority.claims?.exactFinalByteBuildExecuted === false &&
      authority.claims?.exactToolchainBootstrapVerified === false &&
      authority.claims?.exactBuildBrowserEvidenceBound === false &&
      authority.claims?.frozenLocalReleaseCandidateVerified === false &&
      manifest.claims?.exactA77R1ToA80R1Credit === false &&
      manifest.claims?.exactFinalByteBuildExecuted === false &&
      manifest.claims?.browserExecuted === false &&
      state.localVerification?.exactReleaseCreditGranted === false &&
      state.localVerification?.browserCreditGranted === false,
    {
      passCredit: {
        A77R1: state.passCredit?.A77R1,
        A78R1: state.passCredit?.A78R1,
        A79R1: state.passCredit?.A79R1,
        A80R1: state.passCredit?.A80R1,
      },
      authority: {
        exactFinalByteBuildExecuted:
          authority.claims?.exactFinalByteBuildExecuted,
        exactToolchainBootstrapVerified:
          authority.claims?.exactToolchainBootstrapVerified,
        exactBuildBrowserEvidenceBound:
          authority.claims?.exactBuildBrowserEvidenceBound,
        frozenLocalReleaseCandidateVerified:
          authority.claims?.frozenLocalReleaseCandidateVerified,
      },
      descendant: {
        exactA77R1ToA80R1Credit:
          manifest.claims?.exactA77R1ToA80R1Credit,
        exactFinalByteBuildExecuted:
          manifest.claims?.exactFinalByteBuildExecuted,
        browserExecuted: manifest.claims?.browserExecuted,
      },
      state: {
        exactReleaseCreditGranted:
          state.localVerification?.exactReleaseCreditGranted,
        browserCreditGranted:
          state.localVerification?.browserCreditGranted,
      },
    },
  );
  add(
    "sku_paid_disabled",
    Object.values(state.skuDecisions ?? {}).every(
      (sku) => sku?.paid === false,
    ),
    state.skuDecisions,
  );
  add("manifest_digest", digestValid(manifest), {
    manifestDigestSha256: manifest.manifestDigestSha256,
  });
  add(
    "manifest_action_required_lineage",
    manifest.revisionId === A94R1_REVISION &&
      manifest.parentRevisionId === A94R1_PARENT &&
      manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS",
    {
      revisionId: manifest.revisionId,
      parentRevisionId: manifest.parentRevisionId,
      checkpointClass: manifest.checkpointClass,
    },
  );
  add(
    "manifest_no_credit",
    Object.values(manifest.claims ?? {}).every(
      (value) => value === false,
    ),
    manifest.claims,
  );
  return inlineResult("authority_no_promotion_truth", checks, {
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
  });
}

function resolveNpmInvocation() {
  for (const candidate of [
    process.env.VELMERE_EXACT_NPM_CLI,
    process.env.npm_execpath,
  ]) {
    if (!candidate || !path.isAbsolute(candidate)) continue;
    try {
      if (lstatSync(candidate).isFile()) {
        return {
          command: process.execPath,
          args: [candidate, "--version"],
          artifactPath: realpathSync(candidate),
        };
      }
    } catch {
      // Continue to the PATH candidate.
    }
  }
  const executableName =
    process.platform === "win32" ? "npm.cmd" : "npm";
  for (const directory of (process.env.PATH ?? "").split(
    path.delimiter,
  )) {
    if (!directory) continue;
    const candidate = path.resolve(directory, executableName);
    try {
      if (lstatSync(candidate).isFile()) {
        return {
          command: candidate,
          args: ["--version"],
          artifactPath: realpathSync(candidate),
        };
      }
    } catch {
      // Continue to the next PATH entry.
    }
  }
  return null;
}

function fileDigestOrNull(absolutePath) {
  try {
    const bytes = readFileSync(absolutePath);
    return { byteLength: bytes.length, sha256: sha256(bytes) };
  } catch {
    return null;
  }
}

function runtimeTruthResult(npmInvocation, npmResult) {
  const npmVersion = npmResult.stdoutText.trim();
  const checks = [
    {
      id: "node_version",
      passed: process.version === "v24.18.0",
      detail: process.version,
    },
    {
      id: "npm_invocation_resolved",
      passed: npmInvocation !== null,
      detail: npmInvocation?.artifactPath ?? null,
    },
    {
      id: "npm_version",
      passed:
        npmResult.passed && npmVersion === "11.16.0",
      detail: npmVersion,
    },
  ];
  return inlineResult("exact_runtime_version_truth", checks, {
    node: {
      version: process.version,
      executable: process.execPath,
      artifact: fileDigestOrNull(process.execPath),
    },
    npm: {
      version: npmVersion,
      executable: npmInvocation?.artifactPath ?? null,
      artifact: npmInvocation
        ? fileDigestOrNull(npmInvocation.artifactPath)
        : null,
    },
    exactOfficialArchiveProven: false,
    exactLockfileCas827Of827Proven: false,
    exactPlaywrightChromiumProven: false,
  });
}

function runtimeNodeModulesResult(state) {
  return inlineResult(
    "runtime_node_modules_boundary",
    [
      {
        id: "node_modules_real_directory_before_dependency_use",
        passed: state.passed,
        detail: state,
      },
    ],
    {
      exactDependencyBundleProven: false,
      state,
    },
  );
}

function skippedForNodeModulesResult(step, state) {
  return inlineResult(
    step.id,
    [
      {
        id: "node_modules_boundary_before_use",
        passed: false,
        detail: state,
      },
    ],
    {
      notExecuted: true,
      reason: "runtime_node_modules_boundary_failed",
    },
  );
}

function sourceImmutabilityResult({
  sourceBefore,
  sourceAfter,
  packagedTreeBefore,
  packagedTreeAfter,
  nodeModulesBefore,
  nodeModulesAfter,
}) {
  const sourceBoundaryValid =
    sourceBefore.rejected.length === 0 &&
    sourceAfter.rejected.length === 0;
  const sourceBoundaryImmutable =
    canonicalJson(sourceBefore) === canonicalJson(sourceAfter);
  const packagedTreeBeforeValid =
    packagedTreeBefore.rejected.length === 0 &&
    packagedTreeBefore.forbidden.length === 0 &&
    packagedTreeBefore.requiredMissing.length === 0;
  const packagedTreeAfterValid =
    packagedTreeAfter.rejected.length === 0 &&
    packagedTreeAfter.forbidden.length === 0 &&
    packagedTreeAfter.requiredMissing.length === 0;
  const packagedTreeImmutable =
    canonicalJson(packagedTreeBefore) ===
    canonicalJson(packagedTreeAfter);
  const nodeModulesBoundaryStable =
    nodeModulesBefore.passed &&
    nodeModulesAfter.passed &&
    nodeModulesBefore.realPath === nodeModulesAfter.realPath &&
    nodeModulesBefore.typeScriptCli?.realPath ===
      nodeModulesAfter.typeScriptCli?.realPath;
  return inlineResult(
    "source_immutability",
    [
      {
        id: "source_boundary_inventory_valid",
        passed: sourceBoundaryValid,
        detail: {
          beforeRejected: sourceBefore.rejected,
          afterRejected: sourceAfter.rejected,
        },
      },
      {
        id: "source_boundary_payload_immutable",
        passed: sourceBoundaryImmutable,
        detail: {
          before: sourceBefore.payload,
          after: sourceAfter.payload,
        },
      },
      {
        id: "physical_packaged_tree_before_valid",
        passed: packagedTreeBeforeValid,
        detail: {
          rejected: packagedTreeBefore.rejected,
          forbidden: packagedTreeBefore.forbidden,
          requiredMissing: packagedTreeBefore.requiredMissing,
        },
      },
      {
        id: "physical_packaged_tree_after_valid",
        passed: packagedTreeAfterValid,
        detail: {
          rejected: packagedTreeAfter.rejected,
          forbidden: packagedTreeAfter.forbidden,
          requiredMissing: packagedTreeAfter.requiredMissing,
        },
      },
      {
        id: "physical_packaged_tree_immutable",
        passed: packagedTreeImmutable,
        detail: {
          before: packagedTreeBefore.payload,
          after: packagedTreeAfter.payload,
          criticalFilesBefore: packagedTreeBefore.criticalFiles,
          criticalFilesAfter: packagedTreeAfter.criticalFiles,
        },
      },
      {
        id: "runtime_node_modules_boundary_stable",
        passed: nodeModulesBoundaryStable,
        detail: {
          before: nodeModulesBefore,
          after: nodeModulesAfter,
        },
      },
    ],
    {
      immutable:
        sourceBoundaryValid &&
        sourceBoundaryImmutable &&
        packagedTreeBeforeValid &&
        packagedTreeAfterValid &&
        packagedTreeImmutable &&
        nodeModulesBoundaryStable,
    },
  );
}

function addJournalChain(results) {
  let previousSha256 = "0".repeat(64);
  return results.map((result, index) => {
    const core = {
      index,
      id: result.id,
      passed: result.passed,
      exitCode: result.exitCode,
      stdoutSha256: result.stdoutSha256,
      stderrSha256: result.stderrSha256,
      previousSha256,
    };
    const entrySha256 = sha256(canonicalJson(core));
    previousSha256 = entrySha256;
    return { ...core, entrySha256 };
  });
}

async function main() {
  // This invocation is deliberately the first executed verification step.
  // Do not move argument parsing, source inventory, authority reads or receipt
  // setup above it.
  const firstStepRaw = await executeChild(a58Step);

  let output;
  try {
    output = parseReceiptDirectoryArgument();
  } catch (error) {
    const result = {
      schemaVersion:
        "velmere.pass36.a94r1.clean-unpack-controller-error.v1",
      revisionId: A94R1_REVISION,
      status: "ACTION_REQUIRED_RECEIPT_BOUNDARY_FAILURE",
      exitCode: ACTION_REQUIRED_LOCAL_EXIT,
      a58WasLiteralFirstStep: true,
      firstStep: {
        id: firstStepRaw.id,
        passed: firstStepRaw.passed,
        exitCode: firstStepRaw.exitCode,
        parsedStatus: firstStepRaw.parsedStatus,
        stdoutSha256: firstStepRaw.stdoutSha256,
        stderrSha256: firstStepRaw.stderrSha256,
      },
      error: error instanceof Error ? error.message : String(error),
      live: false,
      saleEnabled: false,
      productionApproved: false,
    };
    console.error(JSON.stringify(result, null, 2));
    return ACTION_REQUIRED_LOCAL_EXIT;
  }

  const persistedResults = [
    persistStepLogs(firstStepRaw, output.runDirectory),
  ];
  const sourceBefore = sourceFingerprint();
  const packagedTreeBefore = packagedTreeFingerprint();

  const authorityRaw = await executeChild(authorityStep);
  persistedResults.push(
    persistStepLogs(authorityRaw, output.runDirectory),
  );

  let noPromotionRaw;
  try {
    noPromotionRaw = evaluateNoPromotionTruth();
  } catch (error) {
    noPromotionRaw = inlineResult(
      "authority_no_promotion_truth",
      [
        {
          id: "authority_no_promotion_read",
          passed: false,
          detail:
            error instanceof Error ? error.message : String(error),
        },
      ],
      { globalDecision: "NO_GO" },
    );
  }
  persistedResults.push(
    persistStepLogs(noPromotionRaw, output.runDirectory),
  );

  const nodeModulesBefore =
    inspectA94R1RuntimeNodeModules(root);
  const nodeModulesRaw =
    runtimeNodeModulesResult(nodeModulesBefore);
  persistedResults.push(
    persistStepLogs(nodeModulesRaw, output.runDirectory),
  );

  const npmInvocation = resolveNpmInvocation();
  const npmRaw = npmInvocation
    ? await executeChild({
        id: "npm_version_probe",
        command: npmInvocation.command,
        args: npmInvocation.args,
        timeoutMs: 30_000,
      })
    : inlineResult(
        "npm_version_probe",
        [
          {
            id: "npm_invocation_resolved",
            passed: false,
            detail: null,
          },
        ],
        null,
      );
  persistedResults.push(
    persistStepLogs(npmRaw, output.runDirectory),
  );
  const runtimeRaw = runtimeTruthResult(
    npmInvocation,
    npmRaw,
  );
  persistedResults.push(
    persistStepLogs(runtimeRaw, output.runDirectory),
  );

  for (const step of safeLocalSteps) {
    const raw =
      step.requiresNodeModules === false ||
      nodeModulesBefore.passed
        ? await executeChild(step)
        : skippedForNodeModulesResult(
            step,
            nodeModulesBefore,
          );
    persistedResults.push(
      persistStepLogs(raw, output.runDirectory),
    );
  }

  const sourceAfter = sourceFingerprint();
  const packagedTreeAfter = packagedTreeFingerprint();
  const nodeModulesAfter =
    inspectA94R1RuntimeNodeModules(root);
  const immutabilityRaw = sourceImmutabilityResult({
    sourceBefore,
    sourceAfter,
    packagedTreeBefore,
    packagedTreeAfter,
    nodeModulesBefore,
    nodeModulesAfter,
  });
  persistedResults.push(
    persistStepLogs(immutabilityRaw, output.runDirectory),
  );
  const sourceImmutable = immutabilityRaw.passed;
  const localFailures = persistedResults.filter(
    (result) => !result.passed,
  );

  const status =
    localFailures.length > 0
      ? "ACTION_REQUIRED_LOCAL_OR_INTEGRITY_FAILURE"
      : "ACTION_REQUIRED_EXTERNAL_AND_EXACT_RELEASE_CLOSURE";
  const exitCode =
    localFailures.length > 0
      ? ACTION_REQUIRED_LOCAL_EXIT
      : ACTION_REQUIRED_CLOSURE_EXIT;
  const receiptCore = {
    schemaVersion:
      "velmere.pass36.a94r1.clean-unpack-action-required-receipt.v1",
    revisionId: A94R1_REVISION,
    parentRevisionId: A94R1_PARENT,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    status,
    exitCode,
    requiredOrder: [
      "A58_RELEASE_INTEGRITY_LITERAL_FIRST_EXECUTED_STEP",
      "A94R1_AUTHORITY_AND_DESCENDANT",
      "LOCAL_READ_ONLY_REGRESSIONS",
      "SOURCE_AND_PHYSICAL_PACKAGED_TREE_IMMUTABILITY",
    ],
    a58WasLiteralFirstStep:
      persistedResults[0]?.id ===
      "a58_release_integrity_literal_first_step",
    sourceFingerprint: {
      baselinePoint:
        "IMMEDIATELY_AFTER_READ_ONLY_A58_AND_BEFORE_ALL_LATER_CHECKS",
      sourceBoundary: {
        before: sourceBefore,
        after: sourceAfter,
      },
      physicalPackagedTree: {
        before: packagedTreeBefore,
        after: packagedTreeAfter,
      },
      runtimeNodeModules: {
        before: nodeModulesBefore,
        after: nodeModulesAfter,
      },
      immutable: sourceImmutable,
    },
    summary: {
      checks: persistedResults.length,
      passed: persistedResults.filter((result) => result.passed)
        .length,
      failed: localFailures.length,
    },
    results: persistedResults,
    journal: addJournalChain(persistedResults),
    notExecuted: explicitlyNotExecuted,
    exactReleaseClosureCredited: false,
    browserCredited: false,
    stagingCredited: false,
    realDataCredited: false,
    rightsApproved: false,
    legalApproved: false,
    customerValueProven: false,
    independentlyAssured: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    truthBoundary:
      "This controller verifies ordered local clean-unpack checks and preserves source immutability. A local runtime version match is not official toolchain provenance. It deliberately does not run or credit full lint, exact Webpack/Turbopack builds, production next start, browser, current-root 30/30, staging, real-data, provider-rights, legal, customer or independent-assurance gates. It always returns ACTION_REQUIRED for this sparse non-pass checkpoint.",
  };
  const receipt = {
    ...receiptCore,
    receiptCoreSha256: sha256(canonicalJson(receiptCore)),
  };
  const receiptFile = writeExclusive(
    "a94r1-clean-unpack-receipt.json",
    `${JSON.stringify(receipt, null, 2)}\n`,
    output.runDirectory,
  );
  console.log(
    JSON.stringify(
      {
        status,
        exitCode,
        revisionId: A94R1_REVISION,
        a58WasLiteralFirstStep:
          receipt.a58WasLiteralFirstStep,
        checks: receipt.summary,
        sourceImmutable,
        receiptDirectory: output.runDirectory,
        receipt: receiptFile,
        globalDecision: "NO_GO",
        live: false,
        saleEnabled: false,
        productionApproved: false,
      },
      null,
      2,
    ),
  );
  return exitCode;
}

const exitCode = await main();
process.exit(exitCode);
