import {  errors, fs, packageScriptEvidenceSource, path, read, root } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.evidence-providers.001");

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
      errors.pushWithId.bind(errors, "evidence.001.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS150 runtime marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS150 — VLM brain performance runtime governor",
    ".shield-vlm-runtime-performance",
    ".shield-vlm-runtime-governor",
  ]) {
    if (!globalsCss.includes(needle))
      errors.pushWithId.bind(errors, "evidence.001.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-runtime-css-marker-value")(
        `app/globals.css: missing PASS150 runtime CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.001.components-market-integrity-tokenriskmodalx-missing-lega.a003.vlm-brain-performance-runtime-guard-failed-value")(
    `VLM brain performance runtime guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.002");

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
      errors.pushWithId.bind(errors, "evidence.002.legacy-vlm-brain-polish-marker-missing-value.a001.legacy-vlm-brain-polish-marker-missing-value")(`PASS168 VLM brain polish marker missing: ${needle}.`);
    }
  }
  for (const forbidden of [
    "adaptive orbital risk sphere",
    "sparse react frames",
    "compositor motion",
    "ctx.fillText(`RISK",
  ]) {
    if (`${tokenRiskModal}\n${globalsCss}`.includes(forbidden))
      errors.pushWithId.bind(errors, "evidence.002.legacy-vlm-brain-polish-marker-missing-value.a002.legacy-debug-forbidden-ui-marker-remains-value")(`PASS168 debug/forbidden UI marker remains: ${forbidden}.`);
  }
  const searchMarkerAlternatives = {
    "TokenAvatar image={item.image}": ["TokenAvatar image={item.image}"],
    "live + table": ["live + table", 'item.sourceMode === "local" ? "table"'],
    "click to open Shield readout": ["click to open Shield readout", "open Shield readout"],
  };
  for (const [needle, alternatives] of Object.entries(searchMarkerAlternatives)) {
    if (!alternatives.some((alternative) => marketClient.includes(alternative)))
      errors.pushWithId.bind(errors, "evidence.002.legacy-vlm-brain-polish-marker-missing-value.a003.legacy-search-suggestion-marker-missing-value")(`PASS168 search suggestion marker missing: ${needle}.`);
  }
  if (
    !fs.existsSync(
      path.join(
        root,
        "scripts/verify-vlm-brain-static-advanced-polish-safety.mjs",
      ),
    )
  ) {
    errors.pushWithId.bind(errors, "evidence.002.legacy-vlm-brain-polish-marker-missing-value.a004.legacy-guard-script-is-missing")("PASS168 guard script is missing.");
  }
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.002.legacy-vlm-brain-polish-marker-missing-value.a005.legacy-vlm-brain-polish-guard-failed-value")(
    `PASS168 VLM brain polish guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.003");

// PASS169 home locale runtime guard
try {
  const homeSource = read("components/home/HomePageClient.tsx");
  if (!homeSource.includes("const locale = useLocale();")) {
    errors.pushWithId.bind(errors, "evidence.003.components-home-homepageclientx-missing-scoped-const-loc.a001.components-home-homepageclientx-missing-scoped-const-loc")(
      "components/home/HomePageClient.tsx: missing scoped const locale = useLocale(); for Home readiness panels.",
    );
  }
  if (!homeSource.includes("const copy = homeCopy(locale);")) {
    errors.pushWithId.bind(errors, "evidence.003.components-home-homepageclientx-missing-scoped-const-loc.a002.components-home-homepageclientx-must-use-homecopy-locale")(
      "components/home/HomePageClient.tsx: must use homeCopy(locale), not inline useLocale(), so locale is available in JSX.",
    );
  }
  if (
    !homeSource.includes('data-pass318-public-storefront-focus="home"') &&
    !homeSource.includes(
      '<FullSurfaceReadinessIndex locale={locale} surface="home" />',
    )
  ) {
    errors.pushWithId.bind(errors, "evidence.003.components-home-homepageclientx-missing-scoped-const-loc.a003.components-home-homepageclientx-missing-scoped-locale-pr")(
      "components/home/HomePageClient.tsx: missing scoped locale prop for FullSurfaceReadinessIndex.",
    );
  }
  if (homeSource.includes("homeCopy(useLocale())")) {
    errors.pushWithId.bind(errors, "evidence.003.components-home-homepageclientx-missing-scoped-const-loc.a004.components-home-homepageclientx-homecopy-uselocale-can-c")(
      "components/home/HomePageClient.tsx: homeCopy(useLocale()) can cause locale to be unavailable for later JSX.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.003.components-home-homepageclientx-missing-scoped-const-loc.a005.legacy-home-locale-runtime-guard-failed-value")(
    `PASS169 home locale runtime guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.004");

