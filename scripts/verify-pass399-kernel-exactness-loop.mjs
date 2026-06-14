import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass399-kernel-exactness-loop.ts');
for (const marker of [
  'PASS399.kernel_exactness_loop',
  'PASS399_RUNTIME_CLOSE_EVENT',
  'buildPass399KernelExactnessReadout',
  'buildPass399MarketCoverageUniverse',
  'pass399AssetVisualPatch',
  'pass399PseudoPricePatch',
  'pass399KernelTimeline',
  'pass399SecurityOnePageCopy',
  'AVGO',
  'USD/NOK',
  'NG=F',
  'same resolved payload',
]) if (!contract.includes(marker)) failures.push(`PASS399 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'PASS399_RUNTIME_CLOSE_EVENT',
  'buildPass399MarketCoverageUniverse',
  'buildPass399KernelExactnessReadout',
  'Object.assign(assetVisuals, pass399AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass399PseudoPricePatch)',
  'real-markets-pass399-kernel-terminal',
  'real-markets-pass399-vlm-coin',
  'data-pass399-kernel-exactness-loop="true"',
  'data-pass399-search-runtime-lock={pass399KernelExactnessContract.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS399 marker: ${marker}`);

for (const [file, label] of [
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'Browser'],
  ['components/market-integrity/MarketIntegrityClient.tsx', 'Shield'],
  ['components/market-integrity/ShieldMapClient.tsx', 'Shield Map'],
]) {
  const source = read(file);
  for (const marker of ['PASS399_RUNTIME_CLOSE_EVENT', 'pass399KernelExactnessContract']) {
    if (!source.includes(marker)) failures.push(`${label} missing PASS399 marker: ${marker}`);
  }
}

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass399KernelExactnessReadout',
  'pass399Readout',
  'pass399KernelTimeline',
  'pass399KernelExactnessContract',
  'PASS399 KERNEL EXACTNESS LOOP',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS399 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass399MarketCoverageUniverse', 'pass399KernelExactnessContract', 'pass399: pass399KernelExactnessContract']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS399 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS399 · kernel exactness loop',
  '.real-markets-pass399-kernel-terminal',
  '.real-markets-pass399-vlm-coin',
  '[data-pass399-search-runtime-lock]',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS399 marker: ${marker}`);

const files = globSync('app/**/*.ts?(x)').concat(globSync('components/**/*.ts?(x)'), globSync('lib/**/*.ts?(x)'));
if (ts) {
  for (const file of files) {
    const text = read(file);
    const out = ts.transpileModule(text, {
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    const errors = (out.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    for (const diagnostic of errors) {
      const position = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : null;
      const where = position ? `${position.line + 1}:${position.character + 1}` : 'unknown';
      failures.push(`${file}:${where}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
  }
} else {
  for (const file of files) {
    const text = read(file);
    if (/\?\?[^\n;]+\|\|/.test(text)) failures.push(`${file}: risky ?? / || fallback pattern detected`);
  }
}

if (failures.length) {
  console.error('PASS399 kernel exactness loop failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS399 kernel exactness loop passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
