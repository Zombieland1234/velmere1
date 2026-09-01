#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [];
const assert = (name, condition, detail) => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const modal = read("components/market-integrity/AssetDetailModal.tsx");
const tabs = read("components/market-integrity/AssetIntelligenceTabs.tsx");
const runtimeClient = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
const runtimeSource = `${tabs}
${runtimeClient}`;
const tabsCss = read("components/market-integrity/AssetIntelligenceTabs.module.css");
const globalsCss = read("app/globals.css");
const intelligenceCss = read("components/intelligence/IntelligenceLuxury.module.css");
const intelligencePage = read("components/intelligence/IntelligencePage.tsx");
const vault = read("components/intelligence/IntelligenceResearchVault.tsx");
const flagship = read("components/intelligence/IntelligenceFlagshipSections.tsx");
const angelEvidence = read("components/intelligence/AngelEvidenceChapter.tsx");
const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
const shield = read("components/market-integrity/ShieldRealMarketsParityClient.tsx");
const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const diagnostics = read("scripts/a36-install-diagnostics.mjs");
const windowsSetup = read("VELMERE_SETUP_WINDOWS_A36.ps1");

assert("modal_three_active_tabs", ["overview", "market-impact", "whale-watch"].every((token) => modal.includes(`"${token}"`)), "overview, Market Impact and Whale Watch tabs must be active");
assert("modal_tabs_lazy_loaded", modal.includes("dynamic(") && modal.includes("MarketImpactTab") && modal.includes("WhaleWatchTab"), "heavy intelligence tabs must be split from initial modal bundle");
assert("modal_tab_keyboard_navigation", modal.includes("handleDetailTabKeyDown") && modal.includes('event.key === "Home"') && modal.includes('event.key === "End"'), "tabs must support arrow/Home/End navigation");
assert("overview_chart_fetch_paused", modal.includes('if (activeDetailTab !== "overview")') && modal.includes("setLoadingTimeframe(null)"), "chart request must stop outside Overview");
assert("overview_chart_poll_paused", modal.includes('if (activeDetailTab !== "overview") return;') && modal.includes("visibilitychange"), "chart polling must stop outside Overview and while page is hidden");
assert("cross_surface_modal_labels", shield.includes('productLabel="Velmère Shield"') && realMarkets.includes('productLabel="Velmère Real Markets"') && shieldPro.includes('productLabel="Velmère Shield Pro"'), "modal must identify each active product surface");
assert("shield_pro_monochrome_retained", shieldPro.includes('appearance="monochrome"'), "Shield Pro intelligence tabs must inherit monochrome mode");
assert("modal_active_tab_state_exposed", modal.includes("data-vlm-asset-active-tab={activeDetailTab}"), "active tab must be exposed for layout and performance styling");
assert("three_column_tab_grid", globalsCss.includes("PASS35 A36") && globalsCss.includes("repeat(3, minmax(0, 1fr))"), "active three-tab modal must not reserve an empty fourth column");

