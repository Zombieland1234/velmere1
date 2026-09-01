#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  resolveA59ReceiptDirectory,
  writeA59Receipt,
} from "./a59-external-receipt-boundary.mjs";
import {
  assertApiIdentityBinding,
  assertBudgetTupleBinding,
  assertCssIdentityBinding,
  budgetTupleSha256,
  inspectApiIdentity,
  inspectCssIdentity,
  sha256,
} from "./a59-current-identity-lib.mjs";
import {
  CURRENT_CSS_DEDUP_SCHEMA,
  CURRENT_CSS_DEDUP_STATUS,
  verifyCurrentCssDedupReceipt,
} from "./a59-current-css-dedup-lib.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a59-build-graph-route-css-budget-recovery.json"), "utf8"));
const checks = [];
const failures = [];
const check = (id, ok, detail = null) => {
  const row = { id, ok: Boolean(ok), detail };
  checks.push(row);
  if (!row.ok) failures.push(row);
};
const runJson = (args, options = {}) => {
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, ...options });
  let parsed = null;
  try { parsed = JSON.parse(run.stdout); } catch (ignoredError) { void ignoredError; }
  return { run, parsed };
};
const errorDetail = (error) => ({ code: error?.code ?? null, message: error?.message ?? String(error) });

const identityAdversarialRun = runJson(["scripts/pass36/test-a59-current-identity-adversarial.mjs"]);
check(
  "current-identity-adversarial-suite",
  identityAdversarialRun.run.status === 0 && identityAdversarialRun.parsed?.status === "PASS_A59_CURRENT_IDENTITY_ADVERSARIAL" && identityAdversarialRun.parsed?.summary?.failed === 0,
  { exitCode: identityAdversarialRun.run.status, status: identityAdversarialRun.parsed?.status ?? null, summary: identityAdversarialRun.parsed?.summary ?? null, stderr: identityAdversarialRun.run.stderr?.slice(-1000) },
);
let budgetIdentity = null;
try {
  assertBudgetTupleBinding(policy.budgets, policy.currentIdentityBinding.budgetTupleSha256);
  budgetIdentity = budgetTupleSha256(policy.budgets);
  check("budget-tuple-frozen", policy.constraints.budgetThresholdIncreaseForbidden === true, budgetIdentity);
} catch (error) {
  check("budget-tuple-frozen", false, errorDetail(error));
}

const profileRun = runJson(["scripts/pass14/profile-build-graph.mjs"]);
check("build-graph-profiler-exit", profileRun.run.status === 0, { exitCode: profileRun.run.status, stderr: profileRun.run.stderr?.slice(-1000) });
const profileText = fs.readFileSync(path.join(root, policy.buildGraphProfilePath), "utf8");
const profile = JSON.parse(profileText);
if (resolveA59ReceiptDirectory(root).external) {
  writeA59Receipt({
    sourceRoot: root,
    fileName: "PASS36_A59_BUILD_GRAPH_PROFILE.json",
    content: profileText,
  });
}
const summary = profile.summary;
check("entrypoint-budget", summary.entrypoints <= policy.budgets.entrypointsMax, { actual: summary.entrypoints, limit: policy.budgets.entrypointsMax });
check("api-route-budget", summary.apiRoutes <= policy.budgets.apiRoutesMax, { actual: summary.apiRoutes, limit: policy.budgets.apiRoutesMax });
check("aggregate-css-budget", summary.cssBytes <= policy.budgets.aggregateCssBytesMax, { actual: summary.cssBytes, limit: policy.budgets.aggregateCssBytesMax });
check("server-client-boundary", summary.serverRoutesImportingClientCode <= policy.budgets.serverRoutesImportingClientCodeMax, summary.serverRoutesImportingClientCode);
check("local-import-boundary", summary.unresolvedLocalImports <= policy.budgets.unresolvedLocalImportsMax, summary.unresolvedLocalImports);
const globalsBytes = fs.statSync(path.join(root, "app/globals.css")).size;
check("globals-css-budget", globalsBytes <= policy.budgets.globalsCssBytesMax, { actual: globalsBytes, limit: policy.budgets.globalsCssBytesMax });

for (const relative of policy.retiredRootPageShells) check(`retired-root-shell:${relative}`, !fs.existsSync(path.join(root, relative)));
for (const relative of policy.retiredDirectApiShells) check(`retired-api-shell:${relative}`, !fs.existsSync(path.join(root, relative)));
for (const relative of policy.requiredDispatchers) {
  const absolute = path.join(root, relative);
  const source = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
  check(`dispatcher-present:${relative}`, fs.existsSync(absolute));
  check(`dispatcher-runtime:${relative}`, source.includes('runtime = "nodejs"'));
  check(`dispatcher-dynamic:${relative}`, source.includes('dynamic = "force-dynamic"'));
  check(`dispatcher-lazy:${relative}`, source.includes("dispatchLazyRoute") && source.includes("optionsLazyRoute"));
}

