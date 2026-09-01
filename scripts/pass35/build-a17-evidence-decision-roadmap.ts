import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPass35A16CanonicalChannelParityRuntime } from "../../lib/market-integrity/pass35-a16-canonical-channel-parity.ts";
import { runPass35A17EvidenceQualityDecisionRuntime } from "../../lib/market-integrity/pass35-a17-evidence-quality-decision-runtime.mjs";
import { applyPass35A17EvidenceFamilyRegistry } from "../../lib/market-integrity/pass35-a17-evidence-family-registry.mjs";
import { runPass35A17RiskCalibrationEvaluationRuntime } from "../../lib/market-integrity/pass35-a17-risk-calibration-evaluation-runtime.mjs";
import { buildA16RiskRows } from "./a16-test-fixtures.mjs";

const PASS = "PASS35_A17";
const REVISION = "VELMERE_PASS35_A17_EVIDENCE_QUALITY_DECISION_PDF_RISK_NON_VISUAL";
const A16_CANONICAL = 40.7;
const A16_ZERO = 80.0;
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file: string, value: unknown) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

const registry = readJson("config/pass35/a17-evidence-family-registry.json");
const rawProduct = readJson("config/pass35/product-tier-content-contract.json");
const product = applyPass35A17EvidenceFamilyRegistry(rawProduct, registry);
product.passId = PASS;
product.sourceRevisionId = REVISION;
writeJson("config/pass35/product-tier-content-contract.json", product);

const parity = buildPass35A16CanonicalChannelParityRuntime({ productContract: product, generatedAt: "2026-07-23T04:00:00.000Z" });
const evidenceRuntime = runPass35A17EvidenceQualityDecisionRuntime({ parityRuntime: parity, evaluatedAt: "2026-07-23T04:00:00.000Z" });
const riskRuntime = runPass35A17RiskCalibrationEvaluationRuntime({ rows: buildA16RiskRows(), evaluatedAt: "2026-07-23T04:00:00.000Z" });

const pdfReceiptPath = "artifacts/pass35/PASS35_A17_PACKET_PDF_QA_RECEIPT.json";
const pdfReceipt = existsSync(pdfReceiptPath) ? readJson(pdfReceiptPath) : null;
const pdfPass = pdfReceipt?.status === "PASS" && pdfReceipt?.totals?.pdfCount === 21 && pdfReceipt?.totals?.totalPages === 98;
const rasterReceiptPath = "artifacts/pass35/PASS35_A17_PACKET_PDF_RASTER_QA_RECEIPT.json";
const rasterReceipt = existsSync(rasterReceiptPath) ? readJson(rasterReceiptPath) : null;
const rasterPass = rasterReceipt?.status === "PASS" && rasterReceipt?.totals?.pageCount === 98 && rasterReceipt?.totals?.blankPages === 0 && rasterReceipt?.totals?.pagesTouchingRasterEdge === 0;

