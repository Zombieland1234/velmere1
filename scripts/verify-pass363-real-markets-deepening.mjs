import fs from 'node:fs';

const checks = [];
function must(file, needle, label = needle) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = text.includes(needle);
  checks.push({ file, label, ok });
  if (!ok) console.error(`Missing ${label} in ${file}`);
}
function mustCountAtLeast(file, pattern, count, label) {
  const text = fs.readFileSync(file, 'utf8');
  const found = (text.match(pattern) || []).length;
  const ok = found >= count;
  checks.push({ file, label: `${label} >= ${count} (${found})`, ok });
  if (!ok) console.error(`Expected ${label} >= ${count}, found ${found}`);
}

must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass363-real-markets-browser-search="true"', 'Real Markets browser-style search marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass363-search-suggestions-portal="true"', 'Real Markets suggestion portal marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass363-all-class-expanded="true"', 'expanded market classes marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass363-advanced-shield-chart="true"', 'advanced Shield-like chart marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'createPortal(<RealMarketModal', 'modal is portaled above header');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'PLATINUM', 'expanded commodity universe');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'GOOGL', 'expanded stock universe');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'GBP/PLN', 'expanded FX universe');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'XLRE', 'expanded real estate universe');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'real-markets-pass363-logo', 'visible deterministic logo component');
must('components/market-integrity/ShieldMapClient.tsx', 'data-pass363-close-on-page-scroll="true"', 'Shield Map closes floating portal on page scroll');
must('app/globals.css', '.real-markets-pass363-search-portal', 'Real Markets search portal CSS');
must('app/globals.css', 'z-index: 10070', 'Real Markets modal above header');
must('app/globals.css', '.real-markets-pass363-candle-svg', 'advanced candle chart CSS');
mustCountAtLeast('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', /extraAsset\(/g, 35, 'extra assets');

if (checks.some((check) => !check.ok)) process.exit(1);
console.log('PASS363 real markets deepening guard passed');
