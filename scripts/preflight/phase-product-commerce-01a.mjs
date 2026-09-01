import {  errors, fs, packageScriptEvidenceSource, path, pkg, read, root, routeFileExistsOrHasAlias, walk } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.product-commerce.001");

if (!pkg.dependencies?.next && !pkg.devDependencies?.next) {
  errors.pushWithId.bind(errors, "commerce.001.next-dependency-is-missing-from-packageon-check-vercel-r.a001.next-dependency-is-missing-from-packageon-check-vercel-r")(
    "Next.js dependency is missing from package.json. Check Vercel Root Directory.",
  );
}



setGuardScope("pf.product-commerce.002");

try {
  const rootArtifacts = fs
    .readdirSync(root)
    .filter((name) => /^CODEX_.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name));
  for (const artifact of rootArtifacts) {
    errors.pushWithId.bind(errors, "commerce.002.value-codex-handoff-source-artifact-is-in-the-project-ro.a001.value-codex-handoff-source-artifact-is-in-the-project-ro")(
      `${artifact}: Codex handoff/source artifact is in the project root and will be compiled by Next/TypeScript. Move it to docs/codex-handoff as .txt or keep it outside the deployment ZIP.`,
    );
  }
  const codexSourceArtifacts = walk(".", [".ts", ".tsx", ".js", ".jsx"]).filter(
    (file) => /^CODEX_/.test(path.basename(file)),
  );
  for (const artifact of codexSourceArtifacts) {
    errors.pushWithId.bind(errors, "commerce.002.value-codex-handoff-source-artifact-is-in-the-project-ro.a002.value-codex-handoff-files-must-not-use-source-code-exten")(
      `${artifact}: Codex handoff files must not use source-code extensions inside the deployable project.`,
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.002.value-codex-handoff-source-artifact-is-in-the-project-ro.a003.codex-artifact-guard-failed-value")(
    `Codex artifact guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.003");

// Product truth production guard
try {
  const typeSource = read("lib/products/types.ts");
  const catalogSource = read("lib/products/catalog.generated.ts");
  const detailSource = read("components/shop/ProductDetailClient.tsx");
  const readinessSource = read("lib/products/launch-readiness.ts");
  for (const needle of ["ProductTruthProfile", "truth?: ProductTruthProfile"]) {
    if (!typeSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.003.lib-products-types-missing-product-truth-type-value.a001.lib-products-types-missing-product-truth-type-value")(
        `lib/products/types.ts: missing product truth type ${needle}.`,
      );
  }
  for (const needle of [
    "material:",
    "composition:",
    "sizeGuide:",
    "deliveryNote:",
    "returnNote:",
  ]) {
    const count = catalogSource.split(needle).length - 1;
    if (count < 4)
      errors.pushWithId.bind(errors, "commerce.003.lib-products-types-missing-product-truth-type-value.a002.lib-products-catalog-generated-product-truth-field-value")(
        `lib/products/catalog.generated.ts: product truth field ${needle} should exist for preview products; found ${count}.`,
      );
  }
  for (const needle of [
    "productTruthIssues(product)",
    "product_truth_missing",
    "size_guide_missing",
  ]) {
    if (!readinessSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.003.lib-products-types-missing-product-truth-type-value.a003.lib-products-launch-readiness-missing-product-truth-read")(
        `lib/products/launch-readiness.ts: missing product truth readiness guard ${needle}.`,
      );
  }
  for (const needle of [
    "const truth = selectedProduct.truth",
    "truth?.sizeGuide.measurements ?? MEASUREMENTS",
    "productSpecs",
  ]) {
    if (!detailSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.003.lib-products-types-missing-product-truth-type-value.a004.components-shop-productdetailclientx-missing-dynamic-pro")(
        `components/shop/ProductDetailClient.tsx: missing dynamic product truth surface ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.003.lib-products-types-missing-product-truth-type-value.a005.product-truth-production-guard-failed-value")(
    `Product truth production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.004");

// Commerce launch safety production guard
try {
  const launchSource = read("lib/products/launch-readiness.ts");
  const shopSource = read("components/shop/ShopPageClient.tsx");
  const catalogSource = read("lib/products/catalog.generated.ts");
  for (const needle of [
    "buildCommerceLaunchAudit",
    "checkout_disabled",
    "automatic_mapping_missing",
    "localized_copy_missing",
  ]) {
    if (!launchSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.004.lib-products-launch-readiness-missing-commerce-launch-gu.a001.lib-products-launch-readiness-missing-commerce-launch-gu")(
        `lib/products/launch-readiness.ts: missing commerce launch guard ${needle}.`,
      );
  }
  if (!shopSource.includes('data-pass318-public-storefront-focus="shop"')) {
    for (const needle of [
      "launchAudit.averageScore",
      "commerce.readinessKicker",
      "commerce.issueTitle",
    ]) {
      if (!shopSource.includes(needle))
        errors.pushWithId.bind(errors, "commerce.004.lib-products-launch-readiness-missing-commerce-launch-gu.a002.components-shop-shoppageclientx-missing-commerce-launch")(
          `components/shop/ShopPageClient.tsx: missing commerce launch UI ${needle}.`,
        );
    }
  }
  if (
    catalogSource.includes('status: "active"') &&
    catalogSource.includes('fulfilmentMode: "disabled"')
  ) {
    errors.pushWithId.bind(errors, "commerce.004.lib-products-launch-readiness-missing-commerce-launch-gu.a003.lib-products-catalog-generated-active-products-cannot-us")(
      "lib/products/catalog.generated.ts: active products cannot use disabled fulfilment.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.004.lib-products-launch-readiness-missing-commerce-launch-gu.a004.commerce-launch-safety-production-guard-failed-value")(
    `Commerce launch safety production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.005");

// Operator copy progress production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const casefileSource = read("lib/market-integrity/operator-casefile.ts");
  const progressSource = read("lib/launch/project-progress.ts");
  const cssSource = read("app/globals.css");
  for (const needle of ["controlBody", "basicHint", "advancedHint"]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a001.components-market-integrity-tokenriskmodalx-missing-oper")(
        `components/market-integrity/TokenRiskModal.tsx: missing operator copy marker ${needle}.`,
      );
  }
  if (!cssSource.includes(".shield-token-action-panel .shield-mode-guide"))
    errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a002.app-globals-css-missing-legacy-hidden-mode-guide-marker")("app/globals.css: missing PASS148 hidden mode guide marker.");
  for (const needle of [
    "low-risk pre-screen",
    "Missing sources still keep the case in review mode",
  ]) {
    if (!casefileSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a003.lib-market-integrity-operator-casefile-missing-clear-ver")(
        `lib/market-integrity/operator-casefile.ts: missing clear verdict marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmereProjectProgress",
    "velmereProjectOverallProgress",
    "evidence-export",
    "launch-safety",
  ]) {
    if (!progressSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a004.lib-launch-project-progress-missing-progress-matrix-mark")(
        `lib/launch/project-progress.ts: missing progress matrix marker ${needle}.`,
      );
  }
  if (!cssSource.includes("PASS132 — operator copy clarity")) {
    errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a005.app-globals-css-missing-legacy-operator-copy-css")("app/globals.css: missing PASS132 operator copy CSS.");
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.005.components-market-integrity-tokenriskmodalx-missing-oper.a006.operator-copy-progress-production-guard-failed-value")(
    `Operator copy progress production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.006");

// Site page audit production guard
try {
  const auditSource = read("lib/launch/site-page-audit.ts");
  for (const needle of [
    "velmereSitePageAudit",
    "Velmère Square",
    "VLM token / access layer",
    "Shield market table",
    "Admin import products",
    "vercelRisk",
    "launchBlockers",
  ]) {
    if (!auditSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.006.lib-launch-site-page-audit-missing-site-audit-marker-val.a001.lib-launch-site-page-audit-missing-site-audit-marker-val")(
        `lib/launch/site-page-audit.ts: missing site audit marker ${needle}.`,
      );
  }
  const requiredRoutes = [
    "app/[locale]/page.tsx",
    "app/[locale]/clothing/page.tsx",
    "app/[locale]/shop/page.tsx",
    "app/[locale]/shop/[id]/page.tsx",
    "app/[locale]/vlm-token/page.tsx",
    "app/[locale]/square/page.tsx",
    "app/[locale]/market-integrity/page.tsx",
    "app/[locale]/market-integrity/shield-map/page.tsx",
    "app/[locale]/account/page.tsx",
    "app/[locale]/login/page.tsx",
    "app/[locale]/member/page.tsx",
    "app/[locale]/legal/terms/page.tsx",
    "app/[locale]/admin/import-products/page.tsx",
  ];
  for (const route of requiredRoutes) {
    if (!routeFileExistsOrHasAlias(route))
      errors.pushWithId.bind(errors, "commerce.006.lib-launch-site-page-audit-missing-site-audit-marker-val.a002.missing-route-required-by-site-audit-or-redirect-registr")(`Missing route required by site audit or redirect registry: ${route}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.006.lib-launch-site-page-audit-missing-site-audit-marker-val.a003.site-page-audit-production-guard-failed-value")(
    `Site page audit production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.007");

// Broad Vercel static production guard
try {
  const sourceFiles = walk(".", [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
  const runtimeFiles = sourceFiles.filter(
    (file) => !file.startsWith("scripts/") && !file.startsWith("docs/"),
  );
  for (const file of sourceFiles) {
    if (/^CODEX_/.test(path.basename(file)))
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a001.value-codex-source-artifact-must-not-be-deployable")(`${file}: Codex source artifact must not be deployable.`);
  }
  for (const file of runtimeFiles) {
    const source = read(file);
    if (file.endsWith(".tsx") && /<img\b/.test(source))
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a002.value-raw-img-is-blocked")(`${file}: raw <img> is blocked.`);
    if (
      /\[\s*\.\.\.\s*[^\n;]*(\.values\(\)|\.keys\(\)|\.entries\(\))/.test(
        source,
      )
    )
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a003.value-direct-iterator-spread-is-blocked-for-vercel-targe")(
        `${file}: direct iterator spread is blocked for Vercel target.`,
      );
    if (
      (file.includes("TokenRiskModal") ||
        file.includes("market-integrity/risk-engine")) &&
      source.includes("result.limitations")
    )
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a004.value-stale-result-limitations-access-is-blocked")(`${file}: stale result.limitations access is blocked.`);
    if (
      (file.includes("TokenRiskModal") ||
        file.includes("market-integrity/risk-engine")) &&
      source.includes("safeTileIndex")
    )
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a005.value-old-safetileindex-workaround-must-not-return")(`${file}: old safeTileIndex workaround must not return.`);
    if (
      (file.startsWith("app/api/") || file.startsWith("app/actions/")) &&
      ["window.", "document.", "localStorage", "navigator."].some((needle) =>
        source.includes(needle),
      )
    ) {
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a006.value-browser-api-is-used-in-server-route-action-code")(`${file}: browser API is used in server route/action code.`);
    }
  }
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const unifiedAssetModal =
    modalSource.includes("UnifiedAssetModalShell") &&
    modalSource.includes("UnifiedAnalysisDepthDock") &&
    modalSource.includes("detailsSlot=");
  for (const marker of [
    "downloadEvidenceManifest",
    "copyEvidenceManifest",
    "motionPreset",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a007.components-market-integrity-tokenriskmodalx-missing-runt")(
        `components/market-integrity/TokenRiskModal.tsx: missing runtime safety marker ${marker}.`,
      );
  }
  if (!unifiedAssetModal && !modalSource.includes("shield-token-review-tools-hidden")) {
    errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a008.components-market-integrity-tokenriskmodalx-missing-runt")(
      "components/market-integrity/TokenRiskModal.tsx: missing runtime safety marker shield-token-review-tools-hidden or unified asset modal replacement.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.007.value-codex-source-artifact-must-not-be-deployable.a009.broad-vercel-static-production-guard-failed-value")(
    `Broad Vercel static production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.008");

// Orbit layout cleanup production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const unifiedAssetModal =
    modalSource.includes("UnifiedAssetModalShell") &&
    modalSource.includes("UnifiedAnalysisDepthDock") &&
    modalSource.includes("detailsSlot=");
  for (const needle of [
    "requestAnimationFrame(tick)",
    "targetFrameMs",
    "shield-vlm-static-board",
    "shield-vlm-detail-panel-side",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.008.components-market-integrity-tokenriskmodalx-missing-orbi.a001.components-market-integrity-tokenriskmodalx-missing-orbi")(
        `components/market-integrity/TokenRiskModal.tsx: missing orbit cleanup marker ${needle}.`,
      );
  }
  if (!unifiedAssetModal && !modalSource.includes("shield-token-review-tools-hidden")) {
    errors.pushWithId.bind(errors, "commerce.008.components-market-integrity-tokenriskmodalx-missing-orbi.a002.components-market-integrity-tokenriskmodalx-missing-orbi")(
      "components/market-integrity/TokenRiskModal.tsx: missing orbit cleanup marker shield-token-review-tools-hidden or unified asset modal replacement.",
    );
  }
  for (const needle of [
    "PASS131 — orbit layout cleanup",
    ".shield-vlm-static-board",
    ".shield-vlm-detail-panel-side",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.008.components-market-integrity-tokenriskmodalx-missing-orbi.a003.app-globals-css-missing-orbit-cleanup-css-marker-value")(
        `app/globals.css: missing orbit cleanup CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.008.components-market-integrity-tokenriskmodalx-missing-orbi.a004.orbit-layout-cleanup-production-guard-failed-value")(
    `Orbit layout cleanup production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.009");

// Evidence export manifest production guard
try {
  const evidenceSource = read("lib/market-integrity/evidence-report.ts");
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "ShieldEvidenceExportManifest",
    "buildShieldEvidenceExportManifest",
    "serializeShieldEvidenceExportManifest",
    "json_preview_only",
  ]) {
    if (!evidenceSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.009.lib-market-integrity-evidence-report-missing-evidence-ex.a001.lib-market-integrity-evidence-report-missing-evidence-ex")(
        `lib/market-integrity/evidence-report.ts: missing evidence export manifest marker ${needle}.`,
      );
  }
  const unifiedEvidenceDetails =
    modalSource.includes("evidenceExportManifest") &&
    modalSource.includes("evidenceExportJson") &&
    modalSource.includes("detailsSlot=");
  for (const needle of [
    "downloadEvidenceManifest",
    "copyEvidenceManifest",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.009.lib-market-integrity-evidence-report-missing-evidence-ex.a002.components-market-integrity-tokenriskmodalx-missing-evid")(
        `components/market-integrity/TokenRiskModal.tsx: missing evidence export UI marker ${needle}.`,
      );
  }
  if (!unifiedEvidenceDetails && !modalSource.includes("shield-evidence-export-manifest")) {
    errors.pushWithId.bind(errors, "commerce.009.lib-market-integrity-evidence-report-missing-evidence-ex.a003.components-market-integrity-tokenriskmodalx-missing-evid")(
      "components/market-integrity/TokenRiskModal.tsx: missing evidence export UI marker shield-evidence-export-manifest or unified evidence details replacement.",
    );
  }
  if (!cssSource.includes("PASS130 — evidence JSON manifest preview")) {
    errors.pushWithId.bind(errors, "commerce.009.lib-market-integrity-evidence-report-missing-evidence-ex.a004.app-globals-css-missing-legacy-evidence-export-manifest")(
      "app/globals.css: missing PASS130 evidence export manifest CSS.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.009.lib-market-integrity-evidence-report-missing-evidence-ex.a005.evidence-export-manifest-production-guard-failed-value")(
    `Evidence export manifest production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.010");

// PASS197 search portal containment guard
try {
  const clientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");
  for (const needle of [
    "createPortal",
    "suggestPanelFrame",
    "suggestPanelRef",
    "document.body",
    "shield-token-search-suggest-portal",
    "PASS197 marker: Shield search suggestions render through a fixed body portal",
  ]) {
    if (!clientSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a001.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS197 search portal marker ${needle}.`,
      );
  }
  for (const needle of [
    'btc: "₿"',
    'eth: "◆"',
    'sol: "◎"',
    'usdt: "₮"',
    'ltc: "Ł"',
    'shib: "S"',
    'pepe: "P"',
  ]) {
    if (!clientSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a002.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS197 glyph marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS197 · Shield search portal",
    ".shield-market-search-dock",
    ".shield-token-search-suggest-portal",
    "z-index: 2147483000",
    "overflow: visible !important",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a003.app-globals-css-missing-legacy-containment-marker-value")(
        `app/globals.css: missing PASS197 containment marker ${needle}.`,
      );
  }
  if (clientSource.includes("absolute left-1/2 top-[calc(100%+0.55rem)]"))
    errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a004.components-market-integrity-marketintegrityclientx-stale")(
      "components/market-integrity/MarketIntegrityClient.tsx: stale clipped absolute suggestion panel returned.",
    );
  if (!packageScriptEvidenceSource.includes("verify:pass197-search-portal-containment"))
    errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a005.packageon-missing-legacy-verify-script")("package.json: missing PASS197 verify script.");
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.010.components-market-integrity-marketintegrityclientx-missi.a006.legacy-search-portal-containment-guard-failed-value")(
    `PASS197 search portal containment guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
