import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const helperPath = 'lib/market-integrity/pass1274-runtime-visual-qa-release-gate.ts';
const reportPath = 'lib/search/lens-report.ts';
const browserPath = 'components/search/VelmereIntelligenceSearchClient.tsx';
const cssPath = 'app/globals.css';
const specPath = 'tests/e2e/pass1274-1293-runtime-visual-qa.spec.ts';
const docPath = 'docs/progress/PASS1274_1293_RUNTIME_VISUAL_QA.md';

const helper = existsSync(helperPath) ? read(helperPath) : '';
const report = read(reportPath);
const browser = read(browserPath);
const css = read(cssPath);
const spec = existsSync(specPath) ? read(specPath) : '';
const doc = existsSync(docPath) ? read(docPath) : '';

add('PASS1274 helper exists', existsSync(helperPath));
add('Helper declares browser screenshot proof mode', helper.includes('pass1274-runtime-visual-qa-release-gate') && helper.includes('browser_screenshot_required_before_100'));
add('Helper requires desktop and mobile viewport matrix', helper.includes('viewportMatrix') && helper.includes('width: 1440') && helper.includes('width: 390'));
add('Helper names all critical screenshot artifacts', helper.includes('lens-reader-desktop') && helper.includes('header-cart-mobile') && helper.includes('real-markets-unified-modal'));
add('LensReport imports and exposes pass1274 contract', report.includes('Pass1274RuntimeVisualQaReleaseGate') && report.includes('pass1274: Pass1274RuntimeVisualQaReleaseGate'));
add('LensReport builds pass1274 after pass1254', report.includes('const pass1274 = buildPass1274RuntimeVisualQaReleaseGate') && report.includes('pass1254State: pass1254.state'));
add('LensReport validator requires pass1274 screenshot command', report.includes('report.pass1274?.proofMode === "browser_screenshot_required_before_100"') && report.includes('npm run test:e2e:pass1274-1293'));
add('Lens modal root exposes pass1274 runtime attributes', browser.includes('data-pass1274-runtime-visual-qa-release') && browser.includes('data-pass1274-artifact-root'));
add('Lens reader shows visible pass1274 strip', browser.includes('velmere-pass1274-runtime-visual-qa') && browser.includes('pdfPreview.report.pass1274.viewportMatrix.map'));
add('Lens scroll region carries pass1274 overflow budget', browser.includes('data-pass1274-body-scroll-locked') && browser.includes('data-pass1274-max-overflow-px'));
add('CSS hardens pass1274 visual proof surfaces', css.includes('PASS1274–1293') && css.includes('.velmere-pass1274-runtime-visual-qa') && css.includes('data-pass1274-body-scroll-locked="true"'));
add('Playwright visual QA spec exists', existsSync(specPath));
add('Playwright spec opens Lens reader and captures desktop/mobile artifacts', spec.includes('openLensReader') && spec.includes('lens-reader-desktop-eth.png') && spec.includes('lens-reader-mobile-eth.png'));
add('Playwright spec covers header cart bottom sheet', spec.includes('header-cart-mobile.png') && spec.includes('#velmere-cart-bottom-sheet'));
add('Playwright spec covers Shield and Real Markets modals', spec.includes('shield-unified-modal.png') && spec.includes('real-markets-unified-modal.png'));
add('Package wires PASS1274 verifier', pkg.scripts?.['verify:pass1274-1293-runtime-visual-qa'] === 'node scripts/verify-pass1274-1293-runtime-visual-qa.mjs');
add('Package wires PASS1274 Playwright command', pkg.scripts?.['test:e2e:pass1274-1293']?.includes('pass1274-1293-runtime-visual-qa.spec.ts'));
add('Progress document is honest about Playwright not run here', existsSync(docPath) && doc.includes('HARNESS ADDED, NOT RUN HERE') && doc.includes('NOT PROVEN HERE'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1274-1293 runtime visual QA verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1274-1293 runtime visual QA verifier passed: ${checks.length}/${checks.length}`);
