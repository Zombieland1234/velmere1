import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const docPath = 'docs/progress/PASS1194_1213_FINAL_100_AUDIT.md';
const pkg = JSON.parse(read('package.json'));
const overlay = read('components/ui/OverlayPrimitives.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const cart = read('components/CartDrawer.tsx');
const smoke = read('scripts/smoke-routes-static.mjs');
const doc = existsSync(docPath) ? read(docPath) : '';

add('PASS1194 final 100 audit document exists', existsSync(docPath));
add('Audit document states no-fake-100 rule', doc.includes('No-fake-100 rule'));
add('Audit document includes completion table', doc.includes('| Area | Current score | Missing |'));
add('Audit document names weakest Shield Map lane', doc.includes('Shield Map') && doc.includes('77.0%'));
add('Audit document keeps full build unproven instead of fake green', doc.includes('timed out') && doc.includes('not counted as proven'));
add('Package still pins Node 24 and npm 11 engines', pkg.engines?.node?.includes('>=24.16.0') && pkg.engines?.npm?.includes('>=11.16.0'));
add('Latest runtime click verifier remains wired', pkg.scripts?.['verify:pass1174-1193-runtime-click-readiness'] === 'node scripts/verify-pass1174-1193-runtime-click-readiness.mjs');
add('This final audit verifier is wired', pkg.scripts?.['verify:pass1194-1213-final-100-audit'] === 'node scripts/verify-pass1194-1213-final-100-audit.mjs');
add('DropdownRoot still rejects hidden anchors', overlay.includes('isUsableDropdownAnchor') && overlay.includes('aria-hidden') && overlay.includes('resolveFallbackDropdownPosition'));
add('DropdownRoot still tracks visualViewport for mobile overlays', overlay.includes('window.visualViewport') && overlay.includes('data-dropdown-visual-viewport'));
add('Unified asset shell still has circular chart and bubble rail contract', unified.includes('data-unified-asset-circular-chart="true"') && unified.includes('data-unified-asset-bubble-rail="true"'));
add('Unified depth dock still exposes Basic/Pro/Advanced levels', unified.includes('basic') && unified.includes('pro') && unified.includes('advanced'));
add('Cart drawer still exposes stable bottom-sheet surface id', cart.includes('velmere-cart-bottom-sheet') && cart.includes('motionPreset="bottom"'));
add('Static route smoke still covers localized routes', smoke.includes('localized routes') || smoke.includes('locales'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1194-1213 final 100 audit failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1194-1213 final 100 audit passed: ${checks.length}/${checks.length}`);
