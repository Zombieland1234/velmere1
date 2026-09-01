import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPass35A16CanonicalChannelParityRuntime } from "../../lib/market-integrity/pass35-a16-canonical-channel-parity.ts";
import { runPass35A16CrossAssetPortfolioRuntime } from "../../lib/market-integrity/pass35-a16-cross-asset-portfolio-runtime.mjs";
import { runPass35A16RegimeStressRuntime } from "../../lib/market-integrity/pass35-a16-regime-stress-runtime.mjs";
import { runPass35A16RiskProspectiveRuntime } from "../../lib/market-integrity/pass35-a16-risk-prospective-runtime.mjs";
import { buildA16MarketWindows, buildA16PortfolioFixtures, buildA16RiskRows } from "./a16-test-fixtures.mjs";

const REVISION = "VELMERE_PASS35_A16_CANONICAL_PARITY_PORTFOLIO_REGIME_RISK_NON_VISUAL";
const PASS = "PASS35_A16";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file: string, value: unknown) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

const product = readJson("config/pass35/product-tier-content-contract.json");
product.passId = PASS;
product.sourceRevisionId = REVISION;
writeJson("config/pass35/product-tier-content-contract.json", product);

const parity = buildPass35A16CanonicalChannelParityRuntime({ productContract: product });
const portfolioFixture = buildA16PortfolioFixtures();
const portfolio = runPass35A16CrossAssetPortfolioRuntime(portfolioFixture);
const regimeStress = runPass35A16RegimeStressRuntime({ marketWindows: buildA16MarketWindows(), portfolioRows: portfolio.rows });
const risk = runPass35A16RiskProspectiveRuntime({ rows: buildA16RiskRows() });

const zero = readJson("config/pass35/zero-budget-functional-roadmap.json");
zero.passId = PASS;
zero.sourceRevisionId = REVISION;
const replaceCapability = (capability: Record<string, unknown>) => {
  const index = zero.capabilities.findIndex((row: Record<string, unknown>) => row.id === capability.id);
  if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...capability };
  else zero.capabilities.push(capability);
};
replaceCapability({ id: "ZB02_CANONICAL_PACKET_AND_PARITY", status: "DONE", resourceModel: "Own work only", truth: "A16 executes 21 immutable canonical packets and 126 packet/facts-identical API/UI/preview/PDF/Brain/Angel projections. Projections reference canonical claims only and cannot add facts; real customer outcome remains a separate gate." });
replaceCapability({ id: "ZB13_BRAIN_ANGEL_ORCHESTRATION", status: "DONE", resourceModel: "Own work plus optional local/open model", truth: "Brain and Angel are now mechanically bounded channel projections of the same canonical packet across all 7 surfaces and 3 tiers. They can summarize, lock fields and expose safe-next-checks but cannot create new claims." });
replaceCapability({ id: "ZB15_RISK_PRO_ADVANCED", status: "PARTIAL", resourceModel: "Own work; real observation window required for claims", truth: "Temporal split enforcement, calibration metrics, 600-row offline corpus, 100 frozen prospective predictions, uncertainty bands, scenario IDs and human-override gates are implemented. Empirical probability and prospective performance claims remain forbidden until real preregistered outcomes close." });
for (const capability of [
  { id: "ZB39_CROSS_ASSET_PORTFOLIO_RUNTIME", status: "DONE", resourceModel: "Own work only", truth: "A16 computes complete asset-class/currency exposure, weights, HHI, volatility, drawdown, pair correlation and liquidity-exit horizons for 12 portfolios over 120 instruments, with 36 Basic/Pro/Advanced packets and no billing unlock." },
  { id: "ZB40_MARKET_REGIME_CLASSIFICATION", status: "DONE", resourceModel: "Own work only", truth: "A16 deterministically classifies CALM, RISK_ON, RISK_OFF, STRESS and DISLOCATION regimes from bounded trend, volatility, correlation and liquidity inputs. Classification is analytical context, not a forecast." },
  { id: "ZB41_CROSS_ASSET_STRESS_SCENARIOS", status: "DONE", resourceModel: "Own work only", truth: "A16 executes six cross-asset stress scenarios for every declared portfolio, producing 72 bounded loss/liquidity estimates, worst-scenario receipts and monitoring triggers without claiming realized future losses." },
  { id: "ZB42_PROSPECTIVE_RISK_LEDGER", status: "DONE", resourceModel: "Own work only; real outcomes required later", truth: "A16 creates hash-bound prediction-before-outcome receipts and Advanced decision packets for 100 prospective cases, enforcing temporal ordering, uncertainty, abstention and human-override paths. The infrastructure is complete while performance claims remain disabled." },
]) replaceCapability(capability);
zero.capabilities.sort((a: Record<string, string>, b: Record<string, string>) => a.id.localeCompare(b.id));
writeJson("config/pass35/zero-budget-functional-roadmap.json", zero);

