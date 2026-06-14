import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass397-unified-search-pdf-brain.ts');
for (const marker of [
  'PASS397.unified_search_pdf_brain',
  'PASS397_SEARCH_RUNTIME_CLOSE_EVENT',
  'buildPass397UnifiedTerminalReadout',
  'buildPass397MarketCoverageUniverse',
  'pass397AssetVisualPatch',
  'pass397PseudoPricePatch',
  'JPM',
  'EUR/NOK',
  'NG=F',
  'REET',
  'fake scarcity',
]) if (!contract.includes(marker)) failures.push(`PASS397 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'buildPass397MarketCoverageUniverse',
  'buildPass397UnifiedTerminalReadout',
  'PASS397_SEARCH_RUNTIME_CLOSE_EVENT',
  'Object.assign(assetVisuals, pass397AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass397PseudoPricePatch)',
  'real-markets-pass397-unified-terminal',
  'real-markets-pass397-vlm-coin',
  'data-pass397-unified-search-pdf-brain="true"',
  'data-pass397-search-runtime-lock={pass397UnifiedTerminalContract.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS397 marker: ${marker}`);

const browser = read('components/search/VelmereIntelligenceSearchClient.tsx');
for (const marker of [
  'PASS397_SEARCH_RUNTIME_CLOSE_EVENT',
  'pass397UnifiedTerminalContract',
  'emitPass397SearchRuntimeClose',
  'data-pass397-pdf-exact-payload={pass397UnifiedTerminalContract.version}',
  'pass397UnifiedTerminalContract.pdfRule',
]) if (!browser.includes(marker)) failures.push(`Browser missing PASS397 marker: ${marker}`);

const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
for (const marker of [
  'PASS397_SEARCH_RUNTIME_CLOSE_EVENT',
  'emitPass397SearchRuntimeClose',
  'data-pass397-search-runtime-lock={pass397UnifiedTerminalContract.version}',
]) if (!shield.includes(marker)) failures.push(`Shield missing PASS397 marker: ${marker}`);

const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
for (const marker of [
  'PASS397_SEARCH_RUNTIME_CLOSE_EVENT',
  'emitPass397SearchRuntimeClose',
  'data-pass397-unified-search-pdf-brain="true"',
]) if (!shieldMap.includes(marker)) failures.push(`Shield Map missing PASS397 marker: ${marker}`);

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass397UnifiedTerminalReadout',
  'pass397Readout',
  'pass397BrainTimeline',
  'pass397UnifiedTerminalContract',
  'pass397-unified-terminal-brain',
  'PASS397 UNIFIED SEARCH PDF BRAIN',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS397 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass397MarketCoverageUniverse', 'pass397UnifiedTerminalContract', 'pass397: pass397UnifiedTerminalContract']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS397 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS397 · unified search PDF brain',
  '.real-markets-pass397-unified-terminal',
  '.real-markets-pass397-vlm-coin',
  '@keyframes pass397-orbit-rotate',
  '@keyframes pass397-node-pulse',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS397 marker: ${marker}`);

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
  console.error('PASS397 unified search PDF brain failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS397 unified search PDF brain passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
