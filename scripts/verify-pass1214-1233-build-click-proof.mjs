import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const docPath = 'docs/progress/PASS1214_1233_BUILD_CLICK_PROOF.md';
const specPath = 'tests/e2e/pass1214-1233-build-click-proof.spec.ts';
const overlay = read('components/ui/OverlayPrimitives.tsx');
const navbar = read('components/Navbar.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
const real = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const doc = existsSync(docPath) ? read(docPath) : '';
const spec = existsSync(specPath) ? read(specPath) : '';

add('PASS1214-1233 build click proof document exists', existsSync(docPath));
add('Document keeps full npm ci timeout honest', doc.includes('STARTS, TIMEOUT IN SANDBOX') && doc.includes('Not counted as green'));
add('Document includes exact Node 24/npm 11 proof command chain', doc.includes('nvm use 24.16.0') && doc.includes('npm run test:e2e:pass1214-1233'));
add('Playwright click proof spec exists', existsSync(specPath));
add('Playwright spec covers header dropdown arbitration', spec.includes('header dropdown arbitration works on desktop') && spec.includes('header-wallet-menu') && spec.includes('velmere-cart-bottom-sheet'));
add('Playwright spec covers mobile hidden-anchor/corner drift regression', spec.includes('mobile menu beats open dropdowns without corner drift') && spec.includes('header-menu'));
add('Playwright spec covers Shield unified modal contract', spec.includes('data-unified-asset-modal="shield"') && spec.includes('data-analysis-mode="advanced"'));
add('Playwright spec covers Real Markets unified modal contract', spec.includes('data-unified-asset-modal="real-markets"') && spec.includes('realmarkets-row'));
add('Package wires e2e click proof script', pkg.scripts?.['test:e2e:pass1214-1233']?.includes('pass1214-1233-build-click-proof.spec.ts'));
add('Package wires this verifier script', pkg.scripts?.['verify:pass1214-1233-build-click-proof'] === 'node scripts/verify-pass1214-1233-build-click-proof.mjs');
add('Navbar exposes menu trigger id for click arbitration', navbar.includes('data-velmere-overlay-trigger="header-menu"'));
add('DropdownRoot Escape focus restore rejects hidden anchors', overlay.includes('if (isUsableDropdownAnchor(anchor)) {\n          anchor.focus'));
add('Shield rows expose desktop and mobile stable test ids', shield.includes('data-testid="shield-row"') && shield.includes('data-testid="shield-row-mobile"'));
add('Shield desktop rows now support keyboard activation', shield.includes('role="button"') && shield.includes('tabIndex={0}') && shield.includes('event.key !== "Enter"'));
add('Real Markets rows already expose stable test ids', real.includes('data-testid="realmarkets-row"') && real.includes('data-testid="realmarkets-row-mobile"'));
add('Unified modal keeps chart orb, bubble rail and depth buttons', unified.includes('data-unified-asset-circular-chart="true"') && unified.includes('data-unified-asset-bubble-rail="true"') && unified.includes('data-analysis-mode={option.value}'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1214-1233 build/click proof verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1214-1233 build/click proof verifier passed: ${checks.length}/${checks.length}`);
