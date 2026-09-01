import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.product-commerce.011");

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
      errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a001.components-home-homepageclientx-missing-legacy-home-loca")(
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
      errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS196 Orbit marker ${needle}.`,
      );
  }
  if (
    modalSource.includes("key={preset}") &&
    modalSource.includes("ui.evidenceBoard")
  )
    errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a003.components-market-integrity-tokenriskmodalx-evidence-boa")(
      "components/market-integrity/TokenRiskModal.tsx: Evidence Board preset toggle still appears in public render.",
    );
  for (const needle of [
    "function knownTokenGlyph",
    "knownTokenGlyph(symbol, id, name)",
    "PASS196 marker: Shield search suggestions",
  ]) {
    if (!clientSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a004.components-market-integrity-marketintegrityclientx-missi")(
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
      errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a005.app-globals-css-missing-legacy-containment-marker-value")(
        `app/globals.css: missing PASS196 containment marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.011.components-home-homepageclientx-missing-legacy-home-loca.a006.legacy-orbit-360-final-runtime-hotfix-guard-failed-value")(
    `PASS196 Orbit 360 final runtime hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.012");

// guard script marker: verify-pass196-orbit360-final-runtime-hotfix-safety.mjs
// PASS196

// PASS195 home locale runtime hotfix guard
try {
  const homePageClientSource = read("components/home/HomePageClient.tsx");
  if (
    !homePageClientSource.includes('import { useLocale } from "next-intl";') &&
    !homePageClientSource.includes("import { useLocale } from 'next-intl';")
  ) {
    errors.pushWithId.bind(errors, "commerce.012.components-home-homepageclientx-missing-uselocale-import.a001.components-home-homepageclientx-missing-uselocale-import")(
      "components/home/HomePageClient.tsx: missing useLocale import.",
    );
  }
  if (
    !/export\s+default\s+function\s+HomePageClient\s*\(\)\s*\{\s*const\s+locale\s*=\s*useLocale\(\)\s*;/s.test(
      homePageClientSource,
    )
  ) {
    errors.pushWithId.bind(errors, "commerce.012.components-home-homepageclientx-missing-uselocale-import.a002.components-home-homepageclientx-missing-const-locale-use")(
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
    errors.pushWithId.bind(errors, "commerce.012.components-home-homepageclientx-missing-uselocale-import.a003.components-home-homepageclientx-fullsurfacereadinessinde")(
      "components/home/HomePageClient.tsx: FullSurfaceReadinessIndex must receive locale.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.012.components-home-homepageclientx-missing-uselocale-import.a004.legacy-home-locale-runtime-hotfix-guard-failed-value")(
    `PASS195 home locale runtime hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
