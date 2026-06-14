import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const gatePath = 'lib/release/pass1294-build-truth-release-gate.ts';
const runnerPath = 'scripts/run-pass1294-build-truth.mjs';
const artifactValidatorPath = 'scripts/verify-pass1294-playwright-artifacts.mjs';
const progressPath = 'docs/progress/PASS1294_1313_BUILD_TRUTH_RUNTIME_ARTIFACTS.md';
const packageText = read('package.json');
const gate = existsSync(gatePath) ? read(gatePath) : '';
const runner = existsSync(runnerPath) ? read(runnerPath) : '';
const artifactValidator = existsSync(artifactValidatorPath) ? read(artifactValidatorPath) : '';
const progress = existsSync(progressPath) ? read(progressPath) : '';
const spec = read('tests/e2e/pass1274-1293-runtime-visual-qa.spec.ts');

add('PASS1294 release gate exists', existsSync(gatePath));
add('Gate declares no fake 100 rule', gate.includes('do_not_count_100_until_full_build_and_browser_artifacts_are_green') && gate.includes('percentageCapUntilGreen: 96.2'));
add('Gate pins Node 24 and npm 11 targets', gate.includes('nodeTarget: "24.16.0"') && gate.includes('npmTarget: "11.16.0"'));
add('Gate lists full build commands', gate.includes('npm ci --no-audit --no-fund --progress=false') && gate.includes('npm run typecheck') && gate.includes('npm run lint') && gate.includes('npm run build'));
add('Gate lists Playwright screenshot artifacts', gate.includes('lens-reader-desktop-eth.png') && gate.includes('header-cart-mobile.png') && gate.includes('real-markets-unified-modal.png'));
add('Runner exists and has full/sandbox modes', existsSync(runnerPath) && runner.includes('VELMERE_FULL_BUILD_TRUTH') && runner.includes('sandbox-safe-static-proof'));
add('Runner writes JSON build truth artifact', runner.includes('test-results/pass1294-build-truth') && runner.includes('summary.json'));
add('Artifact validator exists', existsSync(artifactValidatorPath));
add('Artifact validator fails by default and allows pending mode', artifactValidator.includes('--allow-missing') && artifactValidator.includes('minimumBytes = 2048') && artifactValidator.includes('process.exit(1)'));
add('Package wires PASS1294 verifier', pkg.scripts?.['verify:pass1294-1313-build-truth-runtime-artifacts'] === 'node scripts/verify-pass1294-1313-build-truth-runtime-artifacts.mjs');
add('Package wires PASS1294 runner', pkg.scripts?.['ci:pass1294-build-truth'] === 'node scripts/run-pass1294-build-truth.mjs');
add('Package wires full build truth runner', pkg.scripts?.['ci:pass1294-build-truth:full']?.includes('VELMERE_FULL_BUILD_TRUTH=1'));
add('Package wires artifact validators', pkg.scripts?.['verify:e2e:pass1274-1293-artifacts'] === 'node scripts/verify-pass1294-playwright-artifacts.mjs' && pkg.scripts?.['verify:e2e:pass1274-1293-artifacts:pending']?.includes('--allow-missing'));
add('Playwright spec names every required artifact', spec.includes('lens-reader-desktop-eth.png') && spec.includes('lens-pdf-frame-desktop-eth.png') && spec.includes('shield-unified-modal.png'));
add('Progress doc records real npm ci timeout', progress.includes('420s timeout') && progress.includes('not counted as green build'));
add('Progress doc has next blocker order', progress.includes('PASS1314') && progress.includes('Playwright') && progress.includes('PASS1334'));
add('Package keeps existing Node24 build truth command', packageText.includes('ci:node24-npm11-build-truth'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1294-1313 build truth runtime artifact verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1294-1313 build truth runtime artifact verifier passed: ${checks.length}/${checks.length}`);
