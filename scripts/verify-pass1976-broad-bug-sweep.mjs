import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const assert = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const navbar = read('components/Navbar.tsx');
assert('navbar uses click-to-open header semantics', navbar.includes('header controls are click-to-open controls') && navbar.includes('setMenuOpen(surface === "menu")'));
for (const trigger of ['menu','language','wallet','account','mail','cart']) {
  assert(`header ${trigger} trigger has pass1976 marker`, navbar.includes(`data-pass1976-header-trigger="${trigger}-click-to-open"`));
}
assert('cart keyboard activation prevents page scroll and opens cart surface', navbar.includes('event.preventDefault();') && navbar.includes('openExclusiveHeaderSurface("cart")'));

const css = read('app/globals.css');
for (const id of ['velmere-header-language-menu','velmere-header-wallet-menu','velmere-header-account-menu','velmere-main-menu-drawer','velmere-private-mail-drawer','velmere-cart-bottom-sheet']) {
  assert(`css hardens ${id}`, css.includes(`#${id}`));
}
assert('css supports actual drawer overlay data attribute', css.includes('[data-velmere-overlay-layer="drawer"]'));
assert('css supports legacy drawer overlay data attribute', css.includes('[data-pass628-overlay-layer="drawer"]'));

const floatingMail = read('components/contact/FloatingMailWidget.tsx');
assert('mail drawer carries pass1976 visible marker', floatingMail.includes('pass1976: "visible-mail-drawer"'));

const lensReport = read('lib/search/lens-report.ts');
assert('Lens visual QA uses safe symbol string, not optional result.symbol', lensReport.includes('buildPass1274RuntimeVisualQaReleaseGate') && lensReport.includes('    symbol,\n    pass1234State'));

const realMarkets = read('app/api/market-integrity/real-markets/route.ts');
assert('real markets maps 15m UI range to supported provider range', realMarkets.includes('const providerRangeKey: Pass458RangeKey = rangeKey === "15m" ? "1h" : rangeKey') && realMarkets.includes('rangeKey: providerRangeKey'));
assert('real markets accepts 1w range explicitly', realMarkets.includes('rangeValue === "1w"'));

const pdfRoute = read('app/api/search/lens-report/route.ts');
assert('PDF tinyMeta accepts optional size/color arguments', pdfRoute.includes('valueSize = 9') && pdfRoute.includes('valueColor = "0.08 0.08 0.08"'));

const dashboard = read('components/dashboard/DashboardClient.tsx');
assert('dashboard card values are normalized to strings', dashboard.includes('type DashboardInfoCard') && dashboard.includes('const cards: DashboardInfoCard[]') && dashboard.includes('String(walletUi.shortAddress'));

const exts = ['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json'];
const missing = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const re = /(?:import(?:[^'\"]*from)?|export[^'\"]*from)\s*[\"'](@\/[^\"']+)[\"']/g;
      let match;
      while ((match = re.exec(text))) {
        const rel = match[1].slice(2);
        const candidates = [path.join(root, rel), ...exts.map((ext) => path.join(root, rel + ext)), ...exts.map((ext) => path.join(root, rel, 'index' + ext))];
        if (!candidates.some((candidate) => fs.existsSync(candidate))) missing.push(`${path.relative(root, full)} -> ${match[1]}`);
      }
    }
  }
}
walk(root);
assert('all @/ local imports resolve', missing.length === 0);
if (missing.length) console.error(missing.join('\n'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
if (failed.length) {
  console.error(`PASS1976 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1976 verifier OK: ${checks.length}/${checks.length}`);
