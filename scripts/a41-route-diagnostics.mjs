#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checks = [];
const failures = [];
function filePath(relativePath) { return path.join(root, relativePath); }
function read(relativePath) { return fs.readFileSync(filePath(relativePath), "utf8"); }
function exists(relativePath) { return fs.existsSync(filePath(relativePath)); }
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}
function checkDispatcher(id, file, registrySymbol) {
  check(`dispatcher:${id}:exists`, exists(file), file);
  if (!exists(file)) return;
  const text = read(file);
  check(`dispatcher:${id}:node_runtime`, text.includes('runtime = "nodejs"'));
  check(`dispatcher:${id}:force_dynamic`, text.includes('dynamic = "force-dynamic"'));
  check(`dispatcher:${id}:registry`, text.includes(registrySymbol), registrySymbol);
  check(`dispatcher:${id}:lazy_dispatch`, text.includes("dispatchLazyRoute") && text.includes("optionsLazyRoute"));
  check(`dispatcher:${id}:no_fixture`, !/fixture|mock|synthetic.*live/iu.test(text));
}
function checkRegistry(id, file, entries) {
  check(`registry:${id}:exists`, exists(file), file);
  if (!exists(file)) return;
  const text = read(file);
  for (const [operation, methods, modulePath] of entries) {
    check(`registry:${id}:${operation}:key`, text.includes(`"${operation}"`), operation);
    check(`registry:${id}:${operation}:methods`, text.includes(`methods: [${methods.map((method) => `"${method}"`).join(", ")}]`), methods);
    check(`registry:${id}:${operation}:module`, text.includes(modulePath), modulePath);
  }
}

const pages = [
  ["home", "app/[locale]/page.tsx", "/pl"],
  ["browser", "app/[locale]/search/page.tsx", "/pl/search"],
  ["shield", "app/[locale]/market-integrity/page.tsx", "/pl/market-integrity"],
  ["shield_pro", "app/[locale]/shield-pro/page.tsx", "/pl/shield-pro"],
  ["shield_map", "app/[locale]/shield-map/page.tsx", "/pl/shield-map"],
];
for (const [id, file, url] of pages) check(`page:${id}`, exists(file), { file, url });

const proxy = read("proxy.ts");
const aliases = [
  ["root", "app/page.tsx", '"/": "/pl"'],
  ["browser", "app/browser/page.tsx", '"/browser": "/pl/search"'],
  ["search", "app/search/page.tsx", '"/search": "/pl/search"'],
  ["shield", "app/shield/page.tsx", '"/shield": "/pl/market-integrity"'],
  ["market_integrity", "app/market-integrity/page.tsx", '"/market-integrity": "/pl/market-integrity"'],
  ["shield_pro", "app/shield-pro/page.tsx", '"/shield-pro": "/pl/shield-pro"'],
  ["shield_map", "app/shield-map/page.tsx", '"/shield-map": "/pl/shield-map"'],
  ["real_markets", "app/real-markets/page.tsx", '"/real-markets": "/pl/real-markets"'],
];
for (const [id, file, proxyEntry] of aliases) {
  check(`alias:${id}:physical_shell_absent`, !exists(file), file);
  check(`alias:${id}:proxy_owned`, proxy.includes(proxyEntry), proxyEntry);
}
check("proxy:locale_root_renders_home", proxy.includes("renderLocaleRoot") && !proxy.includes("LOCALE_ROOT_RECOVERY_TARGETS"));
check("proxy:root_alias_registry", proxy.includes("ROOT_PUBLIC_ALIASES"));
check("proxy:query_preserved", proxy.includes("redirectPreservingSearch") && proxy.includes("target.search = request.nextUrl.search"));

checkDispatcher("market_integrity", "app/api/market-integrity/[operation]/route.ts", "MARKET_INTEGRITY_ROUTES");
checkDispatcher("search", "app/api/search/[operation]/route.ts", "SEARCH_ROUTES");
checkDispatcher("market_integrity_vlm", "app/api/market-integrity/vlm/[operation]/route.ts", "MARKET_INTEGRITY_VLM_ROUTES");
checkDispatcher("real_markets", "app/api/market-integrity/real-markets/[operation]/route.ts", "REAL_MARKETS_ROUTES");

