import fs from 'node:fs';

const checks = [
  ['components/security/VlmAuditCommandClient.tsx', 'velmere-audit-brain-chat-drawer', 'Audit Watch side chat drawer'],
  ['components/security/VlmAuditCommandClient.tsx', 'auditChatLines', 'Audit Watch typed chat logic'],
  ['components/market-integrity/ShieldMapClient.tsx', 'shield-map-analysis-stage', 'Shield Map delayed analysis stage'],
  ['components/market-integrity/ShieldMapClient.tsx', 'shieldMapTypedLine', 'Shield Map stable typing line'],
  ['components/market-integrity/TokenRiskModal.tsx', 'label: "Advanced"', 'Shield modal Advanced label'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'label: "Advanced"', 'Real Markets modal Advanced label'],
  ['components/Navbar.tsx', 'auditBrowser: "Audit Browser"', 'Header Audit Browser label'],
  ['components/CartDrawer.tsx', 'velmere-cart-bottom-sheet', 'Cart bottom sheet shell'],
  ['components/wallet/WalletConnectOptions.tsx', '/wallets/metamask.svg', 'Real MetaMask icon'],
  ['components/wallet/WalletConnectOptions.tsx', '/wallets/phantom.svg', 'Real Phantom icon'],
  ['app/globals.css', 'PASS2028', 'PASS2028 CSS block'],
  ['app/globals.css', 'velmere-audit-typing-line', 'Audit typing no layout shift CSS'],
  ['app/globals.css', 'shield-map-typing-line', 'Shield Map typing no layout shift CSS'],
  ['app/globals.css', 'realmarkets-pass578-table.realmarkets-pass618-table', 'Real Markets table widened'],
  ['app/globals.css', 'velmereWalletSlide2028', 'Wallet side panel CSS'],
  ['app/globals.css', 'velmere-square-post-modal', 'Square post modal polish CSS'],
];

let failed = 0;
for (const [file, needle, label] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: missing ${needle} in ${file}`);
    failed += 1;
  } else {
    console.log(`[OK] ${label}`);
  }
}

const nav = fs.readFileSync('components/Navbar.tsx', 'utf8');
const linkOrder = [
  'href: "/vlm-token"',
  'href: "/shop"',
  'href: "/security/audits"',
  'href: "/security"',
];
let last = -1;
for (const token of linkOrder) {
  const idx = nav.indexOf(token, last + 1);
  if (idx === -1) {
    console.error(`[FAIL] Header nav order missing token: ${token}`);
    failed += 1;
    break;
  }
  last = idx;
}
if (!failed) console.log('[OK] PASS2028 visual stability contract passed');
process.exit(failed ? 1 : 0);
