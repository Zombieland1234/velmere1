import fs from 'node:fs';

const files = {
  access: 'components/vlm/VlmAccessGatePage.tsx',
  basicPro: 'components/vlm/VlmBasicProShowcase.tsx',
  actionBar: 'components/vlm/VlmActionBar.tsx',
  buyPanel: 'components/vlm/VlmBuyAccessPanel.tsx',
  modeSwitch: 'components/vlm/VlmModeSwitch.tsx',
  css: 'app/globals.css',
  packageJson: 'package.json',
};

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

const access = read(files.access);
const basicPro = read(files.basicPro);
const actionBar = read(files.actionBar);
const buyPanel = read(files.buyPanel);
const modeSwitch = read(files.modeSwitch);
const css = read(files.css);
const pkg = read(files.packageJson);

add('VLM access page has PASS2004 broad sweep marker', access.includes('data-pass2004-vlm-access-page="tokenomics-cards-risk-solid-cyan-polish"'));
add('Tokenomics changed from row/divide table to cards grid', access.includes('data-pass2004-tokenomics-grid="cards-not-row-lines"') && !access.includes('mt-7 divide-y divide-white/[0.10]'));
add('Risk card uses solid cyan no-gold-block class marker', access.includes('pass2004-vlm-risk-card') && access.includes('border-cyan-200/[0.14] bg-[#0a0d10]'));
add('Utility cards use calmer hover class marker', access.includes('pass2004-utility-card') && access.includes('hover:border-cyan-200/[0.18]'));
add('Basic/Pro showcase has PASS2004 solid no-heavy-blur marker', basicPro.includes('data-pass2004-vlm-basic-pro="solid-no-heavy-blur-low-lag"'));
add('Signal visual uses cyan solid marker', basicPro.includes('data-pass2004-vlm-signal-visual="solid-cyan-no-heavy-blur"') && basicPro.includes('border border-cyan-200/[0.14]'));
add('Basic/Pro showcase no heavy backdrop blur utilities remain', !/backdrop-blur-(xl|2xl)/.test(basicPro));
add('Basic/Pro showcase has no malformed Tailwind opacity chains', !/\]\s*\/\s*\[/.test(basicPro));
add('VLM actionbar has cyan focus low-lag marker', actionBar.includes('data-pass2004-vlm-actionbar="cyan-focus-low-lag"') && actionBar.includes('focus:ring-cyan-200/[0.22]'));
add('VLM buy floating access has solid no-blur marker', buyPanel.includes('data-pass2004-vlm-floating-access="solid-no-blur-low-lag"') && !buyPanel.includes('backdrop-blur-2xl'));
add('VLM buy drawer gets PASS2004 surfaceData', buyPanel.includes('pass2004: "solid-owned-scroll-low-lag"'));
add('VLM buy close button uses pointerdown fast close', buyPanel.includes('onPointerDown={(event) => { event.preventDefault(); setOpen(false); }}'));
add('VLM mode switch has solid no-blur marker', modeSwitch.includes('data-pass2004-vlm-mode-switch="solid-no-blur-low-lag"') && !modeSwitch.includes('backdrop-blur-2xl'));
add('VLM chart trigger/modal have PASS2004 markers', modeSwitch.includes('data-pass2004-vlm-chart-trigger="solid-no-blur"') && modeSwitch.includes('pass2004: "solid-chart-modal-owned-scroll"'));
add('VLM chart close button uses pointerdown fast close', modeSwitch.includes('onPointerDown={(event) => { event.preventDefault(); setChartOpen(false); }}'));
add('PASS2004 CSS exists for solid panels and cyan focus', css.includes('PASS2004 — broad VLM access / token / wallet visual + logic sweep') && css.includes('data-pass2004-vlm-actionbar="cyan-focus-low-lag"'));
add('No unsupported data-pass2004 props are passed directly into Reveal', !/<Reveal[^>]*data-pass2004/.test(access));
add('package.json contains PASS2004 verify script', pkg.includes('verify:pass2004-broad-vlm-access-sweep'));
add('package.json parses', (() => {
  try { JSON.parse(pkg); return true; } catch { return false; }
})());
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
  console.error(`PASS2004 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2004 verification passed: ${checks.length}/${checks.length}`);
