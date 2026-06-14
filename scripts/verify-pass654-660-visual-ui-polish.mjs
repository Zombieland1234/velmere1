import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const files = {
  browser: "components/search/VelmereIntelligenceSearchClient.tsx",
  shield: "components/market-integrity/MarketIntegrityClient.tsx",
  map: "components/market-integrity/ShieldMapClient.tsx",
  modal: "components/market-integrity/TokenRiskModal.tsx",
  markets: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  nav: "components/Navbar.tsx",
  css: "app/globals.css",
  searchApi: "app/api/search/route.ts",
  reportApi: "app/api/search/lens-report/route.ts",
};

const src = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS654–660 visual gate failed: ${message}`);
    process.exit(1);
  }
}

assert(src.browser.includes("velmere-lens-live-stage"), "Lens live visual stage missing");
assert(src.browser.includes('data-state={loading ? "scanning" : results.length ? "ready" : "idle"}'), "Lens visual state contract missing");
assert(src.browser.includes("velmere-lens-live-caption"), "Lens visual caption missing");
assert(!src.browser.includes("4-stage PDF forge · preview = download"), "technical PDF forge copy still visible");
assert(src.browser.includes('data-pass314-vlm-browser-simplified="true"'), "Browser public trim marker missing");

assert(src.shield.includes("shield-evidence-compass"), "Shield evidence compass missing");
assert(src.shield.includes('data-pass294-trust-signal-feed="shield-terminal"'), "Shield proof marker continuity missing");
assert(!src.shield.includes("PASS294 · Trust Signal Feed sync"), "Shield still renders PASS294 wall");
assert(!src.shield.includes("PASS313 · Atelier Access Runway sync"), "Shield still renders PASS313 wall");
assert(src.shield.includes("socialExchangeRouterGate.suggestions.reduce"), "Shield source coverage score missing");

assert(src.map.includes("Czytelna mapa bez technicznego szumu"), "Shield Map public simplification missing");
assert(src.map.includes("investigatorResult.lanes.slice(0, 4)"), "Shield Map lane density not reduced");
assert(src.map.includes("investigatorResult.answerContract.slice(0, 3)"), "Shield Map action density not reduced");
assert(!src.map.includes("mode · {investigatorResult.caseFrame.operatorMode}"), "Shield Map still exposes operator mode label");

assert(!src.modal.includes("`PASS463: ${symbol}"), "Token modal still exposes PASS463 prefix");
assert(!src.markets.includes('label: "PASS458 source contract"'), "Real Markets still exposes PASS458 label");
assert(!src.markets.includes('label: "PASS460 provider consensus"'), "Real Markets still exposes PASS460 label");
assert(!src.searchApi.includes("`PASS463: ${assetSymbol}"), "Search API still emits PASS463 prefix");
assert(!src.reportApi.includes("`PASS466 · CONFIDENCE WATERFALL"), "PDF API still emits PASS466 prefix");

assert(src.css.includes('[data-pass628-overlay-layer="drawer-backdrop"]'), "header-safe drawer backdrop rule missing");
assert(src.css.includes("--velmere-header-mobile: 68px"), "header height contract missing");
assert(src.css.includes(".velmere-lens-live-visual"), "Lens visual CSS missing");
assert(src.css.includes(".shield-evidence-compass-grid"), "Shield compass CSS missing");
assert(src.css.includes("@media (prefers-reduced-motion: reduce)"), "reduced-motion protection missing");

const parseFiles = Object.values(files).filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of parseFiles) {
  const source = read(file);
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    const message = ts.flattenDiagnosticMessageText(errors[0].messageText, "\n");
    throw new Error(`${file}: TypeScript parse failed: ${message}`);
  }
}

console.log(`PASS654–660 visual UI polish verified · ${parseFiles.length} TS/TSX files parsed · Lens/Shield/Map/header public surfaces clean`);