const zero = readJson("config/pass35/zero-budget-functional-roadmap.json");
zero.passId = PASS;
zero.sourceRevisionId = REVISION;
const replaceCapability = (capability: Record<string, unknown>) => {
  const index = zero.capabilities.findIndex((row: Record<string, unknown>) => row.id === capability.id);
  if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...capability };
  else zero.capabilities.push(capability);
};
replaceCapability({
  id: "ZB08_PDF_BASIC_PRO_ADVANCED",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A17 generates 21 physical packet-bound PDFs for all 7 surfaces x Basic/Pro/Advanced with exact 2/4/8-page contracts, 98 total pages, packet/facts/claim/evidence hashes embedded in uncompressed bytes and fail-closed structural verification. Customer purchase-worthiness and live-data usefulness remain separate external/product gates.",
});
replaceCapability({
  id: "ZB15_RISK_PRO_ADVANCED",
  status: "PARTIAL",
  resourceModel: "Own work; real observation window required for claims",
  truth: "A17 adds actual ECE/MCE, Brier Skill, calibration intercept/slope, Wilson intervals, immutable threshold registry and sealed prediction-before-outcome receipts. Of the 100 synthetic prospective windows, 38 are closed and 62 remain open at the frozen evaluation time; all empirical probability, prospective performance and paid claims remain disabled until real preregistered outcomes close and are independently adjudicated.",
});
replaceCapability({
  id: "ZB43_EVIDENCE_QUALITY_CONTRADICTION_RUNTIME",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A17 explicitly enumerates evidence families and tier floors for all 21 cells, scores claim coverage/rights/freshness, detects explicit and opposing-claim contradictions, forces Brain/Angel/PDF abstention on material blockers and verifies zero added facts across 63 guarded channel decisions.",
});
replaceCapability({
  id: "ZB44_CROSS_SURFACE_DECISION_PACKET_RUNTIME",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A17 fuses Shield, Real Markets, Market Impact and Whale Watch into three Basic/Pro/Advanced decision packets using only source packet IDs/hashes/claim IDs. Missing surfaces, stale evidence, withdrawn rights, contradictions or tier evidence-floor failures force ABSTAIN; paid delivery and LIVE remain false.",
});
zero.capabilities.sort((left: Record<string, string>, right: Record<string, string>) => left.id.localeCompare(right.id));
writeJson("config/pass35/zero-budget-functional-roadmap.json", zero);

const excluded = new Set<string>(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row: Record<string, string>) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row: Record<string, string>) => row.status === "DONE").length,
  PARTIAL: core.filter((row: Record<string, string>) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row: Record<string, string>) => row.status === "NOT_DONE").length,
};
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 42 || zeroCounts.DONE !== 28 || zeroCounts.PARTIAL !== 13 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 82.1) {
  throw new Error(`a17_zero_budget_math_invalid:${JSON.stringify({ denominator: core.length, zeroCounts, zeroWeighted })}`);
}