const dispatchRun = runJson(["scripts/pass15/verify-route-dispatch-consolidation.mjs"]);
check("route-dispatch-exit", dispatchRun.run.status === 0, { exitCode: dispatchRun.run.status, stderr: dispatchRun.run.stderr?.slice(-1000) });
check("route-dispatch-paths", dispatchRun.parsed?.routesPreserved === policy.requiredPreservedDispatchPaths, dispatchRun.parsed);
check("route-dispatch-failures", dispatchRun.parsed?.failed === 0, dispatchRun.parsed);

const apiRun = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/test-pass4659-api-surface-and-body-boundary.ts"], { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
let apiResult = null;
try { apiResult = JSON.parse(apiRun.stdout); } catch (ignoredError) { void ignoredError; }
check("api-inventory-exit", apiRun.status === 0, { exitCode: apiRun.status, stderr: apiRun.stderr?.slice(-1000), stdout: apiRun.stdout?.slice(-1000) });
check("api-logical-operation-parity", apiResult?.routeCount === policy.requiredLogicalApiOperations, apiResult?.routeCount);
check("api-mutating-body-coverage", apiResult?.boundedMutatingCoveragePercent === policy.constraints.bodyBoundaryCoveragePercent && apiResult?.unboundedMutatingRouteCount === 0, apiResult);
let apiIdentity = null;
let apiIdentityError = null;
try {
  const inventory = JSON.parse(fs.readFileSync(path.join(root, policy.currentIdentityBinding.api.inventoryPath), "utf8"));
  if (inventory.passId !== policy.currentIdentityBinding.api.passId) throw Object.assign(new Error(`unexpected passId ${inventory.passId}`), { code: "API_PASS_ID_MISMATCH" });
  apiIdentity = inspectApiIdentity({
    root,
    inventory,
    allowedFileRoots: policy.currentIdentityBinding.api.allowedFileRoots,
  });
  assertApiIdentityBinding(apiIdentity, policy.currentIdentityBinding.api);
} catch (error) {
  apiIdentityError = errorDetail(error);
}
check("api-current-exact-identity-binding", apiIdentityError === null, apiIdentityError ?? {
  routeIdentitySha256: apiIdentity.routeIdentitySha256,
  summary: apiIdentity.summary,
});
check(
  "api-current-handler-file-byte-bindings",
  apiIdentityError === null
    && apiIdentity.handlerFileBindingCount === policy.currentIdentityBinding.api.handlerFileBindingCount
    && apiIdentity.uniqueHandlerFileCount === policy.currentIdentityBinding.api.uniqueHandlerFileCount
    && apiIdentity.handlerFileIdentitySha256 === policy.currentIdentityBinding.api.handlerFileIdentitySha256,
  apiIdentityError ?? (apiIdentity === null ? null : {
    handlerFileBindingCount: apiIdentity.handlerFileBindingCount,
    uniqueHandlerFileCount: apiIdentity.uniqueHandlerFileCount,
    handlerFileIdentitySha256: apiIdentity.handlerFileIdentitySha256,
  }),
);