const marketRoutes = [
  ["markets", ["GET"], "@/lib/server/market-integrity-route-modules/markets"],
  ["search", ["GET"], "@/lib/server/market-integrity-route-modules/search"],
  ["investigator", ["GET"], "@/lib/server/market-integrity-route-modules/investigator"],
  ["market-intelligence", ["POST"], "@/lib/server/market-integrity-route-modules/market-intelligence"],
  ["klines", ["GET"], "@/lib/server/market-integrity-route-modules/klines"],
  ["real-markets", ["GET"], "@/lib/server/market-integrity-route-modules/real-markets"],
  ["vlm", ["GET", "POST"], "@/lib/server/market-integrity-route-modules/vlm"],
];
const searchRoutes = [
  ["bridge", ["GET"], "@/lib/server/search-route-modules/bridge"],
  ["lens-report", ["GET", "POST"], "@/lib/server/search-route-modules/lens-report"],
  ["lens-route", ["GET"], "@/lib/server/search-route-modules/lens-route"],
  ["live-preview", ["GET"], "@/lib/server/search-route-modules/live-preview"],
  ["token-metadata", ["GET"], "@/lib/server/search-route-modules/token-metadata"],
];
const vlmRoutes = [
  ["access-policy", ["GET"], "@/lib/server/market-integrity-vlm-route-modules/access-policy"],
  ["keys", ["GET"], "@/lib/server/lazy-route-modules/market-integrity--vlm--keys"],
  ["verify", ["POST"], "@/lib/server/lazy-route-modules/market-integrity--vlm--verify"],
];
const realMarketsRoutes = [
  ["catalog", ["GET"], "@/lib/server/real-markets-route-modules/catalog"],
  ["provider-contract", ["GET"], "@/lib/server/real-markets-route-modules/provider-contract"],
  ["search", ["GET"], "@/lib/server/real-markets-route-modules/search"],
];
checkRegistry("market_integrity", "lib/server/route-registries/market-integrity.ts", marketRoutes);
checkRegistry("search", "lib/server/route-registries/search.ts", searchRoutes);
checkRegistry("market_integrity_vlm", "lib/server/route-registries/market-integrity-vlm.ts", vlmRoutes);
checkRegistry("real_markets", "lib/server/route-registries/real-markets.ts", realMarketsRoutes);

for (const operation of marketRoutes.map(([operation]) => operation)) {
  check(`api:market:${operation}:direct_shell_absent`, !exists(`app/api/market-integrity/${operation}/route.ts`));
}
for (const operation of searchRoutes.map(([operation]) => operation)) {
  check(`api:search:${operation}:direct_shell_absent`, !exists(`app/api/search/${operation}/route.ts`));
}
for (const operation of vlmRoutes.map(([operation]) => operation)) {
  check(`api:vlm:${operation}:direct_shell_absent`, !exists(`app/api/market-integrity/vlm/${operation}/route.ts`));
}
for (const operation of realMarketsRoutes.map(([operation]) => operation)) {
  check(`api:real_markets:${operation}:direct_shell_absent`, !exists(`app/api/market-integrity/real-markets/${operation}/route.ts`));
}

