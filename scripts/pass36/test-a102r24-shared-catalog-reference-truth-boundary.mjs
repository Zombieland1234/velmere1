#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const REV = 'VELMERE_PASS36_A102R24_ACTION_REQUIRED_SHARED_CATALOG_REFERENCE_TRUTH_REMOTE_SEARCH_AND_REFRESH_FLICKER_RECOVERY_NO_REAL_CREDIT';
const PARENT = 'VELMERE_PASS36_A102R23_ACTION_REQUIRED_KLINE_MODE_LOCAL_REFERENCE_DETAIL_ICON_REQUEST_AND_DEV_PREFETCH_STORM_RECOVERY_NO_REAL_CREDIT';
let checks = 0;
const rows = [];
const ok = (value, id, details) => { checks += 1; assert.ok(value, id); rows.push({ id, passed: true, ...(details === undefined ? {} : { details }) }); };
const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(text(p));

const active = text('VELMERE_ACTIVE_PASS.txt').trim();
const pkg = json('package.json');
const auth = json('config/pass36/current-release-authority.json');
const a58 = json('config/pass36/a58-release-integrity-policy.json');
ok(active === REV, 'identity.active');
ok(pkg.velmerePass === REV, 'identity.package');
ok(pkg.velmere?.currentRevisionId === REV, 'identity.package-nested');
ok(pkg.velmere?.currentRevisionParentId === PARENT, 'identity.parent');
ok(auth.authorityRevisionId === REV, 'identity.authority');
ok(auth.parentRevisionId === PARENT, 'identity.authority-parent');
ok(auth.claims?.decision === 'NO_GO', 'truth.no-go');
ok(auth.claims?.liveProven === false, 'truth.live-false');
ok(auth.claims?.saleEnabled === false, 'truth.sale-false');
ok(auth.claims?.productionApproved === false, 'truth.production-false');
ok(auth.claims?.worldClassProven === false, 'truth.worldclass-false');

const moduleUrl = pathToFileURL(path.join(ROOT, 'lib/market-integrity/shield-pro-full-catalog-client.ts')).href + `?r24=${Date.now()}`;
const catalog = await import(moduleUrl);
ok(catalog.SHIELD_MARKET_CATALOG_CACHE_TTL_MS === 15_000, 'catalog.cache-ttl');
ok(typeof catalog.clearShieldMarketCatalogClientCache === 'function', 'catalog.clear-export');
ok(typeof catalog.fetchShieldProFullCatalog === 'function', 'catalog.fetch-export');
const originalFetch = globalThis.fetch;
let fetchCalls = 0;
const payload = { mode: 'live', source: 'test-source', rows: [{ id: 'btc', value: 1 }, { id: 'eth', value: 2 }] };
globalThis.fetch = async () => {
  fetchCalls += 1;
  await new Promise((resolve) => setTimeout(resolve, 20));
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
};
catalog.clearShieldMarketCatalogClientCache();
const [first, second] = await Promise.all([catalog.fetchShieldProFullCatalog(), catalog.fetchShieldProFullCatalog()]);
ok(fetchCalls === 1, 'catalog.concurrent-dedup', fetchCalls);
ok(first.rows.length === 2 && second.rows.length === 2, 'catalog.concurrent-results');
first.rows[0].id = 'mutated';
ok(second.rows[0].id === 'btc', 'catalog.result-clone');
const third = await catalog.fetchShieldProFullCatalog();
ok(fetchCalls === 1, 'catalog.resolved-cache-hit', fetchCalls);
ok(third.complete === true && third.mode === 'live', 'catalog.complete-live');
catalog.clearShieldMarketCatalogClientCache();
await catalog.fetchShieldProFullCatalog();
ok(fetchCalls === 2, 'catalog.clear-forces-refresh', fetchCalls);

catalog.clearShieldMarketCatalogClientCache();
const aborter = new AbortController();
const aborted = catalog.fetchShieldProFullCatalog({ signal: aborter.signal });
const survivor = catalog.fetchShieldProFullCatalog();
aborter.abort();
await assert.rejects(aborted, (error) => error instanceof DOMException && error.name === 'AbortError');
const survivorResult = await survivor;
ok(fetchCalls === 3, 'catalog.abort-does-not-duplicate-or-cancel-shared-fetch', fetchCalls);
ok(survivorResult.rows.length === 2, 'catalog.surviving-waiter-resolves');
globalThis.fetch = originalFetch;

