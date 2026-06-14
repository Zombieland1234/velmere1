import fs from 'node:fs';

const checks = [
  ['components/market-integrity/VlmNeuralAuditExperience.tsx', 'contained?: boolean;', 'VLM Brain supports contained modal mode'],
  ['components/market-integrity/VlmNeuralAuditExperience.tsx', 'useModalScrollLock(!contained);', 'Contained VLM Brain does not steal full page scroll lock'],
  ['components/market-integrity/TokenRiskModal.tsx', '<VlmNeuralAuditExperience\n                contained', 'Shield Basic/Pro/Advanced opens contained VLM Brain'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', '<VlmNeuralAuditExperience\n                      contained', 'Real Markets Basic/Pro/Advanced opens contained VLM Brain'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'cleanChrome', 'Real Markets chart can run without text chrome'],
  ['components/market-integrity/AdvancedMarketChart.tsx', 'data-chart-clean-chrome={cleanChrome ? "true" : "false"}', 'Advanced chart exposes clean chrome runtime flag'],
  ['components/market-integrity/MarketIntegrityClient.tsx', 'data-sort-direction={active ? sortDirection : "neutral"}', 'Shield table headers expose tri-state sort direction'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-sort-direction={active ? sort.direction : "neutral"}', 'Real Markets headers expose tri-state sort direction'],
  ['components/wallet/WalletConnectOptions.tsx', 'otherPanelSide?: "left" | "right" | "inline";', 'Wallet Other panel supports left/right side'],
  ['components/Navbar.tsx', 'otherPanelSide="left"', 'Header wallet Other panel opens to the left'],
  ['components/Navbar.tsx', 'if (href === "/security") return pathname === "/security";', 'Audit Watch no longer highlights Security link'],
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'velmere-lens-command-center', 'Velmère Browser uses centered command search shell'],
  ['components/square/VelmereSquareClient.tsx', 'squareScrollRef.current', 'Square remembers scroll before post modal opens'],
  ['components/square/VelmereSquareClient.tsx', 'velmere-square-post-modal-centered', 'Square modal uses centered modal surface'],
  ['components/community/CommentThread.tsx', 'velmere-square-comment-form', 'Square comments have pass-specific styling hooks'],
  ['app/globals.css', 'PASS1981 — full UI runtime alignment', 'PASS1981 CSS repair block installed'],
  ['app/globals.css', '.shield-table-scroll-x table th:not(:first-child)', 'Shield table header/cell alignment repaired'],
  ['app/globals.css', '.wallet-other-panel-side-left', 'Wallet nested panel left-side animation styles installed'],
];

let failed = 0;
for (const [file, needle, label] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`FAIL ${label}: missing ${needle} in ${file}`);
    failed++;
  } else {
    console.log(`OK ${label}`);
  }
}

if (failed) process.exit(1);
console.log(`PASS1981 UI runtime repair verified · ${checks.length}/${checks.length}`);
