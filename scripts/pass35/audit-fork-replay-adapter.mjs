import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/iu;
const HASH32 = /^0x[a-f0-9]{64}$/iu;
const ADDRESS = /^0x[a-f0-9]{40}$/iu;
const TX_HASH = /^0x[a-f0-9]{64}$/iu;
const CASE_REF = /^AUD-[A-Z0-9-]{8,64}$/u;
const ASSERTION_ID = /^A09_[A-Z0-9_]{4,64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;

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
function insideRoot(root, relative, code, mustExist = true) {
  if (typeof relative !== "string" || !relative.trim() || path.isAbsolute(relative)) throw new Error(code);
  const resolved = path.resolve(root, relative);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(code);
  if (mustExist && (!existsSync(resolved) || !statSync(resolved).isFile())) throw new Error(`${code}_missing`);
  return resolved;
}
function normalizeHash32(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return HASH32.test(text) ? text : null;
}
function normalizeAddress(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(text) ? text : null;
}
function normalizeTxHash(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return TX_HASH.test(text) ? text : null;
}

function validateCase(input) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(input?.schemaVersion === "velmere.pass35.audit-a7-fork-replay-case.v1", "a7_fork_case_schema_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(input?.inputClass), "a7_fork_input_class_invalid");
  add(CASE_REF.test(String(input?.caseRef ?? "")), "a7_fork_case_ref_invalid");
  add(ISO.test(String(input?.observedAt ?? "")), "a7_fork_observed_at_invalid");
  add(DECIMAL.test(String(input?.chainId ?? "")) && BigInt(input.chainId) > 0n, "a7_fork_chain_id_invalid");
  add(DECIMAL.test(String(input?.blockNumber ?? "")) && BigInt(input.blockNumber) > 0n, "a7_fork_block_number_invalid");
  add(normalizeHash32(input?.blockHash) !== null, "a7_fork_block_hash_invalid");
  add(normalizeHash32(input?.preStateRoot) !== null, "a7_fork_pre_state_root_invalid");
  add(normalizeHash32(input?.expectedPostStateRoot) !== null, "a7_fork_post_state_root_invalid");
  add(normalizeAddress(input?.contractAddress) !== null, "a7_fork_contract_address_invalid");
  for (const field of ["sourceToBytecodeReceiptSha256", "chainProviderReceiptSha256", "replayPlanSha256", "forkProviderConfigurationSha256"]) {
    add(digest(input?.[field]) !== null, `a7_fork_${field}_invalid`);
  }
  if (input?.forkProviderCommercialRightsEvidenceSha256 != null) add(digest(input.forkProviderCommercialRightsEvidenceSha256) !== null, "a7_fork_provider_rights_digest_invalid");
  add(["LOCAL_TEST", "STAGING", "PRODUCTION"].includes(input?.forkProviderEndpointClass), "a7_fork_provider_endpoint_class_invalid");
  const txs = Array.isArray(input?.expectedTransactions) ? input.expectedTransactions : [];
  add(txs.length >= 1 && txs.length <= 64, "a7_fork_transactions_invalid");
  add(new Set(txs.map((row) => String(row?.txHash ?? "").toLowerCase())).size === txs.length, "a7_fork_transaction_duplicate");
  for (const row of txs) {
    add(normalizeTxHash(row?.txHash) !== null, "a7_fork_transaction_hash_invalid");
    add(["SUCCESS", "REVERT"].includes(row?.expectedStatus), "a7_fork_transaction_status_invalid");
    for (const field of ["expectedStateDiffSha256", "expectedLogsSha256", "expectedReturnDataSha256"]) add(digest(row?.[field]) !== null, `a7_fork_transaction_${field}_invalid`);
  }
  const assertions = Array.isArray(input?.requiredAssertions) ? input.requiredAssertions : [];
  add(assertions.length >= 3 && assertions.length <= 128, "a7_fork_assertions_invalid");
  add(new Set(assertions.map((row) => row?.assertionId)).size === assertions.length, "a7_fork_assertion_duplicate");
  for (const row of assertions) {
    add(ASSERTION_ID.test(String(row?.assertionId ?? "")), "a7_fork_assertion_id_invalid");
    add(["STATE", "BALANCE", "STORAGE", "EVENT", "AUTHORIZATION", "ACCOUNTING"].includes(row?.category), "a7_fork_assertion_category_invalid");
    add(digest(row?.expectedObservationSha256) !== null, "a7_fork_assertion_digest_invalid");
  }
  return [...new Set(blockers)].sort();
}

function validateTool(tool) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(tool?.schemaVersion === "velmere.pass35.audit-a7-tool-spec.v1", "a7_fork_tool_schema_invalid");
  add(tool?.toolId === "fork_replay_runner", "a7_fork_tool_id_invalid");
  add(["NATIVE_BINARY", "NODE_SCRIPT_FIXTURE_ONLY"].includes(tool?.executionMode), "a7_fork_execution_mode_invalid");
  add(/^\d+\.\d+\.\d+$/u.test(String(tool?.expectedVersion ?? "")), "a7_fork_expected_version_invalid");
  add(typeof tool?.executablePath === "string" && tool.executablePath.length > 0, "a7_fork_executable_path_invalid");
  if (tool?.executionMode === "NATIVE_BINARY") add(digest(tool?.expectedExecutableSha256) !== null, "a7_fork_expected_executable_digest_invalid");
  if (tool?.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") {
    add(tool?.fixtureOnly === true, "a7_fork_fixture_flag_missing");
    add(typeof tool?.entrypointPath === "string" && tool.entrypointPath.length > 0, "a7_fork_entrypoint_path_invalid");
    add(digest(tool?.expectedEntrypointSha256) !== null, "a7_fork_expected_entrypoint_digest_invalid");
    add(["REFERENCE", "WRONG_CHAIN", "WRONG_BLOCK_HASH", "PRE_STATE_DRIFT", "POST_STATE_DRIFT", "TX_FAILURE", "ASSERTION_FAILURE", "DROP_TRANSACTION"].includes(tool?.fixtureVariant), "a7_fork_fixture_variant_invalid");
  }
  return [...new Set(blockers)].sort();
}

