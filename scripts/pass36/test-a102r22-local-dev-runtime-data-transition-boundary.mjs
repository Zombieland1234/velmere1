#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const REV = 'VELMERE_PASS36_A102R22_ACTION_REQUIRED_LOCAL_DEV_RUNTIME_DATA_REFERENCE_ICON_AND_CONTINUOUS_ROUTE_TRANSITION_RECOVERY_NO_REAL_CREDIT';
const PARENT = 'VELMERE_PASS36_A102R21_ACTION_REQUIRED_CUSTOMER_ACCESSIBILITY_AND_OPERATOR_CHECKPOINT_JARGON_MINIMALISM_BOUNDARY_NO_REAL_CREDIT';
let checks = 0;
const rows = [];
function ok(condition, id, details = undefined) {
  checks += 1;
  assert.ok(condition, id);
  rows.push({ id, passed: true, ...(details === undefined ? {} : { details }) });
}
function text(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function json(rel) { return JSON.parse(text(rel)); }
function sha(rel) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex'); }

const active = text('VELMERE_ACTIVE_PASS.txt').trim();
const pkg = json('package.json');
const authority = json('config/pass36/current-release-authority.json');
const a42 = json('config/pass35/a42-dev-runtime-cache-recovery.json');
const a58 = json('config/pass36/a58-release-integrity-policy.json');

ok(active === REV, 'identity.active-pass');
ok(pkg.velmerePass === REV, 'identity.package-pass');
ok(pkg.velmereCurrentReleaseAuthorityPass === REV, 'identity.package-authority');
ok(pkg.velmere?.currentRevisionId === REV, 'identity.package-nested-current');
ok(pkg.velmere?.currentRevisionParentId === PARENT, 'identity.package-parent');
ok(authority.authorityRevisionId === REV, 'identity.authority-revision');
ok(authority.parentRevisionId === PARENT, 'identity.authority-parent');
ok(authority.currentSource?.revisionId === REV, 'identity.current-source');
ok(authority.claims?.decision === 'NO_GO', 'truth.no-go');
ok(authority.claims?.liveProven === false, 'truth.live-false');
ok(authority.claims?.saleEnabled === false, 'truth.sale-false');
ok(authority.claims?.productionApproved === false, 'truth.production-false');
ok(authority.claims?.worldClassProven === false, 'truth.world-class-false');

const staleA42Paths = [
  'app/api/market-integrity/investigator/route.ts',
  'app/api/market-integrity/klines/route.ts',
  'app/api/market-integrity/market-intelligence/route.ts',
  'app/api/market-integrity/markets/route.ts',
  'app/api/market-integrity/search/route.ts',
  'app/api/market-integrity/vlm/route.ts',
  'app/api/search/lens-report/route.ts',
  'app/browser/page.tsx',
  'app/market-integrity/page.tsx',
  'app/page.tsx',
  'app/shield-map/page.tsx',
  'app/shield-pro/page.tsx',
];
const required = new Set(a42.requiredSourcePaths ?? []);
ok(staleA42Paths.every((entry) => !required.has(entry)), 'a42.stale-consolidated-shells-not-required');
ok(required.has('app/api/market-integrity/[operation]/route.ts'), 'a42.current-operation-dispatch-required');
ok(required.has('app/[locale]/market-integrity/page.tsx'), 'a42.locale-market-integrity-required');
ok(required.has('app/[locale]/shield-pro/page.tsx'), 'a42.locale-shield-pro-required');
ok(required.has('app/[locale]/real-markets/page.tsx'), 'a42.locale-real-markets-required');
ok(required.has('components/ui/VelmereRouteTransition.tsx'), 'a42.route-transition-required');
ok(required.has('lib/market-integrity/local-development-market-reference.ts'), 'a42.local-reference-required');
ok(Object.keys(a42.criticalFiles ?? {}).every((entry) => required.has(entry)), 'a42.hashes-subset-of-required');
ok(Object.entries(a42.criticalFiles ?? {}).every(([entry, digest]) => sha(entry) === digest), 'a42.current-hashes-exact');

const bootstrap = text('scripts/velmere-dev-bootstrap.mjs');
ok(bootstrap.includes('current-release-authority.json'), 'bootstrap.current-authority-read');
ok(bootstrap.includes('currentAuthority.authorityRevisionId'), 'bootstrap.current-source-authority-check');
ok(!bootstrap.includes('activePass !== policy.sourceRevisionId'), 'bootstrap.no-historical-a42-current-identity-lock');
ok(bootstrap.includes('runtime recovery contract'), 'bootstrap.historical-contract-labelled');

const proxy = text('proxy.ts');
ok(proxy.includes('"/fonts/"'), 'proxy.fonts-public-prefix');
ok(proxy.includes('PUBLIC_ASSET_PREFIXES'), 'proxy.public-assets-centralized');

const pageTransition = text('components/PageTransition.tsx');
const routeTransition = text('components/ui/VelmereRouteTransition.tsx');
ok(pageTransition.includes('data-velmere-route-path={pathname}'), 'transition.committed-path-marker');
ok(routeTransition.includes('ROUTE_TRANSITION_SAFETY_MS = 30_000'), 'transition.long-safety-timeout');
ok(routeTransition.includes('committedRoutePath'), 'transition.path-commit-observed');
ok(routeTransition.includes('routeSurfaceCommitted'), 'transition.surface-commit-gate');
ok(routeTransition.includes('pendingAboveFoldImage'), 'transition.above-fold-images-gated');
ok(routeTransition.includes('layoutSettled'), 'transition.layout-settle-gated');
ok(routeTransition.includes('router.prefetch'), 'transition.route-prefetch');
ok(routeTransition.includes('pointerover'), 'transition.pointer-intent-prefetch');
ok(routeTransition.includes('requestIdleCallback'), 'transition.idle-core-prewarm');
ok(routeTransition.includes('requestAnimationFrame'), 'transition.veil-painted-before-push');
ok(!routeTransition.includes('ROUTE_TRANSITION_SAFETY_MS = 2600'), 'transition.old-premature-timeout-removed');

const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';
const referenceModule = await import(`${pathToFileURL(path.join(ROOT, 'lib/market-integrity/local-development-market-reference.ts')).href}?r22=${Date.now()}`);
const devRows = referenceModule.buildLocalDevelopmentMarketReferenceRows({ page: 1, perPage: 250 });
ok(devRows.length >= 20, 'data.dev-reference-nonempty', devRows.length);
ok(devRows.every((row) => row.result.dataQuality === 'demo'), 'data.dev-reference-demo-labelled');
ok(devRows.every((row) => row.result.providerRiskDelivery?.state === 'withheld'), 'data.dev-reference-risk-withheld');
ok(devRows.every((row) => row.result.providerRiskDelivery?.scorePublished === false), 'data.dev-reference-score-not-published');
ok(devRows.every((row) => row.result.providerRiskDelivery?.blockers.includes('provider_rights_not_verified')), 'data.dev-reference-rights-blocker-retained');
ok(devRows.every((row) => row.observedAt === '2026-07-30T00:00:00.000Z'), 'data.dev-reference-fixed-time');
ok(new Set(devRows.map((row) => row.symbol)).size === devRows.length, 'data.dev-reference-symbols-unique');
ok(devRows.every((row) => Number.isFinite(row.price) && row.price > 0), 'data.dev-reference-price-finite');
ok(devRows.every((row) => row.sparkline7d.length === 42), 'data.dev-reference-sparkline-bounded');
process.env.NODE_ENV = 'production';
const prodRows = referenceModule.buildLocalDevelopmentMarketReferenceRows({ page: 1, perPage: 250 });
ok(prodRows.length === 0, 'data.production-reference-disabled');
if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;

const markets = text('lib/server/market-integrity-route-modules/markets.ts');
ok(markets.includes('buildLocalDevelopmentMarketReferenceRows'), 'markets.dev-reference-wired');
ok(text('lib/market-integrity/local-development-market-reference.ts').includes('process.env.NODE_ENV === "production"'), 'markets.dev-reference-nonproduction-only');
ok(markets.includes('illustrative fixed values'), 'markets.dev-reference-truth-label');
ok(markets.includes('local_reference_not_live'), 'markets.dev-reference-not-live-freshness');
ok(markets.includes('}, 503'), 'markets.production-failure-remains-503');
ok(markets.indexOf('const localReferenceRows') < markets.indexOf('No verified market provider'), 'markets.dev-fallback-before-production-fail');
ok(markets.includes('fetchBinanceMarketFallback'), 'markets.real-provider-fallback-retained');

const egress = text('lib/network/brokered-egress.ts');
ok(egress.includes('provider_rights_not_verified'), 'rights.provider-rights-fail-closed-retained');
ok(!egress.includes('A102R22_LOCAL_MARKET_REFERENCE'), 'rights.no-dev-reference-authority-in-egress');

const brandIcon = text('lib/server/market-integrity-route-modules/brand-icon.ts');
const icon = text('lib/server/market-integrity-route-modules/icon.ts');
ok(brandIcon.includes('status: 204'), 'icons.brand-unavailable-204');
ok(brandIcon.includes('x-velmere-icon-fallback'), 'icons.brand-fallback-header');
ok(icon.includes('status: 204'), 'icons.remote-unavailable-204');
ok(icon.includes('x-velmere-icon-fallback'), 'icons.remote-fallback-header');
ok(!brandIcon.includes('status: 502'), 'icons.brand-no-noisy-502');

const logoResolver = text('lib/market-integrity/asset-logo-resolver.ts');
ok(logoResolver.includes('function localMappedLogo'), 'logos.dev-local-mapping-helper');
ok(logoResolver.includes('process.env.NODE_ENV === "production" ? canonicalLocalLogo(path) : path'), 'logos.production-canonical-dev-local-policy');
ok(logoResolver.includes('resolveLocalCryptoLogo'), 'logos.local-crypto-resolution-retained');
ok(logoResolver.includes('resolveLocalBrandLogo'), 'logos.local-brand-resolution-retained');

ok(a58.currentCheckpointRevisionId === REV, 'a58.current-checkpoint');
ok(a58.currentCheckpointParentRevisionId === PARENT, 'a58.parent-checkpoint');
ok(a58.currentDescendantManifestPath === 'config/pass36/a102r22-current-root-descendant-manifest.json', 'a58.current-descendant-path');
ok(a58.archiveManifestPath === '_velmere/PASS36_A102R22_SOURCE_ONLY_MANIFEST.json', 'a58.archive-manifest-path');

const receipt = {
  schemaVersion: 'velmere.pass36.a102r22.runtime-data-transition-test-receipt.v1',
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: '2026-07-30T21:45:00.000Z',
  status: 'PASS_A102R22_LOCAL_DEV_RUNTIME_DATA_TRANSITION_BOUNDARY_NO_REAL_CREDIT',
  checksPassed: checks,
  checksFailed: 0,
  localDevelopmentReferenceRows: devRows.length,
  productionReferenceRows: prodRows.length,
  realProviderRightsApproved: 0,
  realBrowserRows: 0,
  exactBuildBrowserCredit: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  rows,
};
if (process.env.VELMERE_WRITE_RECEIPT === '1') {
  fs.writeFileSync(path.join(ROOT, 'config/pass36/a102r22-test-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
