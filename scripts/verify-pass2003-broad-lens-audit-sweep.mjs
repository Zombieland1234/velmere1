import fs from 'node:fs';

const files = {
  lens: 'components/search/VelmereIntelligenceSearchClient.tsx',
  audit: 'components/security/SecurityAuditWatchPage.tsx',
  css: 'app/globals.css',
};

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

const lens = read(files.lens);
const audit = read(files.audit);
const css = read(files.css);

add('Lens depth modal has PASS2003 solid no-blur marker', lens.includes('data-pass2003-lens-depth-dialog="solid-cyan-owned-scroll-no-blur"'));
add('Lens forge modal has PASS2003 solid low-lag marker', lens.includes('data-pass2003-lens-forge-dialog="solid-low-lag-no-blur"'));
add('Lens preview modal has PASS2003 solid reader marker', lens.includes('data-pass2003-lens-preview-dialog="solid-reader-owned-scroll-no-blur"'));
add('Lens choice modal backdrop blur removed', !lens.includes('data-pass2003-lens-depth-dialog="solid-cyan-owned-scroll-no-blur"') || !/data-pass2003-lens-depth-dialog="solid-cyan-owned-scroll-no-blur"[\s\S]{0,420}backdrop-blur/.test(lens));
add('Lens forge modal backdrop blur removed', !lens.includes('data-pass2003-lens-forge-dialog="solid-low-lag-no-blur"') || !/data-pass2003-lens-forge-dialog="solid-low-lag-no-blur"[\s\S]{0,420}backdrop-blur/.test(lens));
add('Lens preview modal backdrop blur removed', lens.includes('velmere-lens-modal-root fixed inset-0 overflow-hidden overscroll-none bg-black/[0.985] p-3 md:p-6') && !lens.includes('velmere-lens-modal-root fixed inset-0 overflow-hidden overscroll-none bg-black/[0.985] p-3 backdrop-blur'));
add('Lens PDF depth uses cyan active card instead of gold block', lens.includes('border-cyan-200/[0.44] bg-cyan-300/[0.085]'));
add('Lens progress rail is low-lag cyan', lens.includes('bg-cyan-200 transition-[width] duration-300'));
add('Audit page has PASS2003 broad sweep marker', audit.includes('data-pass2003-audit-page-sweep="calm-cta-density-solid-cards"'));
add('Audit CTAs use compact utility density marker', audit.includes('data-pass2003-audit-cta-density="two-primary-compact-utilities-no-button-wall"'));
add('Audit major cards use solid no-gold windows', (audit.match(/data-pass2003-audit-window=/g) || []).length >= 3);
add('CSS contains PASS2003 lens no-blur rules', css.includes('PASS2003 — broad aesthetic + logic sweep'));
add('CSS contains audit CTA density rules', css.includes('two-primary-compact-utilities-no-button-wall'));
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
for (const check of checks) {
  console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
if (failed.length) {
  console.error(`PASS2003 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2003 verification passed: ${checks.length}/${checks.length}`);
