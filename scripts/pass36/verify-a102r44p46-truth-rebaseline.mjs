#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_SOURCE_ROOT = resolve(dirname(SCRIPT_PATH), "../..");
const REVISION =
  "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
const PARENT_REVISION =
  "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const A83_REVISION = "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY";
const A83_FINAL_RC_RECEIPT_PATH =
  process.env.VELMERE_A83_FINAL_RC_TWO_RUN_RECEIPT_PATH ??
  "/workspace/scratch/58010dfc4cde/r46_rebuild_evidence/qa/pdf-final-rc/R44P46_A83_FINAL_RC_TWO_RUN_RECEIPT.json";
const A83_FINAL_RC_RECEIPT_MATERIALS_RELATIVE_PATH =
  "qa/pdf-final-rc/R44P46_A83_FINAL_RC_TWO_RUN_RECEIPT.json";
const A83_FINAL_RC_RECEIPT_SHA256 = "c1a56b18d111f437841273598a728c06513e83720893f228e899413881141a07";
const A83_FINAL_RC_STATUS = "PASS_A83_R44P46_FINAL_RC_TWO_DISPOSABLE_CLONES_BYTE_IDENTICAL";
const A83_FINAL_RC_REQUIRED_CHECKS = [
  "bothCloneRunsPass",
  "separateCloneRoots",
  "exactDependenciesUnchangedWithinRuns",
  "exactDependenciesIdenticalAcrossRuns",
  "exactFontInputIdentical",
  "stageReceiptsAllPass",
  "manifestBytesIdentical",
  "runtimeBytesIdentical",
  "semanticReceiptBytesIdentical",
  "rasterReceiptBytesIdentical",
  "completePdfRowsIdentical",
  "completePdfSetAggregateIdentical",
  "completePhysicalPdfArtifactsRetained",
  "manifestEntryBindingsIdentical",
  "completePageRasterRowsIdentical",
  "contactSheetsIdentical",
  "contactSheetArtifactsRetained",
  "semanticMutationDenominator",
  "activeContentAndFontSecurity",
  "parserAndRasterQa",
  "initialMissingFontFailuresRetained",
  "exactFontRecoveryProvenancePass",
];
const TAXONOMY = [
  "IMPLEMENTED",
  "TESTED_STATIC",
  "TESTED_SYNTHETIC",
  "TESTED_PUBLIC_CORPUS",
  "TESTED_LOCAL_REAL_EXECUTION",
  "TESTED_STAGING",
  "TESTED_PRODUCTION",
  "AI_SIMULATED",
  "EXTERNAL_HUMAN_PROVEN",
  "PROFESSIONAL_LEGAL_PROVEN",
  "PROVIDER_CONTRACT_PROVEN",
  "NOT_PROVEN",
  "BLOCKED_EXTERNAL",
  "BLOCKED_ENVIRONMENT",
  "UNKNOWN",
  "UNAVAILABLE",
  "STALE",
  "CONFLICTED",
  "WITHHELD",
  "UNSUPPORTED",
];
const ROUTE_CLASSES = [
  "ACTIVE_PUBLIC",
  "ACTIVE_PRIVATE",
  "ADMIN",
  "INTERNAL",
  "LEGACY",
  "UNREACHABLE",
  "DEPRECATED",
];
const CLAIM_STATES = ["PROVEN", "QUALIFIED", "REMOVE", "INTERNAL_ONLY", "HISTORICAL_ONLY"];
const RISK_TERMS = [
  "all vulnerabilities",
  "professional audit",
  "human reviewed",
  "ai verified",
  "real-time",
  "realtime",
  "institutional",
  "probability",
  "prediction",
  "guaranteed",
  "certified",
  "verified",
  "accurate",
  "complete",
  "instant",
  "secure",
  "safe",
  "live",
];
const QUALIFIER_PATTERN =
  /\b(?:not|no|never|cannot|can't|does not|doesn't|without|unless|requires?|required|only|simulation|simulated|fixture|reference|diagnostic|bounded|limited|unsupported|unavailable|stale|conflicted|unknown|withheld|estimate|estimated|candidate|readiness|prepared|pending|blocked|evidence|if|when|where available|where lawful|historical|internal|local|mock|test|false|zero|0\/|do not|must not|nicht|kein|nie|ohne|nur|symulac|brak|nie |wyłącznie|ogranicz)\b/i;
const INTERNAL_PATH_PATTERN =
  /^(?:lib\/|app\/api\/(?:admin|internal|ops|provenance)\/|components\/admin\/)/;
const HISTORICAL_PATH_PATTERN =
  /^(?:evaluation\/|fixtures\/|docs\/(?:progress|pass22)\/|config\/)/;

const CONFIG_FILENAMES = {
  taxonomy: "config/pass36/r44p46-evidence-taxonomy.json",
  gates: "config/pass36/r44p46-controllable-gate-registry.json",
  external: "config/pass36/r44p46-external-human-proof.json",
  scorePolicy: "config/pass36/r44p46-score-policy.json",
  scorecard: "config/pass36/r44p46-scorecard.json",
  blockers: "config/pass36/r44p46-p0-p1-register.json",
  routes: "config/pass36/r44p46-route-api-inventory.json",
  claims: "config/pass36/r44p46-claim-inventory.json",
  pdfDependencyClosure: "config/pass36/r44p46-pdf-dependency-closure.json",
  currentState: "config/pass36/r44p46-current-state.json",
  snapshot: "config/pass36/r44p46-prepackage-snapshot.json",
};

