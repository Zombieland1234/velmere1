import fs from 'node:fs';

const files = {
  account: 'components/account/ProfileAccountClient.tsx',
  auth: 'components/auth/AuthFormClient.tsx',
  checkoutPage: 'app/[locale]/checkout/page.tsx',
  checkoutBanner: 'components/checkout/CheckoutReadinessBanner.tsx',
  mail: 'components/contact/FloatingMailWidget.tsx',
  css: 'app/globals.css',
  packageJson: 'package.json',
};
const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (name, ok) => checks.push({ name, ok });

const account = read(files.account);
const auth = read(files.auth);
const checkoutPage = read(files.checkoutPage);
const checkoutBanner = read(files.checkoutBanner);
const mail = read(files.mail);
const css = read(files.css);
const pkg = read(files.packageJson);

add('Account profile has PASS2005 solid cyan marker', account.includes('data-pass2005-account-profile="solid-cyan-focus-no-row-lines"'));
add('Account profile fields use cyan focus instead of gold focus', account.includes('focus:border-cyan-200/[0.42]') && !account.includes('focus:border-velmere-gold/[0.40]'));
add('Auth form has PASS2005 solid no-heavy-blur marker', auth.includes('data-pass2005-auth-form="solid-cyan-focus-no-heavy-blur"'));
add('Auth wallet choices are low-lag cyan solid cards', auth.includes('data-pass2005-auth-wallet-choice="solid-cyan-low-lag"') && auth.includes('duration-150'));
add('Auth password toggle uses cyan focus', auth.includes('focus-visible:ring-cyan-200/[0.32]'));
add('Checkout page has PASS2005 sweep marker', checkoutPage.includes('data-pass2005-checkout-page="solid-cards-no-row-lines-cyan-focus"'));
add('Checkout state uses solid no-glass shell', checkoutPage.includes('data-pass2005-checkout-state="solid-no-glass"'));
add('Checkout status card removes gold block', checkoutPage.includes('data-pass2005-checkout-status="solid-cyan-no-gold-block"') && checkoutPage.includes('border-cyan-200/[0.12]'));
add('Checkout matrix cards are card-style low-lag not row lines', (checkoutPage.match(/data-pass2005-checkout-matrix-card=/g) || []).length === 1 && checkoutPage.includes('duration-150'));
add('Checkout readiness banner has PASS2005 solid marker', checkoutBanner.includes('data-pass2005-checkout-readiness-banner="solid-cyan-no-glass"'));
add('Private mail drawer locks page scroll while open', mail.includes('lockScroll={true}'));
add('Private mail drawer has PASS2005 surface data', mail.includes('pass2005: "solid-owned-scroll-file-guard"'));
add('Private mail drawer close button uses pointerdown fast close', mail.includes('onPointerDown={(event) => { event.preventDefault(); setOpen(false); }}'));
add('Private mail attachment has 5MB guard', mail.includes('maxAttachmentBytes = 5 * 1024 * 1024') && mail.includes('file.size > maxAttachmentBytes'));
add('PASS2005 CSS exists for solid cyan panels and owned scroll', css.includes('PASS2005 — broad account / auth / checkout / private mail visual + logic sweep') && css.includes('#velmere-private-mail-drawer[data-pass2005="solid-owned-scroll-file-guard"]'));
add('package.json contains PASS2005 verify script', pkg.includes('verify:pass2005-broad-account-auth-checkout-mail-sweep'));
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
  console.error(`PASS2005 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2005 verification passed: ${checks.length}/${checks.length}`);