assert("current_market_intelligence_router", runtimeSource.includes('fetch("/api/market-integrity/market-intelligence"'), "visual tabs must use the current market-intelligence router");
assert("server_owned_evidence_mode", runtimeSource.includes('evidenceMode: "server_owned"'), "client must request server-owned evidence rather than local substitute data");
assert("basic_impact_and_pro_whale_depth", tabs.includes('useMarketIntelligence(asset, locale, "basic")') && tabs.includes('useMarketIntelligence(asset, locale, "pro")'), "Market Impact and Whale Watch must respect tier depth");
assert("bounded_unavailable_states", tabs.includes("verified_whale_evidence_unavailable") && tabs.includes("verified_market_impact_unavailable"), "missing runtime evidence must stay explicit");
assert("no_generated_whale_market_data", !tabs.includes("stableHash") && !tabs.includes("Math.random") && !tabs.includes("generateWhale") && !tabs.includes("generatedTransfers"), "active tabs must not synthesize customer-facing market or whale claims");
assert("runtime_request_cache", runtimeSource.includes("runtimeCache") && runtimeSource.includes("runtimeInflight") && runtimeSource.includes("CACHE_TTL_MS"), "duplicate tab requests must be coalesced and briefly cached");
assert("runtime_cache_bounded", runtimeSource.includes("MAX_RUNTIME_CACHE_ENTRIES") && runtimeSource.includes("pruneRuntimeCache"), "session cache must stay bounded during long asset browsing");
assert("runtime_key_asset_exact", runtimeSource.includes("asset.providerSymbol || asset.symbol") && runtimeSource.includes("asset.assetClass || \"unknown\""), "cache key must distinguish exact provider symbol and asset class");
assert("retry_invalidates_cache", tabs.includes("invalidateRuntimeCache(asset, locale, depth)"), "manual retry must not replay an unavailable cached result");
assert("runtime_abort_cleanup", runtimeSource.includes("AbortController") && runtimeSource.includes("controller.abort()"), "unmounted tab requests must be aborted");
assert("whale_popup_focus_escape", tabs.includes("CenterDialog") && tabs.includes('event.key === "Escape"') && tabs.includes("restoreFocus"), "Whale Watch popup must own Escape, focus trap and focus return");
assert("whale_alert_rail_inert", tabs.includes("inert={!railOpen}") && tabs.includes("aria-hidden={!railOpen}"), "closed alert rail must not remain keyboard-active");
assert("responsive_runtime_css", tabsCss.includes(".runtimeStatus") && tabsCss.includes(".alertRail") && tabsCss.includes("prefers-reduced-motion"), "runtime tabs must retain responsive and reduced-motion styling");

assert("research_vault_mounted", intelligencePage.includes("<IntelligenceResearchVault") && intelligencePage.includes("getIntelligenceFlagshipCopy") && intelligencePage.includes("getAngelEvidenceCopy"), "the on-demand Intelligence vault must be mounted on the active page");
assert("vault_on_demand_only", vault.includes("activeLab") && vault.includes("dynamic(") && vault.includes("ssr: false"), "research labs must not run behind the page before interaction");
assert("market_whale_vault_connected", vault.includes("MarketImpactWhaleSection") && vault.includes("research-vault-impact-whale"), "full visual Market Impact / Whale Watch laboratory must be reachable");
assert("vault_unique_panel_ids", vault.includes("research-vault-panel-${module.id}") && vault.includes("research-vault-card-${module.id}"), "vault cards and panels must avoid duplicate IDs");
assert("flagship_tab_ids_scoped", flagship.includes("instanceId") && flagship.includes("${instanceId}-impact-panel") && flagship.includes("${instanceId}-whale-panel"), "nested flagship tabs must have scoped panel IDs");
assert("nested_chapter_ids_scoped", flagship.includes('sectionId = "liquidity-lab"') && angelEvidence.includes('sectionId = "angel-evidence"'), "nested liquidity and Angel chapters must accept unique section IDs");
assert("research_vault_visual_contract", [".researchVault", ".vaultHeader", ".vaultModules", ".labPanel", ".labStack", ".labLoading"].every((selector) => intelligenceCss.includes(selector)), "mounted research vault must have an explicit responsive visual contract");
assert("research_vault_responsive_motion", intelligenceCss.includes("@media (max-width: 760px)") && intelligenceCss.includes("@media (prefers-reduced-motion: reduce)") && intelligenceCss.includes("intelligenceVaultSpin"), "vault must define mobile and reduced-motion behavior");
assert("runtime_tab_panels_linked", modal.includes("aria-controls={id === \"overview\" ? undefined") && tabs.includes("vlm-asset-detail-panel-market-impact") && tabs.includes("vlm-asset-detail-panel-whale-watch"), "runtime tabs must be linked to their tab panels");
assert("install_endpoints_redacted", diagnostics.includes("configured_custom_registry_redacted") && !windowsSetup.includes("config get registry 2>$null)"), "install diagnostics must not print private registry or proxy hosts");

console.log(JSON.stringify({
  status: "PASS_A36_ACTIVE_VISUAL_RUNTIME_WIRING",
  checks: checks.length,
  passed: checks.filter((item) => item.passed).length,
  sourceLevelActivationChecklistPercent: 100,
  exactRuntimeBuildBrowserClaimed: false,
  sellEnabled: false,
}, null, 2));
