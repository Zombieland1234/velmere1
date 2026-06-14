import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const gatePath = 'lib/release/pass1314-playwright-screenshot-repair-gate.ts';
const specPath = 'tests/e2e/pass1274-1293-runtime-visual-qa.spec.ts';
const artifactValidatorPath = 'scripts/verify-pass1294-playwright-artifacts.mjs';
const browserPath = 'components/search/VelmereIntelligenceSearchClient.tsx';
const progressPath = 'docs/progress/PASS1314_1333_PLAYWRIGHT_SCREENSHOT_REPAIR.md';

const gate = existsSync(gatePath) ? read(gatePath) : '';
const spec = existsSync(specPath) ? read(specPath) : '';
const artifactValidator = existsSync(artifactValidatorPath) ? read(artifactValidatorPath) : '';
const browser = existsSync(browserPath) ? read(browserPath) : '';
const progress = existsSync(progressPath) ? read(progressPath) : '';

add('PASS1314 release gate exists', existsSync(gatePath));
add('Gate forbids fake screenshot proof', gate.includes('screenshots_must_have_png_dimensions_and_pass1314_sidecars_before_100') && gate.includes('percentageCapUntilGreen: 96.4'));
add('Gate lists all eight screenshot surfaces', gate.includes('lens-reader-desktop-eth.png') && gate.includes('header-wallet-mobile.png') && gate.includes('real-markets-unified-modal.png'));
add('Gate requires sidecar metadata for screenshots', gate.includes('sidecar: "lens-reader-desktop-eth.png.json"') && gate.includes('sidecar: "real-markets-unified-modal.png.json"'));
add('Gate names real Playwright run and validator commands', gate.includes('npm run test:e2e:pass1314-1333') && gate.includes('npm run verify:e2e:pass1274-1293-artifacts'));
add('Spec writes PASS1314 sidecars next to screenshots', spec.includes('writeArtifactSidecar') && spec.includes('pass: "PASS1314-1333"') && spec.includes('capturedAt'));
add('Spec records route viewport selector metadata', spec.includes('route: "/pl/search"') && spec.includes('viewport: "mobile"') && spec.includes('selector: "[data-unified-asset-modal=\\\"shield\\\"]"'));
add('Spec uses stable PDF toggle instead of translated button text', spec.includes('[data-testid="lens-pdf-toggle"]') && !spec.includes('getByRole("button", { name: /podgląd|preview|vorschau/i })'));
add('Lens browser exposes stable PDF toggle test id', browser.includes('data-testid="lens-pdf-toggle"') && browser.includes('data-pass1314-stable-pdf-toggle="true"'));
add('Artifact validator checks PNG signature and IHDR dimensions', artifactValidator.includes('readPngDimensions') && artifactValidator.includes('89504e470d0a1a0a') && artifactValidator.includes('IHDR'));
add('Artifact validator requires PASS1314 sidecar metadata', artifactValidator.includes('sidecar.pass === \'PASS1314-1333\'') && artifactValidator.includes('sidecar.selector'));
add('Artifact validator keeps pending mode honest', artifactValidator.includes('--allow-missing') && artifactValidator.includes('screenshots still need browser execution with sidecar metadata'));
add('Package wires PASS1314 verifier', pkg.scripts?.['verify:pass1314-1333-playwright-screenshot-repair'] === 'node scripts/verify-pass1314-1333-playwright-screenshot-repair.mjs');
add('Package wires PASS1314 e2e alias', pkg.scripts?.['test:e2e:pass1314-1333'] === 'npm run test:e2e:pass1214-1233 && npm run test:e2e:pass1274-1293 && npm run verify:e2e:pass1274-1293-artifacts');
add('Progress document records this as artifact repair not green proof', existsSync(progressPath) && progress.includes('NOT RUN HERE') && progress.includes('sidecar') && progress.includes('PNG IHDR'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1314-1333 Playwright screenshot repair verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1314-1333 Playwright screenshot repair verifier passed: ${checks.length}/${checks.length}`);