function parseArgs(argv) {
  const result = {
    write: false,
    sourceRoot: DEFAULT_SOURCE_ROOT,
    evidenceRoot: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") result.write = true;
    else if (arg === "--source-root") result.sourceRoot = resolve(argv[++index]);
    else if (arg === "--evidence-root") result.evidenceRoot = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalEvidence(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalEvidence).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonicalEvidence(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function jsonHash(value) {
  return sha256(canonicalJson(value));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadA83FinalRcReceipt(sourceRoot) {
  const summaryPath = join(sourceRoot, "config/pass36/a83-source-evidence-summary.json");
  const summary = readJson(summaryPath);
  const { integrity, ...summaryCore } = summary;
  const summaryIntegrityValid = integrity?.algorithm === "sha256"
    && integrity.digest === sha256(canonicalEvidence(summaryCore));
  const finalRc = summary.finalRcTwoRun ?? {};
  const sourceBindingValid = summary.schemaVersion === "velmere.pass36.a83.source-evidence-summary.v3"
    && summary.revisionId === A83_REVISION
    && summary.currentSourceRevisionId === REVISION
    && summary.status === "PASS_A83_CURRENT_R46_FINAL_RC_TWO_RUN_BOUND"
    && summary.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION"
    && finalRc.materialsRelativePath === A83_FINAL_RC_RECEIPT_MATERIALS_RELATIVE_PATH
    && finalRc.sha256 === A83_FINAL_RC_RECEIPT_SHA256
    && finalRc.status === A83_FINAL_RC_STATUS
    && finalRc.checkCount === 22
    && finalRc.passedChecks === 22
    && finalRc.g11ClosureEligible === true
    && finalRc.evidenceState === "TESTED_LOCAL_REAL_EXECUTION"
    && summary.currentSourceExecution?.exactR46PdfFinalRcExecuted === true
    && summary.currentSourceExecution?.twoRunDeterminismProven === true
    && summary.currentSourceExecution?.g11ClosureEligible === true
    && summary.currentSourceExecution?.finalRcRerunRequired === false
    && summary.executionTruth?.physicalCustomerPdfMatrixExecuted === false
    && summary.executionTruth?.realPacketsVerified === 0
    && summary.executionTruth?.liveProven === false
    && summary.executionTruth?.saleEnabled === false
    && summary.fullEvidencePreparedForMaterials === true
    && summary.fullEvidenceExpectedInSourceOnly === false;
  if (!summaryIntegrityValid || !sourceBindingValid) {
    throw new Error("A83 current-source compact summary integrity or final-RC binding mismatch");
  }
  const normalizedReceipt = {
    status: finalRc.status,
    evidenceClass: summary.evidenceClass,
    denominators: finalRc.denominators,
    run1: {
      ...finalRc.run1,
      pdfSetAggregateSha256: finalRc.pdfSetAggregateSha256,
      pageRasterAggregateSha256: finalRc.pageRasterAggregateSha256,
    },
    run2: {
      ...finalRc.run2,
      pdfSetAggregateSha256: finalRc.pdfSetAggregateSha256,
      pageRasterAggregateSha256: finalRc.pageRasterAggregateSha256,
    },
    retainedNegativeEvidence: (summary.negativeEvidence?.initialMissingFontCloneFailures ?? []).map((row, index) => ({
      label: index === 0 ? "RUN1_INITIAL_MISSING_FONT_FAIL" : "RUN2_INITIAL_MISSING_FONT_FAIL",
      failedStage: "generate_450_pdfs",
      exitCode: row.exitCode,
      stderrSha256: row.stderrSha256,
    })),
  };
  if (!existsSync(A83_FINAL_RC_RECEIPT_PATH)) {
    return {
      receipt: normalizedReceipt,
      receiptSha256: finalRc.sha256,
      byteLength: finalRc.byteLength,
      compactSourceSummaryValidated: true,
      externalReceiptValidated: false,
    };
  }
  const bytes = readFileSync(A83_FINAL_RC_RECEIPT_PATH);
  const receiptSha256 = sha256(bytes);
  if (receiptSha256 !== A83_FINAL_RC_RECEIPT_SHA256) {
    throw new Error(`A83 final-RC receipt SHA-256 mismatch: ${receiptSha256}`);
  }
  const receipt = JSON.parse(bytes.toString("utf8"));
  const exactIdentity = receipt.schemaVersion === "velmere.pass36.a102r44p46.a83-final-rc-two-run-determinism.v1"
    && receipt.revisionId === REVISION
    && receipt.status === A83_FINAL_RC_STATUS
    && receipt.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION"
    && receipt.pass === true
    && receipt.g11ClosureEligible === true
    && receipt.externalCredit === 0
    && receipt.LIVE === false
    && receipt.saleEnabled === false
    && receipt.productionApproved === false
    && receipt.worldClassProven === false;
  if (!exactIdentity) throw new Error("A83 final-RC receipt identity or no-promotion boundary is invalid");
  if (!A83_FINAL_RC_REQUIRED_CHECKS.every((id) => receipt.checks?.[id] === true)) {
    throw new Error("A83 final-RC receipt is missing a required passing check");
  }
  const denominators = receipt.denominators ?? {};
  const exactDenominators = denominators.cloneRuns === 2
    && denominators.physicalPdfsPerRun === 450
    && denominators.physicalPdfsTotal === 900
    && denominators.renderedPagesPerRun === 2100
    && denominators.renderedPagesTotal === 4200
    && denominators.channelProjectionsPerRun === 2700
    && denominators.semanticMutationsPerRun === 8100
    && denominators.mutationKilledPerRun === 8100
    && denominators.completePdfByteComparisons === 450
    && denominators.completePageRasterComparisons === 2100
    && denominators.retainedPhysicalPdfArtifacts === 900
    && denominators.retainedContactSheetArtifacts === 18
    && denominators.ghostscriptSamplesPerRun === 45;
  if (!exactDenominators) throw new Error("A83 final-RC receipt denominator mismatch");
  const identicalRunFields = [
    "manifestSha256",
    "semanticReceiptSha256",
    "rasterReceiptSha256",
    "runtimeSha256",
    "pdfSetAggregateSha256",
    "pageRasterAggregateSha256",
  ];
  if (!identicalRunFields.every((field) => /^[a-f0-9]{64}$/.test(receipt.run1?.[field] ?? "")
    && receipt.run1[field] === receipt.run2?.[field])) {
    throw new Error("A83 final-RC receipt cross-run identity binding mismatch");
  }
  const retainedFailureLabels = new Set((receipt.retainedNegativeEvidence ?? []).map((row) => row.label));
  if (!retainedFailureLabels.has("RUN1_INITIAL_MISSING_FONT_FAIL")
    || !retainedFailureLabels.has("RUN2_INITIAL_MISSING_FONT_FAIL")) {
    throw new Error("A83 final-RC receipt does not retain both initial missing-font failures");
  }
  if (receipt.fontRecoveryProvenance?.pass !== true
    || receipt.fontRecoveryProvenance?.status !== "PASS_EXACT_PARENT_MATERIALS_PDF_FONTFILE2_RECOVERY"
    || receipt.fontRecoveryProvenance?.recoveredFont?.copiedIntoSource !== false
    || receipt.fontRecoveryProvenance?.recoveredFont?.role !== "EXTERNAL_EXACT_HASH_BOUND_TEST_INPUT_ONLY") {
    throw new Error("A83 final-RC exact-font recovery provenance boundary mismatch");
  }
  if (bytes.length !== finalRc.byteLength
    || canonicalEvidence(receipt.denominators) !== canonicalEvidence(finalRc.denominators)
    || receipt.run1.manifestSha256 !== finalRc.run1?.manifestSha256
    || receipt.run2.manifestSha256 !== finalRc.run2?.manifestSha256
    || receipt.run1.pdfSetAggregateSha256 !== finalRc.pdfSetAggregateSha256
    || receipt.run2.pageRasterAggregateSha256 !== finalRc.pageRasterAggregateSha256) {
    throw new Error("A83 external final-RC receipt does not match the compact SOURCE binding");
  }
  return {
    receipt: normalizedReceipt,
    receiptSha256: finalRc.sha256,
    byteLength: finalRc.byteLength,
    compactSourceSummaryValidated: true,
    externalReceiptValidated: true,
  };
}

function walkFiles(root, current = root, output = []) {
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkFiles(root, absolute, output);
    else if (entry.isFile()) output.push(relative(root, absolute).replaceAll("\\", "/"));
  }
  return output;
}

function routeFromFile(path) {
  const withoutApp = path.replace(/^app/, "").replace(/\/(?:page|route)\.tsx?$/, "");
  const converted = withoutApp
    .replace("/[locale]", "/:locale")
    .replace(/\[\.\.\.([^\]]+)\]/g, "*$1")
    .replace(/\[([^\]]+)\]/g, ":$1");
  return converted || "/";
}

const ADMIN_EXTRAS = new Set([
  "app/api/security/audit-review/advanced/assign/route.ts",
  "app/api/security/audit-review/pro/claim/route.ts",
  "app/api/security/audit-review/pro/settle/route.ts",
]);
const PRIVATE_ROUTES = new Set([
  "app/[locale]/account/page.tsx",
  "app/[locale]/security/audits/customer-report/[id]/page.tsx",
  "app/[locale]/security/audits/delivery-receipt/[receiptId]/page.tsx",
  "app/[locale]/security/audits/export/[id]/page.tsx",
  "app/[locale]/security/audits/support-handoff/[receiptId]/page.tsx",
  "app/api/account/audit-messages/route.ts",
  "app/api/account/customer-artifact/route.ts",
  "app/api/angel/memory/route.ts",
  "app/api/auth/email-change/route.ts",
  "app/api/auth/session/route.ts",
  "app/api/market-integrity/account-operations/[operation]/route.ts",
  "app/api/profile/route.ts",
  "app/api/security/audit-case/status/route.ts",
  "app/api/security/audit-watch/business/route.ts",
  "app/api/security/audit-watch/customer-safe-report/route.ts",
  "app/api/security/audit-watch/delivery-receipt/route.ts",
  "app/api/security/audit-watch/paid-preview/route.ts",
  "app/api/security/audit-watch/pro-pdf/route.ts",
  "app/api/security/audit-watch/pro-pdf/token/route.ts",
  "app/api/security/audit-watch/support-handoff/route.ts",
]);
const DIRECT_BOUNDARY_PATTERN =
  /(?:verifySecurityAdminToken|resolveRequestAccount|require(?:Authenticated|Auth|Session)|account_session_required|authorization|authReady|authenticated|supabase\.auth|getUser\(|entitlement|signed.{0,20}token)/i;

function classifyRoute(path) {
  if (path === "app/[locale]/[...missing]/page.tsx") return "LEGACY";
  if (path.includes("/admin/") || ADMIN_EXTRAS.has(path)) return "ADMIN";
  if (path.includes("/api/internal/") || path === "app/[locale]/runtime-proof/page.tsx") return "INTERNAL";
  if (PRIVATE_ROUTES.has(path)) return "ACTIVE_PRIVATE";
  return "ACTIVE_PUBLIC";
}

function buildRouteInventory(sourceRoot) {
  const routeFiles = walkFiles(join(sourceRoot, "app"))
    .map((path) => `app/${path}`)
    .filter((path) => /\/(?:page|route)\.tsx?$/.test(path))
    .sort();
  const entries = routeFiles.map((path) => {
    const kind = /\/page\.tsx?$/.test(path) ? "PAGE" : "API";
    const classification = classifyRoute(path);
    const source = readFileSync(join(sourceRoot, path), "utf8");
    const boundaryRequired = ["ACTIVE_PRIVATE", "ADMIN", "INTERNAL"].includes(classification);
    const directBoundaryVisible = boundaryRequired ? DIRECT_BOUNDARY_PATTERN.test(source) : null;
    return {
      path,
      route: routeFromFile(path),
      kind,
      classification,
      classificationBasis:
        classification === "ADMIN"
          ? "ADMIN_NAMESPACE_OR_REVIEW_OPERATOR_ENDPOINT"
          : classification === "INTERNAL"
            ? "INTERNAL_NAMESPACE_OR_RUNTIME_PROOF"
            : classification === "ACTIVE_PRIVATE"
              ? "ACCOUNT_REPORT_ENTITLEMENT_OR_SIGNED_ARTIFACT_SURFACE"
              : classification === "LEGACY"
                ? "LOCALE_CATCH_ALL_COMPATIBILITY_SURFACE"
                : "CURRENT_PUBLIC_PAGE_OR_API",
      boundaryRequired,
      directBoundaryVisible,
      verificationState: "NOT_PROVEN",
    };
  });
  const byClass = Object.fromEntries(ROUTE_CLASSES.map((name) => [name, 0]));
  const byKind = { PAGE: 0, API: 0 };
  for (const entry of entries) {
    byClass[entry.classification] += 1;
    byKind[entry.kind] += 1;
  }
  const protectedWithoutDirectVisibleBoundary = entries.filter(
    (entry) => entry.boundaryRequired && entry.directBoundaryVisible === false,
  );
  return {
    schemaVersion: "velmere.pass36.a102r44p46.route-api-inventory.v1",
    revisionId: REVISION,
    evidenceClass: "TESTED_STATIC",
    inventoryScope: "Every current app/**/page.ts[x] and app/api/**/route.ts[x] module in SOURCE.",
    routeModuleCount: entries.length,
    pageModuleCount: byKind.PAGE,
    apiModuleCount: byKind.API,
    classificationCounts: byClass,
    protectedModuleCount: entries.filter((entry) => entry.boundaryRequired).length,
    protectedWithoutDirectVisibleBoundaryCount: protectedWithoutDirectVisibleBoundary.length,
    protectedWithoutDirectVisibleBoundaryPaths: protectedWithoutDirectVisibleBoundary.map((entry) => entry.path),
    limitations: [
      "Classification is a conservative current-source inventory, not runtime reachability proof.",
      "A thin route may delegate a valid guard to a first-hop module; no direct visible boundary is not itself a proven vulnerability.",
      "No route receives tested auth, tenant, entitlement or customer-journey credit from enumeration alone.",
      "G17 remains open until every active route is classified, exercised and bound to reproducible security and journey evidence.",
    ],
    gateG17Closed: false,
    entries,
  };
}

const RESOLVE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".json", ".css"];
const IMPORT_PATTERN =
  /(?:\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?|\brequire\s*\(|\bimport\s*\()\s*["']([^"']+)["']/g;

function resolveModule(sourceRoot, importer, specifier) {
  if (!(specifier.startsWith("@/") || specifier.startsWith("."))) return null;
  const base = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : resolve(dirname(join(sourceRoot, importer)), specifier);
  const candidates = [];
  for (const extension of RESOLVE_EXTENSIONS) candidates.push(`${base}${extension}`);
  for (const extension of RESOLVE_EXTENSIONS.slice(1)) candidates.push(join(base, `index${extension}`));
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const stat = lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const real = realpathSync(candidate);
    const rootReal = `${realpathSync(sourceRoot)}/`;
    if (!real.startsWith(rootReal)) continue;
    return relative(sourceRoot, real).replaceAll("\\", "/");
  }
  return null;
}

function dependencyClosure(sourceRoot, routeInventory) {
  const queue = routeInventory.entries.map((entry) => entry.path);
  for (const locale of ["pl", "en", "de"]) {
    const messages = `messages/${locale}.json`;
    if (existsSync(join(sourceRoot, messages))) queue.push(messages);
  }
  const visited = new Set();
  while (queue.length > 0) {
    const path = queue.shift();
    if (visited.has(path) || !existsSync(join(sourceRoot, path))) continue;
    visited.add(path);
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"].includes(extname(path))) continue;
    const source = readFileSync(join(sourceRoot, path), "utf8");
    IMPORT_PATTERN.lastIndex = 0;
    let match;
    while ((match = IMPORT_PATTERN.exec(source))) {
      const resolved = resolveModule(sourceRoot, path, match[1]);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return [...visited].sort();
}

function npmPackageName(specifier) {
  if (specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/", 1)[0];
}

function buildPdfDependencyClosure(sourceRoot) {
  const finalRc = loadA83FinalRcReceipt(sourceRoot);
  const seedFiles = [
    "scripts/pass36/generate-a83-browser-lens-pdf-corpus.ts",
    "scripts/pass36/test-a83-browser-lens-pdf-real-packet-matrix.ts",
    "scripts/pass36/verify-a83-browser-lens-pdf-real-packet-matrix.ts",
    "lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts",
    "lib/search/lens-pdf-renderer.ts",
  ];
  const queue = [...seedFiles];
  const visited = new Set();
  const externalSpecifiers = new Set();
  const specialImports = [];
  while (queue.length > 0) {
    const path = queue.shift();
    if (visited.has(path) || !existsSync(join(sourceRoot, path))) continue;
    visited.add(path);
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"].includes(extname(path))) continue;
    const source = readFileSync(join(sourceRoot, path), "utf8");
    IMPORT_PATTERN.lastIndex = 0;
    let match;
    while ((match = IMPORT_PATTERN.exec(source))) {
      const specifier = match[1];
      const resolved = resolveModule(sourceRoot, path, specifier);
      if (resolved) queue.push(resolved);
      else externalSpecifiers.add(specifier);
      if (/^(?:postcss|nanoid|tailwindcss)(?:\/|$)|\.css(?:$|\?)/i.test(specifier)) {
        specialImports.push({ importer: path, specifier });
      }
    }
  }

  const lockBytes = readFileSync(join(sourceRoot, "package-lock.json"));
  const lock = JSON.parse(lockBytes.toString("utf8"));
  const packageQueue = [...new Set([...externalSpecifiers].map(npmPackageName).filter(Boolean))];
  const packageClosure = new Set();
  while (packageQueue.length > 0) {
    const name = packageQueue.shift();
    if (packageClosure.has(name)) continue;
    packageClosure.add(name);
    const entry = lock.packages?.[`node_modules/${name}`];
    for (const dependency of Object.keys(entry?.dependencies ?? {})) packageQueue.push(dependency);
  }
  const prohibitedBuildPackages = ["postcss", "nanoid", "tailwindcss"];
  const prohibitedInClosure = prohibitedBuildPackages.filter((name) => packageClosure.has(name));
  const currentPostcss = lock.packages?.["node_modules/postcss"]?.version ?? null;
  const currentNanoid = lock.packages?.["node_modules/nanoid"]?.version ?? null;
  const dependencyIsolated = specialImports.length === 0 && prohibitedInClosure.length === 0;
  return {
    schemaVersion: "velmere.pass36.a102r44p46.pdf-dependency-closure.v1",
    revisionId: REVISION,
    evidenceClass: "TESTED_STATIC",
    scope: "Exact static import closure of the A83 PDF generator, semantic test, materials verifier, runtime and PDF renderer on current SOURCE bytes.",
    seedFiles,
    reachableFileCount: visited.size,
    reachableFiles: [...visited].sort(),
    externalModuleSpecifiers: [...externalSpecifiers].sort(),
    npmPackageClosure: [...packageClosure].sort(),
    prohibitedBuildPackages,
    prohibitedBuildPackagesInClosure: prohibitedInClosure,
    prohibitedImports: specialImports.sort((left, right) => left.importer.localeCompare(right.importer) || left.specifier.localeCompare(right.specifier)),
    packageLockSha256: sha256(lockBytes),
    observedLockChange: {
      postcss: { parentR44P44: "8.5.19", currentR44P46: currentPostcss },
      nanoid: { parentR44P44: "3.3.16", currentR44P46: currentNanoid },
    },
    dependencyIsolatedFromPostcssNanoidTailwind: dependencyIsolated,
    evidenceBindingDriftDetected: true,
    evidenceBindingDrift: {
      staleSummaryReceiptSha256: "3da6d48ec19bf4d55295cfacbb0d3285d68f1737b1391d13242757e88e4a5942",
      currentReceiptSha256: "517ad9fb06f8c45d9978c144b1ddb6989e812e57777b08c85e67a90baa6dbb9a",
      staleSummaryManifestIntegrityDigest: "7c533525ad2bebae7afaa71c47d3d65590523ed70705e5e2c9409da257f7e354",
      currentReceiptManifestIntegrityDigest: "49834771794b8bcbd4f92289bf1a9bc333fde4baa86b724fccffed645db4cccb",
      initialExactVerifierResult: "FAIL_25_OF_31_WITH_6_FAILURES",
    },
    currentFinalRcEvidence: {
      receiptPath: A83_FINAL_RC_RECEIPT_MATERIALS_RELATIVE_PATH,
      receiptByteLength: finalRc.byteLength,
      receiptSha256: finalRc.receiptSha256,
      compactSourceSummaryValidated: finalRc.compactSourceSummaryValidated,
      fullExternalReceiptValidationRequiredInMaterialsLane: true,
      status: finalRc.receipt.status,
      evidenceClass: finalRc.receipt.evidenceClass,
      cloneRuns: finalRc.receipt.denominators.cloneRuns,
      physicalPdfsPerRun: finalRc.receipt.denominators.physicalPdfsPerRun,
      physicalPdfsTotal: finalRc.receipt.denominators.physicalPdfsTotal,
      renderedPagesPerRun: finalRc.receipt.denominators.renderedPagesPerRun,
      renderedPagesTotal: finalRc.receipt.denominators.renderedPagesTotal,
      semanticMutationsPerRun: finalRc.receipt.denominators.semanticMutationsPerRun,
      mutationKilledPerRun: finalRc.receipt.denominators.mutationKilledPerRun,
      completePdfByteComparisons: finalRc.receipt.denominators.completePdfByteComparisons,
      completePageRasterComparisons: finalRc.receipt.denominators.completePageRasterComparisons,
      retainedPhysicalPdfArtifacts: finalRc.receipt.denominators.retainedPhysicalPdfArtifacts,
      retainedContactSheetArtifacts: finalRc.receipt.denominators.retainedContactSheetArtifacts,
      manifestSha256: finalRc.receipt.run1.manifestSha256,
      semanticReceiptSha256: finalRc.receipt.run1.semanticReceiptSha256,
      rasterReceiptSha256: finalRc.receipt.run1.rasterReceiptSha256,
      runtimeSha256: finalRc.receipt.run1.runtimeSha256,
      pdfSetAggregateSha256: finalRc.receipt.run1.pdfSetAggregateSha256,
      pageRasterAggregateSha256: finalRc.receipt.run1.pageRasterAggregateSha256,
      g11ClosureEligible: true,
      externalCredit: 0,
    },
    retainedNegativeEvidence: {
      splitBrain: {
        initialExactVerifierResult: "FAIL_25_OF_31_WITH_6_FAILURES",
        staleSummaryReceiptSha256: "3da6d48ec19bf4d55295cfacbb0d3285d68f1737b1391d13242757e88e4a5942",
        currentReceiptSha256: "517ad9fb06f8c45d9978c144b1ddb6989e812e57777b08c85e67a90baa6dbb9a",
      },
      initialMissingFontFailures: finalRc.receipt.retainedNegativeEvidence,
    },
    stableParentReuseAllowed: false,
    stableParentReuseDecision: "NOT_USED_CURRENT_R46_FINAL_RC_TWO_RUN_EXECUTION_SUPERSEDES_STALE_PARENT_REUSE",
    retainedParentEvidence: "R44P44 PDF 450 documents x2, 2100 pages, 450/450 byte-identical, blank=0, edge=0.",
    finalRcRerunRequired: false,
    finalRcRequirement: "SATISFIED_BY_CURRENT_R44P46_A83_TWO_DISPOSABLE_CLONE_RECEIPT",
    limitations: [
      "Static import closure proves dependency isolation, not current-byte PDF output correctness.",
      "The prior A83 compact-summary split-brain remains retained negative evidence even though the current final-RC receipt resolves G11.",
      "Both initial missing-font generation failures remain retained; the passing reruns used one exact-hash font recovered from retained parent MATERIALS PDF FontFile2 and never copied it into SOURCE.",
      "The current receipt closes only bounded internal PDF gate G11 and grants zero external, LIVE, sale, production or world-class credit.",
      "PyMuPDF, Pillow, pypdf, pdfinfo, pdftotext and Ghostscript are execution dependencies outside the npm closure.",
    ],
  };
}

function classifyClaim(path, lineText) {
  if (HISTORICAL_PATH_PATTERN.test(path)) return "HISTORICAL_ONLY";
  if (QUALIFIER_PATTERN.test(lineText)) return "QUALIFIED";
  if (INTERNAL_PATH_PATTERN.test(path)) return "INTERNAL_ONLY";
  return "REMOVE";
}

function termOffsets(line, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
  const offsets = [];
  let match;
  while ((match = pattern.exec(line))) offsets.push(match.index);
  return offsets;
}

function buildClaimInventory(sourceRoot, routeInventory) {
  const closure = dependencyClosure(sourceRoot, routeInventory);
  const occurrences = [];
  for (const path of closure) {
    const absolute = join(sourceRoot, path);
    const extension = extname(path);
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".json", ".css"].includes(extension)) continue;
    const source = readFileSync(absolute, "utf8");
    for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
      for (const term of RISK_TERMS) {
        for (const offset of termOffsets(line, term)) {
          const state = classifyClaim(path, line);
          occurrences.push({
            path,
            line: lineIndex + 1,
            column: offset + 1,
            term,
            state,
            snippet: line.trim().slice(0, 320),
            evidenceClass: state === "INTERNAL_ONLY" ? "IMPLEMENTED" : state === "QUALIFIED" ? "TESTED_STATIC" : "NOT_PROVEN",
          });
        }
      }
    }
  }
  occurrences.sort((left, right) =>
    left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column || left.term.localeCompare(right.term),
  );
  const stateCounts = Object.fromEntries(CLAIM_STATES.map((state) => [state, 0]));
  const termCounts = Object.fromEntries(RISK_TERMS.map((term) => [term, 0]));
  for (const occurrence of occurrences) {
    stateCounts[occurrence.state] += 1;
    termCounts[occurrence.term] += 1;
  }
  const fullInventory = {
    schemaVersion: "velmere.pass36.a102r44p46.claim-inventory-evidence.v1",
    revisionId: REVISION,
    scanMode: "ACTIVE_ROUTE_DEPENDENCY_CLOSURE_PLUS_PL_EN_DE_MESSAGES",
    dependencyClosureFileCount: closure.length,
    riskyLiteralOccurrenceCount: occurrences.length,
    stateCounts,
    termCounts,
    occurrences,
  };
  const occurrenceProjectionHash = sha256(canonicalJson(occurrences));
  const summary = {
    schemaVersion: "velmere.pass36.a102r44p46.claim-inventory.v1",
    revisionId: REVISION,
    evidenceClass: "TESTED_STATIC",
    scanMode: fullInventory.scanMode,
    dependencyClosureFileCount: closure.length,
    riskyLiteralOccurrenceCount: occurrences.length,
    stateCounts,
    termCounts,
    occurrenceProjectionSha256: occurrenceProjectionHash,
    publicHighRiskRemoveCandidateCount: stateCounts.REMOVE,
    provenClaimCount: stateCounts.PROVEN,
    fixesAppliedThisTruthRebaseline: 0,
    classificationBoundary:
      "A REMOVE row is a conservative review/removal candidate, not an adjudicated false statement. PROVEN requires exact evidence; none was awarded by lexical scanning.",
    limitations: [
      "Static lexical inventory can include identifiers, internal diagnostics and negative statements.",
      "QUALIFIED is syntax/context triage, not legal approval.",
      "INTERNAL_ONLY does not permit the same wording to appear on a public surface.",
      "G09 remains open while REMOVE candidates exist and until public rendered copy, email, SEO, metadata, OpenGraph, PDF and Browser surfaces are adjudicated.",
    ],
    gateG09Closed: false,
  };
  return { fullInventory, summary };
}

function buildEvidenceTaxonomy() {
  return {
    schemaVersion: "velmere.pass36.a102r44p46.evidence-taxonomy.v1",
    revisionId: REVISION,
    exactEvidenceClasses: TAXONOMY,
    aliasesForbidden: true,
    priorAliasCorrections: {
      TESTED_REAL_LOCAL: "TESTED_LOCAL_REAL_EXECUTION",
    },
    nonPromotionRules: [
      "IMPLEMENTED_DOES_NOT_IMPLY_TESTED",
      "TESTED_STATIC_DOES_NOT_IMPLY_RUNTIME",
      "TESTED_SYNTHETIC_DOES_NOT_IMPLY_PUBLIC_CORPUS",
      "TESTED_PUBLIC_CORPUS_DOES_NOT_IMPLY_INDEPENDENT_GROUND_TRUTH",
      "TESTED_LOCAL_REAL_EXECUTION_DOES_NOT_IMPLY_STAGING_OR_PRODUCTION",
      "AI_SIMULATED_GIVES_ZERO_EXTERNAL_CREDIT",
      "PROFESSIONAL_LEGAL_PROVEN_REQUIRES_A_REAL_QUALIFIED_PROFESSIONAL",
      "PROVIDER_CONTRACT_PROVEN_REQUIRES_EXECUTED_RIGHTS_EVIDENCE",
      "ABSENCE_OF_A_FINDING_DOES_NOT_PROVE_ABSENCE_OF_A_VULNERABILITY",
    ],
    sourceOnlyAuthority: true,
    materialsMayOverwriteSource: false,
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function gate(id, name, closureRule, status, evidenceClass, evidence, blocker) {
  return { id, name, closureRule, status, evidenceClass, evidence, blocker };
}

function buildGateRegistry(pdfDependencyClosure) {
  const gates = [
    gate("G01", "Authority and supported-scope freeze", "Current SOURCE authority and supported scope are frozen and verified after all changes.", "OPEN", "NOT_PROVEN", [], "Final R46 authority manifest and supported-scope freeze are pending."),
    gate("G02", "Static quality and dual production build", "Lint, TypeScript, Webpack, Turbopack, post-build TypeScript and smoke pass on exact current bytes.", "OPEN", "NOT_PROVEN", [], "Exact-current-byte final RC pipeline is pending."),
    gate("G03", "Audit family coverage", "All declared supported detector families have vulnerable, patched, hard-negative and lookalike coverage without denominator gaming.", "OPEN", "NOT_PROVEN", [], "Broad supported detector-family denominator is incomplete."),
    gate("G04", "Audit accuracy and independent holdout", "Supported regression, validation, a fresh sealed holdout, mutation testing and accuracy metrics meet frozen thresholds with sufficient ground truth.", "OPEN", "NOT_PROVEN", [], "Current internal detector evidence does not constitute independently sufficient formal ground truth."),
    gate("G05", "Source-to-deployment binding", "Chain/address to runtime bytecode, proxy implementation, compiler/settings, local compile and mismatch classification workflow is complete and exercised.", "OPEN", "NOT_PROVEN", [], "No complete current-byte deployment-binding closure receipt."),
    gate("G06", "Security attacker panel", "The full attacker panel passes reproducible tests on current bytes with no controllable P0/P1.", "OPEN", "NOT_PROVEN", [], "Full current-byte attacker-panel evidence is incomplete."),
    gate("G07", "Account, auth and tenant isolation", "Complete account lifecycle and tenant A/B isolation pass on current bytes.", "OPEN", "NOT_PROVEN", [], "Whole-lifecycle and all-surface tenant proof are incomplete."),
    gate("G08", "Entitlement, Stripe readiness and paid-data fail-closed", "Internal entitlement/payment readiness suite passes; external Stripe proof remains separate.", "OPEN", "NOT_PROVEN", [], "Current exact-byte complete internal lifecycle receipt is absent; real Stripe remains external."),
    gate("G09", "Customer-facing claim truth", "Every high-risk public claim is PROVEN, QUALIFIED or removed; unsupported high-risk public claims equal zero.", "OPEN", "NOT_PROVEN", [], "Conservative current-source inventory retains REMOVE candidates and needs rendered-surface adjudication."),
    gate("G10", "Browser release QA", "Full PL/EN/DE desktop/mobile/browser/error-state QA is stable, repeated and dependency-valid.", "OPEN", "STALE", [
      "R44P44 Browser 57/57, screenshots 29 and evidence checks 584/584 remain historical positive evidence.",
      "R44P46 changes direct CSS-build dependency postcss 8.5.19 -> 8.5.26 and transitive nanoid 3.3.16 -> 3.3.18; the R44P45 analyzer-only stable-parent rationale no longer applies.",
    ], "Full exact R46 A60 dual-build/runtime/Browser 57/57, 29 screenshots, 4 popups and 584/584 evidence rerun is required."),
    gate("G11", "PDF release QA", "Complete relevant PDF corpus passes two deterministic runs, semantic/visual/security checks and exact-byte identity.", "CLOSED", "TESTED_LOCAL_REAL_EXECUTION", [
      "R44P44 PDF 450 documents x2, 2100 pages and 450/450 byte identity remain retained historical positive evidence.",
      `R44P46 exact static PDF dependency closure ${pdfDependencyClosure.reachableFileCount} files: postcss/nanoid/tailwind/CSS imports=0 and prohibited npm packages in closure=0.`,
      "Exact current verifier initially failed 25/31 because the compact summary still bound receipt 3da6d48e... while current receipt is 517ad9fb...; negative evidence is retained.",
      `Fresh R44P46 final-RC receipt ${pdfDependencyClosure.currentFinalRcEvidence.receiptSha256}: two disposable clones, 900 retained PDFs, 4200 rendered pages, 8100/8100 semantic mutations per run, 450/450 PDF byte identity, 2100/2100 page-raster identity and 18 retained contact sheets.`,
      "Both initial missing-font generation failures remain retained; exact-hash parent-MATERIALS FontFile2 recovery enabled the passing reruns without copying the font into SOURCE.",
    ], null),
    gate("G12", "Angel internal mega-eval", "At least 300 diverse predefined factuality, citation, safety, injection, tenant and multilingual cases meet frozen thresholds.", "OPEN", "NOT_PROVEN", [], "No current 300+ exact-case threshold-bound mega-eval closure."),
    gate("G13", "Risk, Whale and Market Impact truth", "Risk remains descriptive, Whale transfer semantics remain factual and Market Impact remains simulation-only across tiers and states.", "OPEN", "NOT_PROVEN", [], "Complete current-byte cross-surface truth suite is pending."),
    gate("G14", "Privacy, DSAR, cookie and analytics", "Notices, consent, export, deletion, correction, retention, processor mapping and analytics boundaries pass internal tests.", "OPEN", "NOT_PROVEN", [], "Internal end-to-end DSAR/privacy closure is incomplete; professional legal approval is external."),
    gate("G15", "Storage, KMS, secrets, logging and email", "Private storage, secrets/KMS readiness, redaction and transactional email failure modes pass internally.", "OPEN", "NOT_PROVEN", [], "Complete current-byte cross-plane receipt is absent; real cloud/provider proof is external."),
    gate("G16", "Backup, restore, rollback and migrations", "Backup integrity, isolated restore, failure modes, deletion semantics and migration/rollback compatibility pass.", "OPEN", "NOT_PROVEN", [], "No complete current R46 restore/rollback closure receipt."),
    gate("G17", "Whole active route and API coverage", "All active pages/APIs are classified and exercised for access, failure, locale, privacy and entitlement boundaries.", "OPEN", "NOT_PROVEN", [], "Inventory exists, but route-level runtime/security/journey coverage is incomplete."),
    gate("G18", "Incident response and kill switches", "Tabletop and independent feature kill-switch tests pass without evidence deletion.", "OPEN", "NOT_PROVEN", [], "Current full tabletop and kill-switch exercise is pending."),
    gate("G19", "Observability, SLO and alerting readiness", "Redacted telemetry contracts, local metrics, alert trigger/dedup/storm/silence/escalation/recovery tests pass.", "OPEN", "NOT_PROVEN", [], "No complete current-byte observability/alerting closure."),
    gate("G20", "Resilience, overload and performance", "Supported concurrency, heap/CPU, queue/backpressure, timeout/retry/provider failure and degraded-mode tests meet frozen budgets.", "OPEN", "NOT_PROVEN", [], "Concurrent audit and heap soak denominator remains incomplete."),
    gate("G21", "Supply chain, SBOM and build provenance", "Dependency integrity, reachability-aware advisory review, licenses, SBOM and deterministic build receipts pass.", "OPEN", "NOT_PROVEN", [], "Current final dependency/provenance closure is pending."),
    gate("G22", "Accessibility and i18n", "Every active route/state passes PL/EN/DE and defined accessibility automation; external disabled-user comprehension remains separate.", "OPEN", "NOT_PROVEN", [], "Whole-route multilingual/accessibility closure is incomplete."),
    gate("G23", "Data rights and provider failure truth", "Field/provider rights registry and all unavailable/stale/conflict/outage modes are internally complete without fake live data.", "OPEN", "NOT_PROVEN", [], "Rights-approved Shield 0/318 and Real Markets 0/583 remain parent-reported external blockers; internal registry/handoff is incomplete."),
    gate("G24", "External handoff readiness", "Reviewer, customer/WTP, rights, Stripe TEST, staging, DSAR, incident, Windows and independent-eval packets validate at 100% internal handoff readiness.", "OPEN", "NOT_PROVEN", [], "One or more required handoff packets or validation receipts are incomplete."),
    gate("G25", "Deterministic canonical packaging and clean unpack", "Exactly SOURCE_ONLY, MATERIALS and CURRENT_STATE_AND_PASS_LEDGER are bound, deterministic, clean-unpacked and verified.", "OPEN", "NOT_PROVEN", [], "Prepackage snapshot: canonical trio does not yet exist."),
    gate("G26", "No controllable P0/P1 and final RC repetition", "Controllable P0=0, controllable P1=0 and all critical gates repeat on final RC bytes.", "OPEN", "NOT_PROVEN", [], "Open controllable P1 work and incomplete final RC prevent closure."),
  ];
  const closed = gates.filter((entry) => entry.status === "CLOSED").length;
  return {
    schemaVersion: "velmere.pass36.a102r44p46.controllable-gate-registry.v1",
    revisionId: REVISION,
    denominatorPolicy: "Binary, additive, non-shrinking. A gate is CLOSED only when its full closure rule is proven; partial work receives no binary closure credit.",
    denominator: gates.length,
    closed,
    open: gates.length - closed,
    internalClosurePercent: Number(((closed / gates.length) * 100).toFixed(1)),
    prepackage: true,
    stableParentCredits: [],
    currentExecutionCredits: ["G11"],
    invalidatedStableParentCredits: ["G10"],
    resolvedByFreshCurrentExecution: ["G11"],
    gates,
  };
}

function buildExternalHumanProof() {
  const labels = [
    "Real research participants",
    "Real Basic users",
    "Real Pro users",
    "Real Advanced users",
    "Real paying users",
    "External reviewers",
    "Independent FN review",
    "Independent severity adjudication",
    "Real WTP",
    "Real refunds",
    "Real comprehension",
    "Real retention",
    "Professional legal review",
    "Provider legal confirmations",
  ];
  const items = labels.map((name) => ({
    name,
    count: 0,
    required: name === "External reviewers" ? 2 : null,
    evidenceClass: "NOT_PROVEN",
    AIContribution: 0,
  }));
  return {
    schemaVersion: "velmere.pass36.a102r44p46.external-human-proof.v1",
    revisionId: REVISION,
    denominator: items.length,
    closed: 0,
    externalEvidenceClosurePercent: 0,
    AIContribution: 0,
    items,
  };
}

const SCORE_DIMENSIONS = [
  "Engineering Quality",
  "Security Quality",
  "Accuracy/Data Quality",
  "AI Customer Score",
  "AI Reviewer Score",
  "Tier/Entitlement Value",
  "Operational Readiness",
  "Legal/Data Rights",
  "External Customer Proof",
  "External Reviewer Proof",
  "Free Release Readiness",
  "Paid Release Readiness",
  "World-Class Evidence",
];
const PRODUCT_ROWS = [
  "Audit Basic",
  "Audit Pro",
  "Audit Advanced",
  "PDF Basic",
  "PDF Pro",
  "PDF Advanced",
  "Browser Basic",
  "Browser Pro",
  "Browser Advanced",
  "Shield",
  "Shield Pro",
  "Shield Map",
  "Real Markets",
  "Angel",
  "Risk Indicator",
  "Whale Watch",
  "Market Impact",
];

function buildScorePolicy() {
  return {
    schemaVersion: "velmere.pass36.a102r44p46.score-policy.v1",
    revisionId: REVISION,
    dimensions: SCORE_DIMENSIONS,
    binaryInternalClosureUsesOnlyGateRegistry: true,
    externalClosureUsesOnlyExternalHumanProofRegistry: true,
    numericDimensionScoresRequireReproducibleDenominator: true,
    absentReproducibleDenominatorValue: null,
    passNumberCreditForbidden: true,
    testCountAloneCreditForbidden: true,
    AIExternalCreditForbidden: true,
    denominatorGamingForbidden: true,
    scoreMayDecrease: true,
    everyNumericDeltaRequires: ["PREVIOUS", "CURRENT", "DELTA", "REASON", "EVIDENCE"],
    legacyR45QuarantineClass: "LEGACY_DIRECTIONAL_UNREPRODUCIBLE",
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function buildScorecard(gates, external) {
  const products = PRODUCT_ROWS.map((name) => ({
    name,
    dimensionScores: Object.fromEntries(
      SCORE_DIMENSIONS.map((dimension) => [
        dimension,
        {
          previous: dimension === "External Customer Proof" || dimension === "External Reviewer Proof" ? 0 : null,
          current: dimension === "External Customer Proof" || dimension === "External Reviewer Proof" ? 0 : null,
          delta: dimension === "External Customer Proof" || dimension === "External Reviewer Proof" ? 0 : null,
          state: "NOT_PROVEN",
          reason:
            dimension === "External Customer Proof" || dimension === "External Reviewer Proof"
              ? "External registry is zero; AI contributes zero credit."
              : "R45 directional numeric score lacks a reproduced R46 denominator and is quarantined rather than carried forward.",
          evidence: [],
        },
      ]),
    ),
    releaseTruth:
      name === "Audit Basic" || name === "PDF Basic" || name === "Browser Basic"
        ? "FREE_ACTION_REQUIRED"
        : name === "Audit Pro"
          ? "INVITATION_ONLY_CONTROLLED_BETA_MANUAL_QA_REQUIRED"
          : "NOT_FOR_SALE",
  }));
  return {
    schemaVersion: "velmere.pass36.a102r44p46.scorecard.v1",
    revisionId: REVISION,
    legacyDirectionalQuarantine: {
      sourceCheckpoint: "R44P45",
      classification: "LEGACY_DIRECTIONAL_UNREPRODUCIBLE",
      internalClosurePercent: 67.4,
      externalEvidenceClosurePercent: 6.2,
      proofWeightedPercent: 55.3,
      authorityForR46: false,
      reason: "R45 did not expose a reproducible binary controllable-gate denominator or an external-human numerator supporting these percentages.",
    },
    currentProjectTruth: {
      internalClosure: {
        previous: null,
        current: gates.internalClosurePercent,
        delta: null,
        numerator: gates.closed,
        denominator: gates.denominator,
        evidence: [...gates.stableParentCredits, ...gates.currentExecutionCredits],
      },
      externalEvidenceClosure: {
        previous: null,
        current: external.externalEvidenceClosurePercent,
        delta: null,
        numerator: external.closed,
        denominator: external.denominator,
        evidence: [],
      },
      proofWeighted: {
        previous: null,
        current: null,
        delta: null,
        state: "UNREPRODUCIBLE",
        reason: "No frozen reproducible aggregation formula and complete current dimension denominators exist.",
      },
    },
    products,
  };
}

function buildBlockers(claims, routes) {
  return {
    schemaVersion: "velmere.pass36.a102r44p46.p0-p1-register.v1",
    revisionId: REVISION,
    adjudicationScope: "Known current-source evidence at truth-rebaseline prepackage time.",
    controllableP0: [],
    controllableP0Count: 0,
    p0ClosureClaimed: false,
    p0Boundary: "No known controllable P0 was reproduced in this bounded truth pass; incomplete full-gate coverage means zero known is not a final zero-P0 proof.",
    controllableP1: [
      {
        id: "P1-R46-001",
        title: "Audit accuracy denominator and independently sufficient sealed holdout remain open",
        gates: ["G03", "G04"],
        evidenceClass: "NOT_PROVEN",
      },
      {
        id: "P1-R46-002",
        title: "Unsupported high-risk public claim candidates require rendered-surface adjudication",
        gates: ["G09"],
        evidenceClass: "NOT_PROVEN",
        observedCandidates: claims.publicHighRiskRemoveCandidateCount,
      },
      {
        id: "P1-R46-003",
        title: "Whole active route/API runtime, auth, tenant, entitlement and journey coverage is incomplete",
        gates: ["G06", "G07", "G08", "G17"],
        evidenceClass: "NOT_PROVEN",
        routeModules: routes.routeModuleCount,
      },
      {
        id: "P1-R46-004",
        title: "Concurrent audit, heap soak and degraded-mode resilience denominator remains open",
        gates: ["G20"],
        evidenceClass: "NOT_PROVEN",
      },
      {
        id: "P1-R46-005",
        title: "Canonical deterministic trio and clean-unpack verification are pending",
        gates: ["G25"],
        evidenceClass: "NOT_PROVEN",
      },
      {
        id: "P1-R46-006",
        title: "External handoff packet set has not yet been verified complete",
        gates: ["G24"],
        evidenceClass: "NOT_PROVEN",
      },
      {
        id: "P1-R46-007",
        title: "Browser stable-parent reuse was invalidated by the PostCSS/Nanoid build dependency change",
        gates: ["G10", "G26"],
        evidenceClass: "STALE",
        requiredEvidence: "Exact R46 A60 dual-build/runtime/Browser 57/57, 29 screenshots, 4 popups and 584/584 evidence rerun.",
      },
    ],
    resolvedNegativeEvidence: [
      {
        id: "P1-R46-008",
        title: "PDF compact-summary binding drift invalidated interim stable-parent closure",
        gates: ["G11", "G26"],
        initialEvidenceClass: "STALE",
        initialExactVerifier: "FAIL_25_OF_31_WITH_6_FAILURES",
        resolutionEvidenceClass: "TESTED_LOCAL_REAL_EXECUTION",
        resolution: "Fresh R44P46 A83 final-RC execution passed in two disposable clones with 900 retained PDFs, 4200 rendered pages, 450/450 PDF byte identity, 2100/2100 page-raster identity and 18 retained contact sheets.",
        receiptPath: A83_FINAL_RC_RECEIPT_MATERIALS_RELATIVE_PATH,
        receiptSha256: A83_FINAL_RC_RECEIPT_SHA256,
        retainedNegativeEvidence: [
          "Initial compact-summary split-brain: exact verifier FAIL 25/31 with six failures.",
          "RUN1 initial generation failed because the exact font input was missing.",
          "RUN2 initial generation failed because the exact font input was missing.",
        ],
      },
    ],
    externalBlockers: [
      "Real customer and WTP evidence",
      "Two independent reviewers and independent FN/severity adjudication",
      "Professional legal review",
      "Provider rights confirmations",
      "Real Stripe TEST and production/staging outcomes",
      "Exact Windows execution environment",
    ],
  };
}

function buildCurrentState(gates, external, routes, claims, blockers) {
  return {
    schemaVersion: "velmere.pass36.a102r44p46.current-state.v1",
    revisionId: REVISION,
    parentRevisionId: PARENT_REVISION,
    checkpoint: "PASS36 A102R44P46",
    pass: "LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE",
    cycle: "CURRENT_STATE_LOOP_PREPACKAGE",
    status: "ACTION_REQUIRED",
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    sourceOnlyAuthority: true,
    materialsMayOverwriteSource: false,
    roadmapStatus: "HISTORICAL_PARENT_EVIDENCE",
    currentStateLedgerIsSoleDetachedCurrentStateAuthority: true,
    internalClosure: { numerator: gates.closed, denominator: gates.denominator, percent: gates.internalClosurePercent },
    externalEvidenceClosure: { numerator: external.closed, denominator: external.denominator, percent: 0 },
    proofWeighted: { value: null, state: "UNREPRODUCIBLE" },
    legacyR45Scores: {
      internalClosurePercent: 67.4,
      externalEvidenceClosurePercent: 6.2,
      proofWeightedPercent: 55.3,
      classification: "LEGACY_DIRECTIONAL_UNREPRODUCIBLE",
      carriedForward: false,
    },
    currentInventory: {
      routesAndApis: routes.routeModuleCount,
      pages: routes.pageModuleCount,
      apis: routes.apiModuleCount,
      dependencyClosureFilesForClaimScan: claims.dependencyClosureFileCount,
      riskyClaimOccurrences: claims.riskyLiteralOccurrenceCount,
      removeCandidates: claims.publicHighRiskRemoveCandidateCount,
    },
    knownControllableP0: blockers.controllableP0Count,
    controllableP0FinallyProvenZero: false,
    knownControllableP1: blockers.controllableP1.length,
    nextHighestValueTask:
      "Attack the highest-value Audit accuracy/ground-truth gap. G11 PDF is closed by fresh exact R44P46 two-clone final-RC evidence; G10 Browser remains separately OPEN/STALE until a real browser executable is available.",
  };
}

function buildSnapshot(gates, external, routes, claims, blockers) {
  return {
    schemaVersion: "velmere.pass36.a102r44p46.prepackage-snapshot.v1",
    revisionId: REVISION,
    phase: "PREPACKAGE",
    sourceFingerprint: "PENDING_FINAL_R46_SOURCE_MANIFEST",
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    internalClosure: `${gates.closed}/${gates.denominator}=${gates.internalClosurePercent}%`,
    externalEvidenceClosure: `${external.closed}/${external.denominator}=0.0%`,
    proofWeighted: "UNREPRODUCIBLE",
    stableParentClosedGates: gates.stableParentCredits,
    currentExecutionClosedGates: gates.currentExecutionCredits,
    openGateCount: gates.open,
    routeInventory: `${routes.routeModuleCount} modules (${routes.pageModuleCount} pages, ${routes.apiModuleCount} APIs)`,
    claimInventory: `${claims.riskyLiteralOccurrenceCount} risky literal occurrences; ${claims.publicHighRiskRemoveCandidateCount} conservative REMOVE candidates`,
    knownControllableP0: blockers.controllableP0Count,
    controllableP0FinallyProvenZero: false,
    knownControllableP1: blockers.controllableP1.length,
    packageState: "NOT_RUN",
    postpackageMaximumWithoutOtherGateChanges: "2/26=7.7% only if G25 fully closes; G11 PDF is already CLOSED by fresh current execution while G10 Browser remains OPEN/STALE",
  };
}

function buildAll(sourceRoot) {
  const routesFull = buildRouteInventory(sourceRoot);
  const { fullInventory: claimsFull, summary: claims } = buildClaimInventory(sourceRoot, routesFull);
  const routes = {
    ...routesFull,
    entriesSha256: sha256(canonicalJson(routesFull.entries)),
    entries: undefined,
  };
  delete routes.entries;
  const taxonomy = buildEvidenceTaxonomy();
  const pdfDependencyClosure = buildPdfDependencyClosure(sourceRoot);
  const gates = buildGateRegistry(pdfDependencyClosure);
  const external = buildExternalHumanProof();
  const scorePolicy = buildScorePolicy();
  const scorecard = buildScorecard(gates, external);
  const blockers = buildBlockers(claims, routesFull);
  const currentState = buildCurrentState(gates, external, routesFull, claims, blockers);
  const snapshot = buildSnapshot(gates, external, routesFull, claims, blockers);
  return {
    configs: { taxonomy, gates, external, scorePolicy, scorecard, blockers, routes, claims, pdfDependencyClosure, currentState, snapshot },
    evidence: { routesFull, claimsFull },
  };
}

function assertInvariant(condition, message, checks) {
  checks.push({ name: message, pass: Boolean(condition) });
  if (!condition) throw new Error(message);
}

function verifyInvariants(all) {
  const checks = [];
  const { configs, evidence } = all;
  assertInvariant(JSON.stringify(configs.taxonomy.exactEvidenceClasses) === JSON.stringify(TAXONOMY), "evidence taxonomy is exact and ordered", checks);
  assertInvariant(configs.gates.denominator === 26, "controllable denominator is exactly 26", checks);
  assertInvariant(configs.gates.closed === 1, "prepackage closed gate count is exactly 1", checks);
  assertInvariant(configs.gates.internalClosurePercent === 3.8, "prepackage internal closure is 1/26 = 3.8 percent", checks);
  assertInvariant(configs.gates.stableParentCredits.length === 0, "no stale parent gate receives current binary closure credit", checks);
  assertInvariant(JSON.stringify(configs.gates.currentExecutionCredits) === JSON.stringify(["G11"]), "G11 receives current execution credit only", checks);
  assertInvariant(JSON.stringify(configs.gates.invalidatedStableParentCredits) === JSON.stringify(["G10"]), "Browser stable-parent credit remains explicitly invalidated", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G10")?.status === "OPEN", "G10 Browser is open after PostCSS dependency change", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G10")?.evidenceClass === "STALE", "G10 retained Browser evidence is stale, not deleted", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G11")?.status === "CLOSED", "G11 PDF is closed by fresh current two-clone final-RC execution", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G11")?.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION", "G11 evidence class is local real execution", checks);
  assertInvariant(configs.pdfDependencyClosure.dependencyIsolatedFromPostcssNanoidTailwind === true, "PDF closure excludes PostCSS, Nanoid, Tailwind and CSS imports", checks);
  assertInvariant(configs.pdfDependencyClosure.prohibitedBuildPackagesInClosure.length === 0 && configs.pdfDependencyClosure.prohibitedImports.length === 0, "PDF dependency exclusion denominator is zero", checks);
  assertInvariant(configs.pdfDependencyClosure.evidenceBindingDriftDetected === true && configs.pdfDependencyClosure.stableParentReuseAllowed === false, "PDF binding drift remains retained and no parent reuse receives credit", checks);
  assertInvariant(configs.pdfDependencyClosure.finalRcRerunRequired === false, "PDF final RC rerun requirement is satisfied", checks);
  assertInvariant(configs.pdfDependencyClosure.currentFinalRcEvidence?.receiptSha256 === A83_FINAL_RC_RECEIPT_SHA256, "PDF final RC evidence binds the frozen external receipt", checks);
  assertInvariant(configs.pdfDependencyClosure.currentFinalRcEvidence?.g11ClosureEligible === true && configs.pdfDependencyClosure.currentFinalRcEvidence?.externalCredit === 0, "PDF receipt is G11-eligible with zero external credit", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G04")?.status === "OPEN", "G04 accuracy remains open", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G09")?.status === "OPEN", "G09 claims remains open", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G17")?.status === "OPEN", "G17 route coverage remains open", checks);
  assertInvariant(configs.gates.gates.find((entry) => entry.id === "G25")?.status === "OPEN", "G25 packaging remains open prepackage", checks);
  assertInvariant(configs.blockers.controllableP1.length === 7 && !configs.blockers.controllableP1.some((entry) => entry.id === "P1-R46-008"), "P1-R46-008 is no longer open and controllable P1 count decreased to 7", checks);
  assertInvariant(configs.blockers.resolvedNegativeEvidence.some((entry) => entry.id === "P1-R46-008" && entry.receiptSha256 === A83_FINAL_RC_RECEIPT_SHA256), "P1-R46-008 remains retained as resolved negative evidence", checks);
  assertInvariant(configs.external.denominator === 14 && configs.external.closed === 0, "external human registry is 0 of 14", checks);
  assertInvariant(configs.external.items.every((entry) => entry.count === 0 && entry.AIContribution === 0), "all external human counts and AI credit are zero", checks);
  assertInvariant(configs.scorecard.legacyDirectionalQuarantine.classification === "LEGACY_DIRECTIONAL_UNREPRODUCIBLE", "R45 numeric scores are quarantined", checks);
  assertInvariant(configs.scorecard.currentProjectTruth.proofWeighted.current === null, "proof-weighted score is not fabricated", checks);
  assertInvariant(configs.scorecard.products.length === 17, "scorecard contains exactly 17 canonical product rows", checks);
  assertInvariant(configs.scorecard.products.every((product) => Object.keys(product.dimensionScores).length === SCORE_DIMENSIONS.length), "every product has all 13 required dimensions", checks);
  assertInvariant(evidence.routesFull.routeModuleCount === 137, "current SOURCE has 137 route modules", checks);
  assertInvariant(evidence.routesFull.pageModuleCount === 58, "current SOURCE has 58 page modules", checks);
  assertInvariant(evidence.routesFull.apiModuleCount === 79, "current SOURCE has 79 API modules", checks);
  assertInvariant(
    canonicalJson(evidence.routesFull.classificationCounts) ===
      canonicalJson({ ACTIVE_PUBLIC: 86, ACTIVE_PRIVATE: 20, ADMIN: 26, INTERNAL: 4, LEGACY: 1, UNREACHABLE: 0, DEPRECATED: 0 }),
    "route classification is complete and conservatively partitioned",
    checks,
  );
  assertInvariant(evidence.routesFull.entries.length === new Set(evidence.routesFull.entries.map((entry) => entry.path)).size, "route paths are unique", checks);
  assertInvariant(ROUTE_CLASSES.every((classification) => classification in evidence.routesFull.classificationCounts), "all route classes are represented in the registry", checks);
  assertInvariant(configs.claims.gateG09Closed === false && configs.routes.gateG17Closed === false, "claim and route inventory do not fake closure", checks);
  assertInvariant(configs.snapshot.packageState === "NOT_RUN", "prepackage snapshot does not fake packaging", checks);
  assertInvariant(configs.currentState.LIVE === false && configs.currentState.saleEnabled === false && configs.currentState.productionApproved === false && configs.currentState.worldClassProven === false, "all live/sale/approval/world-class flags remain false", checks);
  return checks;
}

function writeAll(sourceRoot, evidenceRoot, all) {
  for (const [key, filename] of Object.entries(CONFIG_FILENAMES)) {
    const absolute = join(sourceRoot, filename);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, canonicalJson(all.configs[key]));
  }
  if (evidenceRoot) {
    mkdirSync(evidenceRoot, { recursive: true });
    writeFileSync(join(evidenceRoot, "R44P46_ROUTE_API_INVENTORY.json"), canonicalJson(all.evidence.routesFull));
    writeFileSync(join(evidenceRoot, "R44P46_CLAIM_INVENTORY.json"), canonicalJson(all.evidence.claimsFull));
  }
}

function verifyFiles(sourceRoot, all, checks) {
  for (const [key, filename] of Object.entries(CONFIG_FILENAMES)) {
    const absolute = join(sourceRoot, filename);
    assertInvariant(existsSync(absolute), `${filename} exists`, checks);
    const actual = readJson(absolute);
    assertInvariant(canonicalJson(actual) === canonicalJson(all.configs[key]), `${filename} matches current-source recomputation`, checks);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = realpathSync(args.sourceRoot);
  const all = buildAll(sourceRoot);
  if (args.write) writeAll(sourceRoot, args.evidenceRoot, all);
  const checks = verifyInvariants(all);
  verifyFiles(sourceRoot, all, checks);
  const receipt = {
    schemaVersion: "velmere.pass36.a102r44p46.truth-rebaseline-verification.v1",
    revisionId: REVISION,
    sourceRoot,
    mode: args.write ? "WRITE_AND_VERIFY" : "VERIFY_ONLY",
    pass: checks.every((entry) => entry.pass),
    checkCount: checks.length,
    checks,
    configSha256: Object.fromEntries(
      Object.entries(CONFIG_FILENAMES).map(([key, filename]) => [filename, jsonHash(all.configs[key])]),
    ),
    routeEvidenceSha256: jsonHash(all.evidence.routesFull),
    claimEvidenceSha256: jsonHash(all.evidence.claimsFull),
  };
  if (args.evidenceRoot) {
    mkdirSync(args.evidenceRoot, { recursive: true });
    writeFileSync(join(args.evidenceRoot, "R44P46_TRUTH_REBASELINE_VERIFICATION.json"), canonicalJson(receipt));
  }
  process.stdout.write(canonicalJson(receipt));
}

main();
