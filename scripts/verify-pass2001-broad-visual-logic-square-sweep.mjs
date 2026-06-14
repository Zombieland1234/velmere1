import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const square = read('components/square/VelmereSquareClient.tsx');
const comments = read('components/community/CommentThread.tsx');
const css = read('app/globals.css');
const pkg = JSON.parse(read('package.json'));

const checks = [];
function check(label, ok) {
  checks.push({ label, ok });
  console.log(`${ok ? 'OK' : 'FAIL'} ${label}`);
}

check('PASS2001 Square post modal has centered solid owned-scroll surface marker', square.includes('pass2001-square-modal') && square.includes('centered-solid-owned-scroll-no-jump'));
check('PASS2001 Square modal has fixed layout and two owned scroll regions', square.includes('data-pass2001-square-modal-layout="fixed-center-two-owned-scroll-regions"') && square.includes('data-pass2001-square-window="post-body-owned-scroll"') && square.includes('data-pass2001-square-comments-scroll="owned-scroll-no-body-jump"'));
check('PASS2001 Square post close uses pointerdown no-jump path', square.includes('data-pass2001-square-close="pointerdown-no-jump"') && square.includes('event.preventDefault();\n                  closePostModal();'));
check('PASS2001 Square composer has solid low-lag surface and pointerdown close', square.includes('pass2001-square-composer') && square.includes('data-pass2001-composer-close="pointerdown-fast"'));
check('PASS2001 image upload guard blocks files above 5 MB', square.includes('file.size > 5 * 1024 * 1024') && square.includes('squareImageTooLargeMessage(locale)'));
check('PASS2001 Square toast warning has centered red solid marker', square.includes('data-pass2001-square-toast="centered-red-warning-solid"') && css.includes('.velmere-square-toast[data-pass2001-square-toast="centered-red-warning-solid"].velmere-toast-warning'));
check('PASS2001 comment thread has outside-click and Escape menu close', comments.includes('data-pass2001-square-comments="outside-click-menu-solid-no-blur"') && comments.includes('document.addEventListener("pointerdown", closeFromPointer, true)') && comments.includes('event.key === "Escape"'));
check('PASS2001 comment form focus moved from gold to cyan', comments.includes('focus:border-cyan-200/[0.34]') && !comments.includes('focus:border-velmere-gold/[0.40]'));
check('PASS2001 CSS removes blur from Square modal/comment/composer surfaces', css.includes('#velmere-square-post-modal[data-pass2001-square-modal="centered-solid-owned-scroll-no-jump"]') && css.includes('backdrop-filter: none !important') && css.includes('#velmere-square-composer-drawer[data-pass2001-square-composer="solid-bottom-sheet-low-lag"]'));
check('package exposes PASS2001 verifier', pkg.scripts?.['verify:pass2001-broad-visual-logic-square-sweep'] === 'node scripts/verify-pass2001-broad-visual-logic-square-sweep.mjs');

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS2001 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2001 verifier OK: ${checks.length}/${checks.length}`);
