import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const expect = (file, markers) => {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file}: missing ${marker}`);
  }
};

expect("components/ui/useModalScrollLock.ts", [
  "__velmereModalScrollLock",
  "body.style.position = \"fixed\"",
  "html.dataset.velmereScrollLocked",
  "window.scrollTo(current.scrollX, current.scrollY)",
]);
expect("components/wallet/WalletConnectOptions.tsx", [
  "useModalScrollLock(open)",
  "data-modal-scroll-region=\"true\"",
  "overscroll-contain",
]);
expect("components/market-integrity/TokenRiskModal.tsx", [
  "useModalScrollLock(mounted)",
  "data-chart-gesture-surface=\"pan-pinch-wheel\"",
  "setChartZoom",
  "shield-chart-gesture-controls",
  "data-modal-scroll-region=\"true\"",
]);
expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "useModalScrollLock(Boolean(selected))",
  "data-modal-scroll-region=\"true\"",
]);
expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  "useModalScrollLock(pdfModalActive)",
  "data-modal-scroll-region=\"true\"",
]);
expect("components/vlm/VlmModeSwitch.tsx", [
  "useModalScrollLock(chartOpen)",
  "z-[100000]",
  "data-modal-scroll-region=\"true\"",
  "aria-label={t(\"chartClose\")}",
]);
expect("components/vlm/VlmBasicProShowcase.tsx", [
  "setChartOpen(false)",
  "aria-label={t(\"pro.chartHide\")}",
  "meaningTitle",
]);
expect("components/market-integrity/MarketIntegrityClient.tsx", [
  "shield-product-nav-grid",
  "shield-product-nav-browser",
  "shield-product-nav-markets",
]);
expect("lib/market-integrity/asset-logo-resolver.ts", [
  "KUCOIN",
  "BITGET",
  "TSLA",
  "XAU/USD",
  'assetClass === "index"',
]);
expect("app/globals.css", [
  "data-velmere-scroll-locked",
  "shield-chart-gesture-controls",
  "shield-product-nav-browser",
  "velmere-asset-logo-exchange",
]);

for (const locale of ["en", "pl", "de"]) {
  expect(`messages/${locale}.json`, [
    '"transitionBasic"',
    '"transitionPro"',
    '"meaningTitle"',
  ]);
}

if (failures.length) {
  console.error(`PASS476 verifier failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS476 mobile modal/chart/icon/i18n verifier OK");
