import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass402-terminal-clean-orbit-controller.ts');
for (const marker of [
  'PASS402.terminal_clean_orbit_controller',
  'PASS402_RUNTIME_CLOSE_EVENT',
  'buildPass402TerminalCleanOrbitReadout',
  'buildPass402MarketCoverageUniverse',
  'pass402AssetVisualPatch',
  'pass402PseudoPricePatch',
  'pass402BrainTimeline',
  'pass402SecurityOnePageCopy',
  'NOW',
  'USD/PLN',
  'NG=F',
  'one close controller',
]) if (!contract.includes(marker)) failures.push(`PASS402 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'PASS402_RUNTIME_CLOSE_EVENT',
  'buildPass402MarketCoverageUniverse',
  'buildPass402TerminalCleanOrbitReadout',
  'Object.assign(assetVisuals, pass402AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass402PseudoPricePatch)',
  'real-markets-pass402-clean-orbit',
  'real-markets-pass402-vlm-coin',
  'data-pass402-terminal-clean-orbit="true"',
  'data-pass402-search-runtime-lock={pass402TerminalCleanOrbit.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS402 marker: ${marker}`);

for (const [file, label] of [
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'Browser'],
  ['components/market-integrity/MarketIntegrityClient.tsx', 'Shield'],
  ['components/market-integrity/ShieldMapClient.tsx', 'Shield Map'],
]) {
  const source = read(file);
  for (const marker of ['PASS402_RUNTIME_CLOSE_EVENT', 'pass402TerminalCleanOrbit']) {
    if (!source.includes(marker)) failures.push(`${label} missing PASS402 marker: ${marker}`);
  }
}

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass402TerminalCleanOrbitReadout',
  'pass402Readout',
  'pass402BrainTimeline',
  'pass402TerminalCleanOrbit',
  'PASS402 TERMINAL CLEAN ORBIT',
  'pass402-terminal-clean-orbit',
  'if (page === 28)',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS402 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass402MarketCoverageUniverse', 'pass402TerminalCleanOrbit', 'pass402: pass402TerminalCleanOrbit']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS402 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS402 · terminal clean orbit controller',
  '.real-markets-pass402-clean-orbit',
  '.real-markets-pass402-vlm-coin',
  '[data-pass402-search-runtime-lock]',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS402 marker: ${marker}`);

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
  console.error('PASS402 terminal clean orbit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS402 terminal clean orbit passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