// PASS198 expanded master build map guard
try {
  const masterMapSource = read("lib/launch/master-build-areas.ts");
  const masterMapDocSource = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const areaCount = (masterMapSource.match(/id: "/g) || []).length;
  if (areaCount < 90)
    errors.pushWithId.bind(errors, "evidence.004.lib-launch-master-build-areas-expected-at-least-90-granu.a001.lib-launch-master-build-areas-expected-at-least-90-granu")(
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
      errors.pushWithId.bind(errors, "evidence.004.lib-launch-master-build-areas-expected-at-least-90-granu.a002.lib-launch-master-build-areas-missing-legacy-marker-valu")(
        `lib/launch/master-build-areas.ts: missing PASS198 marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère Master Build Map",
    "PASS198 zasada raportowania",
    "A–M",
  ]) {
    if (!masterMapDocSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.004.lib-launch-master-build-areas-expected-at-least-90-granu.a003.docs-progress-velmere-master-build-map-md-missing-legacy")(
        `docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS198 documentation marker ${needle}.`,
      );
  }
  if (!packageScriptEvidenceSource.includes("verify:pass198-master-build-map"))
    errors.pushWithId.bind(errors, "evidence.004.lib-launch-master-build-areas-expected-at-least-90-granu.a004.packageon-missing-legacy-verify-script")("package.json: missing PASS198 verify script.");
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.004.lib-launch-master-build-areas-expected-at-least-90-granu.a005.legacy-expanded-master-build-map-guard-failed-value")(
    `PASS198 expanded master build map guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.005");

// guard script marker: verify-pass198-master-build-map-safety.mjs
// docs marker: VELMERE_MASTER_BUILD_MAP.md

// PASS199 progress delta ledger guard
try {
  const deltaSource = read("lib/launch/master-build-progress-delta.ts");
  const deltaDocSource = read("docs/progress/PASS199_PROGRESS_DELTA_LEDGER.md");
  const mapDocSource = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const deltaCount = (deltaSource.match(/previous: /g) || []).length;
  if (deltaCount < 10)
    errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a001.lib-launch-master-build-progress-delta-expected-at-least")(
      `lib/launch/master-build-progress-delta.ts: expected at least 10 PASS199 delta rows, found ${deltaCount}.`,
    );
  for (const needle of [
    "velmerePass199ProgressDeltas",
    "Previous → Current → Change",
    "getVelmerePass199ProgressDeltaRows",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a002.lib-launch-master-build-progress-delta-missing-legacy-ma")(
        `lib/launch/master-build-progress-delta.ts: missing PASS199 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS199 — Progress Delta Ledger",
    "Previous → Current → Change progress table is mandatory",
    "Uczciwe ograniczenie",
  ]) {
    if (!deltaDocSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a003.docs-progress-legacy-progress-delta-ledger-md-missing-le")(
        `docs/progress/PASS199_PROGRESS_DELTA_LEDGER.md: missing PASS199 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS199 — delta procentowa",
    "PASS199 delta — obszary ruszone w tym passie",
  ]) {
    if (!mapDocSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a004.docs-progress-velmere-master-build-map-md-missing-legacy")(
        `docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS199 delta marker ${needle}.`,
      );
  }
  if (!packageScriptEvidenceSource.includes("verify:pass199-progress-delta-ledger"))
    errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a005.packageon-missing-legacy-verify-script")("package.json: missing PASS199 verify script.");
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.005.lib-launch-master-build-progress-delta-expected-at-least.a006.legacy-progress-delta-ledger-guard-failed-value")(
    `PASS199 progress delta ledger guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.006");

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
      errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a001.lib-launch-master-build-areas-missing-legacy-ai-brain-ma")(
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
      errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a002.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass200.ts: missing PASS200 delta marker ${needle}.`,
      );
  }
  if ((mapSource.match(/group: "D"/g) || []).length < 24)
    errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a003.lib-launch-master-build-areas-expected-d01-d24-ai-brain")(
      "lib/launch/master-build-areas.ts: expected D01-D24 AI Brain rows after PASS200.",
    );
  if (
    !mapDocSource.includes("mózg AI jest w mapie") ||
    !mapDocSource.includes("PASS200 delta — obszary ruszone")
  )
    errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a004.docs-progress-velmere-master-build-map-md-missing-legacy")(
      "docs/progress/VELMERE_MASTER_BUILD_MAP.md: missing PASS200 AI Brain map section.",
    );
  if (!reportSource.includes("PASS200 — AI Brain Master Matrix"))
    errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a005.docs-progress-legacy-ai-brain-master-matrix-md-missing-l")(
      "docs/progress/PASS200_AI_BRAIN_MASTER_MATRIX.md: missing PASS200 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.006.lib-launch-master-build-areas-missing-legacy-ai-brain-ma.a006.legacy-ai-brain-master-matrix-guard-failed-value")(
    `PASS200 AI Brain master matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.007");

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
      errors.pushWithId.bind(errors, "evidence.007.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
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
      errors.pushWithId.bind(errors, "evidence.007.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-portal-css-marker-value")(
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
      errors.pushWithId.bind(errors, "evidence.007.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass201.ts: missing PASS201 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS201 — AI Brain Interaction Portal"))
    errors.pushWithId.bind(errors, "evidence.007.components-market-integrity-tokenriskmodalx-missing-lega.a004.docs-progress-legacy-ai-brain-interaction-portal-md-miss")(
      "docs/progress/PASS201_AI_BRAIN_INTERACTION_PORTAL.md: missing PASS201 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.007.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-interaction-portal-guard-failed-value")(
    `PASS201 AI Brain interaction portal guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.008");

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
      errors.pushWithId.bind(errors, "evidence.008.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS202 localization/source trust marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS202 — AI Brain localized detail navigator",
    ".shield-vlm-detail-action-row",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.008.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-drawer-navigation-css-mar")(
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
      errors.pushWithId.bind(errors, "evidence.008.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass202.ts: missing PASS202 delta marker ${needle}.`,
      );
  }
  if (
    !reportSource.includes(
      "PASS202 — AI Brain Localization + Source Trust Drawer",
    )
  )
    errors.pushWithId.bind(errors, "evidence.008.components-market-integrity-tokenriskmodalx-missing-lega.a004.docs-progress-legacy-ai-brain-localization-source-trust")(
      "docs/progress/PASS202_AI_BRAIN_LOCALIZATION_SOURCE_TRUST.md: missing PASS202 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.008.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-localization-source-trust-guard-failed-v")(
    `PASS202 AI Brain localization/source trust guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.009");

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
      errors.pushWithId.bind(errors, "evidence.009.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
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
      errors.pushWithId.bind(errors, "evidence.009.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-evidence-chain-css-marker")(
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
      errors.pushWithId.bind(errors, "evidence.009.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass203.ts: missing PASS203 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS203 — AI Brain Evidence Chain Rail"))
    errors.pushWithId.bind(errors, "evidence.009.components-market-integrity-tokenriskmodalx-missing-lega.a004.docs-progress-legacy-ai-brain-evidence-chain-md-missing")(
      "docs/progress/PASS203_AI_BRAIN_EVIDENCE_CHAIN.md: missing PASS203 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.009.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-evidence-chain-guard-failed-value")(
    `PASS203 AI Brain evidence-chain guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
