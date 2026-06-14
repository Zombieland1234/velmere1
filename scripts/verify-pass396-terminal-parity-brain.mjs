import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass396-terminal-parity-brain.ts');
for (const marker of [
  'PASS396.terminal_parity_brain',
  'buildPass396TerminalBrain',
  'buildPass396MarketCoverageUniverse',
  'pass396AssetVisualPatch',
  'pass396PseudoPricePatch',
  'Orbit 360 starts as a VLM coin',
  'return [',
  'CRWD',
  'EUR/AUD',
  'CL=F',
  'IYR',
]) {
  if (!contract.includes(marker)) failures.push(`PASS396 contract missing marker: ${marker}`);
}

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'buildPass396TerminalBrain',
  'buildPass396MarketCoverageUniverse',
  'Object.assign(assetVisuals, pass396AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass396PseudoPricePatch)',
  'data-pass396-terminal-parity-brain="true"',
  'real-markets-pass396-terminal-brain',
  'real-markets-pass396-vlm-coin',
  'real-markets-pass396-brain-core',
  'real-markets-pass396-field-grid',
  'data-pass396-search-runtime-lock={pass396TerminalParityContract.version}',
]) {
  if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS396 marker: ${marker}`);
}

const browser = read('components/search/VelmereIntelligenceSearchClient.tsx');
for (const marker of [
  'pass396TerminalParityContract',
  'data-pass396-pdf-exact-payload={pass396TerminalParityContract.version}',
  'pass396TerminalParityContract.pdfRule',
  'closeLensSearchRuntime();',
]) {
  if (!browser.includes(marker)) failures.push(`Browser missing PASS396 PDF/search marker: ${marker}`);
}

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass396TerminalBrain',
  'pass396Readout',
  'pass396NeuralSequence',
  'pass396TerminalParityContract',
  'pass396-terminal-parity-brain',
  'PASS396 TERMINAL PARITY BRAIN',
]) {
  if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS396 parity marker: ${marker}`);
}

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass396MarketCoverageUniverse', 'pass396TerminalParityContract', 'pass396: pass396TerminalParityContract']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog route missing PASS396 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS396 · terminal parity brain',
  '.real-markets-pass396-terminal-brain',
  '.real-markets-pass396-brain-orbit',
  '.real-markets-pass396-vlm-coin',
  '@keyframes pass396-orbit-rotate',
  '@keyframes pass396-neuron-pulse',
]) {
  if (!css.includes(marker)) failures.push(`CSS missing PASS396 marker: ${marker}`);
}

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
}

if (failures.length) {
  console.error('PASS396 terminal parity brain failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS396 terminal parity brain passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ''}).`);
