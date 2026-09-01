#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  runA84FixtureHarness,
  verifyA84Runtime,
} from "../../lib/worldclass/pass36-a84-shield-full-catalog-tier-matrix-runtime.ts";
import {
  runA85FixtureHarness,
  verifyA85Runtime,
} from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.ts";
import {
  runA86FixtureHarness,
  verifyA86Runtime,
} from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.ts";
import {
  runA87FixtureHarness,
  verifyA87Runtime,
} from "../../lib/worldclass/pass36-a87-market-impact-whale-watch-runtime.ts";
import {
  runA88FixtureHarness,
  verifyA88Runtime,
} from "../../lib/worldclass/pass36-a88-brain-angel-risk-eval-runtime.ts";

const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const EXCLUDED_DIRS = new Set(["node_modules", "artifacts", ".git", ".next", ".cache", ".turbo"]);

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const sha256 = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf8"));

function sourceFingerprint(root: string) {
  const rows: Array<{ path: string; bytes: number; sha256: string; mode: number }> = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      if (entry.isDirectory() && (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith(".next-"))) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) { walk(absolute); continue; }
      if (!entry.isFile()) continue;
      if (relative.startsWith(".velmere/pass15-diagnostics/")) continue;
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes), mode: fs.statSync(absolute).mode & 0o777 });
    }
  };
  walk(root);
  return {
    files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(rows.map((row) => `${row.path}\t${row.bytes}\t${row.mode.toString(8)}\t${row.sha256}`).join("\n")),
  };
}

const root = process.cwd();
const before = sourceFingerprint(root);
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });

const a84Policy = readJson("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json");
const a85Policy = readJson("config/pass36/a85-shield-pro-map-full-depth-policy.json");
const a86Policy = readJson("config/pass36/a86-real-markets-cross-asset-policy.json");
const a87Policy = readJson("config/pass36/a87-market-impact-whale-watch-policy.json");
const a88Policy = readJson("config/pass36/a88-brain-angel-risk-eval-policy.json");

const a84 = await runA84FixtureHarness(root, a84Policy);
const a85 = await runA85FixtureHarness(root, a85Policy);
const a86 = await runA86FixtureHarness(root, a86Policy);
const a87 = await runA87FixtureHarness(root, a87Policy);
const a88 = runA88FixtureHarness(a88Policy);

check("a84:verified", verifyA84Runtime(a84, a84Policy, a84.integrity.digest));
check("a84:denominators", a84.denominators.activeAssets === 318 && a84.denominators.tierPackets === 954 && a84.denominators.semanticMutations === 11448 && a84.denominators.mutationKilled === 11448, a84.denominators);
check("a84:terminal-states", Object.values(a84.stateCounts).reduce((sum, value) => sum + value, 0) === a84.denominators.observationRows && ["AVAILABLE", "STALE", "CONFLICTED", "FAILED", "RATE_LIMITED"].every((state) => (a84.stateCounts as Record<string, number>)[state] > 0) && (a84.stateCounts as Record<string, number>).UNAVAILABLE >= 0, a84.stateCounts);
check("a84:invariants", Object.values(a84.invariants).every((value) => value === 0), a84.invariants);
check("a84:no-promotion", a84.realFullCatalogSnapshotsVerified === 0 && a84.rightsApprovedAssets === 0 && !a84.currentPublicNetworkExecuted && !a84.productionBrowserExecuted && !a84.customerValueProven && !a84.paidGateEligible && !a84.liveProven && !a84.saleEnabled && !a84.worldClassProven);

check("a85:verified", verifyA85Runtime(a85, a85Policy, a85.integrity.digest));
check("a85:denominators", a85.denominators.activeAssets === 318 && a85.denominators.tierPackets === 954 && a85.denominators.semanticMutations === 15264 && a85.denominators.mutationKilled === 15264, a85.denominators);
check("a85:depth-states", ["AVAILABLE", "STALE", "CONFLICTED", "UNAVAILABLE"].every((state) => (a85.depthCounts as Record<string, number>)[state] > 0), a85.depthCounts);
check("a85:binding-states", Object.values(a85.bindingCounts).every((value) => value > 0), a85.bindingCounts);
check("a85:label-states", Object.values(a85.labelCounts).every((value) => value > 0), a85.labelCounts);
check("a85:invariants", Object.values(a85.invariants).every((value) => value === 0), a85.invariants);
check("a85:no-promotion", a85.realFullDepthCasesVerified === 0 && a85.rightsApprovedAssets === 0 && a85.productionBrowserAssets === 0 && a85.realEntitlementsVerified === 0 && a85.customerValueLabeledAssets === 0 && !a85.paidGateEligible && !a85.liveProven && !a85.saleEnabled);

