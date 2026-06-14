import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass401-terminal-exactness-matrix.ts');
for (const marker of [
  'PASS401.terminal_exactness_matrix',
  'PASS401_RUNTIME_CLOSE_EVENT',
  'buildPass401TerminalExactnessReadout',
  'buildPass401MarketCoverageUniverse',
  'pass401AssetVisualPatch',
  'pass401PseudoPricePatch',
  'pass401BrainTimeline',
  'pass401SecurityOnePageCopy',
  'PLTR',
  'MC.PA',
  'USD/SGD',
  'HG=F',
  'one resolved payload',
]) if (!contract.includes(marker)) failures.push(`PASS401 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'PASS401_RUNTIME_CLOSE_EVENT',
  'buildPass401MarketCoverageUniverse',
  'buildPass401TerminalExactnessReadout',
  'Object.assign(assetVisuals, pass401AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass401PseudoPricePatch)',
  'real-markets-pass401-exactness-terminal',
  'real-markets-pass401-vlm-coin',
  'data-pass401-terminal-exactness-matrix="true"',
  'data-pass401-search-runtime-lock={pass401TerminalExactnessMatrix.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS401 marker: ${marker}`);

for (const [file, label] of [
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'Browser'],
  ['components/market-integrity/MarketIntegrityClient.tsx', 'Shield'],
  ['components/market-integrity/ShieldMapClient.tsx', 'Shield Map'],
]) {
  const source = read(file);
  for (const marker of ['PASS401_RUNTIME_CLOSE_EVENT', 'pass401TerminalExactnessMatrix']) {
    if (!source.includes(marker)) failures.push(`${label} missing PASS401 marker: ${marker}`);
  }
}

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass401TerminalExactnessReadout',
  'pass401Readout',
  'pass401BrainTimeline',
  'pass401TerminalExactnessMatrix',
  'PASS401 TERMINAL EXACTNESS MATRIX',
  'pass401-terminal-exactness-matrix',
  'if (page === 27)',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS401 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass401MarketCoverageUniverse', 'pass401TerminalExactnessMatrix', 'pass401: pass401TerminalExactnessMatrix']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS401 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS401 · terminal exactness matrix',
  '.real-markets-pass401-exactness-terminal',
  '.real-markets-pass401-vlm-coin',
  '[data-pass401-search-runtime-lock]',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS401 marker: ${marker}`);

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
  console.error('PASS401 terminal exactness matrix failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS401 terminal exactness matrix passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