function normalizeToolOutput(parsed) {
  if (!parsed || parsed.schemaVersion !== "velmere.pass35.audit-a7-fork-tool-output.v1") return null;
  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions.map((row) => ({
    txHash: normalizeTxHash(row?.txHash),
    status: row?.status,
    gasUsed: Number.isSafeInteger(row?.gasUsed) && row.gasUsed >= 0 ? row.gasUsed : null,
    stateDiffSha256: digest(row?.stateDiffSha256),
    logsSha256: digest(row?.logsSha256),
    returnDataSha256: digest(row?.returnDataSha256),
  })) : [];
  const assertions = Array.isArray(parsed.assertions) ? parsed.assertions.map((row) => ({
    assertionId: String(row?.assertionId ?? ""),
    status: row?.status,
    observedSha256: digest(row?.observedSha256),
  })) : [];
  return {
    chainId: String(parsed.chainId ?? ""),
    blockNumber: String(parsed.blockNumber ?? ""),
    blockHash: normalizeHash32(parsed.blockHash),
    preStateRoot: normalizeHash32(parsed.preStateRoot),
    postStateRoot: normalizeHash32(parsed.postStateRoot),
    replayTraceSha256: digest(parsed.replayTraceSha256),
    snapshotReadRootSha256: digest(parsed.snapshotReadRootSha256),
    transactions,
    assertions,
  };
}

