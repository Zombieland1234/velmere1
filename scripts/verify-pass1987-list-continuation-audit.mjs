import fs from 'node:fs';

const checks = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const has = (file, needle, label = needle) => {
  const ok = read(file).includes(needle);
  checks.push({ ok, label: `${file}: ${label}` });
};
const notHas = (file, needle, label = needle) => {
  const ok = !read(file).includes(needle);
  checks.push({ ok, label: `${file}: no ${label}` });
};

has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1987-five-piece-polish="single-grid-chart-rail-scroll-safe"', 'five-piece polish marker');
has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1987-chart-gesture-policy="wheel-contained-touch-native"', 'chart gesture policy marker');
has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1987-depth-dock="three-stable-actions-no-legacy-bubbles"', 'stable analysis dock marker');
notHas('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'onTouchMove={(event) => event.stopPropagation()}', 'touch move propagation blocker on chart panel');
notHas('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'onPointerMove={(event) => event.stopPropagation()}', 'pointer move propagation blocker on chart panel');
has('components/market-integrity/VlmNeuralAuditExperience.tsx', 'data-pass1987-contained-vlm={contained ? "modal-bounded-no-duplicate-overscroll" : "fullscreen"}', 'contained VLM marker');
has('components/market-integrity/VlmNeuralAuditExperience.tsx', 'touchAction: contained ? "pan-y" : modalGestureQa.touchAction', 'contained touch action override');
notHas('components/market-integrity/VlmNeuralAuditExperience.tsx', 'overscrollBehavior: modalGestureQa.overscroll,\n        overscrollBehavior: modalGestureQa.overscroll', 'duplicate overscroll style line');
has('components/square/VelmereSquareClient.tsx', '"pass1987-square-modal": "centered-owned-scroll"', 'square modal owned scroll marker');
has('app/globals.css', 'PASS1987 — continuation of user\'s UI list', 'PASS1987 CSS block');
has('app/globals.css', '.unified-asset-chart-panel[data-pass1987-chart-gesture-policy="wheel-contained-touch-native"]', 'chart gesture CSS');
has('app/globals.css', '#velmere-square-post-modal[data-pass1987-square-modal="centered-owned-scroll"]', 'square modal CSS');
has('app/globals.css', '.unified-asset-modal-shell[data-pass1987-five-piece-polish] .unified-asset-analysis-overlay[data-unified-asset-analysis-overlay="true"]', 'anti legacy hide CSS');

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error('PASS1987 verification failed:');
  for (const item of failed) console.error(' - ' + item.label);
  process.exit(1);
}
console.log(`PASS1987 verification OK (${checks.length}/${checks.length})`);
