import fs from 'node:fs';

const files = {
  home: 'components/home/HomePageClient.tsx',
  dashboard: 'components/dashboard/DashboardClient.tsx',
  footer: 'components/Footer.tsx',
  cookie: 'components/CookieConsent.tsx',
  css: 'app/globals.css',
  packageJson: 'package.json',
};
const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (name, ok) => checks.push({ name, ok });

const home = read(files.home);
const dashboard = read(files.dashboard);
const footer = read(files.footer);
const cookie = read(files.cookie);
const css = read(files.css);
const pkg = read(files.packageJson);

add('Home page has PASS2006 storefront sweep marker', home.includes('data-pass2006-home-storefront-sweep="solid-home-footer-cookie-dashboard-low-lag"'));
add('Home hero/cards/sections have PASS2006 premium window markers', (home.match(/pass2006-home-/g) || []).length >= 10);
add('Home hover polish moved away from heavy gold hover', home.includes('hover:border-cyan-200/[0.20]') && home.includes('duration-300'));
add('Dashboard has PASS2006 cyan no-row-line marker', dashboard.includes('data-pass2006-dashboard="solid-tabs-cyan-no-row-lines-low-lag"'));
add('Dashboard active wallet/command highlights are cyan not gold blocks', dashboard.includes('border-cyan-200/[0.16]') && dashboard.includes('pass2006-dashboard-command'));
add('Dashboard tabs expose aria-current and controlled panel region', dashboard.includes('aria-current={active === tab ? "page" : undefined}') && dashboard.includes('role="region"'));
add('Footer has PASS2006 no-row-link marker', footer.includes('data-pass2006-footer="solid-cards-no-row-link-chaos"'));
add('Footer English nav parity includes Security link', footer.includes('{ href: "/security", label: "Security" }'));
add('Footer trust/status cards use PASS2006 card markers', footer.includes('pass2006-footer-status') && footer.includes('pass2006-footer-trust-card'));
add('Cookie consent has PASS2006 solid low-lag marker', cookie.includes('data-pass2006-cookie="solid-low-lag-cyan-focus-owned-settings"'));
add('Cookie animation timings are reduced for lower lag', cookie.includes('transition={{ duration: 0.22') && cookie.includes('transition={{ duration: 0.18'));
add('Cookie focus and accent moved to cyan instead of gold block', cookie.includes('focus-visible:ring-cyan-200/[0.38]') && cookie.includes('via-cyan-200/[0.28]') && cookie.includes('text-cyan-100'));
add('PASS2006 CSS exists and scopes solid no-blur surfaces', css.includes('PASS2006 — broad home / dashboard / footer / cookie aesthetic logic sweep') && css.includes('backdrop-filter: none !important'));
add('PASS2006 CSS includes cyan focus and no-row footer guards', css.includes('[data-pass2006-footer="solid-cards-no-row-link-chaos"] a:focus-visible') && css.includes('border: 0 !important'));
add('PASS2006 CSS includes reduced-motion guard', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('[data-pass2006-cookie="solid-low-lag-cyan-focus-owned-settings"] *'));
add('package.json contains PASS2006 verify script', pkg.includes('verify:pass2006-broad-home-dashboard-footer-cookie-sweep'));
add('package.json parses', (() => { try { JSON.parse(pkg); return true; } catch { return false; } })());
add('CSS braces are balanced', (() => {
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
})());

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}`);
if (failed.length) {
  console.error(`PASS2006 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2006 verification passed: ${checks.length}/${checks.length}`);
