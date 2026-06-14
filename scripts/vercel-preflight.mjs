import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const errors = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function walk(dir, exts, files = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "dist", "out"].includes(entry.name))
      continue;
    const p = path.join(full, entry.name);
    if (entry.isDirectory()) walk(path.relative(root, p), exts, files);
    else if (exts.some((ext) => entry.name.endsWith(ext)))
      files.push(path.relative(root, p));
  }
  return files;
}

if (!pkg.dependencies?.next && !pkg.devDependencies?.next) {
  errors.push(
    "Next.js dependency is missing from package.json. Check Vercel Root Directory.",
  );
}

try {
  const rootArtifacts = fs
    .readdirSync(root)
    .filter((name) => /^CODEX_.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name));
  for (const artifact of rootArtifacts) {
    errors.push(
      `${artifact}: Codex handoff/source artifact is in the project root and will be compiled by Next/TypeScript. Move it to docs/codex-handoff as .txt or keep it outside the deployment ZIP.`,
    );
  }
  const codexSourceArtifacts = walk(".", [".ts", ".tsx", ".js", ".jsx"]).filter(
    (file) => /^CODEX_/.test(path.basename(file)),
  );
  for (const artifact of codexSourceArtifacts) {
    errors.push(
      `${artifact}: Codex handoff files must not use source-code extensions inside the deployable project.`,
    );
  }
} catch (error) {
  errors.push(
    `Codex artifact guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Product truth production guard
try {
  const typeSource = read("lib/products/types.ts");
  const catalogSource = read("lib/products/catalog.generated.ts");
  const detailSource = read("components/shop/ProductDetailClient.tsx");
  const readinessSource = read("lib/products/launch-readiness.ts");
  for (const needle of ["ProductTruthProfile", "truth?: ProductTruthProfile"]) {
    if (!typeSource.includes(needle))
      errors.push(
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
      errors.push(
        `lib/products/catalog.generated.ts: product truth field ${needle} should exist for preview products; found ${count}.`,
      );
  }
  for (const needle of [
    "productTruthIssues(product)",
    "product_truth_missing",
    "size_guide_missing",
  ]) {
    if (!readinessSource.includes(needle))
      errors.push(
        `lib/products/launch-readiness.ts: missing product truth readiness guard ${needle}.`,
      );
  }
  for (const needle of [
    "const truth = selectedProduct.truth",
    "productMeasurements",
    "productSpecs",
  ]) {
    if (!detailSource.includes(needle))
      errors.push(
        `components/shop/ProductDetailClient.tsx: missing dynamic product truth surface ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Product truth production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

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
      errors.push(
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
        errors.push(
          `components/shop/ShopPageClient.tsx: missing commerce launch UI ${needle}.`,
        );
    }
  }
  if (
    catalogSource.includes('status: "active"') &&
    catalogSource.includes('fulfilmentMode: "disabled"')
  ) {
    errors.push(
      "lib/products/catalog.generated.ts: active products cannot use disabled fulfilment.",
    );
  }
} catch (error) {
  errors.push(
    `Commerce launch safety production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Operator copy progress production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const casefileSource = read("lib/market-integrity/operator-casefile.ts");
  const progressSource = read("lib/launch/project-progress.ts");
  const cssSource = read("app/globals.css");
  for (const needle of ["controlBody", "basicHint", "advancedHint"]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing operator copy marker ${needle}.`,
      );
  }
  if (!cssSource.includes(".shield-token-action-panel .shield-mode-guide"))
    errors.push("app/globals.css: missing PASS148 hidden mode guide marker.");
  for (const needle of [
    "low-risk pre-screen",
    "Missing sources still keep the case in review mode",
  ]) {
    if (!casefileSource.includes(needle))
      errors.push(
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
      errors.push(
        `lib/launch/project-progress.ts: missing progress matrix marker ${needle}.`,
      );
  }
  if (!cssSource.includes("PASS132 — operator copy clarity")) {
    errors.push("app/globals.css: missing PASS132 operator copy CSS.");
  }
} catch (error) {
  errors.push(
    `Operator copy progress production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

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
      errors.push(
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
    if (!fs.existsSync(path.join(root, route)))
      errors.push(`Missing route required by site audit: ${route}.`);
  }
} catch (error) {
  errors.push(
    `Site page audit production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Broad Vercel static production guard
try {
  const sourceFiles = walk(".", [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
  const runtimeFiles = sourceFiles.filter(
    (file) => !file.startsWith("scripts/") && !file.startsWith("docs/"),
  );
  for (const file of sourceFiles) {
    if (/^CODEX_/.test(path.basename(file)))
      errors.push(`${file}: Codex source artifact must not be deployable.`);
  }
  for (const file of runtimeFiles) {
    const source = read(file);
    if (file.endsWith(".tsx") && /<img\b/.test(source))
      errors.push(`${file}: raw <img> is blocked.`);
    if (
      /\[\s*\.\.\.\s*[^\n;]*(\.values\(\)|\.keys\(\)|\.entries\(\))/.test(
        source,
      )
    )
      errors.push(
        `${file}: direct iterator spread is blocked for Vercel target.`,
      );
    if (
      (file.includes("TokenRiskModal") ||
        file.includes("market-integrity/risk-engine")) &&
      source.includes("result.limitations")
    )
      errors.push(`${file}: stale result.limitations access is blocked.`);
    if (
      (file.includes("TokenRiskModal") ||
        file.includes("market-integrity/risk-engine")) &&
      source.includes("safeTileIndex")
    )
      errors.push(`${file}: old safeTileIndex workaround must not return.`);
    if (
      (file.startsWith("app/api/") || file.startsWith("app/actions/")) &&
      ["window.", "document.", "localStorage", "navigator."].some((needle) =>
        source.includes(needle),
      )
    ) {
      errors.push(`${file}: browser API is used in server route/action code.`);
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
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing runtime safety marker ${marker}.`,
      );
  }
  if (!unifiedAssetModal && !modalSource.includes("shield-token-review-tools-hidden")) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: missing runtime safety marker shield-token-review-tools-hidden or unified asset modal replacement.",
    );
  }
} catch (error) {
  errors.push(
    `Broad Vercel static production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

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
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing orbit cleanup marker ${needle}.`,
      );
  }
  if (!unifiedAssetModal && !modalSource.includes("shield-token-review-tools-hidden")) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: missing orbit cleanup marker shield-token-review-tools-hidden or unified asset modal replacement.",
    );
  }
  for (const needle of [
    "PASS131 — orbit layout cleanup",
    ".shield-vlm-static-board",
    ".shield-vlm-detail-panel-side",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing orbit cleanup CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Orbit layout cleanup production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

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
      errors.push(
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
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing evidence export UI marker ${needle}.`,
      );
  }
  if (!unifiedEvidenceDetails && !modalSource.includes("shield-evidence-export-manifest")) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: missing evidence export UI marker shield-evidence-export-manifest or unified evidence details replacement.",
    );
  }
  if (!cssSource.includes("PASS130 — evidence JSON manifest preview")) {
    errors.push(
      "app/globals.css: missing PASS130 evidence export manifest CSS.",
    );
  }
} catch (error) {
  errors.push(
    `Evidence export manifest production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// PASS197 search portal containment guard
try {
  const clientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");
  const pkgSource = read("package.json");
  for (const needle of [
    "createPortal",
    "suggestPanelFrame",
    "suggestPanelRef",
    "document.body",
    "shield-token-search-suggest-portal",
    "PASS197 marker: Shield search suggestions render through a fixed body portal",
  ]) {
    if (!clientSource.includes(needle))
      errors.push(
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
      errors.push(
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
      errors.push(
        `app/globals.css: missing PASS197 containment marker ${needle}.`,
      );
  }
  if (clientSource.includes("absolute left-1/2 top-[calc(100%+0.55rem)]"))
    errors.push(
      "components/market-integrity/MarketIntegrityClient.tsx: stale clipped absolute suggestion panel returned.",
    );
  if (!pkgSource.includes("verify:pass197-search-portal-containment"))
    errors.push("package.json: missing PASS197 verify script.");
} catch (error) {
  errors.push(
    `PASS197 search portal containment guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass197-search-portal-containment-safety.mjs
// PASS197

// PASS196 Orbit 360 final runtime hotfix guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const clientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const homeSource = read("components/home/HomePageClient.tsx");
  const cssSource = read("app/globals.css");
  const pass318HomeFocus = homeSource.includes(
    'data-pass318-public-storefront-focus="home"',
  );
  const homeLocaleNeedles = pass318HomeFocus
    ? ["const locale = useLocale();"]
    : [
        "const locale = useLocale();",
        `<FullSurfaceReadinessIndex locale={locale} surface="home" />`,
      ];
  for (const needle of homeLocaleNeedles) {
    if (!homeSource.includes(needle))
      errors.push(
        `components/home/HomePageClient.tsx: missing PASS196 home locale marker ${needle}.`,
      );
  }
  for (const needle of [
    "const useStaticEvidenceBoard = false;",
    "const useRailLayout = false;",
    "shield-vlm-orbit-only",
    "startOffset - deltaBars",
    "document.body",
    "PASS196 marker: Orbit 360 only",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS196 Orbit marker ${needle}.`,
      );
  }
  if (
    modalSource.includes("key={preset}") &&
    modalSource.includes("ui.evidenceBoard")
  )
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: Evidence Board preset toggle still appears in public render.",
    );
  for (const needle of [
    "function knownTokenGlyph",
    "knownTokenGlyph(symbol, id, name)",
    "PASS196 marker: Shield search suggestions",
  ]) {
    if (!clientSource.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS196 suggestion marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS196 · Orbit 360 only",
    ".shield-vlm-static-evidence-board",
    ".shield-analysis-disclaimer",
    ".shield-source-spine-panel",
    ".shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS196 containment marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS196 Orbit 360 final runtime hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass196-orbit360-final-runtime-hotfix-safety.mjs
// PASS196

// PASS195 home locale runtime hotfix guard
try {
  const homePageClientSource = read("components/home/HomePageClient.tsx");
  if (
    !homePageClientSource.includes('import { useLocale } from "next-intl";') &&
    !homePageClientSource.includes("import { useLocale } from 'next-intl';")
  ) {
    errors.push(
      "components/home/HomePageClient.tsx: missing useLocale import.",
    );
  }
  if (
    !/export\s+default\s+function\s+HomePageClient\s*\(\)\s*\{\s*const\s+locale\s*=\s*useLocale\(\)\s*;/s.test(
      homePageClientSource,
    )
  ) {
    errors.push(
      "components/home/HomePageClient.tsx: missing const locale = useLocale(); inside HomePageClient.",
    );
  }
  if (
    !homePageClientSource.includes(
      'data-pass318-public-storefront-focus="home"',
    ) &&
    !homePageClientSource.includes(
      '<FullSurfaceReadinessIndex locale={locale} surface="home" />',
    )
  ) {
    errors.push(
      "components/home/HomePageClient.tsx: FullSurfaceReadinessIndex must receive locale.",
    );
  }
} catch (error) {
  errors.push(
    `PASS195 home locale runtime hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass195-home-locale-runtime-hotfix-safety.mjs
// PASS195

// PASS194 Orbit 360 modal cleanup + Lens descriptive cards guard
try {
  const tokenRiskModalSource = read(
    "components/market-integrity/TokenRiskModal.tsx",
  );
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const lensRouterSource = read(
    "components/search/VelmereLensCommandRouter.tsx",
  );
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md");
  const unifiedSourceSpineReplacement =
    tokenRiskModalSource.includes("UnifiedAssetModalShell") &&
    tokenRiskModalSource.includes("detailsSlot=") &&
    tokenRiskModalSource.includes("sourceContract.aggregateState");
  for (const needle of [
    'data-chart-gesture-surface="pan-pinch-wheel"',
    "setChartZoom",
    "Evidence Board hidden for now",
    'setActiveCommand("deck")',
    "shield-vlm-detail-panel-popup",
    "shield-mode-guide-popup",
  ]) {
    if (!tokenRiskModalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS194 modal marker ${needle}.`,
      );
  }
  if (!unifiedSourceSpineReplacement && !tokenRiskModalSource.includes("shield-source-spine-panel hidden")) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: missing PASS194 modal marker shield-source-spine-panel hidden or unified source-state details replacement.",
    );
  }
  for (const needle of [
    "PASS194 · full-screen Orbit 360 hotfix",
    ".shield-vlm-detail-panel-popup",
    ".shield-mode-guide-popup",
    ".shield-vlm-motion-toggle-mini button:not(.is-active)",
    ".vlcr-action-row",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS194 CSS marker ${needle}.`);
  }
  for (const needle of [
    "id?: string",
    "name?: string",
    "knownTokenLogo(symbol, id, name)",
    "<TokenAvatar image={item.image} symbol={item.symbol} id={item.id} name={item.name} />",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS194 logo marker ${needle}.`,
      );
  }
  for (const needle of [
    "Lens cards are descriptive only",
    "Wyszukiwarka Velmère zbiera token",
    "Kapsuła raportu Velmère",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS194 Lens marker ${needle}.`,
      );
  }
  if (
    lensRouterSource.includes("<Link href={route.href}") ||
    lensRouterSource.includes("<a href={route.reportHref}")
  )
    errors.push(
      "components/search/VelmereLensCommandRouter.tsx: PASS194 Lens cards still render action buttons.",
    );
  for (const needle of [
    "Token chart drag UX",
    "Token modal mode info popup",
    "VLM mode return-to-chart",
    "Selected tile popup readability",
    "Lens card clutter",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS194 Orbit360/modal/Lens polish guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass194-orbit360-modal-lens-polish-safety.mjs
// PASS194

// PASS193 VLM/Lens/security runtime hotfix guard
try {
  const securityTrustPageSource = read(
    "components/security/SecurityTrustPage.tsx",
  );
  const tokenRiskModalSource = read(
    "components/market-integrity/TokenRiskModal.tsx",
  );
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const lensRouterSource = read(
    "components/search/VelmereLensCommandRouter.tsx",
  );
  const lensRouteMapSource = read("lib/search/velmere-lens-route-map.ts");
  const lensReportRouteSource = read("app/api/search/lens-report/route.ts");
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md");
  if (!securityTrustPageSource.includes("data-pass318-security-public-note")) {
    for (const needle of [
      "import SecurityOperationsChecklistPanel",
      "<SecurityOperationsChecklistPanel locale={safeLocale} />",
    ]) {
      if (!securityTrustPageSource.includes(needle))
        errors.push(
          `components/security/SecurityTrustPage.tsx: missing PASS193 runtime import marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "orbitZoom",
    "handleOrbitWheel",
    "shield-vlm-zoom-controls",
    "--vlm-static-transform",
    "translate(-8%, -50%)",
    "translate(-92%, -50%)",
  ]) {
    if (!tokenRiskModalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS193 VLM marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS193 · VLM Brain viewport expansion",
    ".shield-vlm-zoom-controls",
    ".shield-vlm-static-stage",
    ".vlcr-report-preview",
    ".shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS193 CSS marker ${needle}.`);
  }
  for (const needle of [
    "solana",
    "bonk",
    "shield-suggestion-token-avatar",
    "token suggestions · logo aware",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS193 logo marker ${needle}.`,
      );
  }
  for (const needle of [
    "reportHref",
    "reportTitle",
    "mode=shield",
    "mode=contract",
    "source_ledger",
  ]) {
    if (!lensRouteMapSource.includes(needle))
      errors.push(
        `lib/search/velmere-lens-route-map.ts: missing PASS193 route/report marker ${needle}.`,
      );
  }
  for (const needle of [
    "vlcr-action-row",
    "vlcr-report-preview",
    "c.previewBody",
    "route.reportHref",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS193 report UI marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmere-lens",
    "PDF-ready evidence note",
    "content-disposition",
    "not a safety certificate",
    "escapeHtml",
  ]) {
    if (!lensReportRouteSource.includes(needle))
      errors.push(
        `app/api/search/lens-report/route.ts: missing PASS193 report route marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityOperationsChecklistPanel runtime hotfix",
    "VLM Brain window containment",
    "Evidence Board split lanes",
    "Velmère Lens report preview",
    "Search suggestions logo fallback",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md: missing PASS193 full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS193 VLM/Lens/security hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass193-vlm-lens-security-hotfix-safety.mjs
// PASS193

// PASS192 payment runtime evidence capture + Stripe webhook replay QA ledger guard
try {
  const paymentEvidenceSource = read(
    "lib/security/payment-runtime-evidence.ts",
  );
  const stripeReplaySource = read("lib/security/stripe-webhook-replay-qa.ts");
  const evidenceRouteSource = read(
    "app/api/security/payment-runtime-evidence/route.ts",
  );
  const replayRouteSource = read(
    "app/api/security/stripe-webhook-replay-qa/route.ts",
  );
  const paymentReviewSource = read("lib/security/payment-webhook-security.ts");
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const evidenceDocSource = read(
    "docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md",
  );
  const replayDocSource = read(
    "docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md",
  );
  const matrixSource = read("VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "PaymentRuntimeEvidenceRecord",
    "recordPaymentRuntimeEvidence",
    "buildPaymentRuntimeEvidenceSnapshot",
    "cleanText",
    "redacted-card-like",
  ]) {
    if (!paymentEvidenceSource.includes(needle))
      errors.push(
        `lib/security/payment-runtime-evidence.ts: missing PASS192 evidence marker ${needle}.`,
      );
  }
  for (const needle of [
    "stripeWebhookReplayScenarios",
    "recordStripeWebhookReplayEvidence",
    "buildStripeWebhookReplayQaSnapshot",
    "duplicate-replay",
    "unsupported-signed-event",
  ]) {
    if (!stripeReplaySource.includes(needle))
      errors.push(
        `lib/security/stripe-webhook-replay-qa.ts: missing PASS192 replay marker ${needle}.`,
      );
  }
  for (const source of [evidenceRouteSource, replayRouteSource]) {
    for (const needle of [
      "applyApiAbuseShield",
      "verifySecurityAdminToken",
      "security:events",
      "payloadTooLarge",
      "POST",
      "GET",
    ]) {
      if (!source.includes(needle))
        errors.push(
          `PASS192 admin-gated payment evidence/replay route missing ${needle}.`,
        );
    }
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "runtimeEvidence",
    "replayQa",
  ]) {
    if (!paymentReviewSource.includes(needle))
      errors.push(
        `lib/security/payment-webhook-security.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
    "paymentEvidenceProgress",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.push(
        `lib/security/security-release-gate.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "payment-runtime-evidence-api",
    "stripe-webhook-replay-qa-ledger",
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.push(
        `lib/security/security-runtime-qa.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.push(
        `app/api/security/operations-checklist/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "/api/security/payment-runtime-evidence",
    "/api/security/stripe-webhook-replay-qa",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS192 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment Runtime Evidence Capture",
    "No raw",
    "safe POST payload",
  ]) {
    if (!evidenceDocSource.includes(needle))
      errors.push(
        `docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Stripe Webhook Replay QA Ledger",
    "Duplicate webhook replay",
    "Unsupported signed event",
  ]) {
    if (!replayDocSource.includes(needle))
      errors.push(
        `docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment runtime evidence capture",
    "Stripe webhook replay QA ledger",
    "Payment/webhook security",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS192 payment runtime evidence/replay QA guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass192-payment-runtime-evidence-replay-qa-safety.mjs
// PASS192

// PASS191 payment/webhook security review + commerce release gate integration guard
try {
  const paymentGuardSource = read("lib/security/payment-webhook-guard.ts");
  const paymentReviewSource = read("lib/security/payment-webhook-security.ts");
  const checkoutRouteSource = read("app/api/checkout/route.ts");
  const stripeWebhookRouteSource = read("app/api/stripe/webhook/route.ts");
  const paymentReviewRouteSource = read(
    "app/api/security/payment-webhook-review/route.ts",
  );
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const paymentDocSource = read(
    "docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md",
  );
  const matrixSource = read("VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "validateCheckoutRequestBoundary",
    "validateStripeWebhookBoundary",
    "paymentWebhookGuardReadiness",
    "Checkout expects application/json",
    "Webhook payload is too large",
  ]) {
    if (!paymentGuardSource.includes(needle))
      errors.push(
        `lib/security/payment-webhook-guard.ts: missing PASS191 guard marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "signed-webhook",
    "webhook-idempotency",
    "order-persistence",
    "refund-support",
  ]) {
    if (!paymentReviewSource.includes(needle))
      errors.push(
        `lib/security/payment-webhook-security.ts: missing PASS191 review marker ${needle}.`,
      );
  }
  for (const needle of ["validateCheckoutRequestBoundary", "paymentGuard"]) {
    if (!checkoutRouteSource.includes(needle))
      errors.push(
        `app/api/checkout/route.ts: missing PASS191 checkout marker ${needle}.`,
      );
  }
  for (const needle of [
    "validateStripeWebhookBoundary",
    "SUPPORTED_STRIPE_WEBHOOK_EVENTS",
    "unsupported: true",
    "constructEvent",
  ]) {
    if (!stripeWebhookRouteSource.includes(needle))
      errors.push(
        `app/api/stripe/webhook/route.ts: missing PASS191 webhook marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "verifySecurityAdminToken",
    "buildPaymentWebhookSecuritySnapshot",
    "security:events",
  ]) {
    if (!paymentReviewRouteSource.includes(needle))
      errors.push(
        `app/api/security/payment-webhook-review/route.ts: missing PASS191 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "paymentWebhookSecurity",
    "payment-webhook-review",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.push(
        `lib/security/security-release-gate.ts: missing PASS191 release marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "payment-webhook-review-api",
    "stripe-webhook-guard",
    "paymentWebhookSecurity",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.push(
        `lib/security/security-runtime-qa.ts: missing PASS191 runtime QA marker ${needle}.`,
      );
  }
  for (const needle of [
    "paymentWebhookSecurity",
    "buildPaymentWebhookSecuritySnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.push(
        `app/api/security/operations-checklist/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS191 payment marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "/api/security/payment-webhook-review",
    "paymentWebhook.averageProgress",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS191 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Checkout payload",
    "Stripe webhook",
    "Duplicate webhook event",
    "Do not export card data",
  ]) {
    if (!paymentDocSource.includes(needle))
      errors.push(
        `docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment/webhook security",
    "Payment checkout request boundary",
    "Stripe webhook request boundary",
    "Commerce/order/payment readiness",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS191 payment/webhook security guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass191-payment-webhook-security-safety.mjs
// PASS191

// PASS190 runtime QA result capture + security release gate dashboard guard
try {
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaRouteSource = read("app/api/security/runtime-qa/route.ts");
  const releaseGateRouteSource = read("app/api/security/release-gate/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const qaDocSource = read(
    "docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md",
  );
  const releaseDocSource = read(
    "docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md",
  );
  const matrixSource = read("VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "RuntimeQaCheck",
    "runtimeQaChecks",
    "buildSecurityRuntimeQaSnapshot",
    "admin-api-deny-by-default",
    "export-redaction",
    "release-gate-signoff",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.push(
        `lib/security/security-runtime-qa.ts: missing PASS190 runtime QA marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityReleaseGateItem",
    "buildSecurityReleaseGateSnapshot",
    "payment-webhook-review",
    "security_release_gate_dashboard",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.push(
        `lib/security/security-release-gate.ts: missing PASS190 release gate marker ${needle}.`,
      );
  }
  for (const source of [runtimeQaRouteSource, releaseGateRouteSource]) {
    for (const needle of [
      "applyApiAbuseShield",
      "verifySecurityAdminToken",
      "security:events",
      "securityAdminGate",
      "operator",
    ]) {
      if (!source.includes(needle))
        errors.push(`PASS190 gated security route missing ${needle}.`);
    }
  }
  for (const needle of [
    "runtimeQa",
    "releaseGate",
    "buildSecurityRuntimeQaSnapshot",
    "buildSecurityReleaseGateSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS190 marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS190 marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.push(
        `app/api/security/operations-checklist/route.ts: missing PASS190 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityRuntimeQaSnapshot",
    "buildSecurityReleaseGateSnapshot",
    "/api/security/runtime-qa",
    "/api/security/release-gate",
    "releaseItems.map",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS190 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "/api/security/export",
    "No raw IP",
    "Vercel firewall logs",
    "npm run verify:shield-all",
  ]) {
    if (!qaDocSource.includes(needle))
      errors.push(
        `docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security Release Gate Dashboard",
    "Payment/webhook",
    "Vercel envs",
    "WAF",
  ]) {
    if (!releaseDocSource.includes(needle))
      errors.push(
        `docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security release gate dashboard",
    "Security runtime QA result capture",
    "Payment/webhook security",
    "Source adapters / live feeds",
    "VLM AI risk brain",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS190 runtime QA/release gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass190-runtime-qa-release-gate-safety.mjs
// PASS190

// PASS189 security nav/footer integration + Vercel env/WAF/runtime QA checklist guard
try {
  const operationsChecklistSource = read(
    "lib/security/security-operations-checklist.ts",
  );
  const operationsPanelSource = read(
    "components/security/SecurityOperationsChecklistPanel.tsx",
  );
  const securityPageSource = read("components/security/SecurityTrustPage.tsx");
  const operationsApiSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const navbarSource = read("components/Navbar.tsx");
  const footerSource = read("components/Footer.tsx");
  const cssSource = read("app/globals.css");
  const envDocSource = read("docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md");
  const wafDocSource = read("docs/security/VERCEL_WAF_RULES_DRAFT.md");
  const qaDocSource = read("docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md");
  const matrixSource = read("VELMERE_PASS189_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "securityChecklistItems",
    "wafRuleDrafts",
    "buildSecurityOperationsChecklistSnapshot",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "runtime_qa",
  ]) {
    if (!operationsChecklistSource.includes(needle))
      errors.push(
        `lib/security/security-operations-checklist.ts: missing PASS189 checklist marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityOperationsChecklistPanel",
    "buildSecurityOperationsChecklistSnapshot",
    "WAF drafts",
  ]) {
    if (!operationsPanelSource.includes(needle))
      errors.push(
        `components/security/SecurityOperationsChecklistPanel.tsx: missing PASS189 panel marker ${needle}.`,
      );
  }
  if (!securityPageSource.includes("data-pass318-security-public-note")) {
    for (const needle of [
      "SecurityOperationsChecklistPanel",
      "<SecurityOperationsChecklistPanel locale={safeLocale} />",
    ]) {
      if (!securityPageSource.includes(needle))
        errors.push(
          `components/security/SecurityTrustPage.tsx: missing PASS189 page marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityOperationsChecklistSnapshot",
    "buildSecurityReadinessSnapshot",
  ]) {
    if (!operationsApiSource.includes(needle))
      errors.push(
        `app/api/security/operations-checklist/route.ts: missing PASS189 API marker ${needle}.`,
      );
  }
  for (const needle of [
    'security: "Security"',
    'security: "Sicherheit"',
    "labels.security",
    'href: "/security"',
  ]) {
    if (!navbarSource.includes(needle))
      errors.push(
        `components/Navbar.tsx: missing PASS189 security nav marker ${needle}.`,
      );
  }
  for (const needle of [
    '{ href: "/security", label: "Security" }',
    "Velmère Security means layered protection",
    "Security Velmère to warstwy ochrony",
    "Velmère Security bedeutet Schutzschichten",
  ]) {
    if (!footerSource.includes(needle))
      errors.push(
        `components/Footer.tsx: missing PASS189 footer marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS189 · Security operations checklist",
    ".vso-shell",
    ".vso-card",
    ".vso-status",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS189 CSS marker ${needle}.`);
  }
  for (const needle of [
    "UPSTASH_REDIS_REST_URL",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "GET /api/security/readiness",
  ]) {
    if (!envDocSource.includes(needle))
      errors.push(
        `docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Block scanner paths",
    "Rate-limit public API",
    "Protect admin/security exports",
  ]) {
    if (!wafDocSource.includes(needle))
      errors.push(
        `docs/security/VERCEL_WAF_RULES_DRAFT.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "/security",
    "/admin/security",
    "/api/security/export",
    "No raw IP",
  ]) {
    if (!qaDocSource.includes(needle))
      errors.push(
        `docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security operations checklist",
    "Vercel env checklist",
    "Vercel WAF rules draft",
    "Security nav/footer integration",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS189_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS189 security nav/footer/Vercel WAF checklist guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass189-security-nav-footer-vercel-waf-checklist-safety.mjs
// PASS189

// PASS188 security trust copy + public security page overclaim guard
try {
  const securityTrustCopySource = read("lib/security/security-trust-copy.ts");
  const securityTrustPageSource = read(
    "components/security/SecurityTrustPage.tsx",
  );
  const securityRouteSource = read("app/[locale]/security/page.tsx");
  const securityTrustApiSource = read("app/api/security/trust/route.ts");
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS188_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "securityTrustForbiddenClaims",
    "securityTrustPillars",
    "securityTrustRoadmap",
    "buildSecurityTrustSnapshot",
    "security-first",
  ]) {
    if (!securityTrustCopySource.includes(needle))
      errors.push(
        `lib/security/security-trust-copy.ts: missing PASS188 marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityTrustPage",
    "buildSecurityTrustSnapshot",
    "securityTrustPillars",
    "Production boundary",
  ]) {
    if (!securityTrustPageSource.includes(needle))
      errors.push(
        `components/security/SecurityTrustPage.tsx: missing PASS188 page marker ${needle}.`,
      );
  }
  for (const needle of ["Velmère Security", "SecurityTrustPage", "metadata"]) {
    if (!securityRouteSource.includes(needle))
      errors.push(
        `app/[locale]/security/page.tsx: missing PASS188 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityTrustSnapshot",
    "buildSecurityReadinessSnapshot",
    "security-trust",
  ]) {
    if (!securityTrustApiSource.includes(needle))
      errors.push(
        `app/api/security/trust/route.ts: missing PASS188 API marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS188 · Velmère Security Trust public surface",
    ".vst-hero",
    ".vst-card",
    ".vst-roadmap",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS188 CSS marker ${needle}.`);
  }
  for (const needle of [
    "Security public trust page",
    "Security overclaim safety",
    "Brand trust / credibility",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS188_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
  const publicSecuritySurface =
    `${securityTrustPageSource}\n${securityRouteSource}\n${securityTrustApiSource}`.toLowerCase();
  for (const forbidden of [
    "najlepsze zabezpieczenia świata",
    "nie do zhakowania",
    "gwarantowane bezpieczeństwo",
    "100% secure",
    "unhackable",
    "hack proof",
    "world's best security",
    "best security in the world",
    "military-grade security",
    "bank-level guaranteed",
  ]) {
    if (publicSecuritySurface.includes(forbidden))
      errors.push(`PASS188 public security overclaim remains: ${forbidden}.`);
  }
} catch (error) {
  errors.push(
    `PASS188 security trust copy/public page guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass188-security-trust-copy-public-page-safety.mjs
// PASS188

// PASS187 durable security event append + admin read audit guard
try {
  const eventAppendSource = read(
    "lib/security/security-event-append-adapter.ts",
  );
  const adminAuditSource = read("lib/security/security-admin-audit.ts");
  const eventLedgerSource = read("lib/security/security-event-ledger.ts");
  const adminAuthSource = read("lib/security/security-admin-auth.ts");
  const eventStoreSource = read(
    "lib/security/security-event-store-contract.ts",
  );
  const adminAuditRouteSource = read("app/api/security/admin-audit/route.ts");
  const eventStoreRouteSource = read("app/api/security/event-store/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const matrixSource = read("VELMERE_PASS187_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "appendSecurityEventBestEffort",
    "buildSecurityEventAppendReadiness",
    "VELMERE_SECURITY_EVENT_UPSTASH_KEY",
    "LPUSH",
    "LTRIM",
    "safeRecord",
  ]) {
    if (!eventAppendSource.includes(needle))
      errors.push(
        `lib/security/security-event-append-adapter.ts: missing PASS187 append marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityAdminAuditRecord",
    "recordSecurityAdminAudit",
    "buildSecurityAdminAuditSnapshot",
    "security_export_read",
    "security_event_read",
  ]) {
    if (!adminAuditSource.includes(needle))
      errors.push(
        `lib/security/security-admin-audit.ts: missing PASS187 admin audit marker ${needle}.`,
      );
  }
  for (const needle of [
    "appendSecurityEventBestEffort",
    "appendAdapter",
    "durableStorageReady",
  ]) {
    if (!eventLedgerSource.includes(needle))
      errors.push(
        `lib/security/security-event-ledger.ts: missing PASS187 ledger append marker ${needle}.`,
      );
  }
  for (const needle of [
    "recordSecurityAdminAudit",
    "not_configured",
    "denied",
    "allowed",
  ]) {
    if (!adminAuthSource.includes(needle))
      errors.push(
        `lib/security/security-admin-auth.ts: missing PASS187 auth audit marker ${needle}.`,
      );
  }
  for (const needle of ["buildSecurityEventAppendReadiness", "appendAdapter"]) {
    if (!eventStoreSource.includes(needle))
      errors.push(
        `lib/security/security-event-store-contract.ts: missing PASS187 store append marker ${needle}.`,
      );
    if (!eventStoreRouteSource.includes(needle))
      errors.push(
        `app/api/security/event-store/route.ts: missing PASS187 store route marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:events",
    "buildSecurityAdminAuditSnapshot",
    "listSecurityAdminAuditEvents",
  ]) {
    if (!adminAuditRouteSource.includes(needle))
      errors.push(
        `app/api/security/admin-audit/route.ts: missing PASS187 admin-audit route marker ${needle}.`,
      );
  }
  for (const needle of [
    "eventAppendAdapter",
    "securityAdminAudit",
    "buildSecurityEventAppendReadiness",
    "buildSecurityAdminAuditSnapshot",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS187 export marker ${needle}.`,
      );
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS187 readiness marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS187 abuse marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityEventAppendReadiness",
    "buildSecurityAdminAuditSnapshot",
    "/api/security/admin-audit",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS187 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security event append adapter",
    "Security admin audit",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS187_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS187 durable security event append/admin audit guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass187-durable-event-append-admin-audit-safety.mjs
// PASS187

// PASS186 security admin auth gate + event store contract guard
try {
  const securityAdminAuthSource = read("lib/security/security-admin-auth.ts");
  const eventStoreContractSource = read(
    "lib/security/security-event-store-contract.ts",
  );
  const lockedPanelSource = read(
    "components/admin/SecurityConsoleLockedPanel.tsx",
  );
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const adminSecurityPageSource = read("app/[locale]/admin/security/page.tsx");
  const eventsRouteSource = read("app/api/security/events/route.ts");
  const alertsRouteSource = read("app/api/security/alerts/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const eventStoreRouteSource = read("app/api/security/event-store/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS186_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "verifySecurityAdminToken",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "x-velmere-security-admin-token",
    "timingSafeEqual",
    "security_admin_token_required",
    "consoleVisible",
  ]) {
    if (!securityAdminAuthSource.includes(needle))
      errors.push(
        `lib/security/security-admin-auth.ts: missing PASS186 admin auth marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityEventStoreContract",
    "buildSecurityEventStoreSnapshot",
    "durable-append-contract",
    "retention-policy",
  ]) {
    if (!eventStoreContractSource.includes(needle))
      errors.push(
        `lib/security/security-event-store-contract.ts: missing PASS186 store marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsoleLockedPanel",
    "buildSecurityAdminGateReadiness",
  ]) {
    if (!lockedPanelSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsoleLockedPanel.tsx: missing PASS186 locked marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityAdminGateReadiness",
    "buildSecurityEventStoreSnapshot",
    "/api/security/event-store",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS186 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsoleLockedPanel",
    "buildSecurityAdminGateReadiness",
    "!gate.consoleVisible",
  ]) {
    if (!adminSecurityPageSource.includes(needle))
      errors.push(
        `app/[locale]/admin/security/page.tsx: missing PASS186 route gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:events",
    "applyApiAbuseShield",
  ]) {
    if (!eventsRouteSource.includes(needle))
      errors.push(
        `app/api/security/events/route.ts: missing PASS186 API gate marker ${needle}.`,
      );
    if (!eventStoreRouteSource.includes(needle))
      errors.push(
        `app/api/security/event-store/route.ts: missing PASS186 event-store gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:alerts",
    "applyApiAbuseShield",
  ]) {
    if (!alertsRouteSource.includes(needle))
      errors.push(
        `app/api/security/alerts/route.ts: missing PASS186 alerts gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:export",
    "applyApiAbuseShield",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS186 export gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityAdminGate",
    "buildSecurityAdminGateReadiness",
    "eventStore",
    "buildSecurityEventStoreSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS186 marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS186 marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security admin API gate",
    "Security event store contract",
    "Security locked-state UX",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS186_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS186 security admin auth/event store guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass186-admin-auth-event-store-contract-safety.mjs
// PASS186

// PASS185 admin security console + alert rules + Vercel sweep guard
try {
  const securityAlertRulesSource = read("lib/security/security-alert-rules.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const adminSecurityPageSource = read("app/[locale]/admin/security/page.tsx");
  const alertsRouteSource = read("app/api/security/alerts/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS185_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "SecurityAlertRule",
    "evaluateSecurityAlertRules",
    "buildSecurityAlertSnapshot",
    "waf_not_configured",
  ]) {
    if (!securityAlertRulesSource.includes(needle))
      errors.push(
        `lib/security/security-alert-rules.ts: missing PASS185 alert marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsolePanel",
    "buildSecurityAlertSnapshot",
    "buildSecurityEventLedgerSnapshot",
    "asc-shell",
  ]) {
    if (
      !securityConsoleSource.includes(needle) &&
      !read("app/globals.css").includes(needle)
    )
      errors.push(
        `components/admin/SecurityConsolePanel.tsx: missing PASS185 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère Admin Security Console",
    "robots",
    "index: false",
    "SecurityConsolePanel",
  ]) {
    if (!adminSecurityPageSource.includes(needle))
      errors.push(
        `app/[locale]/admin/security/page.tsx: missing PASS185 admin route marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityAlertSnapshot",
    "securityJson",
  ]) {
    if (!alertsRouteSource.includes(needle))
      errors.push(
        `app/api/security/alerts/route.ts: missing PASS185 alerts marker ${needle}.`,
      );
  }
  for (const needle of [
    "security_export_safe_preview",
    "buildSecurityAlertSnapshot",
    "buildSecurityEventLedgerSnapshot",
    "no raw IP addresses",
    "content-disposition",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.push(
        `app/api/security/export/route.ts: missing PASS185 export marker ${needle}.`,
      );
  }
  for (const needle of ["alertRules", "buildSecurityAlertSnapshot"]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS185 alert marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS185 alert marker ${needle}.`,
      );
  }
  for (const needle of [
    "Vercel potential error sweep",
    "Admin security console",
    "Security alert rules",
    "Security safe export",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS185_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS185 admin security console / Vercel sweep guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass185-admin-security-console-vercel-sweep-safety.mjs
// PASS185

// PASS184 Upstash REST adapter + security event ledger guard
try {
  const durableRateLimitSource = read("lib/security/durable-rate-limit.ts");
  const securityEventLedgerSource = read(
    "lib/security/security-event-ledger.ts",
  );
  const apiAbuseShieldSource = read("lib/security/api-abuse-shield.ts");
  const securityEventsRouteSource = read("app/api/security/events/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS184_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "upstash_rest",
    "upstash_fallback_memory",
    "/pipeline",
    "UPSTASH_REDIS_REST_URL",
    "providerError",
    "upstashRestAdapter",
  ]) {
    if (!durableRateLimitSource.includes(needle))
      errors.push(
        `lib/security/durable-rate-limit.ts: missing PASS184 Upstash marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityEventRecord",
    "recordSecurityEvent",
    "buildSecurityEventLedgerSnapshot",
    "clientFingerprint",
    "in_memory_security_event_ledger",
  ]) {
    if (!securityEventLedgerSource.includes(needle))
      errors.push(
        `lib/security/security-event-ledger.ts: missing PASS184 ledger marker ${needle}.`,
      );
  }
  for (const needle of [
    "recordSecurityEvent",
    "abuse_blocked",
    "rate_limited",
    "suspicious_allowed",
    "provider_fallback",
  ]) {
    if (!apiAbuseShieldSource.includes(needle))
      errors.push(
        `lib/security/api-abuse-shield.ts: missing PASS184 event marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityEventLedgerSnapshot",
    "listSecurityEvents",
    "filtered",
  ]) {
    if (!securityEventsRouteSource.includes(needle))
      errors.push(
        `app/api/security/events/route.ts: missing PASS184 events route marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityEventLedger",
    "buildSecurityEventLedgerSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS184 ledger marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS184 ledger marker ${needle}.`,
      );
  }
  for (const needle of [
    "Upstash/Redis adapter",
    "Security event ledger",
    "Monitoring / alerting readiness",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS184_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS184 Upstash/security event ledger guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass184-upstash-security-event-ledger-safety.mjs
// PASS184

// PASS183 durable rate-limit + API abuse shield guard
try {
  const durableRateLimitSource = read("lib/security/durable-rate-limit.ts");
  const apiAbuseShieldSource = read("lib/security/api-abuse-shield.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const marketSearchRouteSource = read(
    "app/api/market-integrity/search/route.ts",
  );
  const marketAnalyzeRouteSource = read(
    "app/api/market-integrity/analyze/route.ts",
  );
  const iconRouteSource = read("app/api/market-integrity/icon/route.ts");
  for (const needle of [
    "applyDurableRateLimit",
    "buildDurableRateLimitReadiness",
    "UPSTASH_REDIS_REST_URL",
    "memoryFallback",
  ]) {
    if (!durableRateLimitSource.includes(needle))
      errors.push(
        `lib/security/durable-rate-limit.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "evaluateAbuseSignals",
    "scanner_like_user_agent",
    "abuse_shield_blocked",
    "abuseShieldResponseMeta",
  ]) {
    if (!apiAbuseShieldSource.includes(needle))
      errors.push(
        `lib/security/api-abuse-shield.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of [
    "api_abuse_shield_preview",
    "buildDurableRateLimitReadiness",
    "distributed rate-limit store",
  ]) {
    if (!abuseRouteSource.includes(needle))
      errors.push(
        `app/api/security/abuse-shield/route.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of ["applyApiAbuseShield", "abuseShieldResponseMeta"]) {
    if (!marketSearchRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/search/route.ts: missing PASS183 abuse shield marker ${needle}.`,
      );
    if (!marketAnalyzeRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/analyze/route.ts: missing PASS183 abuse shield marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "token-icon-proxy",
    'url.protocol !== "https:"',
  ]) {
    if (!iconRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/icon/route.ts: missing PASS183 icon shield marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildDurableRateLimitReadiness",
    "abuseShieldResponseMeta",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS183 readiness marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS183 durable rate-limit / API abuse shield guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass183-durable-rate-limit-abuse-shield-safety.mjs
// PASS183

// PASS182 security hardening guard
try {
  const nextConfigSource = read("next.config.mjs");
  const securityHeadersSource = read("lib/security/http-security.mjs");
  const apiGuardSource = read("lib/security/api-guard.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const marketSearchRouteSource = read(
    "app/api/market-integrity/search/route.ts",
  );
  const marketAnalyzeRouteSource = read(
    "app/api/market-integrity/analyze/route.ts",
  );
  const iconRouteSource = read("app/api/market-integrity/icon/route.ts");
  for (const needle of [
    "buildSecurityHeaders",
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy",
    "Permissions-Policy",
  ]) {
    if (
      !securityHeadersSource.includes(needle) &&
      !nextConfigSource.includes(needle)
    )
      errors.push(`PASS182 security header marker missing: ${needle}.`);
  }
  if (!nextConfigSource.includes("buildSecurityHeaders({ isDev })"))
    errors.push(
      "next.config.mjs: PASS182 centralized security headers not wired.",
    );
  for (const needle of [
    "securityJson",
    "applySoftRateLimit",
    "sanitizeBoundedParam",
    "rejectOversizedUrl",
  ]) {
    if (!apiGuardSource.includes(needle))
      errors.push(
        `lib/security/api-guard.ts: missing PASS182 marker ${needle}.`,
      );
    const wrappedByPass183 =
      needle !== "securityJson" &&
      marketSearchRouteSource.includes("applyApiAbuseShield") &&
      marketAnalyzeRouteSource.includes("applyApiAbuseShield") &&
      read("lib/security/api-abuse-shield.ts").includes(needle);
    if (!wrappedByPass183) {
      if (!marketSearchRouteSource.includes(needle))
        errors.push(
          `app/api/market-integrity/search/route.ts: missing PASS182 guard ${needle}.`,
        );
      if (!marketAnalyzeRouteSource.includes(needle))
        errors.push(
          `app/api/market-integrity/analyze/route.ts: missing PASS182 guard ${needle}.`,
        );
    }
  }
  for (const needle of [
    "buildSecurityReadinessSnapshot",
    "security_headers_api_guard_preview",
    "no-store",
  ]) {
    if (
      !readinessRouteSource.includes(needle) &&
      !read("lib/security/security-readiness.ts").includes(needle)
    )
      errors.push(
        `app/api/security/readiness/route.ts: missing PASS182 readiness marker ${needle}.`,
      );
  }
  for (const needle of [
    'url.protocol !== "https:"',
    "url.username",
    "url.password",
    "url.port",
    'contentType.toLowerCase().startsWith("image/")',
    "body.byteLength > 600_000",
  ]) {
    if (!iconRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/icon/route.ts: missing PASS182 icon proxy hardening marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS182 security hardening guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass182-security-hardening-safety.mjs
// PASS182

// PASS180 Contract Lens + OSINT Queue foundations guard
try {
  const contractLensSource = read(
    "lib/market-integrity/contract-lens-contract.ts",
  );
  const osintQueueSource = read("lib/market-integrity/osint-queue-contract.ts");
  const contractRouteSource = read(
    "app/api/market-integrity/contract-lens/route.ts",
  );
  const osintRouteSource = read(
    "app/api/market-integrity/osint-queue/route.ts",
  );
  const marketPageSource = read("app/[locale]/market-integrity/page.tsx");
  for (const needle of [
    "ContractLensSignalId",
    "owner_control",
    "proxy_upgrade",
    "createContractLensPreview",
  ]) {
    if (!contractLensSource.includes(needle))
      errors.push(
        `lib/market-integrity/contract-lens-contract.ts: missing PASS180 marker ${needle}.`,
      );
  }
  for (const needle of [
    "OsintQueueItem",
    "blockedClaims",
    "createOsintQueuePreview",
    "safe paraphrase",
  ]) {
    if (!osintQueueSource.includes(needle))
      errors.push(
        `lib/market-integrity/osint-queue-contract.ts: missing PASS180 marker ${needle}.`,
      );
  }
  for (const needle of [
    "contract_lens_preview_only",
    "externalFetchPerformed: false",
    "server-only analyzer output",
  ]) {
    if (!contractRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/contract-lens/route.ts: missing PASS180 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "osint_queue_preview_only",
    "externalFetchPerformed: false",
    "safe paraphrase",
  ]) {
    if (!osintRouteSource.includes(needle))
      errors.push(
        `app/api/market-integrity/osint-queue/route.ts: missing PASS180 route marker ${needle}.`,
      );
  }
  for (const needle of ["ContractLensPanel", "OsintQueuePanel"]) {
    if (!marketPageSource.includes(needle))
      errors.push(
        `app/[locale]/market-integrity/page.tsx: missing PASS180 panel ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS180 Contract Lens / OSINT Queue guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass180-contract-lens-osint-queue-safety.mjs
// PASS180

// PASS179 Velmère Lens router + full matrix guard
try {
  const lensMapSource = read("lib/search/velmere-lens-route-map.ts");
  const lensRouterSource = read(
    "components/search/VelmereLensCommandRouter.tsx",
  );
  const searchClientSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const lensRouteSource = read("app/api/search/lens-route/route.ts");
  const matrixSource = read("VELMERE_PASS179_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "velmereLensRoutes",
    "contract_lens",
    "osint_queue",
    "source_ledger",
  ]) {
    if (!lensMapSource.includes(needle))
      errors.push(
        `lib/search/velmere-lens-route-map.ts: missing PASS179 marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereLensCommandRouter",
    "Lens does not replace Shield",
    "Lens nie zastępuje Shielda",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS179 router marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereLensCommandRouter",
    "Velmère Lens",
    "Legacy guard marker: Velmère Intelligence Search",
  ]) {
    if (!searchClientSource.includes(needle))
      errors.push(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS179 Lens marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmere_lens_route_preview",
    "does not replace full Shield analysis",
    "no-store",
  ]) {
    if (!lensRouteSource.includes(needle))
      errors.push(
        `app/api/search/lens-route/route.ts: missing PASS179 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère Lens / Search",
    "Contract lens readiness",
    "OSINT queue / analyst workflow",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `VELMERE_PASS179_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS179 Lens router/full matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass179-lens-router-full-matrix-safety.mjs
// PASS179

// PASS178 token metadata cache/provider readiness guard
try {
  const metadataCacheSource = read("lib/search/token-metadata-cache.ts");
  const metadataRouteSource = read("app/api/search/token-metadata/route.ts");
  const metadataPanelSource = read(
    "components/search/TokenMetadataProviderPanel.tsx",
  );
  const searchPageSource = read("app/[locale]/search/page.tsx");
  for (const needle of [
    "TokenMetadataProvider",
    "curatedTokenMetadata",
    "createTokenMetadataCacheSnapshot",
    "externalFetchPerformed: false",
  ]) {
    if (!metadataCacheSource.includes(needle))
      errors.push(
        `lib/search/token-metadata-cache.ts: missing PASS178 marker ${needle}.`,
      );
  }
  for (const needle of [
    "token_metadata_cache_preview",
    "performs no external provider fetch",
    "no-store",
  ]) {
    if (!metadataRouteSource.includes(needle))
      errors.push(
        `app/api/search/token-metadata/route.ts: missing PASS178 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "TokenMetadataProviderPanel",
    "getTokenMetadataProviderSummary",
    "tokenMetadataProviders",
  ]) {
    if (!metadataPanelSource.includes(needle))
      errors.push(
        `components/search/TokenMetadataProviderPanel.tsx: missing PASS178 panel marker ${needle}.`,
      );
  }
  if (!searchPageSource.includes("TokenMetadataProviderPanel"))
    errors.push(
      "app/[locale]/search/page.tsx: missing PASS178 TokenMetadataProviderPanel.",
    );
} catch (error) {
  errors.push(
    `PASS178 token metadata cache guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass178-token-metadata-cache-safety.mjs
// PASS178

// PASS177 live search adapter + Shield query state guard
try {
  const adapterSource = read("lib/search/live-search-adapter-skeleton.ts");
  const liveRouteSource = read("app/api/search/live-preview/route.ts");
  const searchContractSource = read(
    "lib/search/intelligence-search-contract.ts",
  );
  const searchClientSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const shieldClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  for (const needle of [
    "VelmereLiveSearchAdapter",
    "createLiveSearchAdapterPreview",
    "externalFetchPerformed: false",
  ]) {
    if (!adapterSource.includes(needle))
      errors.push(
        `lib/search/live-search-adapter-skeleton.ts: missing PASS177 marker ${needle}.`,
      );
  }
  for (const needle of [
    "live_search_adapter_preview_only",
    "does not fetch public web or OSINT sources",
    "no-store",
  ]) {
    if (!liveRouteSource.includes(needle))
      errors.push(
        `app/api/search/live-preview/route.ts: missing PASS177 safety marker ${needle}.`,
      );
  }
  for (const needle of ["avatarImage?: string", "assets.coingecko.com"]) {
    if (!searchContractSource.includes(needle))
      errors.push(
        `lib/search/intelligence-search-contract.ts: missing PASS177 logo marker ${needle}.`,
      );
  }
  for (const needle of ["result.avatarImage", "vis-live-adapter-note"]) {
    if (!searchClientSource.includes(needle))
      errors.push(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS177 UI marker ${needle}.`,
      );
  }
  for (const needle of [
    'routeParams.get("asset")',
    'routeParams.get("query")',
    "velmere-search",
    "cleanRouteScan",
  ]) {
    if (!shieldClientSource.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS177 query bridge marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS177 live search / Shield query guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass177-live-search-shield-query-safety.mjs
// PASS177

// PASS176 Search bridge + discovery capsules guard
try {
  const searchContractSource = read(
    "lib/search/intelligence-search-contract.ts",
  );
  const searchClientSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const bridgeRouteSource = read("app/api/search/bridge/route.ts");
  const discoveryRailSource = read(
    "components/search/VelmereSearchDiscoveryRail.tsx",
  );
  for (const needle of [
    "VelmereShieldBridge",
    "buildVelmereShieldBridge",
    "full_shield_analysis",
    "avatarLabel",
  ]) {
    if (!searchContractSource.includes(needle))
      errors.push(
        `lib/search/intelligence-search-contract.ts: missing PASS176 marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereSearchDiscoveryRail",
    "vis-bridge-box",
    "result.bridge?.href",
  ]) {
    if (!searchClientSource.includes(needle))
      errors.push(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS176 marker ${needle}.`,
      );
  }
  for (const needle of [
    "search_to_shield_bridge_preview",
    "storageWritePerformed: false",
    "does not create a final risk verdict",
  ]) {
    if (!bridgeRouteSource.includes(needle))
      errors.push(
        `app/api/search/bridge/route.ts: missing PASS176 safety marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère discovery layer",
    "Narrative radar",
    "Source gap map",
    "VLM capsule",
  ]) {
    if (!discoveryRailSource.includes(needle))
      errors.push(
        `components/search/VelmereSearchDiscoveryRail.tsx: missing PASS176 discovery marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS176 search bridge/discovery guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass176-search-bridge-discovery-safety.mjs
// PASS176

// PASS175 Velmère Intelligence Search guard
try {
  const searchPageSource = read("app/[locale]/search/page.tsx");
  const searchClientSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const searchRouteSource = read("app/api/search/route.ts");
  const searchContractSource = read(
    "lib/search/intelligence-search-contract.ts",
  );
  for (const needle of [
    "VelmereIntelligenceSearchClient",
    "Velmère Intelligence Search",
  ]) {
    if (
      !searchPageSource.includes(needle) &&
      !searchClientSource.includes(needle)
    )
      errors.push(`search page/client: missing PASS175 marker ${needle}.`);
  }
  for (const needle of [
    "VelmereSearchResult",
    "searchVelmereIntelligence",
    "shieldHref",
    "missingData",
    "nextOperatorStep",
  ]) {
    if (!searchContractSource.includes(needle))
      errors.push(
        `lib/search/intelligence-search-contract.ts: missing PASS175 marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmere_intelligence_search_preview",
    "sanitizeSearchInput",
    "no-store",
  ]) {
    if (!searchRouteSource.includes(needle))
      errors.push(
        `app/api/search/route.ts: missing PASS175 safety marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS175 intelligence search guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass175-intelligence-search-safety.mjs
// PASS175

// PASS174 source cache + snapshot ledger guard
try {
  const runtimeSource = read("lib/market-integrity/source-adapter-runtime.ts");
  const routeSource = read("app/api/market-integrity/source-snapshot/route.ts");
  const pageSource = read("app/[locale]/market-integrity/page.tsx");
  for (const needle of [
    "SourceAdapterEnvelope",
    "redactSourcePayload",
    "getSourceCacheDecision",
    "createDemoSourceSnapshotBundle",
  ]) {
    if (!runtimeSource.includes(needle))
      errors.push(
        `lib/market-integrity/source-adapter-runtime.ts: missing PASS174 marker ${needle}.`,
      );
  }
  for (const needle of [
    "source_snapshot_preview_only",
    "storageWritePerformed: false",
    "no-store",
  ]) {
    if (!routeSource.includes(needle))
      errors.push(
        `app/api/market-integrity/source-snapshot/route.ts: missing PASS174 safety marker ${needle}.`,
      );
  }
  if (!pageSource.includes("SourceSnapshotLedgerPanel"))
    errors.push(
      "app/[locale]/market-integrity/page.tsx: missing PASS174 SourceSnapshotLedgerPanel.",
    );
} catch (error) {
  errors.push(
    `PASS174 source cache/snapshot guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass174-source-cache-snapshot-ledger-safety.mjs
// PASS174

// PASS173 real browser QA + market source readiness guard
try {
  const contractSource = read(
    "lib/market-integrity/live-source-adapter-contract.ts",
  );
  const marketPageSource = read("app/[locale]/market-integrity/page.tsx");
  const routeSource = read(
    "app/api/market-integrity/source-readiness/route.ts",
  );
  for (const needle of [
    "marketIntegritySourceFreshnessRules",
    "targetTtlSeconds",
    "staleAfterSeconds",
    "mustNeverClaim",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/live-source-adapter-contract.ts: missing PASS173 marker ${needle}.`,
      );
  }
  for (const needle of [
    "MarketIntegritySourceReadinessPanel",
    "RealBrowserQaPanel",
  ]) {
    if (!marketPageSource.includes(needle))
      errors.push(
        `app/[locale]/market-integrity/page.tsx: missing PASS173 panel ${needle}.`,
      );
  }
  for (const needle of [
    "source_readiness_preview_only",
    "storageWritePerformed",
    "no-store",
  ]) {
    if (!routeSource.includes(needle))
      errors.push(
        `app/api/market-integrity/source-readiness/route.ts: missing PASS173 safety marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS173 browser/source readiness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass173-browser-source-readiness-safety.mjs
// PASS173

// PASS172 board density + renderer contract guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const rendererContract = read("lib/launch/vlm-brain-renderer-contract.ts");
  for (const needle of [
    "boardDensity",
    "shield-vlm-static-density-${boardDensity}",
    "sparsePositions",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS172 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS172 · evidence board sparse/focused density polish",
    ".shield-vlm-static-density-sparse",
    ".shield-vlm-static-density-focused",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS172 CSS marker ${needle}.`);
  }
  for (const needle of [
    "dom_orbit_360",
    "dom_evidence_board",
    "webgl_prototype",
    "getVlmBrainRendererSummary",
  ]) {
    if (!rendererContract.includes(needle))
      errors.push(
        `lib/launch/vlm-brain-renderer-contract.ts: missing renderer contract marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS172 board density/renderer guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-vlm-brain-board-density-renderer-contract-safety.mjs

// PASS171 evidence board focus + WebGL prototype lane guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const webglSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  for (const needle of [
    "shield-vlm-board-mode",
    "staticBoardRingName",
    "shield-vlm-static-map-rings",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS171 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS171 · evidence board focus polish",
    ".shield-vlm-board-mode .shield-vlm-dom-core",
    ".shield-vlm-static-map-ring-a",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS171 CSS marker ${needle}.`);
  }
  for (const needle of [
    "PASS171 WebGL-ready lane",
    'canvas.getContext("webgl"',
    'data-webgl-prototype="vlm-brain"',
  ]) {
    if (!webglSource.includes(needle))
      errors.push(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS171 WebGL marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `PASS171 board/WebGL guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-vlm-brain-board-focus-webgl-lane-safety.mjs

// PASS170 unified orbit/board production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    'const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit", "static"], []);',
    'const [motionPreset, setMotionPreset] = useState<MotionPreset>("orbit");',
    "shield-vlm-static-stage",
    "staticBoardTileStyle",
    "supportsOrbit360 = true",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS170 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS170 · unified Orbit 360 + full-screen evidence board",
    ".shield-vlm-static-stage",
    ".shield-vlm-static-card",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS170 CSS marker ${needle}.`);
  }
} catch (error) {
  errors.push(
    `PASS170 unified orbit/board guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Evidence report production guard
try {
  const evidenceSource = read("lib/market-integrity/evidence-report.ts");
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "buildShieldEvidenceReportDraft",
    "sourceLedger",
    "missingDataAppendix",
    "redactionRules",
    "draft_only",
  ]) {
    if (!evidenceSource.includes(needle))
      errors.push(
        `lib/market-integrity/evidence-report.ts: missing ${needle}.`,
      );
  }
  const unifiedEvidenceDetails =
    modalSource.includes("buildShieldEvidenceReportDraft(result, operatorCaseFile)") &&
    modalSource.includes("evidenceReportDraft") &&
    modalSource.includes("detailsSlot=");
  if (!modalSource.includes("buildShieldEvidenceReportDraft(result, operatorCaseFile)")) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: missing evidence report UI buildShieldEvidenceReportDraft(result, operatorCaseFile).",
    );
  }
  if (!unifiedEvidenceDetails) {
    for (const needle of ["evidenceReportDraft.exportStatus", "shield-evidence-draft"]) {
      if (!modalSource.includes(needle))
        errors.push(
          `components/market-integrity/TokenRiskModal.tsx: missing evidence report UI ${needle}.`,
        );
    }
  }
  if (!cssSource.includes("PASS129 — evidence draft source ledger")) {
    errors.push("app/globals.css: missing PASS129 evidence draft CSS.");
  }
} catch (error) {
  errors.push(
    `Evidence report production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Operator casefile production guard
try {
  const casefileSource = read("lib/market-integrity/operator-casefile.ts");
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "buildShieldOperatorCaseFile",
    "ShieldOperatorCaseFile",
    "osintQueries",
    "operatorChecklist",
  ]) {
    if (!casefileSource.includes(needle))
      errors.push(
        `lib/market-integrity/operator-casefile.ts: missing ${needle}.`,
      );
  }
  const unifiedCasefileDetails =
    modalSource.includes("UnifiedAssetModalShell") &&
    modalSource.includes("operatorCaseFile.primaryNextAction") &&
    modalSource.includes("detailsSlot=");
  for (const needle of [
    "buildShieldOperatorCaseFile(result)",
    "operatorCaseFile.primaryNextAction",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS126 marker ${needle}.`,
      );
  }
  if (!unifiedCasefileDetails) {
    for (const needle of ["shield-operator-casefile", "shield-vlm-orbital-shell"]) {
      if (!modalSource.includes(needle))
        errors.push(
          `components/market-integrity/TokenRiskModal.tsx: missing PASS126 marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "PASS126 — operator casefile",
    ".shield-operator-casefile",
    ".shield-vlm-orbital-shell",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS126 CSS marker ${needle}.`);
  }
} catch (error) {
  errors.push(
    `Operator casefile production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM motion governor production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "type MotionPreset",
    "motionPreset",
    "renderHeavyCanvas",
    "shield-vlm-motion-toggle-mini",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing VLM motion governor marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS128 — VLM motion governor",
    "PASS148 — VLM brain cleanup",
    ".shield-vlm-motion-governor",
    ".shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing VLM motion governor CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `VLM motion governor production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM organic motion production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const unifiedDepthDockRunsBrain =
    modalSource.includes("UnifiedAnalysisDepthDock") &&
    modalSource.includes("onSelect={runVlmAiSequence}") &&
    modalSource.includes('value: "pro"');
  for (const needle of [
    "isInvestigationMode",
    "advancedOrbitalSlots",
    "setOrbitTick",
    "shield-vlm-brain-chip",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing VLM spherical motion marker ${needle}.`,
      );
  }
  if (!unifiedDepthDockRunsBrain && !modalSource.includes(`runVlmAiSequence("pro")`)) {
    errors.push(
      `components/market-integrity/TokenRiskModal.tsx: missing VLM spherical motion marker runVlmAiSequence("pro") or unified depth dock replacement.`,
    );
  }
  for (const needle of [
    "PASS125 — real VLM spherical orbit layer",
    "PASS127 — clean chart surface",
    "perspective: 2100px",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing VLM spherical motion CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `VLM organic motion production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Shield runtime UI production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const modalBody = modalSource.slice(
    modalSource.indexOf("export default function TokenRiskModal"),
  );
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  const marketSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");

  if (
    modalBody.includes("{ui.controlKicker}") &&
    !modalBody.includes("const ui = useMemo(() =>")
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: ui control copy must exist in TokenRiskModal scope.",
    );
  }
  for (const needle of [
    "investigatorSuggestRef",
    "closeOnOutsidePointer",
    'role="listbox"',
  ]) {
    if (!shieldMapSource.includes(needle))
      errors.push(
        `components/market-integrity/ShieldMapClient.tsx: missing suggestion outside-click marker ${needle}.`,
      );
  }
  if (
    shieldMapSource.includes(
      "onBlur={() => window.setTimeout(() => setSuggestionsOpen(false)",
    )
  ) {
    errors.push(
      "components/market-integrity/ShieldMapClient.tsx: suggestions must not rely on blur timeout.",
    );
  }
  if (
    !marketSource.includes("shield-token-search-suggest-panel") ||
    !marketSource.includes("z-[10000]")
  ) {
    errors.push(
      "components/market-integrity/MarketIntegrityClient.tsx: search suggestions must use high overlay layer.",
    );
  }
  for (const needle of [
    "overflow: visible",
    "z-index: 10000",
    "shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing Shield suggestion overlay CSS ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Shield runtime UI production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// AI risk brain scenario guard
try {
  const scenarioSource = read("scripts/verify-ai-risk-brain-scenarios.mjs");
  for (const needle of [
    "mega_cap_normal_volatility",
    "stablecoin_depeg",
    "low_float_parabolic_pump",
    "contract_trap",
    "no_data_token",
  ]) {
    if (!scenarioSource.includes(needle))
      errors.push(
        `scripts/verify-ai-risk-brain-scenarios.mjs: missing scenario ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `AI risk brain scenario guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// AI brain import contract production guard
try {
  const riskSource = read("lib/market-integrity/risk-engine.ts");
  const typeSource = read("lib/market-integrity/risk-types.ts");
  const promptSource = read(
    "docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md",
  );
  for (const [needle, message] of [
    [
      "export function analyzeTokenRisk",
      "analyzeTokenRisk export must remain.",
    ],
    ["computeDataConfidence", "computeDataConfidence must remain."],
    ["buildLimitations", "buildLimitations must remain."],
    ["computeFusedRiskScore", "computeFusedRiskScore must remain."],
    ["buildMetaModel", "buildMetaModel must remain."],
    ["OSINT source ledger not attached", "OSINT limitation must remain."],
    ["vesting/unlock schedule not verified", "vesting limitation must remain."],
  ]) {
    if (!riskSource.includes(needle))
      errors.push(`lib/market-integrity/risk-engine.ts: ${message}`);
  }
  for (const forbidden of [
    "fetch(",
    "window.",
    "document.",
    "localStorage",
    "as any",
    "safe investment",
    "scam confirmed",
    "fraud proven",
    "buy signal",
    "sell signal",
  ]) {
    if (riskSource.toLowerCase().includes(forbidden.toLowerCase()))
      errors.push(
        `lib/market-integrity/risk-engine.ts: forbidden risk-engine content "${forbidden}".`,
      );
  }
  const unionMatch = typeSource.match(/export type RiskSignalId =([\s\S]*?);/);
  if (unionMatch) {
    const allowed = new Set(
      [...unionMatch[1].matchAll(/\|\s+"([^"]+)"/g)].map((match) => match[1]),
    );
    for (const match of riskSource.matchAll(
      /addSignal\(signals,\s*\{[\s\S]*?id:\s+"([^"]+)"/g,
    )) {
      if (!allowed.has(match[1]))
        errors.push(
          `lib/market-integrity/risk-engine.ts: signal id "${match[1]}" is missing from RiskSignalId union.`,
        );
    }
  }
  if (
    !promptSource.includes("edytować dokładnie jeden plik") ||
    !promptSource.includes("NIE OTWIERAJ pełnego repo Velmère")
  ) {
    errors.push(
      "docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md: prompt must force one-file codex workflow.",
    );
  }
} catch (error) {
  errors.push(
    `AI brain import contract production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Locale surface production guard
try {
  const footerSource = read("components/Footer.tsx");
  const homeSource = read("components/home/HomePageClient.tsx");
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  if (
    !footerSource.includes("function footerCopy(locale: string)") ||
    !footerSource.includes("useLocale()")
  ) {
    errors.push("components/Footer.tsx: footer must use locale-aware copy.");
  }
  if (
    !homeSource.includes("function homeCopy(locale: string)") ||
    !(
      homeSource.includes("const copy = homeCopy(useLocale())") ||
      homeSource.includes("const copy = homeCopy(locale)")
    )
  ) {
    errors.push(
      "components/home/HomePageClient.tsx: homepage must use locale-aware copy.",
    );
  }
  for (const needle of [
    "const pageCopy = useMemo",
    "const atlasNodes = useMemo",
    "const commandRoomCards = useMemo",
    "const brainImportLanes = useMemo",
  ]) {
    if (!shieldMapSource.includes(needle))
      errors.push(
        `components/market-integrity/ShieldMapClient.tsx: missing locale-aware block ${needle}.`,
      );
  }
  if (/"\{pageCopy\./.test(shieldMapSource)) {
    errors.push(
      "components/market-integrity/ShieldMapClient.tsx: pageCopy placeholder found inside a string literal.",
    );
  }
} catch (error) {
  errors.push(
    `Locale surface production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM brain performance guard
try {
  const modalFile = "components/market-integrity/TokenRiskModal.tsx";
  const modalSource = read(modalFile);
  const vlmForbidden = [
    [
      "RISK ${riskScore}%",
      "Duplicated risk score under the VLM orb must not return.",
    ],
    [
      "ctx.fillText(`RISK",
      "Canvas risk text under the VLM orb must not return.",
    ],
    [
      "Math.random()",
      "VLM brain graph should use deterministic seeded randomness, not Math.random().",
    ],
    ["((index % 5)", "Old undefined index transform bug must not return."],
    ["(index % 4)", "Old undefined index transform bug must not return."],
  ];
  for (const [needle, message] of vlmForbidden) {
    if (modalSource.includes(needle)) errors.push(`${modalFile}: ${message}`);
  }
  const vlmRequired = [
    ["maxAnimationLife", "Canvas animation should have a hard max lifetime."],
    [
      "idleFrameBudget",
      "Canvas animation should slow down after the readout is complete.",
    ],
    [
      "randomFrom",
      "VLM brain should use deterministic seeded graph generation.",
    ],
    [
      "advancedTileStyle",
      "Advanced tiles should use the typed 3D cockpit placement helper.",
    ],
    [
      "shield-vlm-tile-anchor",
      "Advanced tile anchors should be present to control 3D placement and overlap.",
    ],
    [
      "prefers-reduced-motion: reduce",
      "Reduced-motion mode should be respected.",
    ],
  ];
  for (const [needle, message] of vlmRequired) {
    if (!modalSource.includes(needle)) errors.push(`${modalFile}: ${message}`);
  }
} catch (error) {
  errors.push(
    `VLM brain performance guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Risk engine production guard
try {
  const riskFile = "lib/market-integrity/risk-engine.ts";
  const riskSource = read(riskFile);
  const riskForbidden = [
    [
      "result.limitations",
      "Limitations must live in metaModel.limitations, not result.limitations.",
    ],
    ["RISK {riskScore}%", "Old duplicated VLM orb risk text must not return."],
    ["odczyt ryzyka", "Old duplicated Polish risk text must not return."],
    ["risk extraction", "Old duplicated English risk text must not return."],
    ["((index % 5)", "Old undefined index transform bug must not return."],
    ["(index % 4)", "Old undefined index transform bug must not return."],
  ];
  for (const [needle, message] of riskForbidden) {
    if (riskSource.includes(needle)) errors.push(`${riskFile}: ${message}`);
  }
  if (
    /\[\s*\.\.\.\s*[^;\n]*(?:\.values\(\)|\.keys\(\)|\.entries\(\))/.test(
      riskSource,
    )
  ) {
    errors.push(
      `${riskFile}: do not spread Map/Set iterators directly; use Array.from(...) for Vercel target safety.`,
    );
  }
  if (!/export function analyzeTokenRisk\s*\(/.test(riskSource))
    errors.push(`${riskFile}: analyzeTokenRisk export is missing.`);
  if (!/export function levelFromScore\s*\(/.test(riskSource))
    errors.push(`${riskFile}: levelFromScore export is missing.`);
  if (!/export function badgeFromLevel\s*\(/.test(riskSource))
    errors.push(`${riskFile}: badgeFromLevel export is missing.`);
  if (
    /\b(buy now|safe buy|guaranteed profit|scam proven|fraud confirmed|moon|easy money)\b/i.test(
      riskSource,
    )
  ) {
    errors.push(
      `${riskFile}: unsafe hype/advice/legal-accusation language found.`,
    );
  }
} catch (error) {
  errors.push(
    `Risk engine production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const textFiles = [
  ...walk("app", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("components", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("lib", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("store", [".ts", ".tsx", ".css", ".js", ".jsx"]),
];

for (const file of textFiles) {
  const source = read(file);
  if (/repeat\s*:\s*Infinity/.test(source))
    errors.push(
      `${file}: use repeat: 999999 instead of repeat: Infinity for Vercel/WAAPI safety.`,
    );
  if (/iterationCount/.test(source))
    errors.push(`${file}: do not pass iterationCount manually to WAAPI.`);
  if (
    /\b(?:border|bg|text|ring|from|via|to|shadow|outline|divide|placeholder|stroke|fill)-[^\s"'`{}]+\/(?:1[1-9]|[2-9][1-9])\b/.test(
      source,
    )
  ) {
    const bad = source.match(
      /\b(?:border|bg|text|ring|from|via|to|shadow|outline|divide|placeholder|stroke|fill)-[^\s"'`{}]+\/(?:1[1-9]|[2-9][1-9])\b/,
    )?.[0];
    const allowed = /\/(15|20|25|30|40|50|60|70|75|80|90|95|100)$/.test(
      bad ?? "",
    );
    if (!allowed)
      errors.push(
        `${file}: suspicious Tailwind opacity class ${bad}. Use arbitrary syntax like border-white/[0.12].`,
      );
  }
  if (/function\s+previewHeaders\s*\(\s*\)\s*\{/.test(source)) {
    errors.push(
      `${file}: previewHeaders must be typed as previewHeaders(): HeadersInit and must build a Record<string, string> without undefined header values.`,
    );
  }
  if (/x-velmere-preview-session[\s\S]{0,240}\?\s*undefined/.test(source)) {
    errors.push(
      `${file}: do not create HeadersInit objects with optional undefined header values; build a Record<string, string> and conditionally assign the header.`,
    );
  }
}

try {
  const cartSource = read("components/CartDrawer.tsx");
  const checkoutSuccess = read("app/[locale]/checkout/success/page.tsx");
  const checkoutCancel = read("app/[locale]/checkout/cancel/page.tsx");
  const commerceSurface = `${cartSource}\n${checkoutSuccess}\n${checkoutCancel}`;
  for (const banned of [
    "Order book",
    "ALLOCATED",
    "PX:",
    "acceptTokenPrefix",
  ]) {
    if (commerceSurface.includes(banned)) {
      errors.push(
        `commerce copy guard: remove trading/token-gating copy '${banned}' from clothing cart/checkout surfaces.`,
      );
    }
  }
  if (/agreedToken|setAgreedToken/.test(cartSource)) {
    errors.push(
      "components/CartDrawer.tsx: token agreement checkbox must not block clothing checkout; VLM perks stay optional.",
    );
  }
} catch (error) {
  errors.push(
    `Commerce copy guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const rootPagePath = path.join(root, "app/page.tsx");
  if (!fs.existsSync(rootPagePath)) {
    errors.push(
      "app/page.tsx: root deployment path '/' must exist and redirect to the default locale so Vercel domain preview does not show a 404.",
    );
  } else {
    const rootPage = read("app/page.tsx");
    if (!/redirect\(["']\/pl["']\)/.test(rootPage)) {
      errors.push(
        "app/page.tsx: root page should redirect('/pl') to avoid Vercel root-domain 404.",
      );
    }
  }
} catch (error) {
  errors.push(
    `Root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const navbar = read("components/Navbar.tsx");
  if (!/const\s+closeMenuPanel\s*=/.test(navbar)) {
    errors.push(
      "components/Navbar.tsx: side menu links need a closeMenuPanel() handler so the mobile drawer closes after navigation.",
    );
  }
  const closeHits = [...navbar.matchAll(/onClick=\{closeMenuPanel\}/g)].length;
  if (closeHits < 4) {
    errors.push(
      "components/Navbar.tsx: expected drawer logo, menu links, legal links, and language links to call closeMenuPanel on click.",
    );
  }
} catch (error) {
  errors.push(
    `Navbar drawer guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const square = read("components/square/VelmereSquareClient.tsx");
  if (
    /addEventListener\("touchmove"[\s\S]{0,220}preventDefault/.test(square) ||
    /addEventListener\("wheel"[\s\S]{0,220}preventDefault/.test(square)
  ) {
    errors.push(
      "components/square/VelmereSquareClient.tsx: do not block touchmove/wheel globally; mobile post modals must remain scrollable.",
    );
  }
  const legacyScrollablePostOverlay =
    /fixed inset-0 z-\[220\][^"`]*overflow-y-auto/.test(square);
  const unifiedScrollablePostModal =
    square.includes("velmere-header-safe-modal") &&
    square.includes("max-w-[82rem]") &&
    square.includes('data-modal-scroll-region="true"');
  const viewportScrollablePostModal =
    square.includes("velmere-viewport-dialog-root") &&
    square.includes("max-w-[82rem]") &&
    square.includes('data-modal-scroll-region="true"');
  if (
    !legacyScrollablePostOverlay &&
    !unifiedScrollablePostModal &&
    !viewportScrollablePostModal
  ) {
    errors.push(
      "components/square/VelmereSquareClient.tsx: post modal should use the header-safe scroll region so long posts/comments remain scrollable on mobile.",
    );
  }
  const legacySafeClose =
    /top-\[calc\(env\(safe-area-inset-top\)\+0\.75rem\)\]/.test(square);
  const unifiedSafeClose =
    square.includes('data-mobile-safe-close="true"') &&
    (square.includes("velmere-header-safe-modal") ||
      square.includes("velmere-viewport-dialog-root"));
  if (!legacySafeClose && !unifiedSafeClose) {
    errors.push(
      "components/square/VelmereSquareClient.tsx: mobile post modal needs a visible close button inside the header-safe modal edge.",
    );
  }
} catch (error) {
  errors.push(
    `Square mobile guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const vlmSwitch = read("components/vlm/VlmModeSwitch.tsx");
  if (
    !/fixed inset-x-4 bottom-\[calc\(env\(safe-area-inset-bottom\)\+9\.25rem\)\]/.test(
      vlmSwitch,
    )
  ) {
    errors.push(
      "components/vlm/VlmModeSwitch.tsx: mobile Basic/Pro switch must be centered above Angel with inset-x-4, not clipped on the right edge.",
    );
  }
  if (!/max-w-\[15\.5rem\]/.test(vlmSwitch)) {
    errors.push(
      "components/vlm/VlmModeSwitch.tsx: mobile Basic/Pro control needs a max width so both labels stay visible.",
    );
  }
} catch (error) {
  errors.push(
    `VLM mobile switch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const rootPagePath = path.join(root, "app/page.tsx");
  if (!fs.existsSync(rootPagePath)) {
    errors.push(
      "app/page.tsx: root deployment path '/' must exist and redirect to the default locale so Vercel domain preview does not show a 404.",
    );
  } else {
    const rootPage = read("app/page.tsx");
    if (!/redirect\(["']\/pl["']\)/.test(rootPage)) {
      errors.push(
        "app/page.tsx: root page should redirect('/pl') to avoid Vercel root-domain 404.",
      );
    }
  }
} catch (error) {
  errors.push(
    `Root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const navbar = read("components/Navbar.tsx");
  if (!/ShoppingBag/.test(navbar) || !/aria-label="Open cart"/.test(navbar)) {
    errors.push(
      "components/Navbar.tsx: mobile header must always expose the cart button with a ShoppingBag icon and Open cart label.",
    );
  }
} catch (error) {
  errors.push(
    `Navbar cart guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const walletTypes = read("lib/wallet/types.ts");
  const walletButton = read("components/wallet/WalletConnectButton.tsx");
  const union =
    walletTypes.match(/export type WalletKind\s*=\s*([^;]+);/s)?.[1] ?? "";
  const kinds = [...union.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const kind of kinds) {
    if (!new RegExp(`${kind}\\s*:`).test(walletButton)) {
      errors.push(
        `components/wallet/WalletConnectButton.tsx: WALLET_CONFIG is missing WalletKind '${kind}'.`,
      );
    }
  }
  if (!/Record<WalletKind/.test(walletButton)) {
    errors.push(
      "components/wallet/WalletConnectButton.tsx: WALLET_CONFIG should be typed as Record<WalletKind, ...> to prevent union indexing errors.",
    );
  }
} catch (error) {
  errors.push(
    `Wallet config guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const productCard = read("components/product/ProductCard.tsx");
  const shopPage = read("components/shop/ShopPageClient.tsx");
  if (
    !/priority\?: boolean/.test(productCard) ||
    !/priority=\{priority\}/.test(productCard)
  ) {
    errors.push(
      "components/product/ProductCard.tsx: ProductCard must accept a priority prop and pass it to the primary next/image for LCP safety.",
    );
  }
  if (!/priority=\{index < 2\}/.test(shopPage)) {
    errors.push(
      "components/shop/ShopPageClient.tsx: first visible product cards should pass priority={index < 2} to optimize above-the-fold mobile LCP.",
    );
  }
} catch (error) {
  errors.push(
    `Product image optimization guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const cartStore = read("store/useCartStore.ts");
  const cartProvider = read("components/CartProvider.tsx");
  const cartDrawer = read("components/CartDrawer.tsx");
  if (
    !/skipHydration:\s*true/.test(cartStore) ||
    !/hasHydrated/.test(cartStore)
  ) {
    errors.push(
      "store/useCartStore.ts: persisted cart needs skipHydration and an explicit hasHydrated flag to prevent hydration flicker.",
    );
  }
  if (!/safeItems/.test(cartProvider)) {
    errors.push(
      "components/CartProvider.tsx: expose safeItems only after cart hydration to avoid SSR/client cart mismatch.",
    );
  }
  if (!/const isOpen = rawIsOpen/.test(cartProvider) || !/ensureCartUiReady/.test(cartProvider)) {
    errors.push(
      "components/CartProvider.tsx: cart click must force the drawer UI open even when persisted storage hydration is pending or failed.",
    );
  }
  if (!/if \(!mounted\) return null/.test(cartDrawer) || /!mounted \|\| !hasHydrated/.test(cartDrawer)) {
    errors.push(
      "components/CartDrawer.tsx: drawer should mount after client mount and must not be hidden behind persisted cart hydration.",
    );
  }
  if (!/pass1774-cart/.test(cartDrawer)) {
    errors.push(
      "components/CartDrawer.tsx: missing PASS1774 force-open hydration state marker.",
    );
  }
} catch (error) {
  errors.push(
    `Cart hydration guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const proxy = read("proxy.ts");
  const hasRequiredExclusions =
    ["api", "_next", "_vercel"].every((part) => proxy.includes(part)) &&
    proxy.includes(".*\\\\..*");
  if (!hasRequiredExclusions) {
    errors.push(
      "proxy.ts: matcher must exclude api, _next, _vercel and static files with extensions to avoid Edge work on images/assets.",
    );
  }
} catch (error) {
  errors.push(
    `Proxy matcher guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const printful = read("lib/printful/client.ts");
  if (
    /cache:\s*["']no-store["'][\s\S]{0,80}method\s*===\s*["']GET/.test(
      printful,
    ) ||
    !/revalidate:\s*options\.revalidate \?\? 3600/.test(printful)
  ) {
    errors.push(
      "lib/printful/client.ts: GET requests should use Next revalidate cache by default to avoid Printful rate limiting.",
    );
  }
} catch (error) {
  errors.push(
    `Printful cache guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const webhook = read("app/api/stripe/webhook/route.ts");
  const orderService = read("lib/db/order-service.ts");
  if (
    !/stripe\.webhooks\.constructEvent/.test(webhook) ||
    !/stripe-signature/.test(webhook)
  ) {
    errors.push(
      "app/api/stripe/webhook/route.ts: Stripe webhook must verify stripe-signature with constructEvent.",
    );
  }
  if (
    !/hasProcessedStripeWebhookEvent/.test(webhook) ||
    !/markStripeWebhookEventProcessed/.test(orderService)
  ) {
    errors.push(
      "Stripe webhook needs idempotency storage to prevent replay/double-fulfilment events.",
    );
  }
} catch (error) {
  errors.push(
    `Stripe webhook guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const provider = read("components/wallet/Web3Provider.tsx");
  if (!/reconnectOnMount=\{false\}/.test(provider)) {
    errors.push(
      "components/wallet/Web3Provider.tsx: set reconnectOnMount={false} to prevent wallet reconnect loops/hydration surprises.",
    );
  }
} catch (error) {
  errors.push(
    `Web3 provider guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const neural = read("components/home/NeuralBrainVisual.tsx");
  if (!/lowPowerMode/.test(neural) || !/max-width: 767px/.test(neural)) {
    errors.push(
      "components/home/NeuralBrainVisual.tsx: mobile canvas must have lowPowerMode to prevent battery drain and scroll lag.",
    );
  }
} catch (error) {
  errors.push(
    `Mobile animation guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const localeLayout = read("app/[locale]/layout.tsx");
  const localeHome = read("app/[locale]/page.tsx");
  if (
    !/(?:setRequestLocale|unstable_setRequestLocale)\(locale\)/.test(
      localeLayout,
    )
  ) {
    errors.push(
      "app/[locale]/layout.tsx: locale layout must call setRequestLocale(locale) so /pl, /en and /de resolve reliably on Vercel.",
    );
  }
  if (
    !/export default (?:async )?function HomePage/.test(localeHome) ||
    !/HomePageClient/.test(localeHome)
  ) {
    errors.push(
      "app/[locale]/page.tsx: locale root pages /pl, /en and /de must render the homepage instead of falling to global 404.",
    );
  }
} catch (error) {
  errors.push(
    `Locale root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const requiredLocaleRoutes = [
    "page.tsx",
    "login/page.tsx",
    "account/page.tsx",
    "cart/page.tsx",
    "shop/page.tsx",
    "clothing/page.tsx",
    "square/page.tsx",
    "vlm-token/page.tsx",
    "market-integrity/page.tsx",
    "community/page.tsx",
    "contact/page.tsx",
    "returns/page.tsx",
    "shipping/page.tsx",
    "terms/page.tsx",
    "privacy/page.tsx",
  ];
  for (const route of requiredLocaleRoutes) {
    const routePath = path.join(root, "app/[locale]", route);
    if (!fs.existsSync(routePath)) {
      errors.push(
        `app/[locale]/${route}: required locale route is missing; Vercel may show a false 404.`,
      );
    }
  }

  const missingFallback = read("app/[locale]/[...missing]/page.tsx");
  if (
    !/LOGIN_ALIASES/.test(missingFallback) ||
    !/LoginPage/.test(missingFallback)
  ) {
    errors.push(
      "app/[locale]/[...missing]/page.tsx: catch-all route must rescue /login aliases so stale Vercel rewrites cannot show a false 404 for /pl/login.",
    );
  }
} catch (error) {
  errors.push(
    `Locale route smoke guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const authGate = read("components/auth/AuthGate.tsx");
  const localeDeclarations = [
    ...authGate.matchAll(/const\s+locale\s*=\s*useLocale\(/g),
  ].length;
  if (localeDeclarations > 1) {
    errors.push(
      "components/auth/AuthGate.tsx: useLocale() was declared as const locale more than once; keep one rawLocale/useLocale declaration to avoid SWC compile errors.",
    );
  }
  if (
    /const\s+locale\s*=\s*useLocale\(\);[\s\S]{0,240}const\s+locale\s*=\s*useLocale\(\)/.test(
      authGate,
    )
  ) {
    errors.push(
      "components/auth/AuthGate.tsx: duplicate locale constant detected near AuthGate; this breaks next dev/build.",
    );
  }
} catch (error) {
  errors.push(
    `AuthGate duplicate-locale guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const navbar = read("components/Navbar.tsx");
  const proxy = read("proxy.ts");
  const authForm = read("components/auth/AuthFormClient.tsx");
  if (
    !/localizedLoginHref/.test(navbar) ||
    !/localizedAccountHref/.test(navbar)
  ) {
    errors.push(
      "components/Navbar.tsx: account/header icon must use hard locale-prefixed login/account hrefs to avoid /login or false 404 navigation on Vercel.",
    );
  }
  if (
    /href=\{isMemberActive \? \"\/account\" : \"\/login\"\}/.test(navbar) ||
    /href=\"\/login\"/.test(navbar)
  ) {
    errors.push(
      "components/Navbar.tsx: do not use raw /login or /account in header/member navigation; use /${locale}/login or /${locale}/account.",
    );
  }
  for (const route of [
    "app/login/page.tsx",
    "app/account/page.tsx",
    "app/logowanie/page.tsx",
    "app/[locale]/login/page.tsx",
    "app/[locale]/account/page.tsx",
    "app/[locale]/logowanie/page.tsx",
    "app/[locale]/sign-in/page.tsx",
    "app/[locale]/signin/page.tsx",
  ]) {
    if (!fs.existsSync(path.join(root, route))) {
      errors.push(
        `${route}: auth route or alias is missing; login/member clicks may show 404.`,
      );
    }
  }
  if (!/ROOT_AUTH_ALIASES/.test(proxy) || !/LOCALE_AUTH_ALIASES/.test(proxy)) {
    errors.push(
      "proxy.ts: auth aliases must redirect /login, /account and /pl/logowanie-style paths to stable locale routes.",
    );
  }
  if (!/window\.location\.assign\(accountHref\)/.test(authForm)) {
    errors.push(
      "components/auth/AuthFormClient.tsx: after preview login, redirect with a hard locale-prefixed accountHref to avoid router locale confusion.",
    );
  }
} catch (error) {
  errors.push(
    `Auth route hardening guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const marketPage = read("app/[locale]/market-integrity/page.tsx");
  const riskEngine = read("lib/market-integrity/risk-engine.ts");
  const apiRoute = read("app/api/market-integrity/analyze/route.ts");
  const client = read("components/market-integrity/MarketIntegrityClient.tsx");
  const riskCard = read("components/market-integrity/TokenRiskCard.tsx");
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  const klinesRoute = read("app/api/market-integrity/klines/route.ts");
  const sentinelRoute = read("app/api/market-integrity/sentinel/route.ts");
  const alertsLib = read("lib/market-integrity/risk-alerts.ts");
  if (!/MarketIntegrityClient/.test(marketPage)) {
    errors.push(
      "app/[locale]/market-integrity/page.tsx: market integrity route must render the Shield dashboard.",
    );
  }
  if (
    !/analyzeTokenRisk/.test(riskEngine) ||
    /This is not an accusation/.test(riskEngine)
  ) {
    errors.push(
      "lib/market-integrity/risk-engine.ts: engine should return signal IDs/data only; legal/i18n copy belongs in UI messages.",
    );
  }
  if (
    !/api\.dexscreener\.com\/latest\/dex\/search/.test(apiRoute) &&
    !/analyzeDexScreenerToken/.test(apiRoute)
  ) {
    errors.push(
      "app/api/market-integrity/analyze/route.ts: live token scan should stay server-side and use the data adapter, not client-side API keys.",
    );
  }
  if (
    !/legalDisclaimer/.test(riskCard) ||
    !/market-integrity-search/.test(client)
  ) {
    errors.push(
      "components/market-integrity/MarketIntegrityClient.tsx: dashboard must include search input and visible legal disclaimer rendering.",
    );
  }
  const unifiedChartModal =
    /UnifiedAssetModalShell/.test(modal) &&
    /PopupMarketChart/.test(modal) &&
    /api\/market-integrity\/klines/.test(modal);
  if (
    !unifiedChartModal &&
    (!/ExchangeCandlesChart/.test(modal) ||
      !/api\/market-integrity\/klines/.test(modal) ||
      !/chartMode === "candles"/.test(modal))
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: token modal must keep exchange-style candles/volume chart modes backed by the klines endpoint or the unified chart modal replacement.",
    );
  }
  if (
    !unifiedChartModal &&
    (!/OrderBookDepthChart/.test(modal) || !/chartMode === "depth"/.test(modal))
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: token modal must keep exchange-style order-book depth chart mode or the unified chart modal replacement.",
    );
  }
  if (!/fetchBinanceKlines/.test(klinesRoute)) {
    errors.push(
      "app/api/market-integrity/klines/route.ts: missing Binance kline proxy for server-side OHLC chart data.",
    );
  }
  if (
    !/buildSentinelAlerts/.test(sentinelRoute) ||
    !/ShieldSentinelAlert/.test(alertsLib) ||
    !/sentinelAlerts/.test(client)
  ) {
    errors.push(
      "market-integrity sentinel: dashboard must keep the server-side Sentinel alert agent and compact watch panel.",
    );
  }
  if (
    !/Shield scenario matrix/.test(modal) &&
    !(/UnifiedAssetModalShell/.test(modal) && /detailsSlot=/.test(modal) && /operatorCaseFile.primaryNextAction/.test(modal))
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: modal must keep scenario matrix/evidence details or the unified source-gap-next-check details replacement.",
    );
  }
} catch (error) {
  errors.push(
    `Market integrity guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Square/VLM launch control production guard
try {
  const squareVlmModel = read("lib/launch/square-vlm-launch-control.ts");
  const squareVlmComponent = read(
    "components/launch/SquareVlmLaunchControl.tsx",
  );
  const squarePage = read("app/[locale]/square/page.tsx");
  const vlmPage = read("app/[locale]/vlm-token/page.tsx");
  const communityPage = read("app/[locale]/community/page.tsx");
  for (const needle of [
    "squareVlmLaunchControl",
    "member-cockpit",
    "No ROI, no price promise",
  ]) {
    if (!squareVlmModel.includes(needle))
      errors.push(
        `lib/launch/square-vlm-launch-control.ts: missing launch-control marker ${needle}.`,
      );
  }
  for (const needle of [
    "SquareVlmLaunchControl",
    "utility/access layer",
    "safety boundary",
  ]) {
    if (!squareVlmComponent.includes(needle))
      errors.push(
        `components/launch/SquareVlmLaunchControl.tsx: missing launch-control UI marker ${needle}.`,
      );
  }
  if (
    !squarePage.includes('publicTrim="pass315"') &&
    !squarePage.includes('surface="square"')
  )
    errors.push(
      "app/[locale]/square/page.tsx: SquareVlmLaunchControl surface=square missing.",
    );
  if (
    !vlmPage.includes("PASS318 route removal") &&
    !vlmPage.includes('surface="vlm"')
  )
    errors.push(
      "app/[locale]/vlm-token/page.tsx: SquareVlmLaunchControl surface=vlm missing.",
    );
  if (
    !communityPage.includes("data-pass318-public-storefront-focus") &&
    !communityPage.includes('surface="community"')
  )
    errors.push(
      "app/[locale]/community/page.tsx: SquareVlmLaunchControl surface=community missing.",
    );
} catch (error) {
  errors.push(
    `Square/VLM launch control production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Commerce launch control production guard
try {
  const commerceModel = read("lib/launch/commerce-launch-control.ts");
  const commerceComponent = read("components/launch/CommerceLaunchControl.tsx");
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  for (const needle of [
    "commerceLaunchControl",
    "No payment flow, card entry",
    "Fulfillment provider truth",
  ]) {
    if (!commerceModel.includes(needle))
      errors.push(
        `lib/launch/commerce-launch-control.ts: missing commerce launch marker ${needle}.`,
      );
  }
  for (const needle of [
    "CommerceLaunchControl",
    "operationally ready",
    "safety boundary",
  ]) {
    if (!commerceComponent.includes(needle))
      errors.push(
        `components/launch/CommerceLaunchControl.tsx: missing commerce UI marker ${needle}.`,
      );
  }
  if (!checkoutPage.includes('surface="checkout"'))
    errors.push(
      "app/[locale]/checkout/page.tsx: CommerceLaunchControl surface=checkout missing.",
    );
  if (!cartPage.includes('surface="cart"'))
    errors.push(
      "app/[locale]/cart/page.tsx: CommerceLaunchControl surface=cart missing.",
    );
} catch (error) {
  errors.push(
    `Commerce launch control production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Provider truth/admin gate production guard
try {
  const providerLedger = read("lib/launch/provider-truth-ledger.ts");
  const providerPanel = read("components/launch/ProviderTruthLedgerPanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "providerTruthLedger",
    "All SKU readiness",
    "buildProductProviderTruthSnapshot",
  ]) {
    if (!providerLedger.includes(needle))
      errors.push(
        `lib/launch/provider-truth-ledger.ts: missing provider truth marker ${needle}.`,
      );
  }
  for (const needle of [
    "ProviderTruthLedgerPanel",
    "SKU and shipping need proof",
    "Provider, SKU i dostawa",
  ]) {
    if (!providerPanel.includes(needle))
      errors.push(
        `components/launch/ProviderTruthLedgerPanel.tsx: missing provider truth UI marker ${needle}.`,
      );
  }
  if (
    !adminPage.includes("adminGateCopy") ||
    !adminPage.includes("admin gate / launch control")
  ) {
    errors.push(
      "app/[locale]/admin/import-products/page.tsx: admin gate launch-control notice missing.",
    );
  }
} catch (error) {
  errors.push(
    `Provider truth/admin gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Product provider snapshot production guard
try {
  const productCard = read("components/product/ProductCard.tsx");
  const productDetail = read("components/shop/ProductDetailClient.tsx");
  const providerLedger = read("lib/launch/provider-truth-ledger.ts");
  for (const needle of [
    "buildProductProviderTruthSnapshot(product)",
    "providerSnapshot.score",
    "providerSnapshot.sourceMode",
  ]) {
    if (!productCard.includes(needle))
      errors.push(
        `components/product/ProductCard.tsx: missing provider snapshot marker ${needle}.`,
      );
  }
  const providerDetailNeedles = productDetail.includes(
    'data-pass318-public-storefront-focus="product"',
  )
    ? [
        "buildProductProviderTruthSnapshot(selectedProduct)",
        "providerSnapshotTitle",
      ]
    : [
        "buildProductProviderTruthSnapshot(selectedProduct)",
        "providerSnapshotTitle",
        "providerSnapshot.missing.join",
      ];
  for (const needle of providerDetailNeedles) {
    if (!productDetail.includes(needle))
      errors.push(
        `components/shop/ProductDetailClient.tsx: missing product provider detail marker ${needle}.`,
      );
  }
  if (
    !providerLedger.includes("SKU truth snapshots now surface on cards/details")
  ) {
    errors.push(
      "lib/launch/provider-truth-ledger.ts: product-level SKU snapshot status missing.",
    );
  }
} catch (error) {
  errors.push(
    `Product provider snapshot production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Shipping/returns truth production guard
try {
  const shippingReturnsModel = read("lib/launch/shipping-returns-truth.ts");
  const shippingReturnsPanel = read(
    "components/launch/ShippingReturnsTruthPanel.tsx",
  );
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const returnsPage = read("app/[locale]/legal/returns/page.tsx");
  for (const needle of [
    "shippingReturnsTruthMatrix",
    "Shipping costs",
    "Refund flow",
    "Provider exceptions",
  ]) {
    if (!shippingReturnsModel.includes(needle))
      errors.push(
        `lib/launch/shipping-returns-truth.ts: missing shipping/returns marker ${needle}.`,
      );
  }
  for (const needle of [
    "ShippingReturnsTruthPanel",
    "Shipping and returns must be clear",
    "Dostawa i zwroty",
  ]) {
    if (!shippingReturnsPanel.includes(needle))
      errors.push(
        `components/launch/ShippingReturnsTruthPanel.tsx: missing shipping/returns UI marker ${needle}.`,
      );
  }
  if (
    !checkoutPage.includes("data-pass318-public-storefront-focus") &&
    !checkoutPage.includes('surface="checkout"')
  )
    errors.push(
      "app/[locale]/checkout/page.tsx: ShippingReturnsTruthPanel surface=checkout missing.",
    );
  if (
    !returnsPage.includes("PASS318 route removal") &&
    !returnsPage.includes('surface="legal"')
  )
    errors.push(
      "app/[locale]/legal/returns/page.tsx: ShippingReturnsTruthPanel surface=legal missing.",
    );
} catch (error) {
  errors.push(
    `Shipping/returns truth production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Payment/order readiness production guard
try {
  const paymentOrderModel = read("lib/launch/payment-order-readiness.ts");
  const paymentOrderPanel = read(
    "components/launch/PaymentOrderReadinessPanel.tsx",
  );
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  for (const needle of [
    "paymentOrderReadinessMatrix",
    "Payment provider",
    "Webhook and audit trail",
    "Customer emails",
  ]) {
    if (!paymentOrderModel.includes(needle))
      errors.push(
        `lib/launch/payment-order-readiness.ts: missing payment/order marker ${needle}.`,
      );
  }
  for (const needle of [
    "PaymentOrderReadinessPanel",
    "Payment and order state must be real",
    "Płatność i status",
  ]) {
    if (!paymentOrderPanel.includes(needle))
      errors.push(
        `components/launch/PaymentOrderReadinessPanel.tsx: missing payment/order UI marker ${needle}.`,
      );
  }
  if (!checkoutPage.includes('surface="checkout"'))
    errors.push(
      "app/[locale]/checkout/page.tsx: PaymentOrderReadinessPanel surface=checkout missing.",
    );
  if (!cartPage.includes('surface="cart"'))
    errors.push(
      "app/[locale]/cart/page.tsx: PaymentOrderReadinessPanel surface=cart missing.",
    );
} catch (error) {
  errors.push(
    `Payment/order readiness production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Order event ledger production guard
try {
  const orderEventModel = read("lib/launch/order-event-ledger.ts");
  const orderEventPanel = read("components/launch/OrderEventLedgerPanel.tsx");
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "orderEventLedgerMatrix",
    "Idempotency key",
    "Signed webhook verification",
    "Order timeline",
  ]) {
    if (!orderEventModel.includes(needle))
      errors.push(
        `lib/launch/order-event-ledger.ts: missing order event marker ${needle}.`,
      );
  }
  for (const needle of [
    "OrderEventLedgerPanel",
    "Every order event needs a trace",
    "Każde zdarzenie",
  ]) {
    if (!orderEventPanel.includes(needle))
      errors.push(
        `components/launch/OrderEventLedgerPanel.tsx: missing order event UI marker ${needle}.`,
      );
  }
  if (!checkoutPage.includes('surface="checkout"'))
    errors.push(
      "app/[locale]/checkout/page.tsx: OrderEventLedgerPanel surface=checkout missing.",
    );
  if (!cartPage.includes('surface="cart"'))
    errors.push(
      "app/[locale]/cart/page.tsx: OrderEventLedgerPanel surface=cart missing.",
    );
  if (!adminPage.includes('surface="admin"'))
    errors.push(
      "app/[locale]/admin/import-products/page.tsx: OrderEventLedgerPanel surface=admin missing.",
    );
} catch (error) {
  errors.push(
    `Order event ledger production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin route gate production guard
try {
  const adminGateModel = read("lib/launch/admin-route-gate.ts");
  const adminGatePanel = read("components/launch/AdminRouteGatePanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminRouteGateMatrix",
    "Admin authentication",
    "Environment gate",
    "Secret redaction",
  ]) {
    if (!adminGateModel.includes(needle))
      errors.push(
        `lib/launch/admin-route-gate.ts: missing admin gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminRouteGatePanel",
    "Admin tooling must stay private",
    "Admin tooling musi być prywatne",
  ]) {
    if (!adminGatePanel.includes(needle))
      errors.push(
        `components/launch/AdminRouteGatePanel.tsx: missing admin gate UI marker ${needle}.`,
      );
  }
  if (
    !adminPage.includes("AdminRouteGatePanel") ||
    !adminPage.includes('surface="admin"')
  ) {
    errors.push(
      "app/[locale]/admin/import-products/page.tsx: AdminRouteGatePanel surface=admin missing.",
    );
  }
} catch (error) {
  errors.push(
    `Admin route gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin environment gate production guard
try {
  const adminEnvGate = read("lib/launch/admin-environment-gate.ts");
  const adminLockedPanel = read("components/launch/AdminToolsLockedPanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "getClientAdminEnvironmentGate",
    "NEXT_PUBLIC_ADMIN_TOOLS_ENABLED",
    "public_env_only",
  ]) {
    if (!adminEnvGate.includes(needle))
      errors.push(
        `lib/launch/admin-environment-gate.ts: missing admin env marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminToolsLockedPanel",
    "Product import is hidden behind an environment gate",
    "Import produktów jest schowany",
  ]) {
    if (!adminLockedPanel.includes(needle))
      errors.push(
        `components/launch/AdminToolsLockedPanel.tsx: missing locked panel marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminToolsLockedPanel",
    "if (!adminEnvironmentGate.isUnlocked)",
    "disabled={!adminEnvironmentGate.isUnlocked",
  ]) {
    if (!adminPage.includes(needle))
      errors.push(
        `app/[locale]/admin/import-products/page.tsx: missing admin locked surface marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Admin environment gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin auth/publish/secret production guard
try {
  const adminAuthContract = read("lib/launch/admin-server-auth-contract.ts");
  const publishGate = read("lib/launch/publish-permission-gate.ts");
  const secretPolicy = read("lib/launch/secret-redaction-policy.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminServerAuthContract",
    "Server auth provider",
    "Server kill switch",
  ]) {
    if (!adminAuthContract.includes(needle))
      errors.push(
        `lib/launch/admin-server-auth-contract.ts: missing admin auth marker ${needle}.`,
      );
  }
  for (const needle of [
    "publishPermissionGate",
    "Active publish permission",
    "Audit before publish",
  ]) {
    if (!publishGate.includes(needle))
      errors.push(
        `lib/launch/publish-permission-gate.ts: missing publish gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "secretRedactionPolicy",
    "Browser-visible secret scan",
    "Raw provider response redaction",
  ]) {
    if (!secretPolicy.includes(needle))
      errors.push(
        `lib/launch/secret-redaction-policy.ts: missing secret redaction marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminServerAuthContractPanel",
    "PublishPermissionGatePanel",
    "SecretRedactionPolicyPanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.push(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Admin auth/publish/secret production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin mutation audit production guard
try {
  const redactedLogger = read("lib/launch/redacted-logger.ts");
  const adminMutationAudit = read("lib/launch/admin-mutation-audit.ts");
  const adminMutationPanel = read(
    "components/launch/AdminMutationAuditPanel.tsx",
  );
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "redactOperatorLogValue",
    "createSafeOperatorLogLine",
    "redactedLoggerLaunchNote",
  ]) {
    if (!redactedLogger.includes(needle))
      errors.push(
        `lib/launch/redacted-logger.ts: missing redacted logger marker ${needle}.`,
      );
  }
  for (const needle of [
    "adminMutationAuditMatrix",
    "createAdminMutationAuditEnvelope",
    "Rollback context",
  ]) {
    if (!adminMutationAudit.includes(needle))
      errors.push(
        `lib/launch/admin-mutation-audit.ts: missing mutation audit marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminMutationAuditPanel",
    "Every import and publish must leave a safe trail",
  ]) {
    if (!adminMutationPanel.includes(needle))
      errors.push(
        `components/launch/AdminMutationAuditPanel.tsx: missing admin mutation UI marker ${needle}.`,
      );
  }
  if (!adminPage.includes("AdminMutationAuditPanel"))
    errors.push(
      "app/[locale]/admin/import-products/page.tsx: AdminMutationAuditPanel missing.",
    );
} catch (error) {
  errors.push(
    `Admin mutation audit production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin audit persistence production guard
try {
  const adminAuditPersistence = read("lib/launch/admin-audit-persistence.ts");
  const publishRollbackContext = read("lib/launch/publish-rollback-context.ts");
  const supportSafeTimeline = read("lib/launch/support-safe-timeline.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuditPersistenceMatrix",
    "createAdminAuditPersistencePreview",
    "Persistent storage adapter",
  ]) {
    if (!adminAuditPersistence.includes(needle))
      errors.push(
        `lib/launch/admin-audit-persistence.ts: missing audit persistence marker ${needle}.`,
      );
  }
  for (const needle of [
    "publishRollbackContextMatrix",
    "createPublishRollbackDiff",
    "Rollback id",
  ]) {
    if (!publishRollbackContext.includes(needle))
      errors.push(
        `lib/launch/publish-rollback-context.ts: missing rollback marker ${needle}.`,
      );
  }
  for (const needle of [
    "supportSafeTimelineMatrix",
    "createSupportSafeTimelinePreview",
    "Support-safe copy",
  ]) {
    if (!supportSafeTimeline.includes(needle))
      errors.push(
        `lib/launch/support-safe-timeline.ts: missing support timeline marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminAuditPersistencePanel",
    "PublishRollbackContextPanel",
    "SupportSafeTimelinePanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.push(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Admin audit persistence production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin audit write API production guard
try {
  const adminAuditWriteContract = read(
    "lib/launch/admin-audit-write-contract.ts",
  );
  const customerSafeExportBoundary = read(
    "lib/launch/customer-safe-export-boundary.ts",
  );
  const adminAuditRoute = read("app/api/admin/audit-events/route.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuditWriteRouteMatrix",
    "createAdminAuditWritePreview",
    "ADMIN_AUDIT_WRITE_ENABLED",
  ]) {
    if (!adminAuditWriteContract.includes(needle))
      errors.push(
        `lib/launch/admin-audit-write-contract.ts: missing audit write marker ${needle}.`,
      );
  }
  for (const needle of [
    "customerSafeExportBoundaryMatrix",
    "createCustomerSafeExportPreview",
    "Approval gate",
  ]) {
    if (!customerSafeExportBoundary.includes(needle))
      errors.push(
        `lib/launch/customer-safe-export-boundary.ts: missing customer-safe export marker ${needle}.`,
      );
  }
  for (const needle of [
    "createAdminAuditWritePreview",
    "storageWritePerformed: false",
    "locked-contract-preview",
  ]) {
    if (!adminAuditRoute.includes(needle))
      errors.push(
        `app/api/admin/audit-events/route.ts: missing locked route marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminAuditWriteApiPanel",
    "CustomerSafeExportBoundaryPanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.push(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Admin audit write API production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Admin auth session/idempotency production guard
try {
  const adminAuthSession = read("lib/launch/admin-auth-session-guard.ts");
  const adminIdempotency = read("lib/launch/admin-idempotency-store.ts");
  const adminAuditWriteContract = read(
    "lib/launch/admin-audit-write-contract.ts",
  );
  const adminAuditRoute = read("app/api/admin/audit-events/route.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuthSessionMatrix",
    "getAdminSessionPreviewFromEnv",
    "requireAdminScope",
    "product:active_publish",
  ]) {
    if (!adminAuthSession.includes(needle))
      errors.push(
        `lib/launch/admin-auth-session-guard.ts: missing auth session marker ${needle}.`,
      );
  }
  for (const needle of [
    "adminIdempotencyStoreMatrix",
    "createAdminIdempotencyPreview",
    "Duplicate response policy",
  ]) {
    if (!adminIdempotency.includes(needle))
      errors.push(
        `lib/launch/admin-idempotency-store.ts: missing idempotency marker ${needle}.`,
      );
  }
  for (const needle of [
    "sessionPreview",
    "permissionPreview",
    "idempotencyPreview",
  ]) {
    if (!adminAuditWriteContract.includes(needle))
      errors.push(
        `lib/launch/admin-audit-write-contract.ts: missing PASS147 audit write marker ${needle}.`,
      );
  }
  if (!adminAuditRoute.includes("sessionPreview"))
    errors.push("app/api/admin/audit-events/route.ts: sessionPreview missing.");
  for (const needle of [
    "AdminAuthSessionGuardPanel",
    "AdminIdempotencyStorePanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.push(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `Admin auth session/idempotency production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM brain orbit cleanup production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");
  for (const needle of [
    "PASS149 hard guard: Orbit 360 belongs only to Advanced",
    "allowedMotionPresets",
    "selectedTileEvidenceCopy",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS148 VLM brain marker ${needle}.`,
      );
  }
  if (
    modalSource.includes('(["orbit", "lite", "static"]') ||
    modalSource.includes("ui.motionLite")
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: Lite motion UI must stay removed.",
    );
  }
  for (const needle of [
    "shield-suggestion-token-avatar",
    "localLookup",
    "shield-token-search-suggest-row",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS148 search suggestion marker ${needle}.`,
      );
  }
  if (!cssSource.includes("PASS148 — VLM brain cleanup"))
    errors.push("app/globals.css: missing PASS148 VLM brain cleanup CSS.");
} catch (error) {
  errors.push(
    `VLM brain orbit cleanup production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM brain explainer advanced guard
try {
  const tokenRiskModal = read("components/market-integrity/TokenRiskModal.tsx");
  const marketClient = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const globalsCss = read("app/globals.css");
  for (const needle of [
    "allowedMotionPresets",
    "const renderHeavyCanvas = false",
    "shield-vlm-detail-panel-solid",
    "operatorQuestion",
  ]) {
    if (!tokenRiskModal.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS149 marker ${needle}.`,
      );
  }
  if (
    tokenRiskModal.includes('"lite"') ||
    tokenRiskModal.includes("'lite'") ||
    tokenRiskModal.includes('| "lite"')
  ) {
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: Lite motion preset must remain removed.",
    );
  }
  for (const needle of [
    'sourceMode?: "local" | "live" | "merged"',
    "token suggestions · logo aware",
    "click to open Shield readout",
  ]) {
    if (!marketClient.includes(needle))
      errors.push(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS149 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS149 — Advanced-only orbit guard",
    ".shield-vlm-detail-panel-solid",
  ]) {
    if (!globalsCss.includes(needle))
      errors.push(`app/globals.css: missing PASS149 marker ${needle}.`);
  }
} catch (error) {
  errors.push(
    `VLM brain explainer advanced guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// VLM brain performance runtime guard
try {
  const tokenRiskModal = read("components/market-integrity/TokenRiskModal.tsx");
  const globalsCss = read("app/globals.css");
  for (const needle of [
    'type BrainRuntimeMode = "cinematic" | "performance"',
    "performanceRuntime",
    "orbitUpdateFrameMs",
    "advancedOrbitalSlots",
    "PASS150 adaptive runtime governor",
    "shield-vlm-static-evidence-board",
  ]) {
    if (!tokenRiskModal.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS150 runtime marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS150 — VLM brain performance runtime governor",
    ".shield-vlm-runtime-performance",
    ".shield-vlm-runtime-governor",
  ]) {
    if (!globalsCss.includes(needle))
      errors.push(
        `app/globals.css: missing PASS150 runtime CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.push(
    `VLM brain performance runtime guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// PASS168 VLM brain static/advanced polish guard
try {
  const tokenRiskModal = read("components/market-integrity/TokenRiskModal.tsx");
  const marketClient = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const globalsCss = read("app/globals.css");
  for (const needle of [
    "shield-vlm-topbar-minimal",
    "shield-vlm-brain-chip",
    "useStaticEvidenceBoard",
    "shield-vlm-static-evidence-board",
    "selectedNode.detail",
    "const renderHeavyCanvas = false",
    "autoSpin = autoRotate ? orbitTick * 0.00058",
  ]) {
    if (!tokenRiskModal.includes(needle) && !globalsCss.includes(needle)) {
      errors.push(`PASS168 VLM brain polish marker missing: ${needle}.`);
    }
  }
  for (const forbidden of [
    "adaptive orbital risk sphere",
    "sparse react frames",
    "compositor motion",
    "ctx.fillText(`RISK",
  ]) {
    if (`${tokenRiskModal}\n${globalsCss}`.includes(forbidden))
      errors.push(`PASS168 debug/forbidden UI marker remains: ${forbidden}.`);
  }
  const searchMarkerAlternatives = {
    "TokenAvatar image={item.image}": ["TokenAvatar image={item.image}"],
    "live + table": ["live + table", 'item.sourceMode === "local" ? "table"'],
    "click to open Shield readout": ["click to open Shield readout", "open Shield readout"],
  };
  for (const [needle, alternatives] of Object.entries(searchMarkerAlternatives)) {
    if (!alternatives.some((alternative) => marketClient.includes(alternative)))
      errors.push(`PASS168 search suggestion marker missing: ${needle}.`);
  }
  if (
    !fs.existsSync(
      path.join(
        root,
        "scripts/verify-vlm-brain-static-advanced-polish-safety.mjs",
      ),
    )
  ) {
    errors.push("PASS168 guard script is missing.");
  }
} catch (error) {
  errors.push(
    `PASS168 VLM brain polish guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// PASS169 home locale runtime guard
try {
  const homeSource = read("components/home/HomePageClient.tsx");
  if (!homeSource.includes("const locale = useLocale();")) {
    errors.push(
      "components/home/HomePageClient.tsx: missing scoped const locale = useLocale(); for Home readiness panels.",
    );
  }
  if (!homeSource.includes("const copy = homeCopy(locale);")) {
    errors.push(
      "components/home/HomePageClient.tsx: must use homeCopy(locale), not inline useLocale(), so locale is available in JSX.",
    );
  }
  if (
    !homeSource.includes('data-pass318-public-storefront-focus="home"') &&
    !homeSource.includes(
      '<FullSurfaceReadinessIndex locale={locale} surface="home" />',
    )
  ) {
    errors.push(
      "components/home/HomePageClient.tsx: missing scoped locale prop for FullSurfaceReadinessIndex.",
    );
  }
  if (homeSource.includes("homeCopy(useLocale())")) {
    errors.push(
      "components/home/HomePageClient.tsx: homeCopy(useLocale()) can cause locale to be unavailable for later JSX.",
    );
  }
} catch (error) {
  errors.push(
    `PASS169 home locale runtime guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// PASS198 expanded master build map guard
try {
  const masterMapSource = read("lib/launch/master-build-areas.ts");
  const masterMapDocSource = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const pkgSource = read("package.json");
  const areaCount = (masterMapSource.match(/id: \"/g) || []).length;
  if (areaCount < 90)
    errors.push(
      `lib/launch/master-build-areas.ts: expected at least 90 granular PASS198 areas, found ${areaCount}.`,
    );
  for (const needle of [
    "velmereMasterBuildAreas",
    "PASS198 marker",
    "VLM Orbit 360 shell",
    "Velmère Shield Report",
    "Holder feed",
    "Durable audit ledger",
  ]) {
    if (!masterMapSource.includes(needle))
      errors.push(
        `lib/launch/master-build-areas.ts: missing PASS198 marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère Master Build Map",
    "PASS198 zasada raportowania",
    "A–M",
  ]) {
    if (!masterMapDocSource.includes(needle))
      errors.push(
        `docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS198 documentation marker ${needle}.`,
      );
  }
  if (!pkgSource.includes("verify:pass198-master-build-map"))
    errors.push("package.json: missing PASS198 verify script.");
} catch (error) {
  errors.push(
    `PASS198 expanded master build map guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass198-master-build-map-safety.mjs
// docs marker: VELMERE_MASTER_BUILD_MAP.md

// PASS199 progress delta ledger guard
try {
  const deltaSource = read("lib/launch/master-build-progress-delta.ts");
  const deltaDocSource = read("docs/progress/PASS199_PROGRESS_DELTA_LEDGER.md");
  const mapDocSource = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const pkgSource = read("package.json");
  const deltaCount = (deltaSource.match(/previous: /g) || []).length;
  if (deltaCount < 10)
    errors.push(
      `lib/launch/master-build-progress-delta.ts: expected at least 10 PASS199 delta rows, found ${deltaCount}.`,
    );
  for (const needle of [
    "velmerePass199ProgressDeltas",
    "Previous → Current → Change",
    "getVelmerePass199ProgressDeltaRows",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta.ts: missing PASS199 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS199 — Progress Delta Ledger",
    "Previous → Current → Change progress table is mandatory",
    "Uczciwe ograniczenie",
  ]) {
    if (!deltaDocSource.includes(needle))
      errors.push(
        `docs/progress/PASS199_PROGRESS_DELTA_LEDGER.md: missing PASS199 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS199 — delta procentowa",
    "PASS199 delta — obszary ruszone w tym passie",
  ]) {
    if (!mapDocSource.includes(needle))
      errors.push(
        `docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS199 delta marker ${needle}.`,
      );
  }
  if (!pkgSource.includes("verify:pass199-progress-delta-ledger"))
    errors.push("package.json: missing PASS199 verify script.");
} catch (error) {
  errors.push(
    `PASS199 progress delta ledger guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass199-progress-delta-ledger-safety.mjs

// PASS200 AI Brain master matrix guard
try {
  const mapSource = read("lib/launch/master-build-areas.ts");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass200.ts");
  const mapDocSource = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const reportSource = read("docs/progress/PASS200_AI_BRAIN_MASTER_MATRIX.md");
  for (const needle of [
    "PASS200 marker: AI Brain has explicit D01-D24 matrix coverage",
    "pass200AiBrainMatrix: true",
    "AI risk signal ontology",
    "Brain telemetry / FPS QA",
    "Brain copy localization PL/EN/DE",
  ]) {
    if (!mapSource.includes(needle))
      errors.push(
        `lib/launch/master-build-areas.ts: missing PASS200 AI Brain marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass200ProgressDeltas",
    "newly_tracked",
    "productDelta",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass200.ts: missing PASS200 delta marker ${needle}.`,
      );
  }
  if ((mapSource.match(/group: "D"/g) || []).length < 24)
    errors.push(
      "lib/launch/master-build-areas.ts: expected D01-D24 AI Brain rows after PASS200.",
    );
  if (
    !mapDocSource.includes("mózg AI jest w mapie") ||
    !mapDocSource.includes("PASS200 delta — obszary ruszone")
  )
    errors.push(
      "docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS200 AI Brain map section.",
    );
  if (!reportSource.includes("PASS200 — AI Brain Master Matrix"))
    errors.push(
      "docs/progress/PASS200_AI_BRAIN_MASTER_MATRIX.md: missing PASS200 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS200 AI Brain master matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass200-ai-brain-master-matrix-safety.mjs
// PASS200

// PASS201 AI Brain interaction portal guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass201.ts");
  const reportSource = read(
    "docs/progress/PASS201_AI_BRAIN_INTERACTION_PORTAL.md",
  );
  for (const needle of [
    "selectedTileDetailPortal",
    "shield-vlm-detail-portal-root",
    "PASS201 marker: tile detail popup is rendered through document.body portal",
    "selectRelativeNode",
    "ArrowRight",
    "Escape",
    "autoRotate && !selectedNode ? orbitTick * 0.00042",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS201 interaction marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS201 — VLM Brain tile detail body portal",
    ".shield-vlm-detail-panel-portal",
    ".shield-vlm-orbit-mode .shield-vlm-zoom-controls",
    "z-index: 2147483200",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS201 portal CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass201ProgressDeltas",
    "Previous → Current → Change",
    "D07",
    "D23",
    "J06",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass201.ts: missing PASS201 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS201 — AI Brain Interaction Portal"))
    errors.push(
      "docs/progress/PASS201_AI_BRAIN_INTERACTION_PORTAL.md: missing PASS201 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS201 AI Brain interaction portal guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass201-ai-brain-interaction-portal-safety.mjs
// PASS201

// PASS202 AI Brain localization/source trust guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass202.ts");
  const reportSource = read(
    "docs/progress/PASS202_AI_BRAIN_LOCALIZATION_SOURCE_TRUST.md",
  );
  for (const needle of [
    "Live-Quelle",
    "sourceTrust",
    "publicationState",
    "previousTile",
    "nextTile",
    "keyboardHint",
    "selectRelativeNode(-1)",
    "selectRelativeNode(1)",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS202 localization/source trust marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS202 — AI Brain localized detail navigator",
    ".shield-vlm-detail-action-row",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS202 drawer navigation CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass202ProgressDeltas",
    "D14",
    "D16",
    "D17",
    "D24",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass202.ts: missing PASS202 delta marker ${needle}.`,
      );
  }
  if (
    !reportSource.includes(
      "PASS202 — AI Brain Localization + Source Trust Drawer",
    )
  )
    errors.push(
      "docs/progress/PASS202_AI_BRAIN_LOCALIZATION_SOURCE_TRUST.md: missing PASS202 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS202 AI Brain localization/source trust guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass202-ai-brain-localization-source-trust-safety.mjs
// PASS202

// PASS203 AI Brain evidence-chain guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass203.ts");
  const reportSource = read("docs/progress/PASS203_AI_BRAIN_EVIDENCE_CHAIN.md");
  for (const needle of [
    "tileSourceBadge",
    "shield-vlm-evidence-chain-rail",
    "shield-vlm-source-badge",
    "operatorChecklist",
    "decisionRail",
    "confidenceRail",
    "evidenceRail",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS203 evidence-chain marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS203 — AI Brain evidence-chain rail + per-card source badges",
    ".shield-vlm-evidence-chain-rail",
    ".shield-vlm-operator-checklist",
    ".shield-vlm-source-badge-live",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS203 evidence-chain CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass203ProgressDeltas",
    "D15",
    "D16",
    "D17",
    "D24",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass203.ts: missing PASS203 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS203 — AI Brain Evidence Chain Rail"))
    errors.push(
      "docs/progress/PASS203_AI_BRAIN_EVIDENCE_CHAIN.md: missing PASS203 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS203 AI Brain evidence-chain guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass203-ai-brain-evidence-chain-safety.mjs
// PASS203

// PASS204 AI Brain FPS/WebGL gate guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass204.ts");
  const reportSource = read("docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md");
  for (const needle of [
    "type MotionTelemetryState",
    "motionTelemetry",
    "PASS204 FPS telemetry",
    'document.visibilityState === "visible" && !selectedNode',
    "shield-vlm-motion-health-chip",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS204 telemetry marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS204 — AI Brain FPS telemetry chip + reading-pause governor",
    ".shield-vlm-motion-health-chip",
    ".shield-vlm-motion-health-throttled",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS204 telemetry CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "VLM_BRAIN_WEBGL_FEATURE_GATE",
    "resolveVlmBrainRendererGate",
    "DOM Orbit 360 remains the safe fallback",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS204 renderer contract marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass204ProgressDeltas",
    "D09",
    "D10",
    "D11",
    "D21",
    "D22",
    "J06",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass204.ts: missing PASS204 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS204 — AI Brain FPS Telemetry + WebGL Gate"))
    errors.push(
      "docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md: missing PASS204 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS204 AI Brain FPS/WebGL gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass204-ai-brain-fps-webgl-gate-safety.mjs
// PASS204

// PASS205 AI Brain WebGL prototype isolation guard
try {
  const prototypeSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass205.ts");
  const reportSource = read(
    "docs/progress/PASS205_AI_BRAIN_WEBGL_PROTOTYPE_ISOLATION.md",
  );
  for (const needle of [
    "PASS205 marker: isolated WebGL prototype renderer",
    "NEXT_PUBLIC_VLM_BRAIN_RENDERER",
    'getContext("webgl"',
    "DOM fallback active",
  ]) {
    if (!prototypeSource.includes(needle))
      errors.push(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS205 prototype marker ${needle}.`,
      );
  }
  for (const needle of [
    "VlmBrainWebGLPrototype",
    "PASS205 marker: VLM Brain mounts an isolated feature-gated WebGL prototype layer",
    "paused={Boolean(selectedNode)}",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS205 modal marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS205 — AI Brain isolated WebGL prototype layer",
    ".shield-vlm-webgl-prototype-layer",
    ".shield-vlm-webgl-prototype-watermark",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS205 WebGL CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "prototypeRules",
    "PASS205 WebGL prototype must be isolated",
    "PASS205 marker: WebGL prototype layer can mount",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS205 renderer contract marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass205ProgressDeltas",
    "D11",
    "D21",
    "D22",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass205.ts: missing PASS205 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS205 — AI Brain WebGL Prototype Isolation"))
    errors.push(
      "docs/progress/PASS205_AI_BRAIN_WEBGL_PROTOTYPE_ISOLATION.md: missing PASS205 report marker.",
    );
} catch (error) {
  errors.push(
    `PASS205 AI Brain WebGL prototype isolation guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass205-ai-brain-webgl-prototype-isolation-safety.mjs
// PASS205

// PASS207 AI Brain decision dock guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass207.ts");
  const reportSource = read("docs/progress/PASS207_AI_BRAIN_DECISION_DOCK.md");
  for (const needle of [
    "PASS207 marker",
    "decisionDock",
    "data-vlm-decision-dock",
    "priorityValue",
    "confidenceLimitValue",
    "sourceModeValue",
    "reviewWindowValue",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS207 decision dock marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-decision-dock",
    "grid-template-columns: repeat(4",
    "max-width: 760px",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS207 decision dock CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass207ProgressDeltas",
    "Tile decision dock",
    "Risk driver mapping",
    "Source confidence lanes",
    "Missing-data semantics",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass207.ts: missing PASS207 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS207 — AI Brain Decision Dock"))
    errors.push(
      "docs/progress/PASS207_AI_BRAIN_DECISION_DOCK.md: missing PASS207 report marker",
    );
} catch (error) {
  errors.push(
    `PASS207 AI Brain decision dock guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass207-ai-brain-decision-dock-safety.mjs
// PASS207

// PASS208 AI Brain report capsule guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass208.ts");
  const reportSource = read("docs/progress/PASS208_AI_BRAIN_REPORT_CAPSULE.md");
  for (const needle of [
    "PASS208 marker",
    "reportCapsule",
    "data-vlm-report-capsule",
    "publicBrief",
    "internalMemo",
    "redactionRule",
    "exportGate",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS208 report capsule marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS208 · AI Brain report capsule",
    ".shield-vlm-report-capsule",
    ".shield-vlm-report-capsule-grid",
    "contain: paint",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS208 report capsule CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass208ProgressDeltas",
    "Risk driver mapping",
    "Evidence Note",
    "Operator-only report fields",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass208.ts: missing PASS208 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS208 — AI Brain Report Capsule"))
    errors.push(
      "docs/progress/PASS208_AI_BRAIN_REPORT_CAPSULE.md: missing PASS208 report marker",
    );
} catch (error) {
  errors.push(
    `PASS208 AI Brain report capsule guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass208-ai-brain-report-capsule-safety.mjs
// PASS208

// PASS209 AI Brain capsule envelope guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const capsuleSource = read(
    "lib/market-integrity/vlm-brain-report-capsule.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass209.ts");
  const reportSource = read(
    "docs/progress/PASS209_AI_BRAIN_CAPSULE_ENVELOPE.md",
  );
  for (const needle of [
    "buildVlmBrainReportCapsule",
    "selectedTileReportCapsuleEnvelope",
    "data-vlm-report-capsule-envelope",
    "capsuleId",
    "exportReadiness",
    "PASS209 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS209 capsule envelope marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReportCapsuleEnvelope",
    "vlm-brain-report-capsule-v1-pass209",
    "tile_preview_only",
    "redactSensitive",
    "PASS209_VLM_BRAIN_REPORT_CAPSULE_CONTRACT",
  ]) {
    if (!capsuleSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-report-capsule.ts: missing PASS209 capsule contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS209 · AI Brain report capsule envelope",
    ".shield-vlm-report-capsule-footer",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS209 capsule CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass209ProgressDeltas",
    "Redacted payload export",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass209.ts: missing PASS209 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS209 — AI Brain Capsule Envelope"))
    errors.push(
      "docs/progress/PASS209_AI_BRAIN_CAPSULE_ENVELOPE.md: missing PASS209 report marker",
    );
} catch (error) {
  errors.push(
    `PASS209 AI Brain capsule envelope guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass209-ai-brain-capsule-envelope-safety.mjs
// PASS209

// PASS210 AI Brain capsule handoff bridge guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const handoffSource = read(
    "lib/market-integrity/vlm-brain-capsule-handoff.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass210.ts");
  const reportSource = read(
    "docs/progress/PASS210_AI_BRAIN_CAPSULE_HANDOFF.md",
  );
  for (const needle of [
    "buildVlmBrainCapsuleHandoff",
    "selectedTileReportCapsuleHandoff",
    "data-vlm-capsule-handoff",
    "PASS210 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS210 handoff marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCapsuleHandoff",
    "vlm-brain-capsule-handoff-v1-pass210",
    "report_bridge_preview",
    "client_preview_only",
    "PASS210_VLM_BRAIN_CAPSULE_HANDOFF_CONTRACT",
  ]) {
    if (!handoffSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-capsule-handoff.ts: missing PASS210 handoff contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS210 · AI Brain report capsule handoff bridge",
    ".shield-vlm-report-handoff",
    ".shield-vlm-report-handoff-grid",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS210 handoff CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass210ProgressDeltas",
    "Source freshness registry",
    "PASS210_AI_BRAIN_CAPSULE_HANDOFF_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass210.ts: missing PASS210 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS210 — AI Brain Capsule Handoff Bridge"))
    errors.push(
      "docs/progress/PASS210_AI_BRAIN_CAPSULE_HANDOFF.md: missing PASS210 report marker",
    );
} catch (error) {
  errors.push(
    `PASS210 AI Brain capsule handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass210-ai-brain-capsule-handoff-safety.mjs
// PASS210

// PASS211 AI Brain operator action queue guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const queueSource = read(
    "lib/market-integrity/vlm-brain-operator-action-queue.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass211.ts");
  const reportSource = read(
    "docs/progress/PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE.md",
  );
  for (const needle of [
    "buildVlmBrainOperatorActionQueue",
    "selectedTileOperatorActionQueue",
    "data-vlm-operator-action-queue",
    "PASS211 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS211 action queue marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainOperatorActionQueue",
    "vlm-brain-operator-action-queue-v1-pass211",
    "operator_case_preview",
    "PASS211_VLM_BRAIN_OPERATOR_ACTION_QUEUE_CONTRACT",
  ]) {
    if (!queueSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-operator-action-queue.ts: missing PASS211 action queue contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS211 · AI Brain operator action queue",
    ".shield-vlm-operator-action-queue",
    ".shield-vlm-operator-action-list",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS211 action queue CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass211ProgressDeltas",
    "Operator cases",
    "PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass211.ts: missing PASS211 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS211 — AI Brain Operator Action Queue"))
    errors.push(
      "docs/progress/PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE.md: missing PASS211 report marker",
    );
} catch (error) {
  errors.push(
    `PASS211 AI Brain operator action queue guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass211-ai-brain-operator-action-queue-safety.mjs
// PASS211

// PASS212 AI Brain case review timeline guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const timelineSource = read(
    "lib/market-integrity/vlm-brain-case-review-timeline.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass212.ts");
  const reportSource = read(
    "docs/progress/PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE.md",
  );
  for (const needle of [
    "buildVlmBrainCaseReviewTimeline",
    "selectedTileCaseReviewTimeline",
    "data-vlm-case-review-timeline",
    "PASS212 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS212 timeline marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCaseReviewTimeline",
    "vlm-brain-case-review-timeline-v1-pass212",
    "operator_case_timeline_preview",
    "PASS212_VLM_BRAIN_CASE_REVIEW_TIMELINE_CONTRACT",
  ]) {
    if (!timelineSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-case-review-timeline.ts: missing PASS212 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS212 · AI Brain case review timeline",
    ".shield-vlm-case-review-timeline",
    ".shield-vlm-case-review-event-list",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS212 timeline CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass212ProgressDeltas",
    "Operator cases",
    "PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass212.ts: missing PASS212 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS212 — AI Brain Case Review Timeline"))
    errors.push(
      "docs/progress/PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE.md: missing PASS212 report marker",
    );
} catch (error) {
  errors.push(
    `PASS212 AI Brain case review timeline guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass212-ai-brain-case-review-timeline-safety.mjs
// PASS212

// PASS213 AI Brain customer export firewall guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const firewallSource = read(
    "lib/market-integrity/vlm-brain-customer-export-firewall.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass213.ts");
  const reportSource = read(
    "docs/progress/PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL.md",
  );
  for (const needle of [
    "buildVlmBrainCustomerExportFirewall",
    "selectedTileCustomerExportFirewall",
    'data-vlm-export-firewall="pass213"',
    "PASS213 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS213 export firewall marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCustomerExportFirewall",
    "vlm-brain-customer-export-firewall-v1-pass213",
    "customer_export_preview_gate",
    "debtMatrix",
    "PASS213_VLM_BRAIN_CUSTOMER_EXPORT_FIREWALL_CONTRACT",
  ]) {
    if (!firewallSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-customer-export-firewall.ts: missing PASS213 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS213 · AI Brain customer export firewall",
    ".shield-vlm-export-firewall",
    ".shield-vlm-export-firewall-debt",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS213 firewall CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass213ProgressDeltas",
    "PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass213.ts: missing PASS213 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS213 — AI Brain Customer Export Firewall"))
    errors.push(
      "docs/progress/PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL.md: missing PASS213 report marker",
    );
} catch (error) {
  errors.push(
    `PASS213 AI Brain customer export firewall guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass213-ai-brain-customer-export-firewall-safety.mjs
// PASS213

// PASS214 AI Brain source coverage matrix guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const matrixSource = read(
    "lib/market-integrity/vlm-brain-source-coverage-matrix.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass214.ts");
  const reportSource = read(
    "docs/progress/PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX.md",
  );
  for (const needle of [
    "buildVlmBrainSourceCoverageMatrix",
    "selectedTileSourceCoverageMatrix",
    'data-vlm-source-coverage-matrix="pass214"',
    "PASS214 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS214 matrix marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceCoverageMatrix",
    "vlm-brain-source-coverage-matrix-v1-pass214",
    "operator_source_coverage_preview",
    "secondSourceRequired",
    "PASS214_VLM_BRAIN_SOURCE_COVERAGE_MATRIX_CONTRACT",
  ]) {
    if (!matrixSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-source-coverage-matrix.ts: missing PASS214 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS214 · AI Brain source coverage matrix",
    ".shield-vlm-source-coverage-matrix",
    "data-vlm-source-coverage-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS214 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass214ProgressDeltas",
    "PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass214.ts: missing PASS214 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS214 — AI Brain Source Coverage Matrix"))
    errors.push(
      "docs/progress/PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX.md: missing PASS214 report marker",
    );
} catch (error) {
  errors.push(
    `PASS214 AI Brain source coverage matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass214-ai-brain-source-coverage-matrix-safety.mjs
// PASS214

// PASS215 AI Brain release review packet guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const packetSource = read(
    "lib/market-integrity/vlm-brain-release-review-packet.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass215.ts");
  const reportSource = read(
    "docs/progress/PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET.md",
  );
  for (const needle of [
    "buildVlmBrainReleaseReviewPacket",
    "selectedTileReleaseReviewPacket",
    'data-vlm-release-review-packet="pass215"',
    "PASS215 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS215 release packet marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseReviewPacket",
    "vlm-brain-release-review-packet-v1-pass215",
    "operator_release_packet_preview",
    "PASS215_VLM_BRAIN_RELEASE_REVIEW_PACKET_CONTRACT",
  ]) {
    if (!packetSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-release-review-packet.ts: missing PASS215 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS215 — AI Brain release review packet",
    ".shield-vlm-release-review-packet",
    "data-vlm-release-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(
        `app/globals.css: missing PASS215 release packet CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass215ProgressDeltas",
    "PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass215.ts: missing PASS215 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS215 — AI Brain Release Review Packet"))
    errors.push(
      "docs/progress/PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET.md: missing PASS215 report marker",
    );
} catch (error) {
  errors.push(
    `PASS215 AI Brain release review packet guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass215-ai-brain-release-review-packet-safety.mjs
// PASS215

// PASS216 AI Brain source truth spine guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const spineSource = read(
    "lib/market-integrity/vlm-brain-source-truth-spine.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass216.ts");
  const reportSource = read(
    "docs/progress/PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE.md",
  );
  for (const needle of [
    "buildVlmBrainSourceTruthSpine",
    "selectedTileSourceTruthSpine",
    'data-vlm-source-truth-spine="pass216"',
    "PASS216 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS216 source truth spine marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceTruthSpine",
    "vlm-brain-source-truth-spine-v1-pass216",
    "operator_truth_spine_preview",
    "PASS216_VLM_BRAIN_SOURCE_TRUTH_SPINE_CONTRACT",
  ]) {
    if (!spineSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-source-truth-spine.ts: missing PASS216 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS216 — AI Brain source truth spine",
    ".shield-vlm-source-truth-spine",
    "data-vlm-source-truth-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS216 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass216ProgressDeltas",
    "PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass216.ts: missing PASS216 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS216 — AI Brain Source Truth Spine"))
    errors.push(
      "docs/progress/PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE.md: missing PASS216 report marker",
    );
} catch (error) {
  errors.push(
    `PASS216 AI Brain source truth spine guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass216-ai-brain-source-truth-spine-safety.mjs
// PASS216

// PASS217 AI Brain live adapter freshness guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const freshnessSource = read(
    "lib/market-integrity/vlm-brain-live-adapter-freshness.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass217.ts");
  const reportSource = read(
    "docs/progress/PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS.md",
  );
  for (const needle of [
    "buildVlmBrainLiveAdapterFreshnessMesh",
    "selectedTileLiveAdapterFreshnessMesh",
    'data-vlm-live-adapter-freshness="pass217"',
    "PASS217 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS217 live adapter freshness marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainLiveAdapterFreshnessMesh",
    "vlm-brain-live-adapter-freshness-v1-pass217",
    "operator_adapter_freshness_preview",
    "PASS217_VLM_BRAIN_LIVE_ADAPTER_FRESHNESS_CONTRACT",
  ]) {
    if (!freshnessSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-live-adapter-freshness.ts: missing PASS217 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS217 — AI Brain live adapter freshness",
    ".shield-vlm-live-adapter-freshness",
    "data-vlm-live-adapter-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS217 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass217ProgressDeltas",
    "PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass217.ts: missing PASS217 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS217 — AI Brain Live Adapter Freshness Mesh"))
    errors.push(
      "docs/progress/PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS.md: missing PASS217 report marker",
    );
} catch (error) {
  errors.push(
    `PASS217 AI Brain live adapter freshness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass217-ai-brain-live-adapter-freshness-safety.mjs
// PASS217

// PASS218 AI Brain source policy gate guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const policySource = read(
    "lib/market-integrity/vlm-brain-source-policy-gate.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass218.ts");
  const reportSource = read(
    "docs/progress/PASS218_AI_BRAIN_SOURCE_POLICY_GATE.md",
  );
  for (const needle of [
    "buildVlmBrainSourcePolicyGate",
    "selectedTileSourcePolicyGate",
    'data-vlm-source-policy-gate="pass218"',
    "PASS218 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS218 source policy marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourcePolicyGate",
    "vlm-brain-source-policy-gate-v1-pass218",
    "operator_source_policy_preview",
    "PASS218_VLM_BRAIN_SOURCE_POLICY_GATE_CONTRACT",
  ]) {
    if (!policySource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-source-policy-gate.ts: missing PASS218 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS218 — AI Brain source policy gate",
    ".shield-vlm-source-policy-gate",
    "data-vlm-source-policy-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS218 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass218ProgressDeltas",
    "PASS218_AI_BRAIN_SOURCE_POLICY_GATE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass218.ts: missing PASS218 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS218 — AI Brain Source Policy Gate"))
    errors.push(
      "docs/progress/PASS218_AI_BRAIN_SOURCE_POLICY_GATE.md: missing PASS218 report marker",
    );
} catch (error) {
  errors.push(
    `PASS218 AI Brain source policy gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass218-ai-brain-source-policy-gate-safety.mjs
// PASS218

// PASS219 AI Brain durable snapshot plan guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const planSource = read(
    "lib/market-integrity/vlm-brain-durable-snapshot-plan.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass219.ts");
  const reportSource = read(
    "docs/progress/PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN.md",
  );
  for (const needle of [
    "buildVlmBrainDurableSnapshotPlan",
    "selectedTileDurableSnapshotPlan",
    'data-vlm-durable-snapshot-plan="pass219"',
    "PASS219 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS219 durable snapshot marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainDurableSnapshotPlan",
    "vlm-brain-durable-snapshot-plan-v1-pass219",
    "operator_durable_write_preview",
    "PASS219_VLM_BRAIN_DURABLE_SNAPSHOT_PLAN_CONTRACT",
  ]) {
    if (!planSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-durable-snapshot-plan.ts: missing PASS219 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS219 — AI Brain durable snapshot plan",
    ".shield-vlm-durable-snapshot-plan",
    "data-vlm-durable-snapshot-write",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS219 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass219ProgressDeltas",
    "PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass219.ts: missing PASS219 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS219 — AI Brain Durable Snapshot Plan"))
    errors.push(
      "docs/progress/PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN.md: missing PASS219 report marker",
    );
} catch (error) {
  errors.push(
    `PASS219 AI Brain durable snapshot plan guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass219-ai-brain-durable-snapshot-plan-safety.mjs
// PASS219

// PASS233-PASS242 AI Brain mega branch guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractFiles = [
    "lib/market-integrity/vlm-brain-qa-trace-bundle.ts",
    "lib/market-integrity/vlm-brain-adapter-orchestration-plan.ts",
    "lib/market-integrity/vlm-brain-access-copy-firewall.ts",
    "lib/market-integrity/vlm-brain-pdf-storage-redaction-bridge.ts",
    "lib/market-integrity/vlm-brain-missing-data-escalation-queue.ts",
    "lib/market-integrity/vlm-brain-renderer-comparison-plan.ts",
    "lib/market-integrity/vlm-brain-governance-policy-memo.ts",
    "lib/market-integrity/vlm-brain-audit-trail-index.ts",
    "lib/market-integrity/vlm-brain-customer-readiness-preflight.ts",
    "lib/market-integrity/vlm-brain-mega-branch-control-tower.ts",
  ];
  for (const file of contractFiles) {
    const source = read(file);
    if (!source.includes("CONTRACT = true"))
      errors.push(`${file}: missing PASS233-PASS242 contract export marker.`);
  }
  const markers = [
    "buildVlmBrainQaTraceBundle",
    "buildVlmBrainAdapterOrchestrationPlan",
    "buildVlmBrainAccessCopyFirewall",
    "buildVlmBrainPdfStorageRedactionBridge",
    "buildVlmBrainMissingDataEscalationQueue",
    "buildVlmBrainRendererComparisonPlan",
    "buildVlmBrainGovernancePolicyMemo",
    "buildVlmBrainAuditTrailIndex",
    "buildVlmBrainCustomerReadinessPreflight",
    "buildVlmBrainMegaBranchControlTower",
    'data-vlm-mega-branch-control-tower="pass242"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS233-PASS242 marker ${marker}.`,
      );
  if (
    !cssSource.includes("PASS233–PASS242 — AI Brain mega branch control tower")
  )
    errors.push("app/globals.css: missing PASS233-PASS242 CSS marker.");
} catch (error) {
  errors.push(
    `PASS233-PASS242 AI Brain mega branch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script markers: verify-pass233-ai-brain-mega-branch-safety.mjs verify-pass234-ai-brain-mega-branch-safety.mjs verify-pass235-ai-brain-mega-branch-safety.mjs verify-pass236-ai-brain-mega-branch-safety.mjs verify-pass237-ai-brain-mega-branch-safety.mjs verify-pass238-ai-brain-mega-branch-safety.mjs verify-pass239-ai-brain-mega-branch-safety.mjs verify-pass240-ai-brain-mega-branch-safety.mjs verify-pass241-ai-brain-mega-branch-safety.mjs verify-pass242-ai-brain-mega-branch-safety.mjs

// PASS243-PASS245 AI Brain real three-pass guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const triageSource = read(
    "lib/market-integrity/vlm-brain-release-triage-board.ts",
  );
  const vaultSource = read(
    "lib/market-integrity/vlm-brain-operator-handoff-vault.ts",
  );
  const replaySource = read(
    "lib/market-integrity/vlm-brain-browser-replay-script.ts",
  );
  const markers = [
    "buildVlmBrainReleaseTriageBoard",
    "buildVlmBrainOperatorHandoffVault",
    "buildVlmBrainBrowserReplayScript",
    'data-vlm-release-triage-board="pass243"',
    'data-vlm-operator-handoff-vault="pass244"',
    'data-vlm-browser-replay-script="pass245"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS243-PASS245 marker ${marker}.`,
      );
  for (const marker of [
    "PASS243_VLM_BRAIN_RELEASE_TRIAGE_BOARD_CONTRACT",
    "customerExportReady: false",
    "binaryPdfReady: false",
    "walletAccessReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!triageSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-release-triage-board.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT",
    "sourceSnapshotWriteReady: false",
    "caseTimelineWriteReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!vaultSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-operator-handoff-vault.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS245_VLM_BRAIN_BROWSER_REPLAY_SCRIPT_CONTRACT",
    "manual_vercel_browser_replay_required",
    "qaHudRequired: true",
    "customerExportReady: false",
    "binaryPdfReady: false",
  ])
    if (!replaySource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-browser-replay-script.ts: missing marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS243–PASS245 — AI Brain real three-pass release triage",
    )
  )
    errors.push(
      "app/globals.css: missing PASS243-PASS245 real three-pass CSS marker.",
    );
} catch (error) {
  errors.push(
    `PASS243-PASS245 real three-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass243-245-ai-brain-real-three-pass-safety.mjs

// PASS246-PASS251 AI Brain real six-pass guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const files = [
    "lib/market-integrity/vlm-brain-export-authorization-gate.ts",
    "lib/market-integrity/vlm-brain-browser-evidence-collector.ts",
    "lib/market-integrity/vlm-brain-adapter-readiness-scheduler.ts",
    "lib/market-integrity/vlm-brain-customer-brief-builder.ts",
    "lib/market-integrity/vlm-brain-wallet-session-policy.ts",
    "lib/market-integrity/vlm-brain-release-readiness-orchestrator.ts",
  ];
  for (const file of files) {
    const source = read(file);
    if (!source.includes("CONTRACT = true"))
      errors.push(`${file}: missing PASS246-PASS251 contract export marker.`);
  }
  const markers = [
    "buildVlmBrainExportAuthorizationGate",
    "buildVlmBrainBrowserEvidenceCollector",
    "buildVlmBrainAdapterReadinessScheduler",
    "buildVlmBrainCustomerBriefBuilder",
    "buildVlmBrainWalletSessionPolicy",
    "buildVlmBrainReleaseReadinessOrchestrator",
    'data-vlm-export-authorization-gate="pass246"',
    'data-vlm-browser-evidence-collector="pass247"',
    'data-vlm-adapter-readiness-scheduler="pass248"',
    'data-vlm-customer-brief-builder="pass249"',
    'data-vlm-wallet-session-policy="pass250"',
    'data-vlm-release-readiness-orchestrator="pass251"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS246-PASS251 marker ${marker}.`,
      );
  if (!cssSource.includes("PASS246–PASS251 — AI Brain real six-pass"))
    errors.push("app/globals.css: missing PASS246-PASS251 CSS marker.");
} catch (error) {
  errors.push(
    `PASS246-PASS251 AI Brain real six-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass246-251-ai-brain-real-six-pass-safety.mjs

// PASS254 AI Brain release cockpit source-ledger handoff guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254",
    "PASS254_VLM_BRAIN_RELEASE_COCKPIT_SOURCE_LEDGER_HANDOFF_CONTRACT",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserQaRequired: true",
  ]) {
    if (!contractSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainReleaseCockpitSourceLedgerHandoff",
    "selectedTilePass254ReleaseHandoff",
    'data-vlm-pass254-release-handoff-safety="true"',
    "data-vlm-pass254-release-lane",
    "data-vlm-pass254-release-priority",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS254 — AI Brain release cockpit source-ledger handoff safety",
    ".shield-vlm-pass254-handoff",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS254 marker ${marker}.`);
  }
  for (const marker of [
    "PASS254 Lens handoff safety gates",
    "pewność źródeł",
    "Quellenvertrauen",
    "source confidence",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS254 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS254 guard script marker.");
} catch (error) {
  errors.push(
    `PASS254 AI Brain release cockpit source-ledger handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs

// PASS256 AI Brain evidence runbook export quarantine guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const runbookSource = read(
    "lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass256-evidence-runbook-v1",
    "PASS256_VLM_BRAIN_EVIDENCE_RUNBOOK_CONTRACT",
    "operator_evidence_runbook_browser_replay_quarantine",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserReplayRequired: true",
    "replayEvidenceAttached: false",
    "exportQuarantine: true",
  ]) {
    if (!runbookSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass256EvidenceRunbook",
    "selectedTilePass256EvidenceRunbook",
    'data-vlm-pass256-evidence-runbook="true"',
    "data-vlm-pass256-queue-state",
    "data-vlm-pass256-replay-state",
    "data-vlm-pass256-freeze-cell",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS256 — AI Brain evidence runbook",
    ".shield-vlm-pass256-evidence-runbook",
    "data-vlm-pass256-queue-state",
    "PASS256 — Lens evidence runbook guide",
    ".vlcr-pass256-runbook-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS256 marker ${marker}.`);
  }
  for (const marker of [
    "PASS256 Lens evidence runbook guide",
    "vlcr-pass256-runbook-guide",
    "PASS256 evidence runbook",
    "PASS256 Evidence-Runbook",
    "export quarantine",
    "Export-Quarantäne",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS256 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass256-evidence-runbook-export-quarantine-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS256 guard script marker.");
} catch (error) {
  errors.push(
    `PASS256 AI Brain evidence runbook export quarantine guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass256-evidence-runbook-export-quarantine-safety.mjs

// PASS258 AI Brain proof receipt lock browser trace pack guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const receiptLockSource = read(
    "lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass258-proof-receipt-lock-v1",
    "PASS258_VLM_BRAIN_PROOF_RECEIPT_LOCK_CONTRACT",
    "operator_proof_receipt_lock_browser_trace_pack",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseReceiptSigned: false",
    "browserTraceAttached: false",
    "durableSnapshotAttached: false",
    "redactionManifestAttached: false",
    "proofReceiptLockActive: true",
  ]) {
    if (!receiptLockSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass258ProofReceiptLock",
    "selectedTilePass258ProofReceiptLock",
    'data-vlm-pass258-proof-receipt-lock="true"',
    "data-vlm-pass258-proof-receipt",
    "data-vlm-pass258-signoff-state",
    "data-vlm-pass258-browser-trace",
    "data-vlm-pass258-release-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS258 — AI Brain proof receipt lock",
    ".shield-vlm-pass258-proof-receipt-lock",
    "data-vlm-pass258-proof-receipt",
    "PASS258 — Lens proof receipt lock guide",
    ".vlcr-pass258-receipt-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS258 marker ${marker}.`);
  }
  for (const marker of [
    "PASS258 Lens proof receipt lock guide",
    "vlcr-pass258-receipt-guide",
    "PASS258 proof receipt lock",
    "PASS258 Proof-Receipt-Lock",
    "browser trace pack",
    "Browser-Trace-Pack",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS258 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS258 guard script marker.");
} catch (error) {
  errors.push(
    `PASS258 AI Brain proof receipt lock browser trace pack guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs

// PASS259 AI Brain attestation ledger release freeze guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const ledgerSource = read(
    "lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass259-attestation-ledger-v1",
    "PASS259_VLM_BRAIN_ATTESTATION_LEDGER_CONTRACT",
    "operator_attestation_ledger_release_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "attestationLedgerActive: true",
    "sourceAttestationReady: false",
    "browserAttestationReady: false",
    "storageAttestationReady: false",
    "redactionAttestationReady: false",
  ]) {
    if (!ledgerSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass259AttestationLedger",
    "selectedTilePass259AttestationLedger",
    'data-vlm-pass259-attestation-ledger="true"',
    "data-vlm-pass259-attestation-state",
    "data-vlm-pass259-freeze-state",
    "data-vlm-pass259-check-state",
    "data-vlm-pass259-trace-state",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS259 — AI Brain attestation ledger",
    ".shield-vlm-pass259-attestation-ledger",
    "data-vlm-pass259-attestation-state",
    "PASS259 — Lens attestation ledger guide",
    ".vlcr-pass259-attestation-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS259 marker ${marker}.`);
  }
  for (const marker of [
    "PASS259 Lens attestation ledger guide",
    "vlcr-pass259-attestation-guide",
    "PASS259 attestation ledger",
    "PASS259 Attestation-Ledger",
    "promotion checklist",
    "Promotion-Checklist",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS259 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass259-attestation-ledger-release-freeze-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS259 guard script marker.");
} catch (error) {
  errors.push(
    `PASS259 AI Brain attestation ledger release freeze guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass259-attestation-ledger-release-freeze-safety.mjs

// PASS260 AI Brain release promotion firewall review packet guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const firewallSource = read(
    "lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass260-release-promotion-firewall-v1",
    "PASS260_VLM_BRAIN_RELEASE_PROMOTION_FIREWALL_CONTRACT",
    "operator_release_promotion_firewall_review_packet",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "publicReleaseBadgeAllowed: false",
    "finalVerdictAllowed: false",
    "reviewPacketReady: false",
    "promotionFirewallActive: true",
  ]) {
    if (!firewallSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass260ReleasePromotionFirewall",
    "selectedTilePass260PromotionFirewall",
    'data-vlm-pass260-promotion-firewall="true"',
    "data-vlm-pass260-promotion-lane",
    "data-vlm-pass260-review-packet",
    "data-vlm-pass260-customer-freeze",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS260 — AI Brain release promotion firewall",
    ".shield-vlm-pass260-promotion-firewall",
    "data-vlm-pass260-promotion-lane",
    "PASS260 — Lens promotion firewall guide",
    ".vlcr-pass260-promotion-firewall-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS260 marker ${marker}.`);
  }
  for (const marker of [
    "PASS260 Lens promotion firewall guide",
    "vlcr-pass260-promotion-firewall-guide",
    "PASS260 promotion firewall",
    "PASS260 Promotion-Firewall",
    "release badge lock",
    "Release-Badge-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS260 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass260-release-promotion-firewall-review-packet-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS260 guard script marker.");
} catch (error) {
  errors.push(
    `PASS260 AI Brain release promotion firewall review packet guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass260-release-promotion-firewall-review-packet-safety.mjs

// PASS265 AI Brain evidence language ledger consent boundary
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const languageSource = read(
    "lib/market-integrity/vlm-brain-pass265-evidence-language-ledger.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass265-evidence-language-ledger-v1",
    "PASS265_VLM_BRAIN_EVIDENCE_LANGUAGE_LEDGER_CONTRACT",
    "operator_evidence_language_ledger",
    "languageLedgerActive: true",
    "consentBoundaryActive: true",
    "cognitiveLoadGuardActive: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "publicBadgeAllowed: false",
    "urgencyCopyAllowed: false",
    "certaintyCopyAllowed: false",
    "accessShortcutAllowed: false",
    "recommendedReadingOrder",
    "languageSteps",
    "toneChecks",
  ]) {
    if (!languageSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass265-evidence-language-ledger.ts: missing PASS265 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass265EvidenceLanguageLedger",
    "selectedTilePass265EvidenceLanguageLedger",
    'data-vlm-pass265-evidence-language-ledger="true"',
    "data-vlm-pass265-language-step",
    "data-vlm-pass265-tone-risk",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS265 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS265 — AI Brain evidence language ledger",
    ".shield-vlm-pass265-evidence-language-ledger",
    "data-vlm-pass265-language-step",
    "PASS265 — Lens evidence language guide",
    ".vlcr-pass265-evidence-language-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS265 marker ${marker}.`);
  }
  for (const marker of [
    "PASS265 Lens evidence language guide",
    "vlcr-pass265-evidence-language-guide",
    "PASS265 evidence language ledger",
    "PASS265 Evidence-Language-Ledger",
    "source context",
    "Quellenkontext",
    "visible limits",
    "sichtbare Grenzen",
    "manual review",
    "Manual Review",
    "surface lock",
    "Surface-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS265 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass265-evidence-language-ledger-consent-boundary-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS265 guard script marker.");
} catch (error) {
  errors.push(
    `PASS265 AI Brain evidence language ledger consent boundary failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass265-evidence-language-ledger-consent-boundary-safety.mjs

// PASS266 AI Brain claim traceability matrix comprehension gate
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const claimSource = read(
    "lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass266-claim-traceability-matrix-v1",
    "PASS266_VLM_BRAIN_CLAIM_TRACEABILITY_MATRIX_CONTRACT",
    "operator_claim_traceability_matrix",
    "claimTraceabilityMatrixActive: true",
    "comprehensionGateActive: true",
    "evidenceAnchorRequired: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "publicClaimAllowed: false",
    "unmappedClaimAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "publicBadgeAllowed: false",
    "urgencyCopyAllowed: false",
    "certaintyCopyAllowed: false",
    "accessShortcutAllowed: false",
    "languagePreviewOnly: true",
    "claimReadingProtocol",
    "claimLanes",
    "comprehensionChecks",
  ]) {
    if (!claimSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts: missing PASS266 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass266ClaimTraceabilityMatrix",
    "selectedTilePass266ClaimTraceabilityMatrix",
    'data-vlm-pass266-claim-traceability-matrix="true"',
    "data-vlm-pass266-claim-lane",
    "data-vlm-pass266-comprehension-risk",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS266 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS266 — AI Brain claim traceability matrix",
    ".shield-vlm-pass266-claim-traceability-matrix",
    "data-vlm-pass266-claim-lane",
    "PASS266 — Lens claim traceability guide",
    ".vlcr-pass266-claim-traceability-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS266 marker ${marker}.`);
  }
  for (const marker of [
    "PASS266 Lens claim traceability guide",
    "vlcr-pass266-claim-traceability-guide",
    "PASS266 claim traceability matrix",
    "PASS266 Claim-Traceability-Matrix",
    "evidence anchor",
    "Evidence Anchor",
    "claim lane",
    "Claim-Lane",
    "comprehension gate",
    "Comprehension-Gate",
    "surface lock",
    "Surface-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS266 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS266 guard script marker.");
} catch (error) {
  errors.push(
    `PASS266 AI Brain claim traceability matrix comprehension gate failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs

// PASS267 Lens / Shield Map / VLM Brain UI screenshot hotfix guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const lensSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  const pkgSource = read("package.json");
  for (const marker of [
    "data-vlm-brain-mode={mode}",
    "shield-vlm-detail-depth-note",
    "data-vlm-brain-depth-note={mode}",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  if (modalSource.includes("{tileSourceBadge}"))
    errors.push(
      "components/market-integrity/TokenRiskModal.tsx: PASS267 source-live tile badge still renders over card data.",
    );
  for (const marker of [
    "PASS267 — user screenshot hotfix",
    ".shield-vlm-tile-deck .shield-vlm-source-badge",
    ".shield-vlm-static-stage .shield-vlm-source-badge",
    '.shield-vlm-detail-portal-root[data-vlm-brain-mode="basic"]',
    '.shield-vlm-detail-portal-root[data-vlm-brain-mode="pro"]',
    ".vis-token-suggest-panel",
    ".shield-map-token-suggest-panel",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS267 marker ${marker}.`);
  }
  for (const marker of [
    "PASS267 marker: Lens search suggestions mirror Shield-style token rows",
    "lensSuggestionSeeds",
    "vis-token-suggest-panel",
    "vis-suggestion-token-avatar",
    "selectSuggestion(item)",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  for (const marker of [
    "createPortal",
    "function suggestionGlyph",
    "shield-map-unified-search-shell",
    "shield-map-token-suggest-panel",
    "shield-map-suggestion-avatar",
    "void runInvestigatorScan(null, item.symbol)",
  ]) {
    if (!shieldMapSource.includes(marker))
      errors.push(
        `components/market-integrity/ShieldMapClient.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS267 guard script marker.");
} catch (error) {
  errors.push(
    `PASS267 Lens / Shield Map / VLM Brain UI hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs

if (errors.length) {
  console.error("Velmère preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Velmère preflight OK · next ${pkg.dependencies?.next ?? pkg.devDependencies?.next} · scanned ${textFiles.length} files`,
);

// PASS206 AI Brain QA HUD WebGL trace guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const prototypeSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass206.ts");
  for (const needle of [
    "showMotionQaHud",
    "data-vlm-qa-motion",
    "onTelemetry={setWebglTelemetry}",
    "PASS206 marker: public VLM Brain hides QA/FPS/zoom HUD by default",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS206 marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainWebGLTelemetrySample",
    "telemetryWorstFrameMs",
    "PASS206 marker: WebGL prototype exports per-second telemetry",
  ]) {
    if (!prototypeSource.includes(needle))
      errors.push(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS206 telemetry marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS206 — AI Brain production HUD polish",
    'data-vlm-qa-motion="false"',
    "display: none !important",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS206 CSS marker ${needle}`);
  }
  for (const needle of [
    "VLM_BRAIN_QA_HUD_FEATURE_GATE",
    "NEXT_PUBLIC_VLM_BRAIN_QA_HUD",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS206 contract marker ${needle}`,
      );
  }
  for (const needle of ["velmerePass206ProgressDeltas", "PASS206 marker"]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass206.ts: missing PASS206 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.push(
    `PASS206 AI Brain QA HUD WebGL trace guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass206-ai-brain-qa-hud-webgl-trace-safety.mjs
// PASS206

// PASS220 AI Brain release chain auditor guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const auditSource = read(
    "lib/market-integrity/vlm-brain-release-chain-auditor.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass220.ts");
  const reportSource = read(
    "docs/progress/PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR.md",
  );
  for (const needle of [
    "buildVlmBrainReleaseChainAudit",
    "selectedTileReleaseChainAudit",
    'data-vlm-release-chain-audit="pass220"',
    "PASS220 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS220 release chain marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseChainAudit",
    "vlm-brain-release-chain-auditor-v1-pass220",
    "operator_release_chain_audit_preview",
    "PASS220_VLM_BRAIN_RELEASE_CHAIN_AUDITOR_CONTRACT",
    "publicExportReady: false",
    "pdfDownloadReady: false",
    "rawPayloadAllowed: false",
  ]) {
    if (!auditSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-release-chain-auditor.ts: missing PASS220 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS220 — AI Brain release chain audit",
    ".shield-vlm-release-chain-audit",
    "data-vlm-release-chain-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS220 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass220ProgressDeltas",
    "PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass220.ts: missing PASS220 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS220 — AI Brain Release Chain Auditor"))
    errors.push(
      "docs/progress/PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR.md: missing PASS220 report marker",
    );
} catch (error) {
  errors.push(
    `PASS220 AI Brain release chain auditor guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass220-ai-brain-release-chain-auditor-safety.mjs
// PASS220

// PASS221 AI Brain source ledger UI preview guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-source-ledger-ui-preview.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass221.ts");
  for (const needle of [
    "buildVlmBrainSourceLedgerUiPreview",
    "selectedTileSourceLedgerUiPreview",
    'data-vlm-source-ledger-ui="pass221"',
    "PASS221 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS221 source ledger UI marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceLedgerUiPreview",
    "vlm-brain-source-ledger-ui-preview-v1-pass221",
    "operator_source_ledger_preview",
    "publicLedgerReady: false",
    "rawPayloadAllowed: false",
    "browserTraceRequired: true",
    "PASS221_VLM_BRAIN_SOURCE_LEDGER_UI_PREVIEW_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-source-ledger-ui-preview.ts: missing PASS221 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-source-ledger-ui",
    "data-vlm-source-ledger-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS221 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass221ProgressDeltas",
    "PASS221_AI_BRAIN_SOURCE_LEDGER_UI_PREVIEW_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass221.ts: missing PASS221 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.push(
    `PASS221 AI Brain source ledger UI preview guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass221-ai-brain-source-ledger-ui-preview-safety.mjs
// PASS221

// PASS222 AI Brain PDF preview manifest guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-pdf-preview-manifest.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass222.ts");
  for (const needle of [
    "buildVlmBrainPdfPreviewManifest",
    "selectedTilePdfPreviewManifest",
    'data-vlm-pdf-preview-manifest="pass222"',
    "PASS222 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS222 PDF preview marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainPdfPreviewManifest",
    "vlm-brain-pdf-preview-manifest-v1-pass222",
    "pdf_ready_html_preview_only",
    "binaryPdfReady: false",
    "rawPayloadAllowed: false",
    "redactionRequired: true",
    "PASS222_VLM_BRAIN_PDF_PREVIEW_MANIFEST_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-pdf-preview-manifest.ts: missing PASS222 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-pdf-preview-manifest",
    "data-vlm-pdf-preview-section",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS222 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass222ProgressDeltas",
    "PASS222_AI_BRAIN_PDF_PREVIEW_MANIFEST_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass222.ts: missing PASS222 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.push(
    `PASS222 AI Brain PDF preview manifest guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass222-ai-brain-pdf-preview-manifest-safety.mjs
// PASS222

// PASS223 AI Brain Lens Shield handoff guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-lens-shield-handoff.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass223.ts");
  for (const needle of [
    "buildVlmBrainLensShieldHandoff",
    "selectedTileLensShieldHandoff",
    'data-vlm-lens-shield-handoff="pass223"',
    "PASS223 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS223 Lens Shield marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainLensShieldHandoff",
    "vlm-brain-lens-shield-handoff-v1-pass223",
    "lens_to_shield_operator_preview",
    "publicRouteEnabled: false",
    "rawQueryPayloadAllowed: false",
    "PASS223_VLM_BRAIN_LENS_SHIELD_HANDOFF_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-lens-shield-handoff.ts: missing PASS223 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-lens-shield-handoff",
    "data-vlm-lens-shield-route",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS223 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass223ProgressDeltas",
    "PASS223_AI_BRAIN_LENS_SHIELD_HANDOFF_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass223.ts: missing PASS223 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.push(
    `PASS223 AI Brain Lens Shield handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass223-ai-brain-lens-shield-handoff-safety.mjs
// PASS223

// PASS224 AI Brain release QA scorecard guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-release-qa-scorecard.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass224.ts");
  for (const needle of [
    "buildVlmBrainReleaseQaScorecard",
    "selectedTileReleaseQaScorecard",
    'data-vlm-release-qa-scorecard="pass224"',
    "PASS224 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS224 release QA marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseQaScorecard",
    "vlm-brain-release-qa-scorecard-v1-pass224",
    "operator_release_qa_preview",
    "publicReleaseReady: false",
    "binaryPdfReady: false",
    "rawPayloadAllowed: false",
    "browserQaRequired: true",
    "PASS224_VLM_BRAIN_RELEASE_QA_SCORECARD_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.push(
        `lib/market-integrity/vlm-brain-release-qa-scorecard.ts: missing PASS224 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-release-qa-scorecard",
    "data-vlm-release-qa-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.push(`app/globals.css: missing PASS224 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass224ProgressDeltas",
    "PASS224_AI_BRAIN_RELEASE_QA_SCORECARD_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.push(
        `lib/launch/master-build-progress-delta-pass224.ts: missing PASS224 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.push(
    `PASS224 AI Brain release QA scorecard guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass224-ai-brain-release-qa-scorecard-safety.mjs
// PASS224

// PASS225-PASS232 AI Brain release readiness mega-branch guard hooks
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const pass225232Markers = [
    "buildVlmBrainReleaseBlockerResolver",
    "buildVlmBrainBrowserQaRunbook",
    "buildVlmBrainCustomerCopySanitizer",
    "buildVlmBrainPdfRouteContract",
    "buildVlmBrainLedgerPersistenceAdapterPlan",
    "buildVlmBrainLiveFeedAdapterMatrix",
    "buildVlmBrainWalletAccessGateMatrix",
    "buildVlmBrainLaunchReadinessDashboard",
    'data-vlm-launch-readiness-dashboard="pass232"',
  ];
  for (const marker of pass225232Markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS225-PASS232 marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS225–PASS232 — AI Brain release readiness mega-branch",
    )
  )
    errors.push(
      "app/globals.css: missing PASS225-PASS232 release readiness CSS marker.",
    );
} catch (error) {
  errors.push(
    `PASS225-PASS232 release readiness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script markers: verify-pass225-ai-brain-release-blocker-resolver-safety.mjs verify-pass226-ai-brain-browser-qa-runbook-safety.mjs verify-pass227-ai-brain-customer-copy-sanitizer-safety.mjs verify-pass228-ai-brain-pdf-route-contract-safety.mjs verify-pass229-ai-brain-ledger-persistence-adapter-plan-safety.mjs verify-pass230-ai-brain-live-feed-adapter-matrix-safety.mjs verify-pass231-ai-brain-wallet-access-gate-matrix-safety.mjs verify-pass232-ai-brain-launch-readiness-dashboard-safety.mjs

// PASS233-PASS242 AI Brain mega branch guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractFiles = [
    "lib/market-integrity/vlm-brain-qa-trace-bundle.ts",
    "lib/market-integrity/vlm-brain-adapter-orchestration-plan.ts",
    "lib/market-integrity/vlm-brain-access-copy-firewall.ts",
    "lib/market-integrity/vlm-brain-pdf-storage-redaction-bridge.ts",
    "lib/market-integrity/vlm-brain-missing-data-escalation-queue.ts",
    "lib/market-integrity/vlm-brain-renderer-comparison-plan.ts",
    "lib/market-integrity/vlm-brain-governance-policy-memo.ts",
    "lib/market-integrity/vlm-brain-audit-trail-index.ts",
    "lib/market-integrity/vlm-brain-customer-readiness-preflight.ts",
    "lib/market-integrity/vlm-brain-mega-branch-control-tower.ts",
  ];
  for (const file of contractFiles) {
    const source = read(file);
    if (!source.includes("CONTRACT = true"))
      errors.push(`${file}: missing PASS233-PASS242 contract export marker.`);
  }
  const markers = [
    "buildVlmBrainQaTraceBundle",
    "buildVlmBrainAdapterOrchestrationPlan",
    "buildVlmBrainAccessCopyFirewall",
    "buildVlmBrainPdfStorageRedactionBridge",
    "buildVlmBrainMissingDataEscalationQueue",
    "buildVlmBrainRendererComparisonPlan",
    "buildVlmBrainGovernancePolicyMemo",
    "buildVlmBrainAuditTrailIndex",
    "buildVlmBrainCustomerReadinessPreflight",
    "buildVlmBrainMegaBranchControlTower",
    'data-vlm-mega-branch-control-tower="pass242"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS233-PASS242 marker ${marker}.`,
      );
  if (
    !cssSource.includes("PASS233–PASS242 — AI Brain mega branch control tower")
  )
    errors.push("app/globals.css: missing PASS233-PASS242 CSS marker.");
} catch (error) {
  errors.push(
    `PASS233-PASS242 AI Brain mega branch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script markers: verify-pass233-ai-brain-mega-branch-safety.mjs verify-pass234-ai-brain-mega-branch-safety.mjs verify-pass235-ai-brain-mega-branch-safety.mjs verify-pass236-ai-brain-mega-branch-safety.mjs verify-pass237-ai-brain-mega-branch-safety.mjs verify-pass238-ai-brain-mega-branch-safety.mjs verify-pass239-ai-brain-mega-branch-safety.mjs verify-pass240-ai-brain-mega-branch-safety.mjs verify-pass241-ai-brain-mega-branch-safety.mjs verify-pass242-ai-brain-mega-branch-safety.mjs

// PASS243-PASS245 AI Brain real three-pass guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const triageSource = read(
    "lib/market-integrity/vlm-brain-release-triage-board.ts",
  );
  const vaultSource = read(
    "lib/market-integrity/vlm-brain-operator-handoff-vault.ts",
  );
  const replaySource = read(
    "lib/market-integrity/vlm-brain-browser-replay-script.ts",
  );
  const markers = [
    "buildVlmBrainReleaseTriageBoard",
    "buildVlmBrainOperatorHandoffVault",
    "buildVlmBrainBrowserReplayScript",
    'data-vlm-release-triage-board="pass243"',
    'data-vlm-operator-handoff-vault="pass244"',
    'data-vlm-browser-replay-script="pass245"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS243-PASS245 marker ${marker}.`,
      );
  for (const marker of [
    "PASS243_VLM_BRAIN_RELEASE_TRIAGE_BOARD_CONTRACT",
    "customerExportReady: false",
    "binaryPdfReady: false",
    "walletAccessReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!triageSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-release-triage-board.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT",
    "sourceSnapshotWriteReady: false",
    "caseTimelineWriteReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!vaultSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-operator-handoff-vault.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS245_VLM_BRAIN_BROWSER_REPLAY_SCRIPT_CONTRACT",
    "manual_vercel_browser_replay_required",
    "qaHudRequired: true",
    "customerExportReady: false",
    "binaryPdfReady: false",
  ])
    if (!replaySource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-browser-replay-script.ts: missing marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS243–PASS245 — AI Brain real three-pass release triage",
    )
  )
    errors.push(
      "app/globals.css: missing PASS243-PASS245 real three-pass CSS marker.",
    );
} catch (error) {
  errors.push(
    `PASS243-PASS245 real three-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass243-245-ai-brain-real-three-pass-safety.mjs

// PASS252 AI Brain release cockpit guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const cockpitSource = read(
    "lib/market-integrity/vlm-brain-release-cockpit.ts",
  );
  for (const marker of [
    "vlm-brain-release-cockpit-v1-pass252",
    "operator_release_control_center",
    "PASS252_VLM_BRAIN_RELEASE_COCKPIT_CONTRACT",
    "customerExportAllowed: false",
    "binaryPdfAllowed: false",
    "rawPayloadAllowed: false",
    "browserQaRequired: true",
  ]) {
    if (!cockpitSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-release-cockpit.ts: missing PASS252 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainReleaseCockpit",
    "selectedTileReleaseCockpit",
    'data-vlm-release-cockpit="pass252"',
    "data-vlm-release-cockpit-decision",
    "data-vlm-release-cockpit-lane",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS252 marker ${marker}.`,
      );
  }
  if (!cssSource.includes("PASS252 — AI Brain release cockpit"))
    errors.push("app/globals.css: missing PASS252 release cockpit CSS marker.");
} catch (error) {
  errors.push(
    `PASS252 AI Brain release cockpit guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass252-ai-brain-release-cockpit-safety.mjs

// PASS254 AI Brain release cockpit source-ledger handoff guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254",
    "PASS254_VLM_BRAIN_RELEASE_COCKPIT_SOURCE_LEDGER_HANDOFF_CONTRACT",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserQaRequired: true",
  ]) {
    if (!contractSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainReleaseCockpitSourceLedgerHandoff",
    "selectedTilePass254ReleaseHandoff",
    'data-vlm-pass254-release-handoff-safety="true"',
    "data-vlm-pass254-release-lane",
    "data-vlm-pass254-release-priority",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS254 — AI Brain release cockpit source-ledger handoff safety",
    ".shield-vlm-pass254-handoff",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS254 marker ${marker}.`);
  }
  for (const marker of [
    "PASS254 Lens handoff safety gates",
    "pewność źródeł",
    "Quellenvertrauen",
    "source confidence",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS254 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS254 guard script marker.");
} catch (error) {
  errors.push(
    `PASS254 AI Brain release cockpit source-ledger handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs

// PASS255 AI Brain action router browser replay export freeze guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const actionRouterSource = read(
    "lib/market-integrity/vlm-brain-pass255-action-router.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass255-action-router-v1",
    "PASS255_VLM_BRAIN_ACTION_ROUTER_CONTRACT",
    "operator_action_router_browser_replay_export_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exportFreeze: true",
    "walletSecretAllowed: false",
    "browserReplayRequired: true",
  ]) {
    if (!actionRouterSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass255-action-router.ts: missing PASS255 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass255ActionRouter",
    "selectedTilePass255ActionRouter",
    'data-vlm-pass255-action-router="true"',
    "data-vlm-pass255-action-phase",
    "data-vlm-pass255-replay-artifact",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS255 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS255 — AI Brain action router",
    ".shield-vlm-pass255-action-router",
    "data-vlm-pass255-action-phase",
    "PASS255 — Lens action-router guide",
    ".vlcr-pass255-action-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS255 marker ${marker}.`);
  }
  for (const marker of [
    "PASS255 Lens action router guide",
    "vlcr-pass255-action-guide",
    "evidence intake",
    "Browser-Replay",
    "Velmère Report-Kapsel",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS255 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass255-action-router-browser-replay-export-freeze-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS255 guard script marker.");
} catch (error) {
  errors.push(
    `PASS255 AI Brain action router browser replay export freeze guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass255-action-router-browser-replay-export-freeze-safety.mjs

// PASS256 AI Brain evidence runbook export quarantine guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const runbookSource = read(
    "lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass256-evidence-runbook-v1",
    "PASS256_VLM_BRAIN_EVIDENCE_RUNBOOK_CONTRACT",
    "operator_evidence_runbook_browser_replay_quarantine",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserReplayRequired: true",
    "replayEvidenceAttached: false",
    "exportQuarantine: true",
  ]) {
    if (!runbookSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass256EvidenceRunbook",
    "selectedTilePass256EvidenceRunbook",
    'data-vlm-pass256-evidence-runbook="true"',
    "data-vlm-pass256-queue-state",
    "data-vlm-pass256-replay-state",
    "data-vlm-pass256-freeze-cell",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS256 — AI Brain evidence runbook",
    ".shield-vlm-pass256-evidence-runbook",
    "data-vlm-pass256-queue-state",
    "PASS256 — Lens evidence runbook guide",
    ".vlcr-pass256-runbook-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS256 marker ${marker}.`);
  }
  for (const marker of [
    "PASS256 Lens evidence runbook guide",
    "vlcr-pass256-runbook-guide",
    "PASS256 evidence runbook",
    "PASS256 Evidence-Runbook",
    "export quarantine",
    "Export-Quarantäne",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS256 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass256-evidence-runbook-export-quarantine-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS256 guard script marker.");
} catch (error) {
  errors.push(
    `PASS256 AI Brain evidence runbook export quarantine guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass256-evidence-runbook-export-quarantine-safety.mjs

// PASS257 AI Brain evidence SLA timeline exception firewall guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const timelineSource = read(
    "lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass257-evidence-sla-timeline-v1",
    "PASS257_VLM_BRAIN_EVIDENCE_SLA_TIMELINE_CONTRACT",
    "operator_evidence_sla_timeline_exception_firewall",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exceptionOverrideAllowed: false",
    "releaseFreezeActive: true",
  ]) {
    if (!timelineSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline.ts: missing PASS257 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass257EvidenceSlaTimeline",
    "selectedTilePass257EvidenceSlaTimeline",
    'data-vlm-pass257-evidence-sla-timeline="true"',
    "data-vlm-pass257-sla-tier",
    "data-vlm-pass257-exception-firewall",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS257 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS257 — AI Brain evidence SLA timeline",
    ".shield-vlm-pass257-evidence-sla",
    "data-vlm-pass257-sla-tier",
    "PASS257 — Lens evidence SLA timeline guide",
    ".vlcr-pass257-sla-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS257 marker ${marker}.`);
  }
  for (const marker of [
    "PASS257 Lens evidence SLA timeline guide",
    "vlcr-pass257-sla-guide",
    "PASS257 evidence SLA timeline",
    "PASS257 Evidence-SLA-Timeline",
    "exception firewall",
    "Exception-Firewall",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS257 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass257-evidence-sla-timeline-exception-firewall-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS257 guard script marker.");
} catch (error) {
  errors.push(
    `PASS257 AI Brain evidence SLA timeline exception firewall guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass257-evidence-sla-timeline-exception-firewall-safety.mjs

// PASS258 AI Brain proof receipt lock browser trace pack guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const receiptLockSource = read(
    "lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass258-proof-receipt-lock-v1",
    "PASS258_VLM_BRAIN_PROOF_RECEIPT_LOCK_CONTRACT",
    "operator_proof_receipt_lock_browser_trace_pack",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseReceiptSigned: false",
    "browserTraceAttached: false",
    "durableSnapshotAttached: false",
    "redactionManifestAttached: false",
    "proofReceiptLockActive: true",
  ]) {
    if (!receiptLockSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass258ProofReceiptLock",
    "selectedTilePass258ProofReceiptLock",
    'data-vlm-pass258-proof-receipt-lock="true"',
    "data-vlm-pass258-proof-receipt",
    "data-vlm-pass258-signoff-state",
    "data-vlm-pass258-browser-trace",
    "data-vlm-pass258-release-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS258 — AI Brain proof receipt lock",
    ".shield-vlm-pass258-proof-receipt-lock",
    "data-vlm-pass258-proof-receipt",
    "PASS258 — Lens proof receipt lock guide",
    ".vlcr-pass258-receipt-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS258 marker ${marker}.`);
  }
  for (const marker of [
    "PASS258 Lens proof receipt lock guide",
    "vlcr-pass258-receipt-guide",
    "PASS258 proof receipt lock",
    "PASS258 Proof-Receipt-Lock",
    "browser trace pack",
    "Browser-Trace-Pack",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS258 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS258 guard script marker.");
} catch (error) {
  errors.push(
    `PASS258 AI Brain proof receipt lock browser trace pack guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs

// PASS259 AI Brain attestation ledger release freeze guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const ledgerSource = read(
    "lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass259-attestation-ledger-v1",
    "PASS259_VLM_BRAIN_ATTESTATION_LEDGER_CONTRACT",
    "operator_attestation_ledger_release_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "attestationLedgerActive: true",
    "sourceAttestationReady: false",
    "browserAttestationReady: false",
    "storageAttestationReady: false",
    "redactionAttestationReady: false",
  ]) {
    if (!ledgerSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass259AttestationLedger",
    "selectedTilePass259AttestationLedger",
    'data-vlm-pass259-attestation-ledger="true"',
    "data-vlm-pass259-attestation-state",
    "data-vlm-pass259-freeze-state",
    "data-vlm-pass259-check-state",
    "data-vlm-pass259-trace-state",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS259 — AI Brain attestation ledger",
    ".shield-vlm-pass259-attestation-ledger",
    "data-vlm-pass259-attestation-state",
    "PASS259 — Lens attestation ledger guide",
    ".vlcr-pass259-attestation-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS259 marker ${marker}.`);
  }
  for (const marker of [
    "PASS259 Lens attestation ledger guide",
    "vlcr-pass259-attestation-guide",
    "PASS259 attestation ledger",
    "PASS259 Attestation-Ledger",
    "promotion checklist",
    "Promotion-Checklist",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS259 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass259-attestation-ledger-release-freeze-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS259 guard script marker.");
} catch (error) {
  errors.push(
    `PASS259 AI Brain attestation ledger release freeze guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass259-attestation-ledger-release-freeze-safety.mjs

// PASS260 AI Brain release promotion firewall review packet guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const firewallSource = read(
    "lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass260-release-promotion-firewall-v1",
    "PASS260_VLM_BRAIN_RELEASE_PROMOTION_FIREWALL_CONTRACT",
    "operator_release_promotion_firewall_review_packet",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "publicReleaseBadgeAllowed: false",
    "finalVerdictAllowed: false",
    "reviewPacketReady: false",
    "promotionFirewallActive: true",
  ]) {
    if (!firewallSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass260ReleasePromotionFirewall",
    "selectedTilePass260PromotionFirewall",
    'data-vlm-pass260-promotion-firewall="true"',
    "data-vlm-pass260-promotion-lane",
    "data-vlm-pass260-review-packet",
    "data-vlm-pass260-customer-freeze",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS260 — AI Brain release promotion firewall",
    ".shield-vlm-pass260-promotion-firewall",
    "data-vlm-pass260-promotion-lane",
    "PASS260 — Lens promotion firewall guide",
    ".vlcr-pass260-promotion-firewall-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS260 marker ${marker}.`);
  }
  for (const marker of [
    "PASS260 Lens promotion firewall guide",
    "vlcr-pass260-promotion-firewall-guide",
    "PASS260 promotion firewall",
    "PASS260 Promotion-Firewall",
    "release badge lock",
    "Release-Badge-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS260 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass260-release-promotion-firewall-review-packet-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS260 guard script marker.");
} catch (error) {
  errors.push(
    `PASS260 AI Brain release promotion firewall review packet guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass260-release-promotion-firewall-review-packet-safety.mjs

// PASS261 AI Brain release cutover control rollback vault guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const cutoverSource = read(
    "lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass261-release-cutover-control-v1",
    "PASS261_VLM_BRAIN_RELEASE_CUTOVER_CONTROL_CONTRACT",
    "operator_release_cutover_control_rollback_vault",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "releaseCutoverAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "rollbackVaultRequired: true",
    "cutoverControlActive: true",
  ]) {
    if (!cutoverSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts: missing PASS261 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass261ReleaseCutoverControl",
    "selectedTilePass261CutoverControl",
    'data-vlm-pass261-cutover-control="true"',
    "data-vlm-pass261-cutover-lane",
    "data-vlm-pass261-rollback-state",
    "data-vlm-pass261-readiness-seal",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS261 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS261 — AI Brain release cutover control",
    ".shield-vlm-pass261-cutover-control",
    "data-vlm-pass261-cutover-lane",
    "PASS261 — Lens cutover control guide",
    ".vlcr-pass261-cutover-control-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS261 marker ${marker}.`);
  }
  for (const marker of [
    "PASS261 Lens cutover control guide",
    "vlcr-pass261-cutover-control-guide",
    "PASS261 cutover control",
    "PASS261 Cutover-Control",
    "rollback vault",
    "Rollback-Vault",
    "readiness seals",
    "Readiness-Seals",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS261 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass261-release-cutover-control-rollback-vault-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS261 guard script marker.");
} catch (error) {
  errors.push(
    `PASS261 AI Brain release cutover control rollback vault guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass261-release-cutover-control-rollback-vault-safety.mjs

// PASS262 AI Brain release rehearsal matrix surface locks guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const rehearsalSource = read(
    "lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass262-release-rehearsal-matrix-v1",
    "PASS262_VLM_BRAIN_RELEASE_REHEARSAL_MATRIX_CONTRACT",
    "operator_release_rehearsal_matrix_dry_run",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "rehearsalPromotionAllowed: false",
    "finalVerdictAllowed: false",
    "rollbackDrillRequired: true",
    "dryRunOnly: true",
  ]) {
    if (!rehearsalSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts: missing PASS262 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass262ReleaseRehearsalMatrix",
    "selectedTilePass262ReleaseRehearsalMatrix",
    'data-vlm-pass262-release-rehearsal="true"',
    "data-vlm-pass262-rehearsal-lane",
    "data-vlm-pass262-signoff-state",
    "data-vlm-pass262-surface-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS262 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS262 — AI Brain release rehearsal matrix",
    ".shield-vlm-pass262-release-rehearsal",
    "data-vlm-pass262-rehearsal-lane",
    "PASS262 — Lens release rehearsal guide",
    ".vlcr-pass262-release-rehearsal-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS262 marker ${marker}.`);
  }
  for (const marker of [
    "PASS262 Lens release rehearsal guide",
    "vlcr-pass262-release-rehearsal-guide",
    "PASS262 release rehearsal",
    "PASS262 Release-Rehearsal",
    "dry-run evidence",
    "Dry-Run-Evidenz",
    "rollback drill",
    "Rollback-Drill",
    "surface locks",
    "Surface-Locks",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS262 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS262 guard script marker.");
} catch (error) {
  errors.push(
    `PASS262 AI Brain release rehearsal matrix surface locks guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs

// PASS263 AI Brain release candidate trust board guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const candidateSource = read(
    "lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass263-release-candidate-trust-board-v1",
    "PASS263_VLM_BRAIN_RELEASE_CANDIDATE_TRUST_BOARD_CONTRACT",
    "operator_release_candidate_trust_board",
    "candidateBoardActive: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "trustCuePublicReady: false",
    "copyPsychologySafe: true",
  ]) {
    if (!candidateSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts: missing PASS263 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass263ReleaseCandidateTrustBoard",
    "selectedTilePass263CandidateTrustBoard",
    'data-vlm-pass263-candidate-trust-board="true"',
    "data-vlm-pass263-candidate-lane",
    "data-vlm-pass263-trust-cue",
    "data-vlm-pass263-surface-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS263 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS263 — AI Brain release candidate trust board",
    ".shield-vlm-pass263-candidate-trust-board",
    "data-vlm-pass263-candidate-lane",
    "PASS263 — Lens candidate trust board guide",
    ".vlcr-pass263-candidate-trust-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS263 marker ${marker}.`);
  }
  for (const marker of [
    "PASS263 Lens candidate trust board guide",
    "vlcr-pass263-candidate-trust-guide",
    "PASS263 candidate trust board",
    "PASS263 Candidate-Trust-Board",
    "trust cues",
    "Trust-Cues",
    "copy boundary",
    "Copy-Grenze",
    "proof gaps",
    "Proof-Gaps",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS263 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass263-release-candidate-trust-board-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS263 guard script marker.");
} catch (error) {
  errors.push(
    `PASS263 AI Brain release candidate trust board guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass263-release-candidate-trust-board-safety.mjs

// PASS264 AI Brain trust narrative guard dark-pattern firewall
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const narrativeSource = read(
    "lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  const pkgSource = read("package.json");
  for (const marker of [
    "vlm-brain-pass264-trust-narrative-guard-v1",
    "PASS264_VLM_BRAIN_TRUST_NARRATIVE_GUARD_CONTRACT",
    "operator_trust_narrative_guard",
    "narrativeGuardActive: true",
    "trustPsychologySafe: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "publicBadgeAllowed: false",
    "urgencyCopyAllowed: false",
    "certaintyCopyAllowed: false",
    "accessShortcutAllowed: false",
    "darkPatternChecks",
  ]) {
    if (!narrativeSource.includes(marker))
      errors.push(
        `lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts: missing PASS264 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass264TrustNarrativeGuard",
    "selectedTilePass264TrustNarrativeGuard",
    'data-vlm-pass264-trust-narrative-guard="true"',
    "data-vlm-pass264-narrative-stage",
    "data-vlm-pass264-dark-pattern",
  ]) {
    if (!modalSource.includes(marker))
      errors.push(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS264 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS264 — AI Brain trust narrative guard",
    ".shield-vlm-pass264-trust-narrative-guard",
    "data-vlm-pass264-narrative-stage",
    "PASS264 — Lens trust narrative guide",
    ".vlcr-pass264-trust-narrative-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.push(`app/globals.css: missing PASS264 marker ${marker}.`);
  }
  for (const marker of [
    "PASS264 Lens trust narrative guide",
    "vlcr-pass264-trust-narrative-guide",
    "PASS264 trust narrative guard",
    "PASS264 Trust-Narrative-Guard",
    "context first",
    "Kontext zuerst",
    "evidence status",
    "Evidenzstatus",
    "dark-pattern firewall",
    "Dark-Pattern-Firewall",
  ]) {
    if (!lensSource.includes(marker))
      errors.push(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS264 Lens marker ${marker}.`,
      );
  }
  if (
    !pkgSource.includes(
      "verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs",
    )
  )
    errors.push("package.json: missing PASS264 guard script marker.");
} catch (error) {
  errors.push(
    `PASS264 AI Brain trust narrative guard dark-pattern firewall failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
// guard script marker: verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs

// PASS474 duplicate response-key / object-spread ordering guard
try {
  const spreadContracts = [
    {
      file: "app/api/market-integrity/ai-human-copy/route.ts",
      spread: "...copyEngine",
      property: "boundary:",
    },
    {
      file: "app/api/market-integrity/cross-asset/route.ts",
      spread: "...radar",
      property: "boundary:",
    },
    {
      file: "app/api/market-integrity/exchange-health/route.ts",
      spread: "...exchangeHealth",
      property: "boundary:",
    },
  ];

  for (const contract of spreadContracts) {
    const source = read(contract.file);
    const spreadIndex = source.indexOf(contract.spread);
    const propertyIndex = source.indexOf(contract.property);
    if (spreadIndex < 0 || propertyIndex < 0) {
      errors.push(
        `${contract.file}: missing PASS474 response contract marker.`,
      );
      continue;
    }
    if (propertyIndex < spreadIndex) {
      errors.push(
        `${contract.file}: ${contract.property.slice(0, -1)} must be declared after ${contract.spread} so the explicit API safety boundary wins without TS2783 duplicate-key failure.`,
      );
    }
  }
} catch (error) {
  errors.push(
    `PASS474 duplicate response-key guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (errors.length) {
  console.error("Velmère late preflight guards failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
// PASS217 marker: late preflight error check protects guard blocks appended after the original summary.

// PASS476 mobile modal/chart/icon/i18n guard
try {
  const modalLock = read("components/ui/useModalScrollLock.ts");
  const tokenModal = read("components/market-integrity/TokenRiskModal.tsx");
  const realMarkets = read(
    "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  );
  const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
  const vlmSwitch = read("components/vlm/VlmModeSwitch.tsx");
  const css = read("app/globals.css");
  for (const needle of [
    "__velmereModalScrollLock",
    'body.style.position = "fixed"',
    "window.scrollTo(current.scrollX, current.scrollY)",
  ]) {
    if (!modalLock.includes(needle))
      errors.push(`PASS476 modal lock missing ${needle}.`);
  }
  for (const needle of [
    'data-chart-gesture-surface="pan-pinch-wheel"',
    "shield-chart-gesture-controls",
    "useModalScrollLock(mounted)",
  ]) {
    if (!tokenModal.includes(needle))
      errors.push(`PASS476 TokenRiskModal missing ${needle}.`);
  }
  if (!realMarkets.includes("useModalScrollLock(Boolean(selected))"))
    errors.push("PASS476 Real Markets modal must use shared scroll lock.");
  if (!browser.includes("useModalScrollLock(pdfModalActive)"))
    errors.push("PASS476 Browser PDF must use shared scroll lock.");
  if (
    !vlmSwitch.includes("useModalScrollLock(chartOpen)") ||
    !vlmSwitch.includes("z-[100000]")
  )
    errors.push("PASS476 VLM chart modal layering/lock missing.");
  for (const needle of [
    "shield-product-nav-grid",
    "shield-chart-gesture-controls",
    "velmere-asset-logo-exchange",
  ]) {
    if (!css.includes(needle)) errors.push(`PASS476 CSS missing ${needle}.`);
  }
} catch (error) {
  errors.push(
    `PASS476 mobile modal/chart/icon/i18n guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
