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

const route = readFileSync('app/api/search/lens-report/route.ts', 'utf8');
if (!route.includes('const resolvedReportSymbol = reportSymbolCandidate || routeSymbolFallback;')) {
  failures.push('lens-report route does not centralize report symbol fallback');
}
if (/symbol:\s*result\?\.symbol\s*\?\?\s*cleanQuery\.toUpperCase\(\)\s*\|\|/.test(route)) {
  failures.push('lens-report route still mixes ?? with || in symbol fields');
}
if (/const\s+reportSymbol\s*=\s*result\?\.symbol\s*\?\?\s*cleanQuery\.toUpperCase\(\)\s*\|\|/.test(route)) {
  failures.push('lens-report route still mixes ?? with || in reportSymbol');
}

const browser = readFileSync('components/search/VelmereIntelligenceSearchClient.tsx', 'utf8');
for (const marker of [
  'data-pass394-build-runtime-cleanup="true"',
  'data-pass394-search-anchor-lock="close-on-page-scroll"',
  'setSuggestionFrame(null);',
]) {
  if (!browser.includes(marker)) failures.push(`Browser missing marker/lock: ${marker}`);
}
if (browser.includes('window.addEventListener("scroll", updateFrame, true)')) {
  failures.push('Browser suggestions still remeasure on page scroll instead of closing');
}

const shieldMap = readFileSync('components/market-integrity/ShieldMapClient.tsx', 'utf8');
if (!shieldMap.includes('suggestionsOpen && !investigatorLoading && investigatorSuggestFrame && typeof document !== "undefined"')) {
  failures.push('Shield Map suggestions can still render from fallback coordinates');
}
if (!shieldMap.includes('data-pass394-no-fallback-portal-position="true"')) {
  failures.push('Shield Map PASS394 no-fallback marker missing');
}

const realMarkets = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
if (!realMarkets.includes('data-pass394-close-on-page-scroll="true"')) {
  failures.push('Real Markets search portal close-on-scroll marker missing');
}
if (realMarkets.includes('window.addEventListener("scroll", update, { passive: true, capture: true })')) {
  failures.push('Real Markets suggestions still drag/reposition on page scroll');
}

const shield = readFileSync('components/market-integrity/MarketIntegrityClient.tsx', 'utf8');
if (!shield.includes('data-pass394-search-anchor-lock="true"')) failures.push('Shield main PASS394 anchor marker missing');
if (!shield.includes('setSuggestPanelFrame(null);')) failures.push('Shield main scroll close does not clear stale frame');

const style = readFileSync('app/globals.css', 'utf8');
if (!style.includes('PASS394 · build/runtime cleanup')) failures.push('PASS394 CSS block missing');
if (!style.includes('body[data-velmere-pdf-modal-open="true"]')) failures.push('PASS394 PDF modal z-index/body lock CSS missing');

const files = globSync('app/**/*.ts?(x)').concat(globSync('components/**/*.ts?(x)'), globSync('lib/**/*.ts?(x)'));
if (ts) {
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const out = ts.transpileModule(text, {
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });
    const errors = (out.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length) {
      for (const diagnostic of errors) {
        const position = diagnostic.file && diagnostic.start !== undefined
          ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
          : null;
        const where = position ? `${position.line + 1}:${position.character + 1}` : 'unknown';
        failures.push(`${file}:${where}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
      }
    }
  }
} else {
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (/result\?\.symbol\s*\?\?\s*cleanQuery\.toUpperCase\(\)\s*\|\|/.test(text)) {
      failures.push(`${file}: risky ?? / || fallback pattern detected`);
    }
  }
}

if (failures.length) {
  console.error('PASS394 build/runtime cleanup failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS394 build/runtime cleanup passed (${files.length} TS/TSX files scanned${ts ? ' with TypeScript parser' : ' with fallback regex parser'}).`);
