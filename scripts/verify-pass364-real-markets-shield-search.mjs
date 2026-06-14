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

must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass364-real-logo-img="true"', 'Real Markets remote logo marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'externalLogoUrls', 'external logo URL resolver');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'real-markets-pass364-logo-image', 'visible remote-logo background renderer');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass364-body-scroll-lock="true"', 'modal body scroll lock marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'document.body.style.overflow = "hidden"', 'body scroll lock implementation');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass364-ohlc-volume-ma="true"', 'advanced OHLC/volume/MA chart marker');
must('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'const [mode, setMode]', 'Basic/Pro/Advanced active state');
must('components/market-integrity/MarketIntegrityClient.tsx', 'import { createPortal } from "react-dom";', 'Shield search portal import');
must('components/market-integrity/MarketIntegrityClient.tsx', 'data-pass364-shield-search-browser-portal="true"', 'Shield browser search portal marker');
must('components/market-integrity/MarketIntegrityClient.tsx', 'createPortal(', 'Shield search creates body portal');
must('components/market-integrity/MarketIntegrityClient.tsx', 'window.addEventListener("scroll", handleScroll, true)', 'Shield search closes on scroll to prevent lag/jump');
must('app/globals.css', '.shield-token-search-suggest-pass364', 'Shield pass364 portal CSS');
must('app/globals.css', 'z-index: 2147483200', 'Real Markets modal above header hard z-index');
must('app/globals.css', '.real-markets-pass363-logo .real-markets-pass364-logo-image', 'Real Markets image logo CSS');
mustCountAtLeast('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', /brandIcon\(/g, 20, 'curated logo resolvers');

if (checks.some((check) => !check.ok)) process.exit(1);
console.log('PASS364 real markets + Shield search guard passed');