const a86FieldStates = a86.packets.flatMap((packet) => packet.fields.map((field) => field.state));
const a86StateCounts = Object.fromEntries(["AVAILABLE", "NOT_APPLICABLE_VERIFIED", "STALE", "CONFLICTED", "FAILED", "UNAVAILABLE"].map((state) => [state, a86FieldStates.filter((row) => row === state).length]));
check("a86:verified", verifyA86Runtime(a86, a86Policy, a86.integrity.digest));
check("a86:denominators", a86.denominators.instruments === 583 && a86.denominators.fieldRows === 5830 && a86.denominators.tierPackets === 1749 && a86.denominators.semanticMutations === 31482 && a86.denominators.mutationKilled === 31482, a86.denominators);
check("a86:asset-classes", Object.keys(a86.catalog.classCounts).length === 7 && Object.values(a86.catalog.classCounts).every((value) => value > 0), a86.catalog.classCounts);
check("a86:field-states", Object.values(a86StateCounts).every((value) => value > 0), a86StateCounts);
check("a86:invariants", Object.values(a86.invariants).every((value) => value === 0), a86.invariants);
check("a86:no-promotion", a86.catalog.liveDataRows === 0 && a86.catalog.rightsApprovedRows === 0 && a86.realIntake.fullyVerified === 0 && !a86.exactA80CandidateBound && !a86.currentProviderEvidenceVerified && !a86.providerRightsApproved && !a86.productionBrowserExecuted && !a86.customerValueProven && !a86.paidGateEligible && !a86.liveProven && !a86.saleEnabled && !a86.worldClassProven);

check("a87:verified", verifyA87Runtime(a87, a87Policy, a87.integrity.digest));
check("a87:denominators", a87.denominators.activeAssets === 318 && a87.denominators.tierPackets === 1908 && a87.denominators.semanticMutations === 34344 && a87.denominators.mutationKilled === 34344, a87.denominators);
check("a87:invariants", Object.values(a87.invariants).every((value) => value === 0), a87.invariants);
check("a87:all-surfaces", ["market_impact", "whale_watch"].every((surface) => a87.packets.filter((packet) => packet.surface === surface).length === 954));
check("a87:no-promotion", a87.realIntake.fullyVerified === 0 && !a87.exactA80CandidateBound && !a87.currentProviderEvidenceVerified && !a87.providerRightsApproved && !a87.productionBrowserExecuted && !a87.realizedExecutionValidated && !a87.continuousMonitoringExecuted && !a87.customerValueProven && !a87.paidGateEligible && !a87.liveProven && !a87.saleEnabled && !a87.worldClassProven);

const expectedA88Decisions = [
  "ALLOW_INFORMATIONAL_ANALYSIS",
  "ABSTAIN_MATERIAL_CONTRADICTION",
  "ABSTAIN_MISSING_OR_STALE_EVIDENCE",
  "ABSTAIN_INDIVIDUALIZED_ADVICE",
  "REJECT_SECURITY_POLICY",
  "REJECT_INPUT_CONTRACT",
  "REJECT_EVASION_OR_CONCEALMENT",
  "REJECT_GUARANTEE_OR_CERTIFICATION",
  "REJECT_UNCALIBRATED_PROBABILITY",
];
check("a88:verified", verifyA88Runtime(a88, a88.integrity.digest));
check("a88:denominators", a88.denominators.cases === 360 && a88.denominators.channelProjections === 1800 && a88.denominators.semanticMutations === 5760 && a88.denominators.mutationKilled === 5760 && a88.denominators.mismatchCount === 0, a88.denominators);
check("a88:locale-parity", ["pl", "en", "de"].every((locale) => a88.localeCounts[locale] === 120), a88.localeCounts);
check("a88:tier-parity", ["basic", "pro", "advanced"].every((tier) => a88.tierCounts[tier] === 120), a88.tierCounts);
check("a88:surface-parity", ["brain", "angel", "risk"].every((surface) => a88.surfaceCounts[surface] === 120), a88.surfaceCounts);
check("a88:decision-coverage", expectedA88Decisions.every((decision) => (a88.decisionCounts[decision] ?? 0) > 0), a88.decisionCounts);
check("a88:invariants", Object.values(a88.invariants).every((value) => value === 0), a88.invariants);
check("a88:no-promotion", a88.realEvalCasesVerified === 0 && a88.customerDecisionUtilityLabels === 0 && a88.independentAdjudications === 0 && a88.realCalibrationWindowsClosed === 0 && !a88.paidGateEligible && !a88.liveProven && !a88.saleEnabled);

