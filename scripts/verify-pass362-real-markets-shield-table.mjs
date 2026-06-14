import { readFileSync } from "node:fs";

const files = {
  crossAsset: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  shieldMap: "components/market-integrity/ShieldMapClient.tsx",
  page: "app/[locale]/market-integrity/cross-asset/page.tsx",
  css: "app/globals.css",
};

const read = (file) => readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

const crossAsset = read(files.crossAsset);
const shieldMap = read(files.shieldMap);
const page = read(files.page);
const css = read(files.css);

assert(crossAsset.includes('data-pass362-real-markets-shield-table="true"'), "Real Markets PASS362 shell marker missing");
assert(crossAsset.includes('type RealMarketTab'), "segmented real market tabs missing");
assert(crossAsset.includes('RealMarketModal'), "chart modal missing");
assert(crossAsset.includes('Basic analysis') && crossAsset.includes('Pro review') && crossAsset.includes('Advanced analysis'), "analysis actions missing");
assert(crossAsset.includes('real-markets-pass362-row'), "Shield-style table rows missing");
assert(page.includes('data-pass362-real-markets-empty-shell="true"'), "cross-asset page not simplified");
assert(!page.includes('Real Markets Proof Passport.'), "old text-heavy hero still present");
assert(shieldMap.includes('data-pass362-scroll-anchored-portal="true"'), "Shield Map anchored portal marker missing");
assert(shieldMap.includes('data-pass362-legacy-scroll-resync="disabled-close-on-scroll"') || shieldMap.includes('window.addEventListener("scroll", scheduleSync, true)'), "Shield Map scroll resync/close-on-scroll marker missing");
assert(css.includes('.real-markets-pass362-table'), "PASS362 table CSS missing");
assert(css.includes('.real-markets-pass362-modal-layer'), "PASS362 modal CSS missing");

console.log('PASS362 verify OK: real markets Shield-style table + anchored Shield Map portal.');
