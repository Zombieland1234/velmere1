#!/usr/bin/env node
import fs from "node:fs";
import { evaluateA82RealIntake } from "../../lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs";
import { evaluateA83RealIntake } from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";
import { A84_REVISION, evaluateA84RealIntake } from "../../lib/worldclass/pass36-a84-shield-full-catalog-tier-matrix-runtime.ts";
import { evaluateA85RealIntake } from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.ts";
import { evaluateA86RealIntake } from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.ts";
import { evaluateA87RealIntake } from "../../lib/worldclass/pass36-a87-market-impact-whale-watch-runtime.ts";
import { evaluateA88RealIntake } from "../../lib/worldclass/pass36-a88-brain-angel-risk-eval-runtime.ts";

const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const add = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const envNames = ["VELMERE_REAL_EVIDENCE_ROOT", "VELMERE_REAL_EVIDENCE_TRUST_POLICY", "VELMERE_REAL_EVIDENCE_TRUST_POLICY_SHA256"] as const;
const saved = new Map(envNames.map((name) => [name, process.env[name]]));
for (const name of envNames) delete process.env[name];

try {
  const a82Policy = read("config/pass36/a82-audit-real-contract-matrix-policy.json");
  const a82Index = read(a82Policy.intakeIndex.path);
  const fakeA82 = structuredClone(a82Index);
  fakeA82.slots = fakeA82.slots.map((row: Record<string, unknown>) => ({ ...row, chainId: "1", contractAddress: "0x1111111111111111111111111111111111111111", evidenceReady: true, rightsApproved: true, officialToolReceipts: 4, tierOutputsSupplied: 3 }));
  const a82 = evaluateA82RealIntake(fakeA82, a82Policy);
  add("a82:self-asserted-ready-denied", a82.decision === "BLOCKED_REAL_CASE_EVIDENCE", a82.decision);
  add("a82:no-physical-tool-or-tier-credit", a82.officialToolReceipts === 0 && a82.realTierOutputs === 0, a82);

  const a83Policy = read("config/pass36/a83-browser-lens-pdf-real-packet-policy.json");
  const fakeA83 = read(a83Policy.realIntakeIndex.path);
  fakeA83.slots = fakeA83.slots.map((row: Record<string, unknown>) => ({ ...row, packetBundleSupplied: true, rightsApproved: true, freshnessVerified: true, browserEvidenceReady: true, secureDeliveryEvidenceReady: true, accessibilityEvidenceReady: true, customerComprehensionLabels: 1, tierOutputsSupplied: 3, realPacketReady: true }));
  const a83 = evaluateA83RealIntake(fakeA83, a83Policy);
  add("a83:self-asserted-ready-denied", a83.decision === "BLOCKED_REAL_PACKET_EVIDENCE", a83.decision);
  add("a83:no-physical-pdf-credit", a83.packetBundles === 0 && a83.tierOutputs === 0, a83);

  const a84Policy = read("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json");
  const a84 = evaluateA84RealIntake({ schemaVersion: "velmere.pass36.a84.shield-real-full-catalog-intake.v1", revisionId: A84_REVISION, activeAssetDenominator: 318, providerCatalogBundles: Array(a84Policy.providerFamilies.length).fill(null), fieldSnapshotBundles: Array(318 * a84Policy.fieldIds.length).fill(null), rightsRecords: Array(318).fill(null), browserEvidence: Array(318).fill(null), customerValueLabels: Array(318).fill(null), realTierOutputs: Array(954).fill(null) }, a84Policy);
  add("a84:null-array-denominator-denied", a84.decision === "BLOCKED_CURRENT_FULL_CATALOG_EVIDENCE", a84.decision);
  add("a84:null-array-zero-credit", a84.evidenceCompleteAssets === 0 && a84.fieldSnapshotBundles === 0 && a84.realTierOutputs === 0, a84);

  const a85 = evaluateA85RealIntake({ activeAssetDenominator: 318, fullCatalogPagesVerified: 2, exactMarketIdentityAssets: 318, exactChainAddressBindings: 318, signedCurrentLabelAssets: 318, orderBookDepthAssets: 318, productionBrowserAssets: 318, serverEntitlementAssets: 318, rightsApprovedAssets: 318, customerValueLabeledAssets: 318, evidenceBundles: [] });
  add("a85:counter-only-denied", a85.decision === "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE", a85.decision);
  add("a85:counter-only-zero-credit", a85.evidenceCompleteAssets === 0, a85);

  const repeatedA86 = { instrumentId: "instrument:duplicate", assetClass: "stock", terminalState: "AVAILABLE", currentQuoteVerified: true, historyVerified: true, calendarVerified: true, currencyNormalizationVerified: true, providerRightsApproved: true, productionBrowserVerified: true, customerValueLabeled: true };
  const a86 = evaluateA86RealIntake({ supportedInstrumentDenominator: 583, rows: Array.from({ length: 583 }, () => ({ ...repeatedA86 })) });
  add("a86:duplicate-boolean-rows-denied", a86.decision === "BLOCKED_REAL_MARKETS_CROSS_ASSET_EVIDENCE", a86.decision);
  add("a86:duplicate-boolean-zero-verified", a86.fullyVerified === 0, a86);

  const repeatedA87 = { canonicalAssetId: "asset:duplicate", terminalState: "AVAILABLE", rightsApproved: true, currentMultiVenueBooks: true, realizedSlippageComparison: true, exactChainAddressBinding: true, currentHolderTransferLabelEvidence: true, continuousRevalidationWindow: true };
  const a87 = evaluateA87RealIntake({ rows: Array.from({ length: 318 }, () => ({ ...repeatedA87 })) });
  add("a87:duplicate-boolean-rows-denied", a87.decision === "BLOCKED_REAL_MARKET_IMPACT_WHALE_EVIDENCE", a87.decision);
  add("a87:exact-denominator-no-physical-credit", a87.rows === 318 && a87.fullyVerified === 0, a87);

  const repeatedA88 = { caseId: "case:duplicate", realModelExecution: true, multilingual: true, independentLabel: true, independentAdjudication: true, rightsApproved: true, customerDecisionUtilityLabeled: true, calibrationWindowClosed: true };
  const a88 = evaluateA88RealIntake({ requiredEvidencePerCase: [], requiredFamilies: ["grounded_clean"], rows: Array.from({ length: 300 }, () => ({ ...repeatedA88 })) });
  add("a88:duplicate-minimal-rows-denied", a88.decision === "BLOCKED_REAL_BRAIN_ANGEL_RISK_EVAL", a88.decision);
  add("a88:minimal-boolean-zero-verified", a88.fullyVerified === 0, a88);
} finally {
  for (const name of envNames) {
    const value = saved.get(name);
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.real-intake-self-assertion-denial-test.v1",
  status: failed.length ? "FAIL_A102R41_REAL_INTAKE_SELF_ASSERTION_DENIAL" : "PASS_A102R41_REAL_INTAKE_SELF_ASSERTION_DENIAL_NO_REAL_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  realDenominators: { a82: 0, a83: 0, a84: 0, a85: 0, a86: 0, a87: 0, a88: 0 },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
