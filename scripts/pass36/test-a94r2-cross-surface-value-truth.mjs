#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  evaluateCrossSurfaceValueTruth,
  sealCrossSurfacePolicy,
} from "../../lib/product/cross-surface-value-truth.mjs";

const root = process.cwd();
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
function descendantIndex() {
  const dir = path.join(root, "config/pass36");
  const index = new Map();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith("-current-root-descendant-manifest.json")) continue;
    const value = read(path.join("config/pass36", name));
    if (typeof value.revisionId === "string") index.set(value.revisionId, value);
  }
  return index;
}

function orderedChainFromAncestor(authority, ancestorRevision) {
  const index = descendantIndex();
  const reversed = [];
  const seen = new Set();
  let revision = authority.authorityRevisionId;
  while (revision && revision !== ancestorRevision) {
    if (seen.has(revision)) throw new Error(`descendant_chain_cycle:${revision}`);
    seen.add(revision);
    const entry = index.get(revision);
    if (!entry) throw new Error(`descendant_manifest_missing:${revision}`);
    reversed.push(entry);
    revision = entry.parentRevisionId;
  }
  if (revision !== ancestorRevision) throw new Error(`ancestor_not_reached:${ancestorRevision}`);
  return reversed.reverse();
}

const authority = read("config/pass36/current-release-authority.json");
const descendantChain = orderedChainFromAncestor(authority, "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT");
const baseline = {
  policy: read("config/pass36/a94r2-cross-surface-value-truth-policy.json"),
  authority,
  state: read("config/pass36/a94r2-action-required-current-state.json"),
  pdfSummary: read("config/pass36/a94r2-retained-pdf-evidence-summary.json"),
  routeRegistry: read("config/pass15/route-export-ast-registry.json"),
  auditPolicy: read("config/pass36/a82-audit-real-contract-matrix-policy.json"),
  auditIntake: read("evaluation/pass36/a82-real-contract-intake-index.json"),
  pdfRetention: read("config/pass36/a88r1-physical-pdf-evidence-retention-index.json"),
  shieldPolicy: read("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json"),
  realMarketsPolicy: read("config/pass36/a86-real-markets-cross-asset-policy.json"),
  impactWhalePolicy: read("config/pass36/a87-market-impact-whale-watch-policy.json"),
  brainAngelRiskPolicy: read("config/pass36/a88-brain-angel-risk-eval-policy.json"),
  semanticPolicy: read("config/pass36/a88r1-semantic-route-privacy-pdf-policy.json"),
  currentDescendant: descendantChain.at(-1) ?? null,
  descendantChain,
};
let assertions = 0;
function equal(actual, expected, message) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${message}:expected=${expected}:actual=${actual}`);
}
function clone(value) { return structuredClone(value); }

const clean = evaluateCrossSurfaceValueTruth(baseline);
equal(clean.status, "PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT", "clean consolidated truth passes");
equal(clean.failures.length, 0, "clean consolidated truth has no failures");
equal(clean.paidSkuCreditsGranted, 0, "clean policy grants no paid credit");
equal(clean.realEvidenceCreditsGranted, 0, "clean policy grants no real evidence credit");

const mutations = [
  ["unbound descendant authority", (x) => { x.currentDescendant.parentRevisionId = "UNRELATED_PARENT"; x.descendantChain[x.descendantChain.length - 1].parentRevisionId = "UNRELATED_PARENT"; }],
  ["audit denominator shrink", (x) => { x.policy.surfaces.audit.realCaseDenominator = 49; x.policy = sealCrossSurfacePolicy(x.policy); }],
  ["fake official tool run", (x) => { x.auditIntake.summary.officialToolReceipts = 1; }],
  ["fake real audit readiness", (x) => { x.auditIntake.summary.evidenceReady = 1; }],
  ["pdf denominator shrink", (x) => { x.pdfSummary.qa.documents = 449; }],
  ["pdf blank page hidden", (x) => { x.pdfSummary.qa.blankPages = 1; }],
  ["shield denominator collapse", (x) => { x.state.denominators.shieldAssets.required = 317; }],
  ["shield paid promotion", (x) => { x.authority.planes.shieldFullCatalogTierMatrix.paidGateEligible = true; }],
  ["real markets unavailable drop", (x) => { x.state.denominators.realMarketsInstruments.unavailableOrBlocked = 582; }],
  ["realized slippage fake row", (x) => { x.authority.planes.marketImpactWhaleWatchMatrix.realizedSlippageRows = 1; }],
  ["model run fake credit", (x) => { x.authority.planes.brainAngelRiskMultilingualEval.realModelExecutions = 1; }],
  ["calibration fake credit", (x) => { x.authority.planes.brainAngelRiskMultilingualEval.realCalibrationWindowsClosed = 1; }],
  ["basic paid promotion", (x) => { x.state.skuDecisions.basic.paid = true; }],
  ["pro paid promotion", (x) => { x.policy.skuDecisions.pro.paid = true; x.policy = sealCrossSurfacePolicy(x.policy); }],
  ["advanced paid promotion", (x) => { x.state.skuDecisions.advanced.paid = true; }],
  ["global sale promotion", (x) => { x.authority.claims.saleEnabled = true; }],
  ["world class promotion", (x) => { x.policy.claims.worldClassProven = true; x.policy = sealCrossSurfacePolicy(x.policy); }],
];
let killed = 0;
for (const [name, mutate] of mutations) {
  const value = clone(baseline);
  mutate(value);
  const evaluated = evaluateCrossSurfaceValueTruth(value);
  assertions += 1;
  if (evaluated.failures.length === 0) throw new Error(`semantic_mutation_survived:${name}`);
  killed += 1;
}
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a94r2.cross-surface-value-truth.test.v1",
  status: "PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_MUTATIONS",
  assertions,
  semanticMutations: mutations.length,
  semanticMutationsKilled: killed,
  mutationKillRate: killed / mutations.length,
  paidSkuCreditsGranted: 0,
  realEvidenceCreditsGranted: 0,
  truthBoundary: baseline.policy.truthBoundary,
}, null, 2));