const cssReceipt = JSON.parse(fs.readFileSync(path.join(root, policy.cssReceiptPath), "utf8"));
check("css-receipt-revision", cssReceipt.revisionId === policy.revisionId, cssReceipt.revisionId);
check("css-files-covered", cssReceipt.summary.cssFiles === profile.summary.cssFiles, { receipt: cssReceipt.summary.cssFiles, profile: profile.summary.cssFiles });
check("css-parser-clean", cssReceipt.summary.parseErrorsBefore === 0 && cssReceipt.summary.parseErrorsAfter === 0);
check("css-used-identifier-safety", cssReceipt.summary.usedIdentifierViolations === 0);
check("css-real-reduction", cssReceipt.summary.savedBytes > 0 && cssReceipt.summary.removedRules > 0, cssReceipt.summary);
const cssDedup = JSON.parse(fs.readFileSync(path.join(root, policy.cssExactDedupReceiptPath), "utf8"));
check(
  "css-exact-dedup-status",
  cssDedup.schemaVersion === CURRENT_CSS_DEDUP_SCHEMA
    && cssDedup.status === CURRENT_CSS_DEDUP_STATUS
    && cssDedup.revisionId === "VELMERE_PASS36_A102R44P46_A59_CURRENT_CSS_EXACT_DEDUP_READ_ONLY_CLOSURE"
    && cssDedup.generatedAt === policy.currentIdentityBinding.generatedAt
    && cssDedup.writeMode === false
    && cssDedup.cssMutationApplied === false
    && cssDedup.evidenceClass === "TESTED_STATIC"
    && cssDedup.canonicalProfilePath === policy.buildGraphProfilePath
    && cssDedup.compactionReceiptPath === policy.cssReceiptPath,
  { schemaVersion: cssDedup.schemaVersion, revisionId: cssDedup.revisionId, generatedAt: cssDedup.generatedAt, status: cssDedup.status, writeMode: cssDedup.writeMode, cssMutationApplied: cssDedup.cssMutationApplied, canonicalProfilePath: cssDedup.canonicalProfilePath, compactionReceiptPath: cssDedup.compactionReceiptPath },
);
const historicalA39Removal = cssDedup.historicalA39Removal?.receipt;
const historicalA39RemovalBytes = historicalA39Removal === undefined ? null : `${JSON.stringify(historicalA39Removal, null, 2)}\n`;
const historicalA39RemovalSha256 = historicalA39RemovalBytes === null ? null : sha256(historicalA39RemovalBytes);
check(
  "css-exact-dedup-historical-a39-removal-binding",
  historicalA39Removal?.status === "PASS_A39_CSS_EXACT_DUPLICATES_REMOVED"
    && historicalA39Removal?.writeMode === true
    && historicalA39Removal?.totals?.duplicateGroups === 2
    && historicalA39Removal?.totals?.duplicateExtras === 2
    && historicalA39Removal?.totals?.removedBytes === 430
    && historicalA39RemovalSha256 === cssDedup.historicalA39Removal?.receiptSha256
    && historicalA39RemovalSha256 === policy.currentIdentityBinding.css.historicalA39RemovalReceiptSha256
    && cssDedup.historicalA39Removal?.sourcePath === policy.currentIdentityBinding.css.historicalA39RemovalReceiptPath
    && historicalA39RemovalBytes === fs.readFileSync(path.join(root, policy.currentIdentityBinding.css.historicalA39RemovalReceiptPath), "utf8"),
  { historicalA39RemovalSha256, historicalA39Removal: cssDedup.historicalA39Removal },
);
const priorThreeFileReplay = cssDedup.priorThreeFileReplay?.receipt;
const priorThreeFileReplaySha256 = priorThreeFileReplay === undefined ? null : sha256(`${JSON.stringify(priorThreeFileReplay, null, 2)}\n`);
check(
  "css-exact-dedup-prior-three-file-replay-binding",
  priorThreeFileReplay?.status === "PASS_A39_CSS_EXACT_DUPLICATES_REMOVED"
    && priorThreeFileReplay?.writeMode === true
    && priorThreeFileReplaySha256 === cssDedup.priorThreeFileReplay?.receiptSha256
    && priorThreeFileReplaySha256 === policy.currentIdentityBinding.css.priorThreeFileReplayReceiptSha256
    && cssReceipt.summary.exactDuplicateRulesRemoved === priorThreeFileReplay?.totals?.duplicateExtras
    && cssReceipt.summary.exactDuplicateBytesRemoved === priorThreeFileReplay?.totals?.removedBytes,
  { receipt: cssReceipt.summary, priorThreeFileReplaySha256, priorThreeFileReplay: cssDedup.priorThreeFileReplay },
);
let cssIdentity = null;
let cssIdentityError = null;
try {
  cssIdentity = inspectCssIdentity({
    root,
    profileCssPressure: profile.cssPressure,
    receiptFiles: cssReceipt.files,
    allowedRoots: policy.currentIdentityBinding.css.allowedRoots,
  });
  assertCssIdentityBinding(cssIdentity, policy.currentIdentityBinding.css);
  check("css-current-exact-path-and-byte-identity", true, {
    fileCount: cssIdentity.fileCount,
    totalBytes: cssIdentity.totalBytes,
    pathSetSha256: cssIdentity.pathSetSha256,
    finalIdentitySha256: cssIdentity.finalIdentitySha256,
  });
} catch (error) {
  cssIdentityError = errorDetail(error);
  check("css-current-exact-path-and-byte-identity", false, cssIdentityError);
}
try {
  const currentDedup = verifyCurrentCssDedupReceipt({
    root,
    profileCssPressure: profile.cssPressure,
    receiptFiles: cssReceipt.files,
    allowedRoots: policy.currentIdentityBinding.css.allowedRoots,
    receipt: cssDedup,
  });
  check("css-exact-dedup-current-26-path-closure", currentDedup.totals.currentDuplicateExtras === 0, currentDedup.totals);
} catch (error) {
  const cssDedupError = errorDetail(error);
  check("css-exact-dedup-current-26-path-closure", false, cssDedupError);
}
const cssBytes = cssIdentity?.totalBytes ?? 0;
check("css-final-byte-binding", cssIdentity !== null, cssIdentity === null ? cssIdentityError : { mismatches: 0 });
check("css-profile-byte-parity", cssIdentity !== null && cssBytes === profile.summary.cssBytes && cssBytes === cssReceipt.summary.afterBytes, { calculated: cssBytes, profile: profile.summary.cssBytes, receipt: cssReceipt.summary.afterBytes });

const activeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".json"]);
const activeIdentifiers = new Set();
const identRe = /[-_A-Za-z][-_A-Za-z0-9]*/g;
function walkIdentifiers(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walkIdentifiers(absolute);
    else if (entry.isFile() && activeExtensions.has(path.extname(entry.name).toLowerCase())) {
      const matches = fs.readFileSync(absolute, "utf8").match(identRe) ?? [];
      for (const match of matches) activeIdentifiers.add(match);
    }
  }
}
for (const base of ["app", "components", "lib"]) walkIdentifiers(path.join(root, base));
const removedUsed = [];
for (const row of cssReceipt.removedRules) {
  const overlap = row.identifiers.filter((identifier) => activeIdentifiers.has(identifier));
  if (overlap.length) removedUsed.push({ selector: row.selector, overlap });
}
check("css-removed-identifiers-recomputed-unused", removedUsed.length === 0, removedUsed.slice(0, 20));

const proxy = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");
for (const [source, target] of [["/", "/pl"], ["/browser", "/pl/search"], ["/search", "/pl/search"], ["/shield", "/pl/market-integrity"], ["/market-integrity", "/pl/market-integrity"], ["/shield-pro", "/pl/shield-pro"], ["/shield-map", "/pl/shield-map"], ["/real-markets", "/pl/real-markets"]]) {
  check(`proxy-alias:${source}`, proxy.includes(`"${source}": "${target}"`), target);
}
const current = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8"));
check("a59-retained-as-budget-parent", current.buildGraphBudgetRecoveryRevisionId === policy.revisionId && current.sourceRevisionId === current.currentReleaseAuthorityRevisionId && current.currentRootDescendantManifestRevisionId === current.sourceRevisionId, { sourceRevisionId: current.sourceRevisionId, buildGraphBudgetRecoveryRevisionId: current.buildGraphBudgetRecoveryRevisionId });
check("acceptance-remains-a57", current.activeAcceptanceRevisionId === policy.activeAcceptanceRevisionId, current.activeAcceptanceRevisionId);
check("truth-boundary-sale-live", current.saleEnabled === false && current.liveProven === false, { saleEnabled: current.saleEnabled, liveProven: current.liveProven });

const result = {
  schemaVersion: "velmere.pass36.a59.build-graph-route-css-budget-recovery-test.v1",
  revisionId: policy.revisionId,
  status: failures.length === 0 ? "PASS_STATIC_BUDGET_RECOVERY" : "FAIL_STATIC_BUDGET_RECOVERY",
  exactFinalByteBuildExecuted: false,
  browserScreenshotParityExecuted: false,
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: failures.length },
  buildGraph: summary,
  globalsCssBytes: globalsBytes,
  cssCompaction: cssReceipt.summary,
  currentIdentity: {
    budgetTupleSha256: budgetIdentity,
    css: cssIdentity === null ? null : {
      fileCount: cssIdentity.fileCount,
      totalBytes: cssIdentity.totalBytes,
      pathSetSha256: cssIdentity.pathSetSha256,
      finalIdentitySha256: cssIdentity.finalIdentitySha256,
    },
    api: apiIdentity === null ? null : {
      routeIdentitySha256: apiIdentity.routeIdentitySha256,
      handlerFileBindingCount: apiIdentity.handlerFileBindingCount,
      uniqueHandlerFileCount: apiIdentity.uniqueHandlerFileCount,
      handlerFileIdentitySha256: apiIdentity.handlerFileIdentitySha256,
      summary: apiIdentity.summary,
    },
    adversarial: identityAdversarialRun.parsed?.summary ?? null,
  },
  api: apiResult,
  routeDispatch: dispatchRun.parsed,
  failures,
  checks,
  saleEnabled: false,
  liveProven: false,
  truthBoundary: policy.truthBoundary
};
writeA59Receipt({
  sourceRoot: root,
  fileName: "PASS36_A59_BUILD_GRAPH_ROUTE_CSS_BUDGET_RECOVERY_TEST.json",
  content: `${JSON.stringify(result, null, 2)}\n`,
});
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
