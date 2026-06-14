import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function requireAll(file, needles) {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`);
  }
  return text;
}

function rejectAll(file, needles) {
  const text = read(file);
  for (const needle of needles) {
    if (text.includes(needle)) throw new Error(`${file}: forbidden fragment remains: ${needle}`);
  }
  return text;
}

requireAll("app/globals.css", [
  "PASS709–716",
  ".velmere-floating-utility",
  'html[data-velmere-scroll-locked="true"] .velmere-floating-utility',
  ".velmere-mobile-purchase-dock",
  ".velmere-toast-safe",
  ".velmere-product-card-compact",
  ".velmere-segmented-control",
  ".velmere-ui-button",
  "@media (hover: none), (pointer: coarse)",
  "@media (prefers-reduced-motion: reduce)",
]);

requireAll("components/angel/AngelTeaser.tsx", [
  "velmere-floating-utility",
  "velmere-floating-utility--angel",
]);
rejectAll("components/angel/AngelTeaser.tsx", [
  "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]",
  "z-[90]",
]);

requireAll("components/mobile/MobileModePill.tsx", [
  "velmere-floating-utility",
  "velmere-floating-utility--mode",
]);
rejectAll("components/mobile/MobileModePill.tsx", ["z-[80]", "safe-bottom-4"]);

requireAll("components/SizeGuideTeaser.tsx", [
  "velmere-floating-utility--size-guide",
  "velmere-header-safe-modal",
]);

requireAll("components/square/VelmereSquareClient.tsx", [
  "velmere-floating-utility--primary",
  "velmere-toast-safe",
]);

requireAll("components/shop/ProductDetailClient.tsx", [
  "velmere-mobile-purchase-dock",
  "velmere-toast-safe--purchase",
]);

requireAll("components/product/ProductCard.tsx", [
  'data-product-card-mode="compact"',
  "velmere-product-card-compact__image",
  "velmere-product-card-compact__status",
  "sizes=\"(max-width: 640px) 96px, 112px\"",
]);

requireAll("components/ui/primitives.tsx", [
  "velmere-ui-button",
  "velmere-ui-card",
  "velmere-ui-input",
  "velmere-ui-badge",
]);

requireAll("components/ui/ModeToggle.tsx", [
  "velmere-segmented-control",
  "velmere-segmented-control__item",
  "repeat: 999999",
]);
rejectAll("components/ui/ModeToggle.tsx", ["repeat: Infinity"]);

requireAll("components/auth/AuthFormClient.tsx", [
  "velmere-segmented-control",
  "velmere-segmented-control__item",
]);

requireAll("components/vlm/BlockchainSearch.tsx", [
  "velmere-system-card",
  "velmere-field min-h-12",
  "velmere-button-secondary",
]);

requireAll("app/layout.tsx", ["velmere-skip-link"]);

const changedTsx = [
  "app/layout.tsx",
  "components/angel/AngelTeaser.tsx",
  "components/mobile/MobileModePill.tsx",
  "components/SizeGuideTeaser.tsx",
  "components/square/VelmereSquareClient.tsx",
  "components/shop/ProductDetailClient.tsx",
  "components/product/ProductCard.tsx",
  "components/ui/primitives.tsx",
  "components/ui/ModeToggle.tsx",
  "components/auth/AuthFormClient.tsx",
  "components/vlm/BlockchainSearch.tsx",
];

let ts = null;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch {
  // Clean source archives may not contain local dependencies.
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

const css = read("app/globals.css");
let depth = 0;
let quote = null;
let escaped = false;
for (let index = 0; index < css.length; index += 1) {
  const char = css[index];
  if (escaped) {
    escaped = false;
    continue;
  }
  if (char === "\\") {
    escaped = true;
    continue;
  }
  if (quote) {
    if (char === quote) quote = null;
    continue;
  }
  if (char === '"' || char === "'") {
    quote = char;
    continue;
  }
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  if (depth < 0) throw new Error("app/globals.css: closing brace without opening brace");
}
if (depth !== 0) throw new Error(`app/globals.css: unbalanced braces (${depth})`);

console.log(
  `PASS709–716 visual finish verified · ${changedTsx.length} TSX surfaces · floating dock · compact commerce cards · segmented controls · modal-safe utilities · CSS balanced`,
);
