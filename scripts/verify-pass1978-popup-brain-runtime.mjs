import fs from 'node:fs';

const checks = [
  ['components/market-integrity/TokenRiskModal.tsx', [
    'setVlmSequenceMode(normalizedTier)',
    '<VlmNeuralAuditExperience',
    'onClose={() => completeVlmAiSequence(vlmSequenceMode)}',
    'evidence={vlmAuditEvidence}',
  ]],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', [
    '<VlmNeuralAuditExperience',
    'evidence={auditEvidence}',
    'onClose={() => setAuditMode(null)}',
  ]],
  ['components/ui/OverlayPrimitives.tsx', [
    'data-velmere-drawer-backdrop-surface={overlaySurface}',
  ]],
  ['components/Navbar.tsx', [
    'onClick={() => openExclusiveHeaderSurface("cart")}',
  ]],
  ['components/CartDrawer.tsx', [
    'motionDuration={0.82}',
  ]],
  ['app/globals.css', [
    'PASS1978 — popup visibility',
    'data-velmere-drawer-backdrop-surface="main-menu"',
    'velmereDepthFly1978',
    'velmereAssetModalRise1978',
  ]],
];

let failures = 0;
for (const [file, needles] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`Missing ${needle} in ${file}`);
      failures += 1;
    }
  }
}

const navbar = fs.readFileSync('components/Navbar.tsx', 'utf8');
if (navbar.includes('onPointerDownCapture={() => openCart()}')) {
  console.error('Cart trigger still double-opens on pointerdown and click.');
  failures += 1;
}

if (failures) process.exit(1);
console.log('PASS1978 PASS — popup backdrops lightened, cart/menu lag reduced, Shield and Real Markets depth buttons now launch VLM Brain.');
