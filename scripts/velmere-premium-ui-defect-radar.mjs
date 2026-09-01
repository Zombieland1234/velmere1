#!/usr/bin/env node
import fs from 'node:fs';

const keyFiles = [
  'components/Navbar.tsx',
  'components/CartDrawer.tsx',
  'components/wallet/WalletConnectOptions.tsx',
  'components/market-integrity/MarketIntegrityClient.tsx',
  'components/market-integrity/RealMarketSearch.tsx',
  'components/market-integrity/ShieldMapClient.tsx',
  'components/market-integrity/VlmNeuralAuditExperience.tsx',
  'components/search/VelmereLensCommandRouter.tsx',
  'components/square/VelmereSquareClient.tsx',
  'app/globals.css'
];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const exists = keyFiles.filter((file) => fs.existsSync(file));
const missing = keyFiles.filter((file) => !fs.existsSync(file));
const source = Object.fromEntries(exists.map((file) => [file, read(file)]));
const containsAny = (text, list) => list.some((item) => text.toLowerCase().includes(item.toLowerCase()));

const checks = [
  { id: 'overlay_scroll_lock', surface: 'global', evidence: containsAny(source['app/globals.css'] || '', ['overflow: hidden', 'data-overlay', 'scroll-lock', 'modal-open']), severity: 'P0' },
  { id: 'overlay_z_index', surface: 'global', evidence: containsAny(source['app/globals.css'] || '', ['z-index: 999', 'z-[', '214748', '--overlay']), severity: 'P0' },
  { id: 'keyboard_escape_close', surface: 'global', evidence: containsAny(Object.values(source).join('\n'), ['keydown', 'Escape', 'onKeyDown']), severity: 'P1' },
  { id: 'wallet_options_limited', surface: 'wallet', evidence: containsAny(source['components/wallet/WalletConnectOptions.tsx'] || '', ['MetaMask', 'Phantom', 'Other']), severity: 'P1' },
  { id: 'cart_drawer_present', surface: 'commerce', evidence: Boolean(source['components/CartDrawer.tsx']), severity: 'P1' },
  { id: 'shield_tri_state_sort', surface: 'shield', evidence: containsAny(source['components/market-integrity/MarketIntegrityClient.tsx'] || '', ['tri', 'neutral', 'sortDirection', 'sortConfig']), severity: 'P0' },
  { id: 'chart_wheel_guard', surface: 'shield', evidence: containsAny(source['components/market-integrity/MarketIntegrityClient.tsx'] || '', ['preventDefault', 'wheel', 'onWheel']), severity: 'P0' },
  { id: 'real_markets_search', surface: 'real_markets', evidence: Boolean(source['components/market-integrity/RealMarketSearch.tsx']), severity: 'P1' },
  { id: 'lens_router_present', surface: 'lens_pdf', evidence: Boolean(source['components/search/VelmereLensCommandRouter.tsx']), severity: 'P1' },
  { id: 'vlm_brain_motion', surface: 'vlm_brain', evidence: containsAny(source['components/market-integrity/VlmNeuralAuditExperience.tsx'] || '', ['animate', 'motion', 'rotate', 'spin', 'requestAnimationFrame']), severity: 'P1' },
  { id: 'square_modal_safety', surface: 'square', evidence: containsAny(source['components/square/VelmereSquareClient.tsx'] || '', ['modal', 'dialog', 'overlay', 'fixed']), severity: 'P1' },
  { id: 'no_openai_hover_tooltip', surface: 'global', evidence: !containsAny(Object.values(source).join('\n'), ['title="OpenAI"', "title='OpenAI'", 'aria-label="OpenAI"']), severity: 'P2' }
];
const open = checks.filter((c) => !c.evidence);
const p0Open = open.filter((c) => c.severity === 'P0');
const result = {
  pass: 'PASS2161',
  name: 'Premium UI defect radar',
  status: p0Open.length ? 'P0_REVIEW_REQUIRED' : open.length ? 'PASS_WITH_REVIEW_QUEUE' : 'PASS',
  scannedFiles: exists.length,
  missingFiles: missing,
  checks,
  openChecks: open,
  p0Open,
  note: 'Static radar only; visual/mobile receipts are still required for real promotion.',
  generatedAt: new Date().toISOString()
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2161_PREMIUM_UI_DEFECT_RADAR.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (p0Open.length) process.exit(1);
