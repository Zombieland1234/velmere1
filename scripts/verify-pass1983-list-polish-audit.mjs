import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const has = (file, needle, label = needle) => {
  const ok = read(file).includes(needle);
  checks.push({ ok, label: `${file}: ${label}` });
};

has('components/market-integrity/MarketIntegrityClient.tsx', 'const SHIELD_RUNTIME_CLOSE_EVENTS = [', 'runtime close events collapsed into array');
has('components/market-integrity/MarketIntegrityClient.tsx', 'PASS418_RUNTIME_CLOSE_EVENT', 'PASS418 close event included');
has('components/market-integrity/MarketIntegrityClient.tsx', 'SHIELD_RUNTIME_CLOSE_EVENTS.forEach((eventName) => {\n      window.addEventListener', 'runtime listeners use loop');
has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1983-five-piece-modal="icon-readout-chart-depth-contained-brain"', 'five-piece asset modal marker');
has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1983-chart-wheel-policy="normal-scroll-modifier-zoom"', 'chart wheel policy no unconditional preventDefault');
has('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-depth-layout="fly-in"', 'analysis rail fly-in marker');
has('components/market-integrity/VlmNeuralAuditExperience.tsx', 'data-pass1983-contained-vlm={contained ? "inside-asset-popup" : "fullscreen"}', 'contained VLM marker');
has('components/market-integrity/VlmNeuralAuditExperience.tsx', 'aria-modal={contained ? "false" : "true"}', 'contained nested dialog is not aria-modal takeover');
has('components/market-integrity/ShieldMapCommandClient.tsx', 'shield-map-command-page', 'Shield Map clean command page class');
has('components/market-integrity/ShieldMapCommandClient.tsx', 'shield-map-unified-search-shell', 'Shield Map centered search shell');
has('components/market-integrity/ShieldMapCommandClient.tsx', 'shield-map-command-pills', 'Shield Map quick pills');
has('components/search/VelmereIntelligenceSearchClient.tsx', 'data-pass1983-browser-command-screen="chatgpt-like-centered"', 'Browser command center marker');
has('components/wallet/WalletConnectOptions.tsx', 'data-pass1983-wallet-mark="metamask-original-inspired"', 'MetaMask original-inspired mark');
has('components/wallet/WalletConnectOptions.tsx', 'data-pass1983-wallet-mark="phantom-original-inspired"', 'Phantom original-inspired mark');
has('components/wallet/WalletConnectOptions.tsx', 'setOtherOpen((current) => !current)', 'Other wallets toggles open/close');
has('components/square/VelmereSquareClient.tsx', 'squareScrollRestoreTicketRef', 'Square scroll restore ticket guard');
has('components/square/VelmereSquareClient.tsx', '"pass1983-scroll-restore": "stable-no-jump"', 'Square modal scroll restore marker');
has('components/ui/OverlayPrimitives.tsx', 'transition={{ duration: 0.32', 'dropdown animation slowed');
has('components/ui/OverlayPrimitives.tsx', 'motionPreset === "bottom" ? 0.92 : 0.64', 'drawer animation slowed');
has('app/globals.css', 'PASS1983 — list-driven polish', 'PASS1983 CSS block');
has('app/globals.css', '@keyframes velmerePass1983DepthJoin', 'analysis buttons fly-in keyframes');
has('app/globals.css', '.velmere-neural-audit-root[data-contained="true"][data-pass606-evidence-driven-neural-motion]', 'contained VLM z-index override');
has('app/globals.css', '.shield-map-command-page .shield-map-command-center', 'Shield Map command CSS');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.label}`);
}
if (failed.length) {
  console.error(`\n${failed.length} PASS1983 checks failed.`);
  process.exit(1);
}
console.log(`\nPASS1983 list polish audit checks passed: ${checks.length}/${checks.length}`);
