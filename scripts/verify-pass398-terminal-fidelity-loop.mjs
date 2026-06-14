import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass398-terminal-fidelity-loop.ts');
for (const marker of [
  'PASS398.terminal_fidelity_loop',
  'buildPass398TerminalFidelityReadout',
  'buildPass398MarketCoverageUniverse',
  'pass398AssetVisualPatch',
  'pass398PseudoPricePatch',
  'pass398BrainTimeline',
  'pass398ResearchLabPlainCopy',
  'MC.PA',
  'USD/SGD',
  'ZC=F',
  'one exact resolved payload per locale',
]) if (!contract.includes(marker)) failures.push(`PASS398 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'buildPass398MarketCoverageUniverse',
  'buildPass398TerminalFidelityReadout',
  'Object.assign(assetVisuals, pass398AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass398PseudoPricePatch)',
  'real-markets-pass398-terminal-fidelity',
  'real-markets-pass398-vlm-coin',
  'data-pass398-terminal-fidelity-loop="true"',
  'data-pass398-search-runtime-lock={pass398TerminalFidelityContract.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS398 marker: ${marker}`);

const browser = read('components/search/VelmereIntelligenceSearchClient.tsx');
for (const marker of [
  'pass398TerminalFidelityContract',
  'data-pass398-pdf-exact-payload={pass398TerminalFidelityContract.version}',
  'data-pass398-terminal-fidelity-loop={pass398TerminalFidelityContract.version}',
]) if (!browser.includes(marker)) failures.push(`Browser missing PASS398 marker: ${marker}`);

const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
for (const marker of [
  'pass398TerminalFidelityContract',
  'data-pass398-search-runtime-lock={pass398TerminalFidelityContract.version}',
]) if (!shield.includes(marker)) failures.push(`Shield missing PASS398 marker: ${marker}`);

const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
for (const marker of [
  'pass398TerminalFidelityContract',
  'data-pass398-terminal-fidelity-loop={pass398TerminalFidelityContract.version}',
]) if (!shieldMap.includes(marker)) failures.push(`Shield Map missing PASS398 marker: ${marker}`);

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass398TerminalFidelityReadout',
  'pass398Readout',
  'pass398BrainTimeline',
  'pass398TerminalFidelityContract',
  'pass398-terminal-fidelity-loop',
  'PASS398 TERMINAL FIDELITY LOOP',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS398 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass398MarketCoverageUniverse', 'pass398TerminalFidelityContract', 'pass398: pass398TerminalFidelityContract']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS398 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS398 · terminal fidelity loop',
  '.real-markets-pass398-terminal-fidelity',
  '.real-markets-pass398-vlm-coin',
  '.real-markets-pass398-field-grid',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS398 marker: ${marker}`);

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
  console.error('PASS398 terminal fidelity loop failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS398 terminal fidelity loop passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