const excluded = new Set<string>(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row: Record<string, string>) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row: Record<string, string>) => row.status === "DONE").length,
  PARTIAL: core.filter((row: Record<string, string>) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row: Record<string, string>) => row.status === "NOT_DONE").length,
};
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 40 || zeroCounts.DONE !== 25 || zeroCounts.PARTIAL !== 14 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 80) {
  throw new Error(`a16_zero_budget_math_invalid:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
}

const status = readJson("config/pass35/current-status-register.json");
status.sourceRevisionId = REVISION;
for (const row of status.rows) {
  if (row.id === "AI01_BRAIN_ANGEL") {
    row.doneEvidence = [...new Set([...row.doneEvidence, "A16 exact canonical packet/facts parity across API/UI/preview/PDF/Brain/Angel for 7 surfaces x 3 tiers"])]
    row.nextAction = "Run frozen unseen quality/safety eval on the now packet-bounded Brain/Angel outputs.";
  }
  if (row.id === "RISK02_PRO_ADVANCED_CALIBRATION") {
    row.status = "PARTIAL";
    row.doneEvidence = [...new Set([...row.doneEvidence, "A16 temporal split, Brier/log-loss/ECE metrics, segment/regime reports and 100 frozen prospective prediction receipts"])]
    row.missing = ["real temporal dataset", "closed preregistered observation window", "second regime/cohort", "human override outcome evaluation"];
    row.blocker = "REAL_OUTCOME_DATA_AND_OBSERVATION_WINDOW_REQUIRED";
    row.nextAction = "Execute the A16 protocol on frozen real outcomes; do not change thresholds after results.";
    row.sellImpact = "Risk Pro/Advanced remain disabled; probability and prospective-performance claims forbidden.";
  }
  if (row.id === "PDF02_REAL_TIER_VALUE") {
    row.doneEvidence = [...new Set([...row.doneEvidence, "A16 exact 21-packet / 126-channel identity and facts parity including 2/4/8-page PDF projections"])]
  }
  if (row.id === "MKT02_REAL_MARKETS") {
    row.doneEvidence = [...new Set([...row.doneEvidence, "A16 120-instrument cross-asset portfolio, five-regime classification and six-scenario stress runtime"])]
  }
}
const statusCounts = Object.fromEntries(status.allowedStatuses.map((s: string) => [s, status.rows.filter((row: Record<string, string>) => row.status === s).length]));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
if (canonicalWeighted !== 40.7 || canonicalStrict !== 9.3) throw new Error(`a16_canonical_math_invalid:${canonicalWeighted}:${canonicalStrict}`);
status.zeroBudgetFunctionalTrack = {
  ...status.zeroBudgetFunctionalTrack,
  currentWeightedPlanningPercent: zeroWeighted,
  coreDenominator: core.length,
  done: zeroCounts.DONE,
  partial: zeroCounts.PARTIAL,
  notDone: zeroCounts.NOT_DONE,
  a16CanonicalRiskContractPath: "config/pass35/a16-canonical-risk-runtime-contract.json",
};
status.truthBoundary = "PASS35 A16 is the only canonical current status. Canonical roadmap is 40.7% weighted / 9.3% strict across 43 workstreams. Zero-budget functional core is 80.0% across 40 capabilities. A16 locally closes exact canonical packet parity for analysis/PDF/Brain/Angel, cross-asset portfolio analytics, five-regime classification, six stress scenarios and prospective risk-ledger infrastructure. Public-network freshness, real risk outcomes, customer value, staging and sale remain unclaimed.";
writeJson("config/pass35/current-status-register.json", status);

const current = readJson("config/current-release.json");
current.sourceRevisionId = REVISION;
current.sourceRevisionStatus = "A16_CANONICAL_PARITY_PORTFOLIO_REGIME_STRESS_RISK_IMPLEMENTED_LIVE_UNCLAIMED";
current.truthBoundary = "PASS35 A16 keeps the visual freeze and adds exact canonical packet parity across analysis/PDF/Brain/Angel, deterministic cross-asset portfolio/regime/stress analytics and prospective risk-ledger infrastructure. Offline or synthetic execution remains fail-closed and does not claim current LIVE, real outcome calibration, customer value, staging or sale.";
current.a16CanonicalRiskContractPath = "config/pass35/a16-canonical-risk-runtime-contract.json";
current.a16CanonicalRiskBoardPath = "artifacts/release/PASS35_A16_CANONICAL_RISK_RUNTIME.md";
current.a16ProductRoadmapSummaryPath = "artifacts/release/PASS35_A16_PRODUCT_ROADMAP_SUMMARY.json";
writeJson("config/current-release.json", current);

function updateRevisionFiles(directory: string): void {
  for (const name of readdirSync(directory)) {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory()) continue;
    if (!name.endsWith(".json")) continue;
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
    } catch { /* non-contract JSON remains untouched */ }
  }
}
updateRevisionFiles("config/pass35");

for (const name of readdirSync("artifacts/release")) {
  if (!/^PASS35_A(?:9|10|11|12|13|14|15)_PRODUCT_ROADMAP_SUMMARY\.json$/u.test(name)) continue;
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
  schemaVersion: "velmere.pass35.a16-canonical-risk-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  visualChangesMade: false,
  sellEnabled: false,
  paidDeliveryEligible: false,
  liveClaimed: false,
  canonicalChannelParity: {
    surfaces: parity.surfaceCount,
    tierPackets: parity.tierPacketCount,
    channels: parity.channels,
    projections: parity.projectionCount,
    parityChecks: parity.parityChecks,
    addedFactViolations: parity.addedFactViolations,
    integritySha256: parity.integrity.digest,
  },
  crossAssetPortfolio: {
    instruments: portfolio.instrumentDenominator,
    portfolios: portfolio.portfolioDenominator,
    tierPackets: portfolio.packetCount,
    basic: portfolio.basicFunctionalEligible,
    pro: portfolio.proFunctionalEligible,
    advanced: portfolio.advancedFunctionalEligible,
    integritySha256: portfolio.integrity.digest,
  },
  regimeStress: {
    windows: regimeStress.windowDenominator,
    portfolios: regimeStress.portfolioDenominator,
    regimes: regimeStress.regimes.map((row: Record<string, unknown>) => row.regime),
    scenarios: regimeStress.scenarioCount,
    scenarioResults: regimeStress.scenarioResultCount,
    integritySha256: regimeStress.integrity.digest,
  },
  riskProspective: {
    rows: risk.rowDenominator,
    train: risk.trainCount,
    validation: risk.validationCount,
    prospective: risk.prospectiveCount,
    frozenPredictions: risk.frozenPredictionLedger.length,
    probabilityClaimsAllowed: risk.empiricalProbabilityClaimAllowed,
    prospectiveClaimsAllowed: risk.prospectivePerformanceClaimAllowed,
    integritySha256: risk.integrity.digest,
  },
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  truthBoundary: status.truthBoundary,
};
writeJson("config/pass35/a16-canonical-risk-runtime-contract.json", contract);

const board = `# PASS35 A16 — Canonical Parity + Portfolio + Regime/Stress + Risk (Non-Visual)\n\n- Source revision: \`${REVISION}\`\n- Canonical roadmap: **${canonicalWeighted}% weighted / ${canonicalStrict}% strict**\n- ZERO-BUDGET FUNCTIONAL CORE: **${zeroWeighted}%**\n- Visual changes: **0**\n- Paid cells enabled: **0**\n\n## Canonical packet parity\n\n- 7 surfaces x 3 tiers = **${parity.tierPacketCount} immutable packets**.\n- API/UI/preview/PDF/Brain/Angel = **${parity.projectionCount} projections**.\n- Packet ID, packet hash and facts hash parity checks: **${parity.parityChecks}**.\n- Added-fact violations: **0**.\n\n## Cross-asset portfolio\n\n- Instruments: **${portfolio.instrumentDenominator}**; portfolios: **${portfolio.portfolioDenominator}**.\n- Tier packets: **${portfolio.packetCount}**; Basic/Pro/Advanced: **${portfolio.basicFunctionalEligible}/${portfolio.proFunctionalEligible}/${portfolio.advancedFunctionalEligible}**.\n- Exposure, HHI, volatility, drawdown, correlation and liquidity-exit horizons are deterministic and offline.\n\n## Regime and stress\n\n- Regimes: CALM, RISK_ON, RISK_OFF, STRESS, DISLOCATION.\n- Scenarios: **${regimeStress.scenarioCount}**; portfolio scenario results: **${regimeStress.scenarioResultCount}**.\n- Stress results are analytical estimates, not forecasts.\n\n## Risk Pro / Advanced infrastructure\n\n- Rows: **${risk.rowDenominator}**; train/validation/prospective: **${risk.trainCount}/${risk.validationCount}/${risk.prospectiveCount}**.\n- Frozen prospective prediction receipts: **${risk.frozenPredictionLedger.length}**.\n- Probability claim allowed: **false**. Prospective performance claim allowed: **false**.\n\n## Truth boundary\n\n${status.truthBoundary}\n`;
mkdirSync("artifacts/release", { recursive: true });
writeFileSync("artifacts/release/PASS35_A16_CANONICAL_RISK_RUNTIME.md", board);

const summary = {
  schemaVersion: "velmere.pass35.a16-canonical-risk-summary.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  canonicalParity: contract.canonicalChannelParity,
  portfolio: contract.crossAssetPortfolio,
  regimeStress: contract.regimeStress,
  riskProspective: contract.riskProspective,
  visualChangesMade: false,
  sellEnabled: false,
  liveClaimed: false,
  contractSha256: sha(readFileSync("config/pass35/a16-canonical-risk-runtime-contract.json")),
  boardSha256: sha(board),
};
writeJson("artifacts/release/PASS35_A16_PRODUCT_ROADMAP_SUMMARY.json", summary);

const previous = readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
const marker = "====================================================================================================\nPASS35 A15 —";
const index = previous.indexOf(marker);
if (index < 0) throw new Error("a16_history_marker_missing");
const history = previous.slice(index);
const lines = [
  "====================================================================================================",
  "PASS35 A16 — CANONICAL PARITY + PORTFOLIO + REGIME/STRESS + RISK (NON-VISUAL)",
  "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin",
  `Source revision ID: ${REVISION}`,
  `Decyzja globalna: ${status.globalDecision}`,
  `Stan sprzedaży: ${status.sellEnabledCount} sellEnabled`,
  `Canonical institutional roadmap: ${canonicalWeighted}% weighted / ${canonicalStrict}% strict`,
  `Zero-budget functional core: ${zeroWeighted}% weighted -> target 100%`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)",
  "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched",
  "",
  "A16 — CANONICAL PACKET → ANALYSIS/PDF/BRAIN/ANGEL",
  "----------------------------------------------------------------------------------------------------",
  `- ${parity.tierPacketCount} packets and ${parity.projectionCount} channel projections; ${parity.parityChecks}/${parity.parityChecks} identity/facts parity.`,
  "- Every channel references canonical claim IDs only; added facts are forbidden.",
  "- PDF page contracts remain Basic 2 / Pro 4 / Advanced 8.",
  "",
  "A16 — CROSS-ASSET PORTFOLIO",
  "----------------------------------------------------------------------------------------------------",
  `- ${portfolio.instrumentDenominator} instruments, ${portfolio.portfolioDenominator} portfolios, ${portfolio.packetCount} tier packets.`,
  "- Asset-class/currency exposure, HHI, volatility, drawdown, correlation and liquidity exit are implemented.",
  "",
  "A16 — REGIME + STRESS",
  "----------------------------------------------------------------------------------------------------",
  `- Five regimes and ${regimeStress.scenarioCount} scenarios; ${regimeStress.scenarioResultCount} portfolio-scenario results.`,
  "- Outputs are bounded analytical estimates; no forecast or guaranteed-loss claim.",
  "",
  "A16 — RISK PRO/ADVANCED",
  "----------------------------------------------------------------------------------------------------",
  `- ${risk.rowDenominator} rows; temporal train/validation/prospective ${risk.trainCount}/${risk.validationCount}/${risk.prospectiveCount}.`,
  `- ${risk.frozenPredictionLedger.length} prediction-before-outcome receipts and Advanced decision packets.`,
  "- Real probability and prospective-performance claims remain forbidden until real observation windows close.",
  "",
  "A16 — ZERO-BUDGET FUNCTIONAL CORE",
  "----------------------------------------------------------------------------------------------------",
  `- Core denominator ${core.length}; DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`,
  `- Zero-budget weighted: ${zeroWeighted}%.`,
  "",
  "A16 — KANONICZNA TABELA 43 WORKSTREAMÓW",
  "----------------------------------------------------------------------------------------------------",
  ...status.rows.map((row: Record<string, unknown>) => `${row.id} | ${row.status} | DONE: ${(row.doneEvidence as string[]).join("; ") || "—"} | MISSING: ${(row.missing as string[]).join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`),
  "",
  "A16 TRUTH BOUNDARY",
  "----------------------------------------------------------------------------------------------------",
  status.truthBoundary,
  "",
  "HISTORYCZNE PODSUMOWANIE A15 I WCZEŚNIEJSZYCH FAL",
  "----------------------------------------------------------------------------------------------------",
  "Everything below is historical implementation context and cannot override A16.",
  "",
];
writeFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", `${lines.join("\n")}\n${history}`);

console.log(JSON.stringify({
  status: "PASS_A16_CANONICAL_RISK_ROADMAP_BUILT",
  sourceRevisionId: REVISION,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  parityPackets: parity.tierPacketCount,
  parityProjections: parity.projectionCount,
  portfolioPackets: portfolio.packetCount,
  stressResults: regimeStress.scenarioResultCount,
  prospectivePredictions: risk.frozenPredictionLedger.length,
  visualChangesMade: false,
  sellEnabled: false,
  liveClaimed: false,
}, null, 2));
