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
  cart: "components/CartDrawer.tsx",
  angel: "components/angel/AngelPanel.tsx",
  router: "components/search/VelmereLensCommandRouter.tsx",
  css: "app/globals.css",
};

const src = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS661–668 visual clarity gate failed: ${message}`);
    process.exit(1);
  }
}

// Browser: discovery before search, calmer result density and a compact depth contract.
assert(src.browser.includes("velmere-lens-discovery-card"), "Browser discovery cards missing");
assert(src.browser.includes("velmere-lens-depth-rail"), "Browser compact depth rail missing");
assert(src.browser.includes("waterfall.stages.slice(0, 3)"), "Browser confidence density was not reduced");
assert(src.browser.includes("?.metrics.slice(8, 10)"), "Browser advanced metric density was not reduced");
assert(!src.browser.includes("Result directly below search"), "old Browser implementation copy is still public");

assert(!src.router.match(/Title: "PASS\d+/), "Browser router still exposes numbered PASS titles");
assert(!src.router.includes("operator-only PDF preview"), "Browser router still exposes operator-only copy");

// Shield: search is understandable and the public surface does not expose terminal/runtime language.
assert(src.shield.includes('placeholder={t("searchLabel")}'), "Shield search placeholder missing");
assert(!src.shield.includes("review terminal"), "Shield still exposes terminal review copy");
assert(!src.shield.includes("opening terminal"), "Shield still exposes terminal opening copy");
assert(!src.shield.includes("Shield terminal safe mode"), "Shield still exposes technical safe-mode copy");

// Modal: chart-first hierarchy with only the evidence users need before opening deeper tiers.
assert(src.modal.includes("shield-token-modal-intro-grid-calm"), "calm Shield modal intro missing");
assert(src.modal.includes("shield-token-chart-command-strip-calm"), "calm chart command strip missing");
assert(!src.modal.includes("VLM token intelligence"), "legacy modal kicker is still visible");
assert(!src.modal.includes("<strong>PASS233"), "legacy PASS card is still visible in modal JSX");

// Shield Map: concise drawer instead of an operator document.
assert(src.map.includes("shield-map-focus-drawer-scroll-calm"), "compact Shield Map drawer missing");
assert(src.map.includes("evidencePathIsolation.visibleNodeIds.slice(0, 4)"), "Shield Map relationship density is not capped");
assert(src.map.includes("isolatedSourceRails.slice(0, 3)"), "Shield Map source density is not capped");
assert(!src.map.includes("Shield Map · focus"), "legacy technical drawer title is still visible");

// Global overlay constitution: side panels begin below the persistent header.
for (const [key, source] of [["cart", src.cart], ["angel", src.angel]]) {
  assert(source.includes("velmere-side-drawer-backdrop"), `${key} drawer backdrop contract missing`);
  assert(source.includes("velmere-side-drawer-panel"), `${key} drawer panel contract missing`);
}
assert(!src.cart.includes("z-[110]"), "cart drawer still contains a hard-coded z-index");
assert(!src.angel.includes("z-[240]"), "Angel panel still contains a hard-coded z-index");

const cssContracts = [
  ".velmere-side-drawer-backdrop",
  ".velmere-side-drawer-panel",
  ".velmere-lens-discovery-card",
  ".velmere-lens-depth-rail",
  ".shield-token-modal-intro-grid-calm",
  ".shield-token-chart-command-strip-calm",
  ".shield-map-focus-drawer-scroll-calm",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)",
];
for (const contract of cssContracts) {
  assert(src.css.includes(contract), `CSS contract missing: ${contract}`);
}

const parseFiles = Object.values(files).filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of parseFiles) {
  const result = ts.transpileModule(read(file), {
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

console.log(
  `PASS661–668 visual clarity release verified · ${parseFiles.length} TS/TSX files parsed · Browser/Shield/Map/drawers clean`,
);