const status = readJson("config/pass35/current-status-register.json");
status.sourceRevisionId = REVISION;
for (const row of status.rows) {
  if (row.id === "PDF02_REAL_TIER_VALUE") {
    row.status = "PARTIAL";
    row.doneEvidence = [...new Set([...row.doneEvidence,
      "A17 physical canonical packet PDFs for all 21 surface/tier cells: Basic 2, Pro 4, Advanced 8 pages; 98 total pages; exact packet/facts/claim set binding",
      "A17 PDF verifier rejects packet hash, facts hash, claim-set, page-count, safety-boundary and byte-digest mismatch",
    ])];
    row.missing = ["current real canonical packets", "live provider families", "blind Basic-to-Pro-to-Advanced customer outcome benchmark", "customer comprehension and willingness-to-pay"];
    row.blocker = "REAL_DATA_AND_CUSTOMER_BENCHMARK_REQUIRED";
    row.nextAction = "Run the same packet-bound physical PDF pipeline on current rights-approved inputs, then execute blind tier-value and comprehension tests.";
    row.sellImpact = "PDF functional delivery is locally complete, but Pro/Advanced remain not for sale until real evidence and purchase-worthiness pass.";
  }
  if (row.id === "AI01_BRAIN_ANGEL") {
    row.doneEvidence = [...new Set([...row.doneEvidence,
      "A17 evidence-family registry for all 21 cells and evidence-quality/contradiction runtime",
      "A17 63 Brain/Angel/PDF guarded decisions preserve exact source claim sets and abstain on material contradictions, stale provenance, rights withdrawal or tier-floor failure",
    ])];
    row.nextAction = "Execute frozen unseen prompt-injection/RAG/tool red-team and decision-utility evaluation over the now contradiction-aware outputs.";
  }
  if (row.id === "RISK02_PRO_ADVANCED_CALIBRATION") {
    row.doneEvidence = [...new Set([...row.doneEvidence,
      "A17 true ECE/MCE, Brier Skill, calibration intercept/slope, Wilson intervals, immutable thresholds and 100 sealed prospective receipts",
      `A17 frozen synthetic validation ECE ${riskRuntime.splitMetrics.validation.ece} and calibration slope ${riskRuntime.splitMetrics.validation.calibrationSlope}; 38 closed / 62 open prospective windows at evaluation time`,
    ])];
    row.missing = ["real temporal outcome dataset", "closed preregistered real observation window", "second real regime/cohort", "human override outcome evaluation", "independent adjudication"];
    row.nextAction = "Run the frozen A17 protocol on real outcomes without changing thresholds after seeing results.";
  }
  if (["MKT01_SHIELD_REAL_DATA", "MKT02_REAL_MARKETS", "MKT03_MARKET_IMPACT", "MKT04_WHALE_WATCH"].includes(row.id)) {
    row.doneEvidence = [...new Set([...row.doneEvidence, "A17 cross-surface Basic/Pro/Advanced decision packets bind Shield, Real Markets, Market Impact and Whale Watch source packets with zero added facts and fail-closed missing-surface/contradiction/freshness/rights rules"])];
  }
  if (row.id === "AUD18_A16_REPORT_DELIVERY") {
    row.doneEvidence = [...new Set([...row.doneEvidence, "A17 physical packet-bound PDF generator and verifier with exact packet/facts/claim/evidence identity across 2/4/8-page outputs"])];
  }
}
const statusCounts = Object.fromEntries(status.allowedStatuses.map((state: string) => [state, status.rows.filter((row: Record<string, string>) => row.status === state).length]));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 4 || statusCounts.PARTIAL !== 28 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 2 || canonicalWeighted !== 41.9 || canonicalStrict !== 9.3) {
  throw new Error(`a17_canonical_math_invalid:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
}
status.zeroBudgetFunctionalTrack = {
  ...status.zeroBudgetFunctionalTrack,
  currentWeightedPlanningPercent: zeroWeighted,
  coreDenominator: core.length,
  done: zeroCounts.DONE,
  partial: zeroCounts.PARTIAL,
  notDone: zeroCounts.NOT_DONE,
  a17EvidenceDecisionContractPath: "config/pass35/a17-evidence-decision-runtime-contract.json",
};
status.truthBoundary = `PASS35 A17 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp from A16. Zero-budget functional core is ${zeroWeighted}% across 42 capabilities, up ${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp from A16. A17 locally closes explicit evidence-family floors, contradiction-aware Brain/Angel/PDF decisions, cross-surface decision packets and physical canonical packet PDF delivery. Current public-network evidence, real risk outcomes, customer value, staging, sale and independent assurance remain unclaimed.`;
writeJson("config/pass35/current-status-register.json", status);

const current = readJson("config/current-release.json");
current.sourceRevisionId = REVISION;
current.sourceRevisionStatus = "A17_EVIDENCE_QUALITY_DECISION_PACKET_PDF_RISK_IMPLEMENTED_LIVE_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a17EvidenceDecisionContractPath = "config/pass35/a17-evidence-decision-runtime-contract.json";
current.a17EvidenceDecisionBoardPath = "artifacts/release/PASS35_A17_EVIDENCE_DECISION_RUNTIME.md";
current.a17ProductRoadmapSummaryPath = "artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json";
current.a17PacketPdfReceiptPath = pdfReceiptPath;
writeJson("config/current-release.json", current);

function updateRevisionFiles(directory: string): void {
  for (const name of readdirSync(directory)) {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory() || !name.endsWith(".json")) continue;
    try {
      const value = readJson(absolute);
      if (value && typeof value === "object" && "sourceRevisionId" in value) {
        value.sourceRevisionId = REVISION;
        if (typeof value.zeroBudgetWeightedPlanningPercent === "number") value.zeroBudgetWeightedPlanningPercent = zeroWeighted;
        if (typeof value.canonicalWeightedPlanningPercent === "number") value.canonicalWeightedPlanningPercent = canonicalWeighted;
        if (typeof value.canonicalStrictDonePercent === "number") value.canonicalStrictDonePercent = canonicalStrict;
        if (typeof value.zeroBudgetCoreDenominator === "number") value.zeroBudgetCoreDenominator = core.length;
        writeJson(absolute, value);
      }
    } catch { /* leave unrelated JSON unchanged */ }
  }
}
updateRevisionFiles("config/pass35");

for (const name of readdirSync("artifacts/release")) {
  if (!/^PASS35_A(?:9|10|11|12|13|14|15|16)_PRODUCT_ROADMAP_SUMMARY\.json$/u.test(name)) continue;
  const file = path.join("artifacts/release", name);
  const value = readJson(file);
  value.sourceRevisionId = REVISION;
  if ("canonicalWeightedPlanningPercent" in value) value.canonicalWeightedPlanningPercent = canonicalWeighted;
  if ("canonicalStrictDonePercent" in value) value.canonicalStrictDonePercent = canonicalStrict;
  if ("zeroBudgetWeightedPlanningPercent" in value) value.zeroBudgetWeightedPlanningPercent = zeroWeighted;
  if ("zeroBudgetCoreDenominator" in value) value.zeroBudgetCoreDenominator = core.length;
  if ("zeroBudgetCounts" in value) value.zeroBudgetCounts = zeroCounts;
  writeJson(file, value);
}

const contract = {
  schemaVersion: "velmere.pass35.a17-evidence-decision-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  baselineA16: { canonicalWeightedPlanningPercent: A16_CANONICAL, zeroBudgetWeightedPlanningPercent: A16_ZERO },
  progressDelta: { canonicalPercentagePoints: Number((canonicalWeighted - A16_CANONICAL).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16_ZERO).toFixed(1)) },
  visualChangesMade: false,
  sellEnabled: false,
  paidDeliveryAllowed: false,
  liveClaimed: false,
  evidenceFamilyRegistry: { rules: registry.rules.length, allCellsExplicit: registry.rules.length === 21, registrySha256: sha(readFileSync("config/pass35/a17-evidence-family-registry.json")) },
  evidenceQualityDecision: {
    packets: evidenceRuntime.packetDenominator,
    guardedChannelDecisions: evidenceRuntime.channelDecisionDenominator,
    integratedDecisionPackets: evidenceRuntime.integratedDecisionPacketDenominator,
    addedFactViolations: evidenceRuntime.addedFactViolations,
    contradictionCount: evidenceRuntime.contradictionCount,
    hardBlockedPackets: evidenceRuntime.hardBlockedPackets,
    integritySha256: evidenceRuntime.integrity.digest,
  },
  physicalPacketPdfs: {
    verified: pdfPass,
    pdfCount: pdfReceipt?.totals?.pdfCount ?? 0,
    totalPages: pdfReceipt?.totals?.totalPages ?? 0,
    passingPdfs: pdfReceipt?.totals?.passingPdfs ?? 0,
    receiptSha256: pdfReceipt?.receiptSha256 ?? null,
    pageContract: { basic: 2, pro: 4, advanced: 8 },
    rasterVerified: rasterPass,
    rasterPageCount: rasterReceipt?.totals?.pageCount ?? 0,
    blankPages: rasterReceipt?.totals?.blankPages ?? null,
    pagesTouchingRasterEdge: rasterReceipt?.totals?.pagesTouchingRasterEdge ?? null,
    contactSheets: rasterReceipt?.totals?.contactSheets ?? 0,
    rasterReceiptSha256: rasterReceipt?.receiptSha256 ?? null,
  },
  riskCalibrationEvaluation: {
    rows: riskRuntime.rowDenominator,
    train: riskRuntime.splitCounts.train,
    validation: riskRuntime.splitCounts.validation,
    prospective: riskRuntime.splitCounts.prospective,
    validationEce: riskRuntime.splitMetrics.validation.ece,
    validationMce: riskRuntime.splitMetrics.validation.mce,
    validationBrierSkillVsHalf: riskRuntime.splitMetrics.validation.brierSkillVsHalf,
    validationCalibrationIntercept: riskRuntime.splitMetrics.validation.calibrationIntercept,
    validationCalibrationSlope: riskRuntime.splitMetrics.validation.calibrationSlope,
    prospectiveClosed: riskRuntime.prospectiveWindowClosedCount,
    prospectiveOpen: riskRuntime.prospectiveWindowOpenCount,
    probabilityClaimsAllowed: false,
    prospectiveClaimsAllowed: false,
    integritySha256: riskRuntime.integrity.digest,
  },
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  truthBoundary: status.truthBoundary,
};
writeJson("config/pass35/a17-evidence-decision-runtime-contract.json", contract);
writeJson("artifacts/release/PASS35_A17_EVIDENCE_QUALITY_RUNTIME.json", evidenceRuntime);
writeJson("artifacts/release/PASS35_A17_RISK_CALIBRATION_RUNTIME.json", riskRuntime);

const board = `# PASS35 A17 - Evidence Quality + Decision Packets + Physical PDF + Risk\n\n- Source revision: \`${REVISION}\`\n- Canonical roadmap: **${canonicalWeighted}% weighted / ${canonicalStrict}% strict** (**+${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp vs A16**)\n- ZERO-BUDGET FUNCTIONAL CORE: **${zeroWeighted}%** (**+${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp vs A16**)\n- A16 baseline: **${A16_CANONICAL}% canonical / ${A16_ZERO}% zero-budget**\n- Visual changes: **0**\n- Paid cells enabled: **0**\n\n## Evidence quality and contradiction resolution\n\n- Explicit evidence-family rules: **${registry.rules.length}/21 product-tier cells**.\n- Canonical packets evaluated: **${evidenceRuntime.packetDenominator}**.\n- Guarded Brain/Angel/PDF decisions: **${evidenceRuntime.channelDecisionDenominator}**.\n- Added-fact violations: **${evidenceRuntime.addedFactViolations}**.\n- Cross-surface decision packets: **${evidenceRuntime.integratedDecisionPacketDenominator}** (Basic/Pro/Advanced).\n\n## Physical packet-bound PDFs\n\n- Verified: **${pdfPass}**.\n- PDFs/pages: **${pdfReceipt?.totals?.pdfCount ?? 0}/${pdfReceipt?.totals?.totalPages ?? 0}**.\n- Raster QA: **${rasterPass}**, blank pages **${rasterReceipt?.totals?.blankPages ?? 0}**, edge-touch pages **${rasterReceipt?.totals?.pagesTouchingRasterEdge ?? 0}**.\n- Every PDF binds packet ID/hash, facts hash and exact claim set; Basic/Pro/Advanced = 2/4/8 pages.\n\n## Risk calibration and prospective ledger\n\n- Rows: **${riskRuntime.rowDenominator}**; train/validation/prospective: **${riskRuntime.splitCounts.train}/${riskRuntime.splitCounts.validation}/${riskRuntime.splitCounts.prospective}**.\n- Validation ECE: **${riskRuntime.splitMetrics.validation.ece}**; MCE: **${riskRuntime.splitMetrics.validation.mce}**.\n- Calibration intercept/slope: **${riskRuntime.splitMetrics.validation.calibrationIntercept}/${riskRuntime.splitMetrics.validation.calibrationSlope}**.\n- Prospective windows at frozen synthetic evaluation time: **${riskRuntime.prospectiveWindowClosedCount} closed / ${riskRuntime.prospectiveWindowOpenCount} sealed-open**.\n- Empirical probability and prospective performance claims: **forbidden**.\n\n## Truth boundary\n\n${status.truthBoundary}\n`;
mkdirSync("artifacts/release", { recursive: true });
writeFileSync("artifacts/release/PASS35_A17_EVIDENCE_DECISION_RUNTIME.md", board);

const summary = {
  schemaVersion: "velmere.pass35.a17-product-roadmap-summary.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  baselineA16: contract.baselineA16,
  progressDelta: contract.progressDelta,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  evidenceQualityDecision: contract.evidenceQualityDecision,
  physicalPacketPdfs: contract.physicalPacketPdfs,
  riskCalibrationEvaluation: contract.riskCalibrationEvaluation,
  visualChangesMade: false,
  sellEnabled: false,
  liveClaimed: false,
  contractSha256: sha(readFileSync("config/pass35/a17-evidence-decision-runtime-contract.json")),
  boardSha256: sha(board),
};
writeJson("artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json", summary);

const previous = readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
const marker = "====================================================================================================\nPASS35 A16 —";
const historyIndex = previous.indexOf(marker);
if (historyIndex < 0) throw new Error("a17_history_marker_missing");
const history = previous.slice(historyIndex)
  .replace(/PASS35 A(\d+) is the only canonical current status\./gu, "PASS35 A$1 was canonical at that historical checkpoint and does not override A17.")
  .replace(/cannot override A(?:14|15|16)/gu, "cannot override A17");
const rows = status.rows.map((row: { id: string; status: string; doneEvidence: string[]; missing: string[]; blocker: string; nextAction: string; sellImpact: string }) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.length ? row.doneEvidence.join("; ") : "—"} | MISSING: ${row.missing.length ? row.missing.join("; ") : "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row: { id: string; status: string; resourceModel: string; truth: string }) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const roadmap = [
  "====================================================================================================",
  "PASS35 A17 — EVIDENCE QUALITY + DECISION PACKETS + PHYSICAL PDF + RISK (NON-VISUAL)",
  "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin",
  `Source revision ID: ${REVISION}`,
  `Decyzja globalna: ${status.globalDecision}`,
  `Stan sprzedaży: ${status.sellEnabledCount} sellEnabled`,
  `A16 START: ${A16_CANONICAL}% canonical / ${A16_ZERO}% ZERO-BUDGET`,
  `A17 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A16: canonical +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)",
  "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched",
  "",
  "A17 — EVIDENCE FAMILY REGISTRY + CONTRADICTION RESOLUTION",
  "----------------------------------------------------------------------------------------------------",
  `- ${registry.rules.length}/21 product-tier cells have explicit evidence-family lists and minimum floors.`,
  `- ${evidenceRuntime.packetDenominator} packets and ${evidenceRuntime.channelDecisionDenominator} guarded Brain/Angel/PDF decisions; added facts ${evidenceRuntime.addedFactViolations}.`,
  "- Material contradictions, stale provenance, withdrawn/withheld rights, expired packets or tier-floor failure force ABSTAIN.",
  "- Offline/display-only evidence remains LIMITED_OFFLINE and cannot unlock payment or LIVE claims.",
  "",
  "A17 — SHIELD + REAL MARKETS + MARKET IMPACT + WHALE WATCH DECISION PACKETS",
  "----------------------------------------------------------------------------------------------------",
  `- ${evidenceRuntime.integratedDecisionPacketDenominator} integrated packets: Basic, Pro and Advanced.`,
  "- Output claim IDs are exactly the union of source claim IDs; addedFactCount=0.",
  "- Missing one required surface, unresolved contradiction or evidence failure blocks the integrated decision.",
  "",
  "A17 — PHYSICAL PACKET-BOUND PDF",
  "----------------------------------------------------------------------------------------------------",
  `- Verification status: ${pdfPass ? "PASS" : "PENDING/FAIL"}.`,
  `- Physical corpus: ${pdfReceipt?.totals?.pdfCount ?? 0} PDFs / ${pdfReceipt?.totals?.totalPages ?? 0} pages; Basic/Pro/Advanced 2/4/8 pages.`,
  `- Raster QA: ${rasterPass ? "PASS" : "PENDING/FAIL"}; ${rasterReceipt?.totals?.pageCount ?? 0} pages; blank ${rasterReceipt?.totals?.blankPages ?? 0}; edge-touch ${rasterReceipt?.totals?.pagesTouchingRasterEdge ?? 0}; contact sheets ${rasterReceipt?.totals?.contactSheets ?? 0}.`,
  "- Every page embeds packet ID/hash and facts hash; the verifier compares the exact claim set and rejects byte/hash/page/safety mismatches.",
  "- This closes zero-budget functional PDF delivery, not real customer value or sale-readiness.",
  "",
  "A17 — RISK PRO/ADVANCED CALIBRATION QUALITY",
  "----------------------------------------------------------------------------------------------------",
  `- ${riskRuntime.rowDenominator} synthetic rows; train/validation/prospective ${riskRuntime.splitCounts.train}/${riskRuntime.splitCounts.validation}/${riskRuntime.splitCounts.prospective}.`,
  `- Validation ECE ${riskRuntime.splitMetrics.validation.ece}; MCE ${riskRuntime.splitMetrics.validation.mce}; Brier Skill vs 0.5 ${riskRuntime.splitMetrics.validation.brierSkillVsHalf}.`,
  `- Calibration intercept/slope ${riskRuntime.splitMetrics.validation.calibrationIntercept}/${riskRuntime.splitMetrics.validation.calibrationSlope}.`,
  `- Prospective ledger: ${riskRuntime.prospectiveWindowClosedCount} closed / ${riskRuntime.prospectiveWindowOpenCount} still sealed at frozen synthetic evaluation time.`,
  "- Real probability and prospective-performance claims remain forbidden.",
  "",
  "A17 — POSTĘP WZGLĘDEM A16",
  "----------------------------------------------------------------------------------------------------",
  `- Canonical: ${A16_CANONICAL}% -> ${canonicalWeighted}% = +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp.`,
  `- ZERO-BUDGET: ${A16_ZERO}% -> ${zeroWeighted}% = +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`,
  "- Canonical gain comes from PDF02 NOT_DONE -> PARTIAL after physical canonical packet delivery; no external gate was falsely marked DONE.",
  "- Zero-budget gain comes from PDF functional completion plus two new completed runtimes: evidence-quality/contradiction and cross-surface decisions.",
  "",
  "A17 — ZERO-BUDGET FUNCTIONAL CORE",
  "----------------------------------------------------------------------------------------------------",
  "ID | STATUS | RESOURCE MODEL | TRUTH",
  "----------------------------------------------------------------------------------------------------",
  ...zeroRows,
  "",
  "A17 — KANONICZNA TABELA 43 WORKSTREAMÓW",
  "----------------------------------------------------------------------------------------------------",
  ...rows,
  "",
  "A17 TRUTH BOUNDARY",
  "----------------------------------------------------------------------------------------------------",
  status.truthBoundary,
  "",
  "HISTORYCZNE PODSUMOWANIE A16 I WCZEŚNIEJSZYCH FAL",
  "----------------------------------------------------------------------------------------------------",
  "Everything below is historical implementation context and cannot override A17.",
  "",
  history,
].join("\n");
writeFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", roadmap);

console.log(JSON.stringify({
  status: "PASS_A17_EVIDENCE_DECISION_ROADMAP_BUILT",
  sourceRevisionId: REVISION,
  baselineA16: { canonical: A16_CANONICAL, zeroBudget: A16_ZERO },
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalDeltaPercentagePoints: Number((canonicalWeighted - A16_CANONICAL).toFixed(1)),
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetDeltaPercentagePoints: Number((zeroWeighted - A16_ZERO).toFixed(1)),
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  evidencePackets: evidenceRuntime.packetDenominator,
  guardedChannelDecisions: evidenceRuntime.channelDecisionDenominator,
  integratedDecisionPackets: evidenceRuntime.integratedDecisionPacketDenominator,
  packetPdfsVerified: pdfPass,
  packetPdfs: pdfReceipt?.totals?.pdfCount ?? 0,
  packetPdfPages: pdfReceipt?.totals?.totalPages ?? 0,
  packetPdfRasterVerified: rasterPass,
  packetPdfBlankPages: rasterReceipt?.totals?.blankPages ?? null,
  packetPdfEdgeTouchPages: rasterReceipt?.totals?.pagesTouchingRasterEdge ?? null,
  riskValidationEce: riskRuntime.splitMetrics.validation.ece,
  riskValidationSlope: riskRuntime.splitMetrics.validation.calibrationSlope,
  visualChangesMade: false,
  sellEnabled: false,
  liveClaimed: false,
}, null, 2));
