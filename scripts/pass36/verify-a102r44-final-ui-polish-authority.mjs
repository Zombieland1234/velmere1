import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { canonicalJson, sha256, validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
const STATUS = "PASS_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_AUTHORITY_NO_LIVE_CREDIT";
const LEDGER = "config/pass36/a102r44-approved-current-source-changes.json";
const MANIFEST = "config/pass36/a102r44-current-root-descendant-manifest.json";
const STATE = "config/pass36/a102r44-action-required-current-state.json";
const PROGRAM = "config/pass36/a102r44-world-class-completion-program.json";
const MODE = "config/pass36/a102r44-cross-platform-source-mode-policy.json";
const PARENT_MANIFEST = "config/pass36/a102r43-current-root-descendant-manifest.json";
const RELEASE_BINDINGS = [
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
];

const root = process.cwd();
const read = (relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const verifySelfDigest = (document, field) => {
  const core = { ...document };
  const observed = core[field];
  delete core[field];
  return observed === sha256(canonicalJson(core));
};

const state = read(STATE);
const program = read(PROGRAM);
const mode = read(MODE);
const ledger = read(LEDGER);
const manifest = read(MANIFEST);
const parentBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST));
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const authority = read("config/pass36/current-release-authority.json");
const pkg = read("package.json");

check("state-identity", state.schemaVersion === "velmere.pass36.a102r44.action-required-current-state.v1" && state.revisionId === REV && state.parentRevisionId === PARENT);
check("program-identity", program.schemaVersion === "velmere.pass36.a102r44.world-class-completion-program.v1" && program.revisionId === REV && program.parentRevisionId === PARENT);
check("mode-identity", mode.schemaVersion === "velmere.pass36.cross-platform-source-mode-policy.v1" && mode.revisionId === REV && mode.parentRevisionId === PARENT);
check("ledger-identity", ledger.schemaVersion === "velmere.pass36.a102r44.approved-current-source-changes.v1" && ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
check("ledger-self-digest", verifySelfDigest(ledger, "ledgerDigestSha256"));
check("manifest-identity", manifest.schemaVersion === "velmere.pass36.a102r44.current-root-descendant-manifest.v1" && manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
check("manifest-self-digest", verifySelfDigest(manifest, "manifestDigestSha256"));
check("parent-identity", parent.revisionId === PARENT && parent.parentRevisionId === "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT");
check("parent-self-digest", verifySelfDigest(parent, "manifestDigestSha256"));
check("parent-raw-binding", ledger.parentDescendantManifestRawSha256 === sha256(parentBytes) && manifest.staticBindings?.parentDescendantManifestSha256 === sha256(parentBytes));
check("parent-payload-binding", canonicalJson(ledger.parentReconstruction?.parentPayload) === canonicalJson(parent.payload) && ledger.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256 && manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256);
const exactAuthority = validateCurrentSourceAuthorityExact(root, { expectedRevisionId: REV, platform: process.platform });
check("current-source-payload", exactAuthority.passed, exactAuthority.mismatches);
check("approved-no-delete-and-self-exclusion", ledger.deletedFiles === 0 && ledger.selfExcludedPaths?.length === 2 && ledger.selfExcludedPaths.includes(LEDGER) && ledger.selfExcludedPaths.includes(MANIFEST));
check("approved-denominator", ledger.changedPathCount === ledger.approvedChanges?.length && manifest.claims?.approvedChangePaths === ledger.approvedChanges?.length && ledger.changedPathCount === 34);
check("global-truth", state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false && program.globalDecision === "NO_GO" && program.live === false && program.saleEnabled === false && program.productionApproved === false && program.worldClassProven === false);
check("sku-truth", state.skuDecisions?.basic?.decision === "PILOT_ONLY_FREE_PRESCREEN" && state.skuDecisions?.basic?.priceRecommendation === null && state.skuDecisions?.pro?.decision === "NOT_FOR_SALE" && state.skuDecisions?.advanced?.decision === "NOT_FOR_SALE" && state.skuDecisions?.paidPdfTiers?.decision === "NOT_FOR_SALE");
check("local-denominator-truth", manifest.claims?.finalUiPolishBoundaryChecks === 35 && manifest.claims?.localCanonicalIconAssets === 187 && manifest.claims?.requiredMarketRows === 583 && manifest.claims?.exactFinalByteBuildBrowserCredit === false);
check("pointer-plane", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.planes?.roadmapProgram?.revisionId === REV && authority.planes?.roadmapProgram?.path === PROGRAM && authority.currentRootDescendantManifestPath === MANIFEST);
check("source-mode-denominator", mode.executablePaths?.length === 58 && new Set(mode.executablePaths).size === 58);
check("release-bindings", RELEASE_BINDINGS.every((relativePath) => { const binding = read(relativePath); return binding.currentSourceRevisionId === REV && binding.currentSourceParentRevisionId === PARENT && binding.sourceManifestPath === MANIFEST; }));
check("package-binding", pkg.velmere?.currentRevisionId === REV && pkg.velmere?.currentRevisionParentId === PARENT && pkg.velmere?.currentRootDescendantManifestPath === MANIFEST && pkg.velmere?.worldClassCompletionProgramPath === PROGRAM);
check("compatibility-pointers", authority.compatibilityPointers?.length === 3 && authority.compatibilityPointers.every((pointer) => pointer.declaredRevisionId === REV && pointer.mayDefineCurrentSource === false));
const chain = verifyHistoricalDescendantChain(root, "config/pass36/a80-current-root-descendant-manifest.json", REV);
check("historical-parent-chain", chain.ok && chain.current?.revisionId === REV, chain.checks.filter((row) => !row.passed));

for (const row of ledger.approvedChanges ?? []) {
  const absolute = path.join(root, row.path);
  const bytes = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
  check(`approved-current:${row.path}`, bytes !== null && row.currentByteLength === bytes.length && row.currentSha256 === sha256(bytes));
}

check("verifier-denominator", checks.length + 1 === manifest.claims?.authorityVerifierChecksRequired);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44.final-ui-polish-authority-verification.v1",
  revisionId: REV,
  status: failed.length === 0 ? STATUS : "FAIL_A102R44_FINAL_UI_POLISH_AUTHORITY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  historicalParentChainChecks: chain.checks.length,
  payload: manifest.payload,
  manifestDigestSha256: manifest.manifestDigestSha256,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures: failed,
}, null, 2));
if (failed.length > 0) process.exit(1);
