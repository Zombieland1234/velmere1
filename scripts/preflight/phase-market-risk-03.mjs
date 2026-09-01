import {  errors, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.market-risk.011");
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
      errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a001.lib-search-velmere-lens-route-map-missing-legacy-marker")(
        `lib/search/velmere-lens-route-map.ts: missing PASS179 marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereLensCommandRouter",
    "Lens does not replace Shield",
    "Lens nie zastępuje Shielda",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a002.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS179 router marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereLensCommandRouter",
    "Velmère Lens",
    "Legacy guard marker: Velmère Intelligence Search",
  ]) {
    if (!searchClientSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a003.components-search-velmereintelligencesearchclientx-missi")(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS179 Lens marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmere_lens_route_preview",
    "does not replace full Shield analysis",
    "no-store",
  ]) {
    if (!lensRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a004.app-api-search-lens-route-route-missing-legacy-route-mar")(
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
      errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a005.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS179_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.011.lib-search-velmere-lens-route-map-missing-legacy-marker.a006.legacy-lens-router-full-matrix-guard-failed-value")(
    `PASS179 Lens router/full matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.012");
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
      errors.pushWithId.bind(errors, "market-risk.012.lib-search-token-metadata-cache-missing-legacy-marker-va.a001.lib-search-token-metadata-cache-missing-legacy-marker-va")(
        `lib/search/token-metadata-cache.ts: missing PASS178 marker ${needle}.`,
      );
  }
  for (const needle of [
    "token_metadata_cache_preview",
    "performs no external provider fetch",
    "no-store",
  ]) {
    if (!metadataRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.012.lib-search-token-metadata-cache-missing-legacy-marker-va.a002.app-api-search-token-metadata-route-missing-legacy-route")(
        `app/api/search/token-metadata/route.ts: missing PASS178 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "TokenMetadataProviderPanel",
    "getTokenMetadataProviderSummary",
    "tokenMetadataProviders",
  ]) {
    if (!metadataPanelSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.012.lib-search-token-metadata-cache-missing-legacy-marker-va.a003.components-search-tokenmetadataproviderpanelx-missing-le")(
        `components/search/TokenMetadataProviderPanel.tsx: missing PASS178 panel marker ${needle}.`,
      );
  }
  if (!searchPageSource.includes("TokenMetadataProviderPanel"))
    errors.pushWithId.bind(errors, "market-risk.012.lib-search-token-metadata-cache-missing-legacy-marker-va.a004.app-locale-search-pagex-missing-legacy-tokenmetadataprov")(
      "app/[locale]/search/page.tsx: missing PASS178 TokenMetadataProviderPanel.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.012.lib-search-token-metadata-cache-missing-legacy-marker-va.a005.legacy-token-metadata-cache-guard-failed-value")(
    `PASS178 token metadata cache guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.013");
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
      errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a001.lib-search-live-search-adapter-skeleton-missing-legacy-m")(
        `lib/search/live-search-adapter-skeleton.ts: missing PASS177 marker ${needle}.`,
      );
  }
  for (const needle of [
    "live_search_adapter_preview_only",
    "does not fetch public web or OSINT sources",
    "no-store",
  ]) {
    if (!liveRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a002.app-api-search-live-preview-route-missing-legacy-safety")(
        `app/api/search/live-preview/route.ts: missing PASS177 safety marker ${needle}.`,
      );
  }
  for (const needle of ["avatarImage?: string", "assets.coingecko.com"]) {
    if (!searchContractSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a003.lib-search-intelligence-search-contract-missing-legacy-l")(
        `lib/search/intelligence-search-contract.ts: missing PASS177 logo marker ${needle}.`,
      );
  }
  for (const needle of ["result.avatarImage", "vis-live-adapter-note"]) {
    if (!searchClientSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a004.components-search-velmereintelligencesearchclientx-missi")(
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
      errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a005.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS177 query bridge marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.013.lib-search-live-search-adapter-skeleton-missing-legacy-m.a006.legacy-live-search-shield-query-guard-failed-value")(
    `PASS177 live search / Shield query guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.014");
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
      errors.pushWithId.bind(errors, "market-risk.014.lib-search-intelligence-search-contract-missing-legacy-m.a001.lib-search-intelligence-search-contract-missing-legacy-m")(
        `lib/search/intelligence-search-contract.ts: missing PASS176 marker ${needle}.`,
      );
  }
  for (const needle of [
    "VelmereSearchDiscoveryRail",
    "vis-bridge-box",
    "result.bridge?.href",
  ]) {
    if (!searchClientSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.014.lib-search-intelligence-search-contract-missing-legacy-m.a002.components-search-velmereintelligencesearchclientx-missi")(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS176 marker ${needle}.`,
      );
  }
  for (const needle of [
    "search_to_shield_bridge_preview",
    "storageWritePerformed: false",
    "does not create a final risk verdict",
  ]) {
    if (!bridgeRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.014.lib-search-intelligence-search-contract-missing-legacy-m.a003.app-api-search-bridge-route-missing-legacy-safety-marker")(
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
      errors.pushWithId.bind(errors, "market-risk.014.lib-search-intelligence-search-contract-missing-legacy-m.a004.components-search-velmeresearchdiscoveryrailx-missing-le")(
        `components/search/VelmereSearchDiscoveryRail.tsx: missing PASS176 discovery marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.014.lib-search-intelligence-search-contract-missing-legacy-m.a005.legacy-search-bridge-discovery-guard-failed-value")(
    `PASS176 search bridge/discovery guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