const shield = text('components/market-integrity/ShieldRealMarketsParityClient.tsx');
ok(shield.includes('fetchShieldProFullCatalog<MarketIntegrityRow>'), 'shield.shared-full-catalog');
ok(!shield.includes('fetch("/api/market-integrity/markets?perPage=250"'), 'shield.single-page-fetch-removed');
ok(shield.includes('"reference" | "error"'), 'shield.reference-mode');
ok(shield.includes('feedMode !== "live"'), 'shield.remote-search-live-only');
ok(shield.includes('setRemoteSuggestions([])'), 'shield.remote-search-clears');
ok(shield.includes('referenceSubtitle'), 'shield.reference-subtitle');
ok(shield.includes('referenceMetric'), 'shield.reference-metric-copy');
ok(shield.includes('rowsAvailableRef.current'), 'shield.last-view-retained');
ok(shield.includes('setRefreshing(hadRows)'), 'shield.refresh-without-empty-flicker');
ok(shield.includes('referenceMode ? "—" : formatPercent(stats.avg24h'), 'shield.reference-change-withheld');
ok(shield.includes('referenceMode ? "—" : formatCompact(stats.totalCap'), 'shield.reference-cap-withheld');
ok(shield.includes('referenceMode ? "—" : formatCompact(stats.totalVolume'), 'shield.reference-volume-withheld');
ok(shield.includes('progress={referenceMode ? null : stats.active}'), 'shield.reference-active-withheld');
ok(shield.includes('meta={referenceMode ? t.referenceMetric'), 'shield.reference-meta-explicit');

const pro = text('components/market-integrity/ShieldProCleanTerminalClient.tsx');
ok(pro.includes('"reference" | "error"'), 'shield-pro.reference-mode');
ok(pro.includes('referenceSubtitle'), 'shield-pro.reference-subtitle');
ok(pro.includes('referenceProofs'), 'shield-pro.reference-proofs');
ok(pro.includes('Brak sztucznych danych w trybie LIVE'), 'shield-pro.pl-live-copy-scoped');
ok(pro.includes('No synthetic rows in LIVE mode'), 'shield-pro.en-live-copy-scoped');
ok(pro.includes('Keine synthetischen Zeilen im LIVE-Modus'), 'shield-pro.de-live-copy-scoped');
ok(!pro.includes('"Zero synthetic data"'), 'shield-pro.unscoped-zero-synthetic-removed');
ok(pro.includes('rowsAvailableRef.current'), 'shield-pro.last-view-retained');
ok(pro.includes('setRefreshing(hadRows)'), 'shield-pro.refresh-without-empty-flicker');
ok(pro.includes('referenceMode ? "—" : dashboardStats.totalMarketCap'), 'shield-pro.reference-cap-withheld');
ok(pro.includes('percent: referenceMode ? undefined : dashboardStats.coverage'), 'shield-pro.reference-gauge-withheld');
ok(pro.includes('clearShieldMarketCatalogClientCache()'), 'shield-pro-retry-clears-cache');

const a42 = json('config/pass35/a42-dev-runtime-cache-recovery.json');
const crypto = await import('node:crypto');
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
ok(Object.entries(a42.criticalFiles ?? {}).every(([entry, digest]) => sha(entry) === digest), 'a42.current-hashes-exact');
ok(Object.keys(a42.criticalFiles ?? {}).length === 71, 'a42.denominator-71');

ok(a58.currentCheckpointRevisionId === REV, 'a58.current');
ok(a58.currentCheckpointParentRevisionId === PARENT, 'a58.parent');
ok(a58.currentDescendantManifestPath === 'config/pass36/a102r24-current-root-descendant-manifest.json', 'a58.descendant');
ok(a58.archiveManifestPath === '_velmere/PASS36_A102R24_SOURCE_ONLY_MANIFEST.json', 'a58.archive');

const output = {
  schemaVersion: 'velmere.pass36.a102r24.shared-catalog-reference-truth-test-receipt.v1',
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: '2026-07-31T00:52:00.000Z',
  status: 'PASS_A102R24_SHARED_CATALOG_REFERENCE_TRUTH_REMOTE_SEARCH_AND_REFRESH_FLICKER_BOUNDARY_NO_REAL_CREDIT',
  checksPassed: checks,
  checksFailed: 0,
  sharedConcurrentNetworkCalls: 1,
  sharedResolvedCacheNetworkCalls: 0,
  sharedCacheTtlMs: 15_000,
  shieldSinglePageCatalogFetchRemaining: 0,
  remoteSearchAllowedInReferenceMode: false,
  referenceAggregateMetricsPublished: false,
  referenceRiskScorePublished: false,
  productionReferenceRows: 0,
  realProviderRightsApproved: 0,
  realBrowserRows: 0,
  exactBuildBrowserCredit: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  rows,
};
fs.writeFileSync(path.join(ROOT, 'config/pass36/a102r24-test-receipt.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
