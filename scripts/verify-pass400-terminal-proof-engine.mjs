import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts = null;
try { ts = require('typescript'); } catch { ts = null; }
const failures = [];
const read = (file) => readFileSync(file, 'utf8');

const contract = read('lib/market-integrity/pass400-terminal-proof-engine.ts');
for (const marker of [
  'PASS400.terminal_proof_engine',
  'PASS400_RUNTIME_CLOSE_EVENT',
  'buildPass400TerminalProofReadout',
  'buildPass400MarketCoverageUniverse',
  'pass400AssetVisualPatch',
  'pass400PseudoPricePatch',
  'pass400BrainTimeline',
  'pass400SecurityOnePageCopy',
  'ORCL',
  'USD/INR',
  'LBS=F',
  'one exact resolved payload',
]) if (!contract.includes(marker)) failures.push(`PASS400 contract missing marker: ${marker}`);

const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
for (const marker of [
  'PASS400_RUNTIME_CLOSE_EVENT',
  'buildPass400MarketCoverageUniverse',
  'buildPass400TerminalProofReadout',
  'Object.assign(assetVisuals, pass400AssetVisualPatch)',
  'Object.assign(pseudoPrices, pass400PseudoPricePatch)',
  'real-markets-pass400-proof-terminal',
  'real-markets-pass400-vlm-coin',
  'data-pass400-terminal-proof-engine="true"',
  'data-pass400-search-runtime-lock={pass400TerminalProofContract.version}',
]) if (!realMarkets.includes(marker)) failures.push(`Real Markets missing PASS400 marker: ${marker}`);

for (const [file, label] of [
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'Browser'],
  ['components/market-integrity/MarketIntegrityClient.tsx', 'Shield'],
  ['components/market-integrity/ShieldMapClient.tsx', 'Shield Map'],
]) {
  const source = read(file);
  for (const marker of ['PASS400_RUNTIME_CLOSE_EVENT', 'pass400TerminalProofContract']) {
    if (!source.includes(marker)) failures.push(`${label} missing PASS400 marker: ${marker}`);
  }
}

const route = read('app/api/search/lens-report/route.ts');
for (const marker of [
  'buildPass400TerminalProofReadout',
  'pass400Readout',
  'pass400BrainTimeline',
  'pass400TerminalProofContract',
  'PASS400 TERMINAL PROOF ENGINE',
  'pass400-terminal-proof-engine',
]) if (!route.includes(marker)) failures.push(`Lens PDF route missing PASS400 marker: ${marker}`);

const catalog = read('app/api/market-integrity/real-markets/catalog/route.ts');
for (const marker of ['buildPass400MarketCoverageUniverse', 'pass400TerminalProofContract', 'pass400: pass400TerminalProofContract']) {
  if (!catalog.includes(marker)) failures.push(`Real Markets catalog missing PASS400 marker: ${marker}`);
}

const css = read('app/globals.css');
for (const marker of [
  'PASS400 · terminal proof engine',
  '.real-markets-pass400-proof-terminal',
  '.real-markets-pass400-vlm-coin',
  '[data-pass400-search-runtime-lock]',
]) if (!css.includes(marker)) failures.push(`CSS missing PASS400 marker: ${marker}`);

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
  console.error('PASS400 terminal proof engine failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS400 terminal proof engine passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
