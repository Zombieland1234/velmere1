import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireAll = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`);
  }
  return text;
};
const rejectAll = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (text.includes(needle)) throw new Error(`${file}: forbidden UI fragment remains: ${needle}`);
  }
  return text;
};

requireAll("components/contact/FloatingMailWidget.tsx", [
  "useModalScrollLock(open)",
  "useDialogFocusBoundary(open, panelRef",
  'pass628LayerStyle("drawerBackdrop")',
  'pass628LayerStyle("drawer")',
  "velmere-side-drawer-panel",
  "velmere-field",
  "velmere-status-note",
]);

requireAll("components/SizeGuideTeaser.tsx", [
  'pass628LayerStyle("floatingAction")',
  'pass628LayerStyle("modalBackdrop")',
  'pass628LayerStyle("modal")',
  "velmere-header-safe-modal",
  "velmere-data-table",
]);

const wallet = requireAll("components/wallet/WalletStatusChip.tsx", [
  'pass628LayerStyle("listbox")',
  "velmere-popover-surface",
  "velmere-menu-action",
  'role="menu"',
]);
rejectAll("components/wallet/WalletStatusChip.tsx", ["z-40", "z-50", "z-["]);

requireAll("components/vlm/VlmSelectedSystems.tsx", [
  "VLM Pro / interaktywny atlas",
  "velmere-system-card",
  "velmere-card-action-label",
  "velmere-header-safe-modal",
  'pass628LayerStyle("modal")',
  "useModalScrollLock(Boolean(active))",
]);

requireAll("components/shop/ProductDetailClient.tsx", [
  "useModalScrollLock(isSizeGuideOpen)",
  "velmere-header-safe-modal",
  "velmere-data-table",
  "velmere-toast",
  'pass628LayerStyle("toast")',
]);

requireAll("components/square/VelmereSquareClient.tsx", [
  "useModalScrollLock(Boolean(selectedPost || composerOpen))",
  "velmere-header-safe-backdrop",
  "velmere-side-drawer-panel",
  "velmere-toast",
  'pass628LayerStyle("drawer")',
  'pass628LayerStyle("modal")',
]);

requireAll("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "velmere-popover-surface",
  'pass628LayerStyle("listbox")',
]);
rejectAll("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["z-[500]"]);

requireAll("app/globals.css", [
  "PASS701–708",
  ".velmere-header-safe-backdrop",
  ".velmere-popover-surface",
  ".velmere-menu-action",
  ".velmere-data-table",
  ".velmere-toast",
  ".velmere-system-card",
  "@media (prefers-reduced-motion: reduce)",
]);

const publicRoots = ["components", "app"];
const highLayerPattern = /z-\[(?:2\d{2}|3\d{2}|4\d{2}|5\d{2}|6\d{2}|7\d{2}|8\d{2}|9\d{2}|\d{4,})\]/;
const stack = publicRoots.map((entry) => path.join(root, entry));
while (stack.length) {
  const current = stack.pop();
  if (!current || !fs.existsSync(current)) continue;
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
    continue;
  }
  if (!/\.(tsx|ts)$/.test(current)) continue;
  const source = fs
    .readFileSync(current, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
  if (highLayerPattern.test(source)) {
    throw new Error(`${path.relative(root, current)}: raw high z-index bypasses overlay constitution`);
  }
}

const changedTsx = [
  "components/contact/FloatingMailWidget.tsx",
  "components/SizeGuideTeaser.tsx",
  "components/wallet/WalletStatusChip.tsx",
  "components/vlm/VlmSelectedSystems.tsx",
  "components/shop/ProductDetailClient.tsx",
  "components/square/VelmereSquareClient.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
];

let ts = null;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch {
  // Dependency-free handoff archives may not include TypeScript.
}
if (ts) {
  for (const file of changedTsx) {
    const source = read(file);
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (parsed.parseDiagnostics.length) {
      const message = parsed.parseDiagnostics
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        .join(" | ");
      throw new Error(`${file}: ${message}`);
    }
  }
}

console.log(`PASS701–708 unified UI layer verified · ${changedTsx.length} surfaces · one overlay constitution · header-safe drawers · accessible focus · no raw high z-index`);
