import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
let ts = null;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch {
  ts = null;
}
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
function loadTypeScriptModule(relative) {
  if (!ts) {
    const source = read(relative);
    assert(source.includes("VELMERE_OVERLAY_LAYERS"));
    assert(source.includes("assertPass628LayerOrder"));
    return null;
  }
  const file = path.join(root, relative);
  const output = ts.transpileModule(read(relative), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true },
  });
  const diagnostics = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(diagnostics.length, 0, diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  const module = { exports: {} };
  new Function("module", "exports", output.outputText)(module, module.exports);
  return module.exports;
}
const layers = loadTypeScriptModule("lib/ui/pass628-overlay-constitution.ts");
if (layers) {
  assert.equal(layers.assertPass628LayerOrder(), true);
  assert(layers.VELMERE_OVERLAY_LAYERS.drawerBackdrop < layers.VELMERE_OVERLAY_LAYERS.drawer);
  assert(layers.VELMERE_OVERLAY_LAYERS.drawer < layers.VELMERE_OVERLAY_LAYERS.modalBackdrop);
  assert(layers.VELMERE_OVERLAY_LAYERS.modalBackdrop < layers.VELMERE_OVERLAY_LAYERS.modal);
  assert(layers.VELMERE_OVERLAY_LAYERS.modal < layers.VELMERE_OVERLAY_LAYERS.nestedBackdrop);
  assert(Math.max(...Object.values(layers.VELMERE_OVERLAY_LAYERS)) <= 100);
}
const primitives = read("components/ui/OverlayPrimitives.tsx");
for (const marker of ["BodyPortal", "useDialogFocusBoundary", "useModalScrollLock", "OverlayContentBoundary", "data-velmere-overlay-layer"]) assert(primitives.includes(marker));
const square = read("components/square/VelmereSquareClient.tsx");
assert(square.includes("<ModalRoot")); assert(square.includes("<DrawerRoot")); assert(!square.includes("createPortal"));
assert((square.match(/data-modal-scroll-region="true"/g) ?? []).length >= 3);
const lock = read("components/ui/useModalScrollLock.ts"); assert(lock.includes("closestGestureOwner")); assert(lock.includes('data-modal-wheel-owner="true"'));
assert(read("components/market-integrity/AdvancedMarketChart.tsx").includes('data-modal-wheel-owner="true"'));
assert((read("components/market-integrity/TokenRiskModal.tsx").match(/data-modal-wheel-owner="true"/g) ?? []).length >= 2);
const walletConnect = read("components/wallet/WalletConnectOptions.tsx"); assert(walletConnect.includes("<DrawerRoot")); assert(walletConnect.includes("wallet-other-list")); assert(walletConnect.includes("data-modal-scroll-region=\"true\""));
const cart = read("components/CartDrawer.tsx"); assert(cart.includes("<DrawerRoot")); assert((cart.match(/data-modal-scroll-region="true"/g) ?? []).length >= 2);
const css = read("app/globals.css"); for (const marker of ["--velmere-layer-drawer: 70", "--velmere-layer-modal-backdrop: 80", "--velmere-layer-modal: 90", "--velmere-layer-nested-modal: 94", "--velmere-layer-tooltip: 96"]) assert(css.includes(marker));
console.log("PASS752–756 overlay foundation PASS");
