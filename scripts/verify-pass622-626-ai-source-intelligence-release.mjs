import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
let ts;
try {
  ts = nativeRequire("typescript");
} catch {
  ts = nativeRequire("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}
const cache = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function resolveTs(request, parent) {
  if (request.startsWith("@/")) return path.join(root, request.slice(2)) + ".ts";
  if (request.startsWith(".")) return path.resolve(path.dirname(parent), request) + (path.extname(request) ? "" : ".ts");
  return null;
}

function loadTs(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, {
    fileName: absolute,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (request) => {
    const resolved = resolveTs(request, absolute);
    return resolved ? loadTs(resolved) : nativeRequire(request);
  };
  vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${output}\n})`, { filename: absolute })(
    localRequire,
    module,
    module.exports,
    absolute,
    path.dirname(absolute),
  );
  return module.exports;
}

const pass622 = loadTs(path.join(root, "lib/market-integrity/pass622-source-registry.ts"));
const pass623 = loadTs(path.join(root, "lib/market-integrity/pass623-atomic-claim-decomposition.ts"));
const pass624 = loadTs(path.join(root, "lib/market-integrity/pass624-provider-contradiction-engine.ts"));
const pass625 = loadTs(path.join(root, "lib/market-integrity/pass625-freshness-aware-synthesis.ts"));
const pass626 = loadTs(path.join(root, "lib/market-integrity/pass626-human-next-check-planner.ts"));

const generatedAt = "2026-06-09T10:00:00.000Z";
const registry = pass622.buildPass622SourceRegistry({
  generatedAt,
  configuredEnvKeys: ["ALPHA_VANTAGE_API_KEY", "SEC_USER_AGENT"],
  discoveredSources: [
    {
      id: "aapl-primary",
      label: "AAPL primary quote",
      assetClasses: ["stock"],
      internalRoute: "/api/market-integrity/real-markets",
      ttlSeconds: 60,
    },
  ],
});
assert(registry.providerCount >= 7, "PASS622 must merge canonical and discovered providers");
assert(registry.duplicateIds.length === 0, "PASS622 provider ids must be unique");
assert(registry.brokenBackupLinks.length === 0, "PASS622 backup links must resolve");
assert(registry.publicProviders.every((provider) => !("requiredEnvKeys" in provider)), "PASS622 public registry must not expose env-key names");
assert(registry.publicProviders.every((provider) => provider.internalRoutes.every((route) => route.startsWith("/api/"))), "PASS622 must expose internal routes only");

const sourceManifest = [
  {
    sourceId: "S01",
    label: "Primary",
    state: "confirmed",
    observedAt: "2026-06-09T09:59:30.000Z",
    freshnessLabel: "provider timestamp",
    freshnessState: "fresh",
    confidenceCap: 88,
  },
  {
    sourceId: "S02",
    label: "Secondary",
    state: "confirmed",
    observedAt: "2026-06-09T09:59:00.000Z",
    freshnessLabel: "provider timestamp",
    freshnessState: "fresh",
    confidenceCap: 82,
  },
];
const claimGate = {
  version: "pass607-claim-source-completeness-gate",
  state: "review",
  generatedAt,
  sources: sourceManifest,
  claims: [
    {
      claimId: "C01",
      fieldId: "price",
      label: "Price",
      value: "200 USD",
      sourceIds: ["S01", "S02"],
      state: "confirmed",
      confidenceCap: 82,
      blockers: [],
    },
    {
      claimId: "C02",
      fieldId: "filing",
      label: "Latest filing",
      value: "source required",
      sourceIds: [],
      state: "blocked",
      confidenceCap: 0,
      blockers: ["missing_source_link"],
    },
  ],
  confirmedClaims: 1,
  boundedClaims: 0,
  blockedClaims: 1,
  timestampedSources: 2,
  confidenceCap: 0,
  boundary: "test",
};
const brief = {
  version: "pass478-human-evidence-brief",
  locale: "en",
  depth: "pro",
  assetClass: "stock",
  verdict: { tone: "cautious", label: "cautious", headline: "test", summary: "test", confidenceCeiling: 82 },
  claims: [
    { id: "price", label: "Price", value: "200 USD", meaning: "Observed market price.", state: "confirmed", stateLabel: "confirmed" },
    { id: "filing", label: "Latest filing", value: "source required", meaning: "Filing context.", state: "source_required", stateLabel: "source required" },
  ],
  confirmedFacts: ["Price: 200 USD"],
  confidenceLimits: ["filing"],
  nextChecks: ["Attach filing"],
  whatWouldChangeTheRead: ["new filing"],
  disclosure: "test",
};
const atoms = pass623.buildPass623AtomicClaimDecomposition({
  reportId: "aapl:pro",
  generatedAt,
  brief,
  claimGate,
});
assert(atoms.atoms.length === 2, "PASS623 must preserve one atom per claim field");
assert(atoms.atoms[0].atomId.startsWith("A"), "PASS623 atomic ids must be stable public ids");
assert(atoms.factCount === 1 && atoms.blockedCount === 1, "PASS623 must keep fact and boundary states separate");
assert(atoms.duplicateAtomIds.length === 0, "PASS623 atomic ids must be unique");

const contradiction = pass624.buildPass624ProviderContradictionEngine({
  assetClass: "stock",
  generatedAt,
  observations: [
    { fieldId: "price", sourceId: "S01", kind: "price", value: 200, unit: "USD", observedAt: sourceManifest[0].observedAt, confidenceCap: 88 },
    { fieldId: "price", sourceId: "S02", kind: "price", value: 205, unit: "USD", observedAt: sourceManifest[1].observedAt, confidenceCap: 82 },
  ],
});
assert(contradiction.state === "contradiction", "PASS624 must flag deterministic stock-price divergence");
assert(contradiction.contradictions === 1, "PASS624 contradiction count mismatch");
assert(contradiction.comparisons[0].preferredSourceId === "S01", "PASS624 fresher source should be display anchor without erasing conflict");
assert(contradiction.confidenceCap <= 38, "PASS624 contradiction must hard-cap confidence");

const synthesis = pass625.buildPass625FreshnessAwareSynthesis({
  locale: "en",
  assetClass: "stock",
  generatedAt,
  atomicClaims: atoms,
  sourceManifest,
  contradiction,
});
assert(synthesis.currentFacts.length === 0, "PASS625 contradictory facts cannot remain current");
assert(synthesis.unverifiedCurrent.length >= 1, "PASS625 must expose unverified current claims");
assert(synthesis.confidenceCap <= contradiction.confidenceCap, "PASS625 cannot exceed contradiction cap");
assert(!synthesis.summary.toLowerCase().includes("current fact") || synthesis.currentFacts.length > 0, "PASS625 summary must match currentness buckets");

const appendix = {
  version: "pass608-missing-source-appendix",
  state: "action_required",
  title: "Missing-source appendix",
  summary: "1 gap",
  entries: [
    {
      id: "M01",
      label: "Latest filing",
      reason: "missing_source_link",
      impact: "high",
      confidencePenalty: 14,
      nextCheck: "Attach the latest filing and store its reporting period.",
      linkedClaimIds: ["C02"],
    },
  ],
  totalConfidencePenalty: 14,
  boundary: "test",
};
const planner = pass626.buildPass626HumanNextCheckPlanner({
  locale: "en",
  depth: "pro",
  assetClass: "stock",
  appendix,
  registry,
  contradiction,
  synthesis,
});
assert(planner.tasks.length >= 2, "PASS626 must combine source gaps and provider contradictions");
assert(planner.primaryAction?.impact === "high", "PASS626 must prioritize decision impact");
assert(planner.genericActionCount === 0, "PASS626 must not emit generic check-more-data instructions");
assert(planner.tasks.every((task) => task.completionEvidence.length > 20), "PASS626 every task needs completion evidence");

const lensReportModule = loadTs(path.join(root, "lib/search/lens-report.ts"));
const integratedReport = lensReportModule.buildLensReport(
  {
    id: "apple",
    title: "Apple Inc.",
    symbol: "AAPL",
    category: "market",
    tone: "review",
    summary: "Source-bound Apple market snapshot.",
    whyItMatters: "Provider freshness and filing context bound the readout.",
    missingData: ["latest filing source"],
    nextOperatorStep: "Attach a current filing receipt.",
    sourceMode: "live",
    sourceConfidence: 82,
    shieldHref: "/market-integrity?asset=apple",
    sources: [
      { id: "aapl-primary", label: "Primary quote", mode: "live", freshness: "2026-06-09T09:59:30.000Z", confidence: 88, note: "provider timestamp" },
      { id: "aapl-secondary", label: "Secondary quote", mode: "live", freshness: "2026-06-09T09:59:00.000Z", confidence: 82, note: "provider timestamp" },
    ],
    chips: ["stock", "filing"],
    marketSnapshot: {
      assetClass: "stock",
      currency: "USD",
      price: 200,
      observedAt: "2026-06-09T09:59:30.000Z",
      venueReferencePrice: 200,
      venueSecondaryPrice: 205,
      venueComparisonState: "divergent",
      venueConfidenceCap: 38,
      fundamentalFilingDate: "2026-05-01",
      fundamentalConfidenceCap: 60,
    },
  },
  "en",
  "pro",
  generatedAt,
);
assert(integratedReport.pass622.providerCount >= 8, "PASS622 integrated report registry missing discovered sources");
assert(integratedReport.pass623.atoms.length === integratedReport.pass607.claims.length, "PASS623 integrated report atom parity mismatch");
assert(integratedReport.pass624.state === "contradiction", "PASS624 integrated report should retain provider price conflict");
assert(integratedReport.pass625.unverifiedCurrent.length > 0, "PASS625 integrated report must separate unverified current claims");
assert(integratedReport.pass626.primaryAction, "PASS626 integrated report requires a primary action");

const report = read("lib/search/lens-report.ts");
const route = read("app/api/search/lens-report/route.ts");
const reader = read("components/search/VelmereIntelligenceSearchClient.tsx");
assert(report.includes("buildPass622SourceRegistry"), "PASS622 report integration missing");
assert(report.includes("buildPass623AtomicClaimDecomposition"), "PASS623 report integration missing");
assert(report.includes("buildPass624ProviderContradictionEngine"), "PASS624 report integration missing");
assert(report.includes("buildPass625FreshnessAwareSynthesis"), "PASS625 report integration missing");
assert(report.includes("buildPass626HumanNextCheckPlanner"), "PASS626 report integration missing");
assert(route.includes("x-velmere-source-registry"), "PASS622 PDF response marker missing");
assert(route.includes("pass626.primaryAction"), "PASS626 PDF action integration missing");
assert(reader.includes("data-pass625-freshness-synthesis"), "PASS625 Reader integration missing");
assert(reader.includes("Bieżący stan i następna kontrola"), "PASS626 human Reader panel missing");

console.log("PASS622–626 gate PASS · canonical source registry · atomic claims · visible provider contradictions · freshness-aware synthesis · concrete human next-check planner");
