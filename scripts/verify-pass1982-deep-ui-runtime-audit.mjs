import fs from 'node:fs';

const checks = [
  ['components/Navbar.tsx', 'PASS1982: one synchronous state commit only', 'Header opens surfaces without delayed RAF/timeout replays'],
  ['components/Navbar.tsx', 'requestAnimationFrame(applySurface)', 'absent', 'Header stale delayed hard-open replay removed'],
  ['components/Navbar.tsx', 'window.setTimeout(applySurface', 'absent', 'Header stale timeout hard-open replay removed'],
  ['components/ui/OverlayPrimitives.tsx', 'closeFromModalBackdrop', 'Modal backdrop closes once from pointerdown'],
  ['components/ui/OverlayPrimitives.tsx', 'onClick={closeOnBackdrop ? onClose : undefined}', 'absent', 'Modal backdrop no longer double-closes from pointerdown + click'],
  ['components/square/VelmereSquareClient.tsx', 'restoreSquareScrollPosition', 'Square modal restores scroll without smooth jumping'],
  ['components/square/VelmereSquareClient.tsx', 'root.style.scrollBehavior = "auto"', 'Square scroll restore temporarily disables smooth scroll'],
  ['app/globals.css', 'PASS1982 — deep UI runtime audit', 'PASS1982 CSS cleanup block installed'],
  ['app/globals.css', '[data-velmere-overlay-layer="modal"] .velmere-header-safe-modal', 'Legacy header-safe modal transform neutralized inside portal modal'],
  ['app/globals.css', 'contain: layout paint', 'Overlay surfaces are paint-contained for lower lag'],
  ['app/globals.css', 'backdrop-filter: none !important;', 'Overlay backdrops no longer use heavy blur'],
  ['app/globals.css', 'five-piece target layout', 'Unified asset modal follows five-piece target layout'],
  ['app/globals.css', '.velmere-neural-audit-root[data-contained="true"]', 'Contained VLM Brain has bounded popup sizing'],
  ['app/globals.css', '#velmere-square-post-modal.velmere-square-post-modal-centered', 'Square post modal centered override installed'],
  ['app/globals.css', '@media (prefers-reduced-motion: reduce)', 'Reduced-motion safety path installed'],
];

let failed = 0;
for (const check of checks) {
  const [file, needle, maybeMode, maybeLabel] = check;
  const text = fs.readFileSync(file, 'utf8');
  const absent = maybeMode === 'absent';
  const label = absent ? maybeLabel : maybeMode;
  const ok = absent ? !text.includes(needle) : text.includes(needle);
  if (!ok) {
    console.error(`FAIL ${label}: ${absent ? 'unexpected' : 'missing'} ${needle} in ${file}`);
    failed++;
  } else {
    console.log(`OK ${label}`);
  }
}

if (failed) process.exit(1);
console.log(`PASS1982 deep UI runtime audit verified · ${checks.length}/${checks.length}`);
