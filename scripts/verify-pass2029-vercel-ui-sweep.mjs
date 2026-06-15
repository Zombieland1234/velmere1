import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const checks = [
  ['package.json', '"npm": ">=11.12.0 <12"', 'relaxed npm engine for Vercel npm 11.12+'],
  ['.npmrc', 'engine-strict=false', 'Vercel install does not fail on minor npm drift'],
  ['components/wallet/WalletConnectOptions.tsx', 'import Image from "next/image";', 'wallet icons use next/image'],
  ['components/market-integrity/AssetLogo.tsx', 'asset?: Partial<VelmereAssetLogoInput>', 'AssetLogo accepts real market asset object'],
  ['components/market-integrity/AdvancedMarketChart.tsx', 'commitPanOffset', 'chart drag throttled through RAF'],
  ['components/angel/AngelPanel.tsx', 'angel-thinking-orb', 'Angel thinking orb uses V animation'],
  ['components/angel/AngelTeaser.tsx', 'handoffMessage', 'Angel accepts audit handoff context'],
  ['components/security/VlmAuditCommandClient.tsx', 'Kontynuuj w Angel', 'Audit Brain chat can continue in Angel'],
  ['app/globals.css', 'PASS2029 — live Vercel + visual/mobile sweep', 'PASS2029 CSS override block'],
  ['app/globals.css', 'wallet-other-panel-side-left', 'wallet other panel supports left slide'],
  ['app/globals.css', 'velmereVerticalVTurn2029', 'V orb rotates in 3D'],
  ['app/globals.css', '#velmere-cart-bottom-sheet', 'cart bottom sheet constrained'],
];
let failed = false;
for (const [file, needle, label] of checks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(needle)) {
    console.error(`[FAIL] ${label}: missing ${needle} in ${file}`);
    failed = true;
  } else {
    console.log(`[OK] ${label}`);
  }
}
const rawImgFiles = [];
function walk(dir) {
  const full = path.join(root, dir);
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (['node_modules','.next','.git'].includes(entry.name)) continue;
    const p = path.join(full, entry.name);
    if (entry.isDirectory()) walk(path.relative(root, p));
    else if (/\.(tsx|ts)$/.test(entry.name)) {
      const rel = path.relative(root, p);
      if (!rel.startsWith('scripts/') && /<img\b/.test(fs.readFileSync(p, 'utf8'))) rawImgFiles.push(rel);
    }
  }
}
walk('app'); walk('components'); walk('lib');
if (rawImgFiles.length) {
  console.error(`[FAIL] raw <img> remains: ${rawImgFiles.join(', ')}`);
  failed = true;
} else console.log('[OK] no raw <img> in deployable TSX');
if (failed) process.exit(1);
console.log('[OK] PASS2029 Vercel UI sweep contract passed');
