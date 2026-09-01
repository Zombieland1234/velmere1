import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/iu;
const ADDRESS = /^0x[a-f0-9]{40}$/iu;
const CASE_REF = /^AUD-[A-Z0-9-]{8,64}$/u;
const SCENARIO_ID = /^A10_[A-Z0-9_]{4,64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const REQUIRED_TYPES = [
  "ORACLE_MANIPULATION",
  "MEV_SANDWICH",
  "LIQUIDITY_DRAIN",
  "GOVERNANCE_TAKEOVER",
  "PRIVILEGED_KEY_COMPROMISE",
];
const SEVERITY_WEIGHT = { INFO: 0, LOW: 8, MEDIUM: 20, HIGH: 35, CRITICAL: 50 };

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
function bigint(value, code, blockers, { positive = false } = {}) {
  const text = String(value ?? "");
  if (!DECIMAL.test(text)) { blockers.push(code); return 0n; }
  const parsed = BigInt(text);
  if (positive && parsed <= 0n) blockers.push(code);
  return parsed;
}
function ratioBps(numerator, denominator) {
  return denominator > 0n ? Number((numerator * 10000n) / denominator) : null;
}
function abs(value) { return value < 0n ? -value : value; }
function severityRank(severity) { return ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(severity); }

function validateScenario(row, blockers) {
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(SCENARIO_ID.test(String(row?.scenarioId ?? "")), "a8_economic_scenario_id_invalid");
  add(REQUIRED_TYPES.includes(row?.type), "a8_economic_scenario_type_invalid");
  add(typeof row?.applicabilityReason === "string" && row.applicabilityReason.trim().length >= 8, "a8_economic_applicability_reason_invalid");
  const p = row?.parameters ?? {};
  switch (row?.type) {
    case "ORACLE_MANIPULATION":
      bigint(p.referencePriceE6, "a8_economic_oracle_reference_invalid", blockers, { positive: true });
      bigint(p.manipulatedPriceE6, "a8_economic_oracle_manipulated_invalid", blockers, { positive: true });
      bigint(p.positionNotionalUsdE6, "a8_economic_oracle_notional_invalid", blockers, { positive: true });
      bigint(p.attackCostUsdE6, "a8_economic_oracle_cost_invalid", blockers);
      bigint(p.expectedGrossProfitUsdE6, "a8_economic_oracle_profit_invalid", blockers);
      bigint(p.maxDeviationBps, "a8_economic_oracle_threshold_invalid", blockers, { positive: true });
      break;
    case "MEV_SANDWICH":
      bigint(p.userTradeUsdE6, "a8_economic_mev_trade_invalid", blockers, { positive: true });
      bigint(p.poolLiquidityUsdE6, "a8_economic_mev_liquidity_invalid", blockers, { positive: true });
      bigint(p.estimatedLossUsdE6, "a8_economic_mev_loss_invalid", blockers);
      bigint(p.maxLossBps, "a8_economic_mev_threshold_invalid", blockers, { positive: true });
      break;
    case "LIQUIDITY_DRAIN":
      bigint(p.poolLiquidityUsdE6, "a8_economic_drain_liquidity_invalid", blockers, { positive: true });
      bigint(p.removableLiquidityUsdE6, "a8_economic_drain_removable_invalid", blockers);
      bigint(p.maxDrainBps, "a8_economic_drain_threshold_invalid", blockers, { positive: true });
      bigint(p.withdrawalDelaySec, "a8_economic_drain_delay_invalid", blockers);
      bigint(p.minimumDelaySec, "a8_economic_drain_minimum_delay_invalid", blockers, { positive: true });
      break;
    case "GOVERNANCE_TAKEOVER":
      bigint(p.totalVotingPower, "a8_economic_governance_total_invalid", blockers, { positive: true });
      bigint(p.attackerVotingPower, "a8_economic_governance_attacker_invalid", blockers);
      bigint(p.quorumBps, "a8_economic_governance_quorum_invalid", blockers, { positive: true });
      bigint(p.timelockSec, "a8_economic_governance_timelock_invalid", blockers);
      bigint(p.minimumTimelockSec, "a8_economic_governance_minimum_timelock_invalid", blockers, { positive: true });
      add(typeof p.emergencyPauseAvailable === "boolean", "a8_economic_governance_pause_invalid");
      break;
    case "PRIVILEGED_KEY_COMPROMISE":
      bigint(p.signerCount, "a8_economic_key_signer_count_invalid", blockers, { positive: true });
      bigint(p.threshold, "a8_economic_key_threshold_invalid", blockers, { positive: true });
      bigint(p.minimumThreshold, "a8_economic_key_minimum_threshold_invalid", blockers, { positive: true });
      bigint(p.timelockSec, "a8_economic_key_timelock_invalid", blockers);
      bigint(p.minimumTimelockSec, "a8_economic_key_minimum_timelock_invalid", blockers, { positive: true });
      add(typeof p.emergencyPauseAvailable === "boolean", "a8_economic_key_pause_invalid");
      break;
    default:
      break;
  }
}

function validateCase(input) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(input?.schemaVersion === "velmere.pass35.audit-a8-economic-case.v1", "a8_economic_schema_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(input?.inputClass), "a8_economic_input_class_invalid");
  add(CASE_REF.test(String(input?.caseRef ?? "")), "a8_economic_case_ref_invalid");
  add(ISO.test(String(input?.observedAt ?? "")), "a8_economic_observed_at_invalid");
  add(DECIMAL.test(String(input?.chainId ?? "")) && BigInt(input.chainId) > 0n, "a8_economic_chain_id_invalid");
  add(ADDRESS.test(String(input?.contractAddress ?? "")), "a8_economic_contract_address_invalid");
  for (const field of ["sourceToBytecodeReceiptSha256", "chainProviderReceiptSha256", "marketDataReceiptSha256", "economicMethodologySha256", "forkReplayReceiptFileSha256", "forkReplayEmbeddedReceiptSha256"]) {
    add(digest(input?.[field]) !== null, `a8_economic_${field}_invalid`);
  }
  if (input?.providerCommercialRightsEvidenceSha256 != null) add(digest(input.providerCommercialRightsEvidenceSha256) !== null, "a8_economic_provider_rights_invalid");
  add(typeof input?.forkReplayReceiptPath === "string" && input.forkReplayReceiptPath.length > 0, "a8_economic_fork_receipt_path_invalid");
  const scenarios = Array.isArray(input?.scenarios) ? input.scenarios : [];
  add(scenarios.length >= REQUIRED_TYPES.length && scenarios.length <= 32, "a8_economic_scenario_count_invalid");
  add(new Set(scenarios.map((row) => row?.scenarioId)).size === scenarios.length, "a8_economic_scenario_duplicate_id");
  for (const type of REQUIRED_TYPES) add(scenarios.some((row) => row?.type === type), `a8_economic_required_scenario_missing:${type}`);
  for (const row of scenarios) validateScenario(row, blockers);
  return [...new Set(blockers)].sort();
}

function evaluateScenario(row) {
  const p = row.parameters;
  if (row.type === "ORACLE_MANIPULATION") {
    const reference = BigInt(p.referencePriceE6);
    const manipulated = BigInt(p.manipulatedPriceE6);
    const deviationBps = ratioBps(abs(manipulated - reference), reference);
    const cost = BigInt(p.attackCostUsdE6);
    const gross = BigInt(p.expectedGrossProfitUsdE6);
    const net = gross - cost;
    const threshold = Number(BigInt(p.maxDeviationBps));
    const material = deviationBps !== null && deviationBps > threshold && net > 0n;
    const severity = material ? (deviationBps >= threshold * 3 && net >= cost * 2n ? "CRITICAL" : "HIGH") : "LOW";
    return { scenarioId: row.scenarioId, type: row.type, material, severity, metrics: { deviationBps, netProfitUsdE6: net.toString(), attackCostUsdE6: cost.toString(), thresholdBps: threshold } };
  }
  if (row.type === "MEV_SANDWICH") {
    const trade = BigInt(p.userTradeUsdE6);
    const loss = BigInt(p.estimatedLossUsdE6);
    const lossBps = ratioBps(loss, trade);
    const threshold = Number(BigInt(p.maxLossBps));
    const material = lossBps !== null && lossBps > threshold;
    const severity = material ? (lossBps >= threshold * 3 ? "HIGH" : "MEDIUM") : "LOW";
    return { scenarioId: row.scenarioId, type: row.type, material, severity, metrics: { lossBps, estimatedLossUsdE6: loss.toString(), poolLiquidityUsdE6: String(p.poolLiquidityUsdE6), thresholdBps: threshold } };
  }
  if (row.type === "LIQUIDITY_DRAIN") {
    const pool = BigInt(p.poolLiquidityUsdE6);
    const removable = BigInt(p.removableLiquidityUsdE6);
    const drainBps = ratioBps(removable, pool);
    const threshold = Number(BigInt(p.maxDrainBps));
    const delay = BigInt(p.withdrawalDelaySec);
    const minimumDelay = BigInt(p.minimumDelaySec);
    const material = drainBps !== null && drainBps > threshold && delay < minimumDelay;
    const severity = material ? (drainBps >= 5000 && delay === 0n ? "CRITICAL" : "HIGH") : "LOW";
    return { scenarioId: row.scenarioId, type: row.type, material, severity, metrics: { drainBps, withdrawalDelaySec: delay.toString(), minimumDelaySec: minimumDelay.toString(), thresholdBps: threshold } };
  }
  if (row.type === "GOVERNANCE_TAKEOVER") {
    const total = BigInt(p.totalVotingPower);
    const attacker = BigInt(p.attackerVotingPower);
    const attackerBps = ratioBps(attacker, total);
    const quorum = Number(BigInt(p.quorumBps));
    const delay = BigInt(p.timelockSec);
    const minimumDelay = BigInt(p.minimumTimelockSec);
    const material = attackerBps !== null && attackerBps >= quorum && delay < minimumDelay && p.emergencyPauseAvailable === false;
    const severity = material ? (delay === 0n ? "CRITICAL" : "HIGH") : "LOW";
    return { scenarioId: row.scenarioId, type: row.type, material, severity, metrics: { attackerVotingPowerBps: attackerBps, quorumBps: quorum, timelockSec: delay.toString(), emergencyPauseAvailable: p.emergencyPauseAvailable } };
  }
  const signerCount = BigInt(p.signerCount);
  const threshold = BigInt(p.threshold);
  const minimumThreshold = BigInt(p.minimumThreshold);
  const delay = BigInt(p.timelockSec);
  const minimumDelay = BigInt(p.minimumTimelockSec);
  const material = threshold < minimumThreshold || delay < minimumDelay || p.emergencyPauseAvailable === false;
  const severity = material ? (threshold === 1n && delay === 0n ? "CRITICAL" : "HIGH") : "LOW";
  return { scenarioId: row.scenarioId, type: row.type, material, severity, metrics: { signerCount: signerCount.toString(), threshold: threshold.toString(), minimumThreshold: minimumThreshold.toString(), timelockSec: delay.toString(), emergencyPauseAvailable: p.emergencyPauseAvailable } };
}

export function executeEconomicAdversarialAnalysis({ rootPath = process.cwd(), casePath, caseInput }) {
  const root = path.resolve(rootPath);
  const blockers = validateCase(caseInput);
  let caseFileSha256 = null;
  let forkReceipt = null;
  let forkReceiptFileSha256 = null;
  try {
    const absoluteCasePath = insideRoot(root, casePath, "a8_economic_case_path_outside_root");
    const diskCase = JSON.parse(readFileSync(absoluteCasePath, "utf8"));
    caseFileSha256 = sha256(readFileSync(absoluteCasePath));
    if (sha256(stable(diskCase)) !== sha256(stable(caseInput))) blockers.push("a8_economic_case_file_content_mismatch");
  } catch (error) { blockers.push(error instanceof Error ? error.message : String(error)); }
  try {
    const absoluteForkPath = insideRoot(root, caseInput?.forkReplayReceiptPath, "a8_economic_fork_receipt_path_outside_root");
    const bytes = readFileSync(absoluteForkPath);
    forkReceiptFileSha256 = sha256(bytes);
    forkReceipt = JSON.parse(bytes.toString("utf8"));
    if (forkReceiptFileSha256 !== digest(caseInput.forkReplayReceiptFileSha256)) blockers.push("a8_economic_fork_receipt_file_digest_mismatch");
    if (digest(forkReceipt?.receiptSha256) !== digest(caseInput.forkReplayEmbeddedReceiptSha256)) blockers.push("a8_economic_fork_receipt_embedded_digest_mismatch");
    if (forkReceipt?.familyId !== "fork_replay_exact_state" || forkReceipt?.status !== "VERIFIED") blockers.push("a8_economic_fork_receipt_not_verified");
    if (String(forkReceipt?.target?.chainId ?? "") !== String(caseInput?.chainId ?? "")) blockers.push("a8_economic_fork_receipt_chain_mismatch");
    if (String(forkReceipt?.target?.contractAddress ?? "").toLowerCase() !== String(caseInput?.contractAddress ?? "").toLowerCase()) blockers.push("a8_economic_fork_receipt_contract_mismatch");
  } catch (error) { blockers.push(error instanceof Error ? error.message : String(error)); }
  if (caseInput?.inputClass === "CUSTOMER_SUPPLIED_VERIFIED") {
    if (forkReceipt?.realCaseExecution !== true) blockers.push("a8_economic_real_case_requires_real_fork_receipt");
    if (!caseInput?.providerCommercialRightsEvidenceSha256) blockers.push("a8_economic_real_case_provider_rights_missing");
  }

  const results = blockers.length ? [] : caseInput.scenarios.map(evaluateScenario);
  const material = results.filter((row) => row.material);
  const highestSeverity = results.reduce((current, row) => severityRank(row.severity) > severityRank(current) ? row.severity : current, "INFO");
  const score = Math.min(100, material.reduce((sum, row) => sum + SEVERITY_WEIGHT[row.severity], 0));
  const uniqueBlockers = [...new Set(blockers)].sort();
  const core = {
    schemaVersion: "velmere.pass35.audit-a8-economic-adversarial-receipt.v1",
    familyId: "economic_adversarial_scenario_engine",
    engineId: "PASS35_A8_ECONOMIC_SCENARIO_ENGINE_V1",
    caseRef: caseInput?.caseRef ?? null,
    inputClass: caseInput?.inputClass ?? null,
    caseFileSha256,
    target: {
      chainId: String(caseInput?.chainId ?? ""),
      contractAddress: String(caseInput?.contractAddress ?? "").toLowerCase(),
      blockNumber: String(caseInput?.blockNumber ?? ""),
    },
    upstreamBindings: {
      sourceToBytecodeReceiptSha256: digest(caseInput?.sourceToBytecodeReceiptSha256),
      chainProviderReceiptSha256: digest(caseInput?.chainProviderReceiptSha256),
      marketDataReceiptSha256: digest(caseInput?.marketDataReceiptSha256),
      economicMethodologySha256: digest(caseInput?.economicMethodologySha256),
      forkReplayReceiptFileSha256: forkReceiptFileSha256,
      forkReplayEmbeddedReceiptSha256: digest(forkReceipt?.receiptSha256),
      providerCommercialRightsEvidenceSha256: digest(caseInput?.providerCommercialRightsEvidenceSha256),
    },
    execution: {
      status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED",
      assuranceClass: "LOCAL_DETERMINISTIC_SCENARIO_MODEL",
      realCaseExecution: false,
      paidGateEligible: false,
      fullAuditClaimAllowed: false,
      promotionAllowed: false,
    },
    scenarioCount: results.length,
    materialScenarioCount: material.length,
    highestSeverity,
    deterministicEconomicRiskRanking: score,
    probabilityClaimAllowed: false,
    scenarios: results,
    blockers: uniqueBlockers,
    limitations: [
      "The engine performs deterministic scenario arithmetic on supplied inputs; it is not a calibrated probability model or exploit proof.",
      "The local fixture is bound to an A09 fixture receipt and does not use a real provider, live venue state, official forked EVM or customer case.",
      "A10 paid-gate credit requires rights-approved real inputs, replay evidence, benchmark quality and qualified human adjudication.",
    ],
    truthBoundary: "A8 may prove the local A10 scenario contract, quantitative calculations, upstream receipt binding and mutation detection only. It cannot claim real economic exploitability, customer value, LIVE evidence or paid audit readiness.",
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