const endpointBindings = [
  ["shield_market_feed", "components/market-integrity/ShieldRealMarketsParityClient.tsx", "/api/market-integrity/markets"],
  ["shield_search", "components/market-integrity/ShieldRealMarketsParityClient.tsx", "/api/market-integrity/search"],
  ["shield_pro_catalog_wiring", "components/market-integrity/ShieldProCleanTerminalClient.tsx", "fetchShieldProFullCatalog"],
  ["shield_pro_feed", "lib/market-integrity/shield-pro-full-catalog-client.ts", "/api/market-integrity/markets"],
  ["shield_map_search", "components/market-integrity/ShieldMapCommandClient.tsx", "/api/market-integrity/search"],
  ["shield_map_scan", "components/market-integrity/ShieldMapCommandClient.tsx", "/api/market-integrity/investigator"],
  ["popup_market_whale", "components/market-integrity/asset-detail/market-intelligence-client-runtime.ts", "/api/market-integrity/market-intelligence"],
  ["popup_vlm", "components/market-integrity/asset-detail/paid-access.ts", "/api/market-integrity/vlm"],
  ["browser_pdf", "components/search/VelmereIntelligenceSearchClient.tsx", "/api/search/lens-report"],
];
for (const [id, file, endpoint] of endpointBindings) {
  check(`binding:${id}:file`, exists(file), file);
  if (exists(file)) check(`binding:${id}:endpoint`, read(file).includes(endpoint), endpoint);
}

const popup = read("components/market-integrity/AssetDetailModal.tsx");
check("popup:active_modal", popup.includes("data-pass4593-asset-detail-modal"));
check("popup:close_event", popup.includes("velmere:close-market-intelligence"));
const intelligenceTabs = "components/market-integrity/AssetIntelligenceTabs.tsx";
check("popup:market_whale_tabs:file", exists(intelligenceTabs), intelligenceTabs);
if (exists(intelligenceTabs)) {
  const intelligenceText = read(intelligenceTabs);
  check("popup:market_impact_export", intelligenceText.includes("export function MarketImpactTab"));
  check("popup:whale_watch_export", intelligenceText.includes("export function WhaleWatchTab"));
}

const shieldClient = read("components/market-integrity/ShieldRealMarketsParityClient.tsx");
const shieldProClient = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
const shieldMapClient = read("components/market-integrity/ShieldMapCommandClient.tsx");
check("ui:shield_retry", shieldClient.includes("setReloadNonce") && shieldClient.includes("Ponów pobieranie"));
check("ui:shield_pro_retry", shieldProClient.includes("setReloadNonce") && shieldProClient.includes("Ponów pobieranie"));
check("ui:shield_map_retry", shieldMapClient.includes("Ponów analizę") && shieldMapClient.includes('role="alert"'));

const recoveryContract = JSON.parse(read("config/pass35/a41-critical-route-recovery.json"));
check("contract:a41_direct_routes_retired", Array.isArray(recoveryContract.authorizedDirectRoutes) && recoveryContract.authorizedDirectRoutes.length === 0, recoveryContract.authorizedDirectRoutes?.length);
check("contract:registry_dispatch_required", recoveryContract.constraints?.registryDispatchRequired === true);
check("contract:handler_reexport_retired", recoveryContract.constraints?.handlerModuleReExportOnly === false);
check("contract:no_sell_enable", recoveryContract.constraints?.sellEnableForbidden === true);

const packageJson = JSON.parse(read("package.json"));
check("script:diagnose", packageJson.scripts?.["diagnose:routes:a41"] === "node scripts/a41-route-diagnostics.mjs");
check("script:test", packageJson.scripts?.["test:pass35:a41"] === "node scripts/pass35/test-a41-browser-shield-runtime-recovery.mjs");
check("runtime:node_contract", packageJson.engines?.node === "24.18.0", packageJson.engines);
check("runtime:npm_contract", packageJson.engines?.npm === "11.16.0", packageJson.engines);

const result = {
  schemaVersion: "velmere.pass35.a41.route-diagnostics.v2",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static route, registry, endpoint and wiring diagnosis after PASS36 A59 route consolidation. Exact Next compile, browser rendering and provider data still require final-byte execution on Node 24.18.0/npm 11.16.0.",
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: failures.length },
  runtime: { node: process.versions.node, expectedNode: packageJson.engines?.node, expectedNpm: packageJson.engines?.npm },
  routes: Object.fromEntries(pages.map(([id, , url]) => [id, url])),
  failures,
  checks,
};

const output = process.argv.includes("--write")
  ? path.join(root, "artifacts/pass35/a41/PASS35_A41_ROUTE_DIAGNOSTICS.json")
  : null;
if (output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
