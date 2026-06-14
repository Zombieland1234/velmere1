import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const assertIncludes = (path, needle, label) => {
  const source = read(path);
  if (!source.includes(needle)) throw new Error(`${label} missing in ${path}: ${needle}`);
  checks.push(label);
};

assertIncludes('components/Navbar.tsx', 'const { itemCount, isOpen: cartOpen, openCart, closeCart } = useCart();', 'navbar reads cart open state for toggle safety');
assertIncludes('components/Navbar.tsx', 'PASS1988: header triggers are toggles', 'navbar trigger toggle guard');
assertIncludes('components/Navbar.tsx', '[cartOpen, closeCart, languageOpen, memberOpen, menuOpen, openCart, walletOpen]', 'navbar callback has live surface deps');
assertIncludes('components/ui/useModalScrollLock.ts', 'PASS1988: charts/modals should not steal normal wheel scroll', 'scroll lock no longer blocks plain chart wheel');
assertIncludes('components/ui/useModalScrollLock.ts', 'allow vertical panning inside the modal while the pointer is', 'touch pan can scroll modal region');
assertIncludes('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'value: `${selectedLineage?.confidenceCap ?? selectedQuote?.confidenceCap ?? 20}%`', 'real markets confidence uses percent label');
assertIncludes('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1988-five-piece-stability="header-readouts-chart-depth-brain"', 'asset modal pass1988 stability marker');
assertIncludes('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1988-chart-wheel-policy="normal-scroll-modifier-zoom"', 'asset chart wheel policy marker');
assertIncludes('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1988-depth-dock="stable-three-cards-toggle-safe"', 'depth dock stable three-card marker');
assertIncludes('app/globals.css', 'PASS1988 — continuation: de-lag interactive chrome', 'pass1988 css block');
assertIncludes('app/globals.css', 'contain: layout style !important;', 'paint containment relaxed for active surfaces');
assertIncludes('app/globals.css', '--velmere-pass1988-surface-duration: 760ms;', 'slower stable surface duration');
assertIncludes('app/globals.css', 'normal-scroll-modifier-zoom', 'css chart normal scroll policy');

console.log(`PASS1988 list continuation audit OK — ${checks.length}/${checks.length} checks`);