export function executeForkReplayAdapter({ rootPath = process.cwd(), casePath, caseInput, toolSpec }) {
  const root = path.resolve(rootPath);
  const blockers = [...validateCase(caseInput), ...validateTool(toolSpec)];
  let absoluteCasePath = null;
  try { absoluteCasePath = insideRoot(root, casePath, "a7_fork_case_path_outside_root"); } catch (error) { blockers.push(error.message); }
  if (absoluteCasePath) {
    try {
      const diskInput = JSON.parse(readFileSync(absoluteCasePath, "utf8"));
      if (sha256(stable(diskInput)) !== sha256(stable(caseInput))) blockers.push("a7_fork_case_file_content_mismatch");
    } catch { blockers.push("a7_fork_case_file_invalid"); }
  }
  if (caseInput?.inputClass !== "SYNTHETIC_OFFLINE" && toolSpec?.executionMode !== "NATIVE_BINARY") blockers.push("a7_fork_real_case_requires_native_tool");
  if (caseInput?.inputClass === "CUSTOMER_SUPPLIED_VERIFIED") {
    if (!caseInput?.forkProviderCommercialRightsEvidenceSha256) blockers.push("a7_fork_real_case_provider_rights_missing");
    if (!caseInput?.["sourceToBytecodeReceiptSha256"] || !caseInput?.["chainProviderReceiptSha256"]) blockers.push("a7_fork_real_case_upstream_receipts_missing");
    if (!['STAGING','PRODUCTION'].includes(caseInput?.forkProviderEndpointClass)) blockers.push("a7_fork_real_case_endpoint_class_invalid");
  }

  let executableSha256 = null;
  let entrypointSha256 = null;
  let observedVersion = null;
  let versionOutputSha256 = null;
  let rawOutputSha256 = null;
  let exitCode = null;
  let normalized = null;
  if (blockers.length === 0) {
    try {
      const executable = toolSpec.executablePath === "__CURRENT_NODE__"
        ? process.execPath
        : path.isAbsolute(toolSpec.executablePath)
          ? path.resolve(toolSpec.executablePath)
          : insideRoot(root, toolSpec.executablePath, "a7_fork_executable_outside_root");
      if (!existsSync(executable) || !statSync(executable).isFile()) throw new Error("a7_fork_executable_missing");
      executableSha256 = sha256(readFileSync(executable));
      if (toolSpec.executionMode === "NATIVE_BINARY" && digest(toolSpec.expectedExecutableSha256) !== executableSha256) blockers.push("a7_fork_executable_digest_mismatch");
      let prefix = [];
      if (toolSpec.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") {
        const entrypoint = insideRoot(root, toolSpec.entrypointPath, "a7_fork_entrypoint_outside_root");
        entrypointSha256 = sha256(readFileSync(entrypoint));
        if (digest(toolSpec.expectedEntrypointSha256) !== entrypointSha256) blockers.push("a7_fork_entrypoint_digest_mismatch");
        prefix = [entrypoint];
      }
      if (!blockers.length) {
        const common = {
          cwd: root,
          encoding: "utf8",
          timeout: Math.min(Math.max(Number(toolSpec.timeoutMs ?? 60000), 1000), 300000),
          maxBuffer: Math.min(Math.max(Number(toolSpec.maxStdoutBytes ?? 16 * 1024 * 1024), 1024), 64 * 1024 * 1024),
          env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C", LC_ALL: "C", NO_COLOR: "1" },
        };
        const version = spawnSync(executable, [...prefix, "--version"], common);
        versionOutputSha256 = sha256(`${version.stdout ?? ""}\n${version.stderr ?? ""}`);
        observedVersion = (String(version.stdout ?? "").match(/\b\d+\.\d+\.\d+\b/u) ?? [null])[0];
        if (version.status !== 0 || observedVersion !== toolSpec.expectedVersion) blockers.push("a7_fork_version_mismatch");
        const replayArgs = [...prefix, "replay", "--case", absoluteCasePath, "--json"];
        if (toolSpec.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") replayArgs.push("--fixture-variant", toolSpec.fixtureVariant);
        const replay = spawnSync(executable, replayArgs, common);
        exitCode = typeof replay.status === "number" ? replay.status : null;
        const stdout = String(replay.stdout ?? "");
        const stderr = String(replay.stderr ?? "");
        rawOutputSha256 = sha256(`${stdout}\n${stderr}`);
        if (replay.error || replay.signal || replay.status !== 0) blockers.push("a7_fork_process_failed");
        let parsed = null;
        try { parsed = JSON.parse(stdout); } catch { blockers.push("a7_fork_output_not_json"); }
        normalized = normalizeToolOutput(parsed);
        if (!normalized) blockers.push("a7_fork_output_schema_invalid");
      }
    } catch (error) { blockers.push(`a7_fork_execution_exception:${error instanceof Error ? error.message : String(error)}`); }
  }

  if (normalized) {
    if (normalized.chainId !== String(caseInput.chainId)) blockers.push("a7_fork_chain_id_mismatch");
    if (normalized.blockNumber !== String(caseInput.blockNumber)) blockers.push("a7_fork_block_number_mismatch");
    if (normalized.blockHash !== normalizeHash32(caseInput.blockHash)) blockers.push("a7_fork_block_hash_mismatch");
    if (normalized.preStateRoot !== normalizeHash32(caseInput.preStateRoot)) blockers.push("a7_fork_pre_state_root_mismatch");
    if (normalized.postStateRoot !== normalizeHash32(caseInput.expectedPostStateRoot)) blockers.push("a7_fork_post_state_root_mismatch");
    if (!normalized.replayTraceSha256 || !normalized.snapshotReadRootSha256) blockers.push("a7_fork_trace_or_snapshot_digest_missing");
    const expectedTx = new Map(caseInput.expectedTransactions.map((row) => [row.txHash.toLowerCase(), row]));
    if (normalized.transactions.length !== expectedTx.size) blockers.push("a7_fork_transaction_count_mismatch");
    for (const row of normalized.transactions) {
      const expected = row.txHash ? expectedTx.get(row.txHash) : null;
      if (!expected) { blockers.push("a7_fork_unexpected_transaction"); continue; }
      if (row.status !== expected.expectedStatus) blockers.push("a7_fork_transaction_failure");
      if (row.stateDiffSha256 !== digest(expected.expectedStateDiffSha256)) blockers.push("a7_fork_transaction_state_diff_mismatch");
      if (row.logsSha256 !== digest(expected.expectedLogsSha256)) blockers.push("a7_fork_transaction_logs_mismatch");
      if (row.returnDataSha256 !== digest(expected.expectedReturnDataSha256)) blockers.push("a7_fork_transaction_return_data_mismatch");
      if (row.gasUsed === null) blockers.push("a7_fork_transaction_gas_invalid");
    }
    const expectedAssertions = new Map(caseInput.requiredAssertions.map((row) => [row.assertionId, row]));
    if (normalized.assertions.length !== expectedAssertions.size) blockers.push("a7_fork_assertion_count_mismatch");
    for (const row of normalized.assertions) {
      const expected = expectedAssertions.get(row.assertionId);
      if (!expected) { blockers.push("a7_fork_unexpected_assertion"); continue; }
      if (row.status !== "PASS") blockers.push("a7_fork_assertion_failure");
      if (row.observedSha256 !== digest(expected.expectedObservationSha256)) blockers.push("a7_fork_assertion_observation_mismatch");
    }
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const realCaseExecution = uniqueBlockers.length === 0
    && caseInput.inputClass === "CUSTOMER_SUPPLIED_VERIFIED"
    && toolSpec.executionMode === "NATIVE_BINARY"
    && toolSpec.fixtureOnly === false
    && ["STAGING", "PRODUCTION"].includes(caseInput.forkProviderEndpointClass)
    && digest(caseInput.forkProviderCommercialRightsEvidenceSha256) !== null;
  const core = {
    schemaVersion: "velmere.pass35.audit-a7-fork-replay-receipt.v1",
    familyId: "fork_replay_exact_state",
    toolName: "Fork Replay Runner",
    toolVersion: observedVersion,
    caseRef: caseInput?.caseRef ?? null,
    inputClass: caseInput?.inputClass ?? null,
    target: {
      chainId: String(caseInput?.chainId ?? ""),
      chainName: String(caseInput?.chainName ?? ""),
      blockNumber: String(caseInput?.blockNumber ?? ""),
      blockHash: normalizeHash32(caseInput?.blockHash),
      contractAddress: normalizeAddress(caseInput?.contractAddress),
      preStateRoot: normalizeHash32(caseInput?.preStateRoot),
      expectedPostStateRoot: normalizeHash32(caseInput?.expectedPostStateRoot),
    },
    upstreamBindings: {
      sourceToBytecodeReceiptSha256: digest(caseInput?.sourceToBytecodeReceiptSha256),
      chainProviderReceiptSha256: digest(caseInput?.chainProviderReceiptSha256),
      replayPlanSha256: digest(caseInput?.replayPlanSha256),
      forkProviderConfigurationSha256: digest(caseInput?.forkProviderConfigurationSha256),
      forkProviderCommercialRightsEvidenceSha256: digest(caseInput?.forkProviderCommercialRightsEvidenceSha256),
      forkProviderEndpointClass: caseInput?.forkProviderEndpointClass ?? null,
    },
    toolBinding: {
      executionMode: toolSpec?.executionMode ?? null,
      fixtureOnly: toolSpec?.fixtureOnly === true,
      binaryOrImageSha256: executableSha256,
      entrypointSha256,
      versionOutputSha256,
      rawOutputSha256,
      exitCode,
    },
    replay: {
      transactionCount: normalized?.transactions.length ?? 0,
      successfulTransactions: normalized?.transactions.filter((row) => row.status === "SUCCESS").length ?? 0,
      revertedTransactions: normalized?.transactions.filter((row) => row.status === "REVERT").length ?? 0,
      assertionCount: normalized?.assertions.length ?? 0,
      passedAssertions: normalized?.assertions.filter((row) => row.status === "PASS").length ?? 0,
      replayTraceSha256: normalized?.replayTraceSha256 ?? null,
      snapshotReadRootSha256: normalized?.snapshotReadRootSha256 ?? null,
      observedPostStateRoot: normalized?.postStateRoot ?? null,
      transactions: normalized?.transactions ?? [],
      assertions: normalized?.assertions ?? [],
    },
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED",
    assuranceClass: toolSpec?.fixtureOnly ? "LOCAL_CONTRACT" : "PROVIDER_BOUND_REAL_CASE",
    realCaseExecution,
    paidGateEligible: false,
    fullAuditClaimAllowed: false,
    promotionAllowed: false,
    blockers: uniqueBlockers,
    limitations: toolSpec?.fixtureOnly
      ? [
          "The fixture validates exact chain/block/state binding, replay result normalization and fail-closed mutations only.",
          "It does not run an official forked EVM, Anvil/Forge replay, a real provider, a customer contract or a historical exploit.",
        ]
      : [
          "One provider-bound replay does not establish corpus coverage, exploitability, economic safety, benchmark quality or independent assurance.",
          "Paid-gate eligibility remains false until all applicable audit controls, reviewer and external evidence pass.",
        ],
    truthBoundary: "A7 may prove the local fork/replay adapter contract and exact state-binding checks only. Fixture or relabeled evidence cannot become real, paid, independent, LIVE or full-audit proof.",
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
