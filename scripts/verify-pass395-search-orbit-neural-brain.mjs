import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try {
  ts = require('typescript');
} catch {
  ts = null;
}

const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass395-neural-orbit-search-contract.ts');
for (const marker of [
  'PASS395_SEARCH_ORBIT_LOCK',
  'PASS395_ORBIT360_NEURAL_BRAIN',
  'pass395ReadoutLimit',
  'return 20;',
  'return 14;',
  'return 10;',
  'PDF mirror',
  'no hidden text walls',
]) {
  if (!contract.includes(marker)) failures.push(`PASS395 contract missing marker: ${marker}`);
}

const browser = read('components/search/VelmereIntelligenceSearchClient.tsx');
for (const marker of [
  'closeLensSearchRuntime',
  'data-pass395-search-runtime-lock="true"',
  'data-pass395-search-hard-close={pass395SearchRuntimeContract.version}',
  'data-pass395-pdf-download-parity="same-resolved-report-object"',
  'closeLensSearchRuntime();',
]) {
  if (!browser.includes(marker)) failures.push(`Browser missing PASS395 search/PDF marker: ${marker}`);
}
if (/symbol:\s*"USDT",[\s\S]{0,80}symbol:\s*"USDT"/.test(browser)) {
  failures.push('Browser still has duplicate USDT symbol property');
}

const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
for (const marker of [
  'pass395SearchRuntimeContract',
  'setSuggestPanelFrame(null);',
  'data-pass395-search-runtime-lock="true"',
  'data-pass395-search-runtime-lock={pass395SearchRuntimeContract.version}',
]) {
  if (!shield.includes(marker)) failures.push(`Shield missing PASS395 search runtime marker: ${marker}`);
}

const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
for (const marker of [
  'closeInvestigatorSuggestions();',
  'data-pass395-search-runtime-lock="true"',
  'data-pass394-no-fallback-portal-position="true"',
  'suggestionsOpen && !investigatorLoading && investigatorSuggestFrame && typeof document !== "undefined"',
]) {
  if (!shieldMap.includes(marker)) failures.push(`Shield Map missing PASS395 search marker: ${marker}`);
}
for (const risky of ['investigatorSuggestFrame?.top ??', 'investigatorSuggestFrame?.left ??', '?? 180', '?? 24', '?? 620']) {
  if (shieldMap.includes(risky)) failures.push(`Shield Map still contains fallback portal coordinate: ${risky}`);
}

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'buildPass395NeuralOrbitReadout',
  'real-markets-pass395-orbit-neural-core',
  'data-pass395-orbit360-neural-brain="true"',
  'data-pass395-search-runtime-lock="true"',
  'closeRealMarketSearchRuntime',
  'setSearchFrame(null);',
]) {
  if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS395 marker: ${marker}`);
}

const tokenModal = read('components/market-integrity/TokenRiskModal.tsx');
for (const marker of [
  'buildPass395NeuralOrbitReadout',
  'pass395CollectionPhases',
  'shield-vlm-pass395-neural-collector',
  'shield-vlm-pass395-neural-orbit',
  'data-pass395-orbit360-neural-brain="true"',
  'data-pass395-fields={pass395Readout.count}',
]) {
  if (!tokenModal.includes(marker)) failures.push(`TokenRiskModal missing PASS395 neural brain marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS395 · search hard-close + Orbit 360 neural brain',
  '.real-markets-pass395-orbit-neural-core',
  '.shield-vlm-pass395-neural-collector',
  '@keyframes pass395-brain-breathe',
  '@keyframes pass395-node-pulse',
]) {
  if (!css.includes(marker)) failures.push(`CSS missing PASS395 neural/search marker: ${marker}`);
}

const files = globSync('app/**/*.ts?(x)').concat(globSync('components/**/*.ts?(x)'), globSync('lib/**/*.ts?(x)'));
if (ts) {
  for (const file of files) {
    const text = read(file);
    const out = ts.transpileModule(text, {
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });
    const errors = (out.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    for (const diagnostic of errors) {
      const position = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        : null;
      const where = position ? `${position.line + 1}:${position.character + 1}` : 'unknown';
      failures.push(`${file}:${where}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
  }
} else {
  for (const file of files) {
    const text = read(file);
    if (/result\?\.symbol\s*\?\?\s*cleanQuery\.toUpperCase\(\)\s*\|\|/.test(text)) {
      failures.push(`${file}: risky ?? / || fallback pattern detected`);
    }
  }
}

if (failures.length) {
  console.error('PASS395 search/orbit neural brain failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS395 search/orbit neural brain passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
