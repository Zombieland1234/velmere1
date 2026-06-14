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
  home: "components/home/HomePageClient.tsx",
  shop: "components/shop/ShopPageClient.tsx",
  product: "components/shop/ProductDetailClient.tsx",
  square: "components/square/VelmereSquareClient.tsx",
  vlm: "components/vlm/VlmAccessGatePage.tsx",
  vlmBuy: "components/vlm/VlmBuyAccessPanel.tsx",
  vlmShowcase: "components/vlm/VlmBasicProShowcase.tsx",
  vlmSystems: "components/vlm/VlmSelectedSystems.tsx",
  security: "components/security/SecurityTrustPage.tsx",
  navbar: "components/Navbar.tsx",
  footer: "components/Footer.tsx",
  auth: "components/auth/AuthGate.tsx",
  dashboard: "components/dashboard/DashboardClient.tsx",
  css: "app/globals.css",
};

const src = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS669–676 whole-product visual gate failed: ${message}`);
    process.exit(1);
  }
}

assert(src.home.includes("velmere-editorial-hero"), "home editorial hero contract missing");
assert(src.home.includes("{flow.map(([step, title, body]) => ("), "home still repeats the buying-principles cards above the fold");
assert(src.home.includes('readOnlyPreview: "Prywatny podgląd"'), "home still exposes read-only implementation copy");

assert(src.shop.includes("velmere-sticky-filter"), "shop filter is not header-safe and sticky");
assert(src.shop.includes("velmere-premium-tile velmere-command-shell"), "shop future-drop tiles were not visually upgraded");
assert(!src.shop.includes('issueTitle: "Status operatora"'), "shop still exposes operator status copy");
assert(!src.product.includes('providerMissing: "Operator review"'), "product detail still exposes operator review copy");

assert(src.square.includes("velmere-floating-action"), "Square composer action is not using the safe floating control");
assert(src.square.includes("launchText.checklist.slice(0, 2)"), "Square status density is not capped");
assert(!src.square.includes("top-1/2 z-[190]"), "Square action still blocks the middle of the viewport");
assert(!src.square.includes("COMMUNITY OS"), "Square still exposes internal OS language");

assert(src.vlm.includes('launchKicker: "status dostępu VLM"'), "VLM access status copy missing");
assert(!src.vlm.includes('value: "operator mode"'), "VLM still exposes operator mode");
assert(!src.vlm.includes("matryca startowa VLM"), "VLM still exposes launch-matrix wording");
assert(!src.vlmShowcase.includes("trybu operatorskiego"), "VLM showcase still exposes operator-interface copy");
assert(!src.vlmBuy.includes("podgląd read-only"), "VLM buy panel still exposes read-only implementation copy");
assert(!src.vlmSystems.includes('status: "Podgląd read-only"'), "VLM systems still expose read-only status copy");

assert(src.security.includes('className="hidden" aria-hidden="true"><SecurityOperationsChecklistPanel'), "public Security checklist is still visible");
assert(src.security.includes("{c.mapCardBody}"), "Security route card is not localized");
assert(src.security.includes("velmere-premium-tile"), "Security cards were not moved into the shared visual system");

assert(!src.footer.includes("kontroli launchu"), "footer still exposes launch-control copy");
assert(src.footer.includes("velmere-footer"), "footer visual contract missing");
assert(!src.auth.includes('gate: "Brama konta"'), "auth still exposes gate jargon");
assert(!src.dashboard.includes("Centrum dowodzenia membera"), "dashboard still exposes command-center copy");
assert(!src.navbar.includes("Prywatna konsola membera"), "navbar still exposes console jargon");

const cssContracts = [
  ".velmere-public-page",
  ".velmere-editorial-hero",
  ".velmere-surface-sheen",
  ".velmere-premium-tile",
  ".velmere-sticky-filter",
  ".velmere-floating-action",
  ".velmere-footer",
  "@media (prefers-reduced-motion: reduce)",
];
for (const contract of cssContracts) assert(src.css.includes(contract), `CSS contract missing: ${contract}`);

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
  const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = ts.flattenDiagnosticMessageText(errors[0].messageText, "\n");
    throw new Error(`${file}: TypeScript parse failed: ${message}`);
  }
}

console.log(`PASS669–676 whole-product visual release verified · ${parseFiles.length} TS/TSX files parsed · storefront/community/VLM/security/account clean`);
