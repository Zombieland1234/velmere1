import { CANONICAL_SIGNALS, evaluateDynamicSignals } from "../../lib/commerce/vlm-dynamic-signal-engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseline = {
  hasBytecode: true,
  hasSourceCode: true,
  hasOnChainDeploy: true,
  hasLiquidityPool: true,
  hasOrderbookData: true,
  hasTradingHistory: true,
  isVerifiedExplorer: true,
};

const advanced = evaluateDynamicSignals("advanced", baseline);
const missing = new Set(advanced.missingSignals.map((s) => s.id));
for (const id of [
  "sig_crypto_pdf_seal",
  "sig_formal_verification",
  "sig_multi_auditor_consensus",
  "sig_historical_exploit_replay",
  "sig_oracle_manipulation",
  "sig_institutional_timestamp",
  "sig_sovereign_demarcation",
]) {
  assert(missing.has(id), `advanced_signal_available_without_explicit_evidence:${id}`);
}
assert(advanced.canPurchase === false, "advanced_should_stop_sell_without_advanced_evidence");
assert(advanced.deliveryState === "STOP_SELL_ACTIVE", "advanced_should_be_stop_sell");

const withAllEvidence = evaluateDynamicSignals("advanced", {
  ...baseline,
  hasLocalPdfIntegritySeal: true,
  hasFormalSolverProof: true,
  hasMultiAuditorEvidence: true,
  hasExploitReplayEvidence: true,
  hasOracleSimulationEvidence: true,
  hasExternalTimestampProof: true,
  hasConfirmedHumanReview: true,
});
assert(withAllEvidence.availableSignalsCount === withAllEvidence.targetSignalsCount, "all_explicit_evidence_should_make_all_signals_available");

const timestampSignal = CANONICAL_SIGNALS.find((s) => s.id === "sig_institutional_timestamp");
assert(timestampSignal, "timestamp_signal_missing");
assert(!/RFC\s*3161|certif|certyf|legal proof|prawny dowód/i.test(`${timestampSignal.name} ${timestampSignal.namePl} ${timestampSignal.description}`), "timestamp_signal_copy_overclaims_external_proof");

const pdfSignal = CANONICAL_SIGNALS.find((s) => s.id === "sig_crypto_pdf_seal");
assert(pdfSignal, "pdf_signal_missing");
assert(/local/i.test(pdfSignal.name), "pdf_integrity_signal_must_be_local");
assert(!/certificate|certyfikat|immutable|niezmienny/i.test(`${pdfSignal.name} ${pdfSignal.namePl} ${pdfSignal.description}`), "pdf_integrity_copy_overclaims_certification");

console.log(JSON.stringify({ status: "PASS", checks: 13 }, null, 2));
