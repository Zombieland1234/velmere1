import { readFileSync } from 'node:fs';

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const read = (path) => readFileSync(path, 'utf8');

const cart = read('components/CartProvider.tsx');
add('cart opening is single-phase without requestAnimationFrame reopen', !cart.includes('frame-confirm') && !cart.includes('timeout-confirm') && cart.includes('PASS1985: keep cart opening single-phase'));

const overlay = read('components/ui/OverlayPrimitives.tsx');
add('dropdown geometry updates are requestAnimationFrame-throttled', overlay.includes('const scheduleUpdate = () =>') && overlay.includes('if (frame) return;') && overlay.includes('window.addEventListener("scroll", scheduleUpdate, true)'));

const vlm = read('components/market-integrity/VlmNeuralAuditExperience.tsx');
add('VLM contained analysis resets when symbol/name/mode changes', vlm.includes('setElapsed(0);') && vlm.includes('setComplete(false);') && vlm.includes('[symbol, name, mode, sourceDiffTimeline.steps.length]'));
add('VLM completion timeout is cleared on cleanup', vlm.includes('completionTimeoutRef') && vlm.includes('window.clearTimeout(completionTimeoutRef.current)'));

const shield = read('components/market-integrity/TokenRiskModal.tsx');
add('Shield contained VLM has a mode/symbol key for replay', shield.includes('key={`${asset.symbol}:${vlmSequenceMode}:shield-contained`}'));

const real = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
add('Real Markets contained VLM has a mode/symbol key for replay', real.includes('key={`${selected.symbol}:${auditMode}:real-markets-contained`}'));

const realSearch = read('components/market-integrity/RealMarketSearch.tsx');
add('Real Markets search is capped to 3 results', realSearch.includes('results.slice(0, 3)') && realSearch.includes('three-results-no-chaos'));

const css = read('app/globals.css');
add('PASS1985 CSS surface hardening exists', css.includes('PASS1985 — continue user') && css.includes('--velmere-pass1985-drawer-ms'));
add('PASS1985 asset modal five-piece polish exists', css.includes('Asset modal: make the five visible pieces feel deliberate'));
add('PASS1985 Square comments polish exists', css.includes('Square: comments should read as premium dark cards'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'OK' : 'FAIL'} ${c.name}`);
if (failed.length) {
  console.error(`PASS1985 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1985 verification OK: ${checks.length}/${checks.length}`);