const allPackets = [...a84.packets, ...a85.packets, ...a86.packets, ...a87.packets, ...a88.packets];
check("cross-surface:no-sale", allPackets.every((packet) => !(packet as { saleEnabled?: boolean }).saleEnabled), allPackets.length);
check("cross-surface:no-live", allPackets.every((packet) => !(packet as { liveProven?: boolean }).liveProven), allPackets.length);
check("cross-surface:unique-packet-ids", new Set(allPackets.map((packet) => (packet as { packetId?: string; caseId?: string }).packetId ?? (packet as { caseId?: string }).caseId)).size === allPackets.length, allPackets.length);

const after = sourceFingerprint(root);
check("source:immutable", canonicalJson(before) === canonicalJson(after), { before, after });

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r44p3.product-data-ai-matrix-test-receipt.v1",
  revisionId: REVISION,
  parentRevisionId: PARENT,
  generatedAt: "2026-08-02T07:45:00.000Z",
  status: failed.length ? "FAIL_A102R44P3_PRODUCT_DATA_AI_MATRIX" : "PASS_A102R44P3_LOCAL_PRODUCT_DATA_AI_MATRIX_NO_REAL_OR_LIVE_CREDIT",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  sourceBefore: before,
  sourceAfter: after,
  matrices: {
    shield: { assets: a84.denominators.activeAssets, tierPackets: a84.denominators.tierPackets, semanticMutations: a84.denominators.semanticMutations, terminalStates: a84.stateCounts },
    shieldProMap: { assets: a85.denominators.activeAssets, tierPackets: a85.denominators.tierPackets, semanticMutations: a85.denominators.semanticMutations, depthStates: a85.depthCounts, bindings: a85.bindingCounts, labels: a85.labelCounts },
    realMarkets: { instruments: a86.denominators.instruments, fieldRows: a86.denominators.fieldRows, tierPackets: a86.denominators.tierPackets, semanticMutations: a86.denominators.semanticMutations, fieldStates: a86StateCounts, assetClasses: a86.catalog.classCounts },
    impactWhale: { assets: a87.denominators.activeAssets, tierPackets: a87.denominators.tierPackets, semanticMutations: a87.denominators.semanticMutations },
    brainAngelRisk: { cases: a88.denominators.cases, projections: a88.denominators.channelProjections, semanticMutations: a88.denominators.semanticMutations, decisions: a88.decisionCounts, locales: a88.localeCounts, tiers: a88.tierCounts, surfaces: a88.surfaceCounts },
  },
  realCredit: {
    shield: 0,
    shieldProMap: 0,
    realMarkets: 0,
    impactWhale: 0,
    brainAngelRisk: 0,
    providerRights: 0,
    productionBrowser: 0,
    saleEnabled: false,
    liveProven: false,
  },
  failures: failed,
  checks,
  truthBoundary: "This receipt closes current-byte local execution of the inherited Shield, Shield Pro/Map, Real Markets, Market Impact/Whale Watch and Brain/Angel/Risk fixture matrices. It proves deterministic local terminal-state, tier, identity, safety and mutation contracts only; real provider data, rights, customer value, production browser, paid delivery, LIVE and sale remain unproven and disabled.",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
