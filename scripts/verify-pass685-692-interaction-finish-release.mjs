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
    if (text.includes(needle)) throw new Error(`${file}: public technical copy remains: ${needle}`);
  }
  return text;
};

const command = requireAll("components/ui/CommandPalette.tsx", [
  "Szybkie przejście",
  "Schnellzugriff",
  "Quick access",
  "<ModalRoot",
  'router.push("/market-integrity/shield-map")',
]);
for (const forbidden of ["LOCAL TERMINAL STATE", "ROUTE /SHOP", "Toggle Basic / Pro Memory"]) {
  if (command.includes(forbidden)) throw new Error(`Command palette still exposes ${forbidden}`);
}

const errorPage = requireAll("app/[locale]/error.tsx", ["useLocale", "Safe view recovery", "Bezpieczne odzyskiwanie widoku", "velmere-button-primary"]);
for (const forbidden of ["KERNEL PANIC", "SYSTEM BREAKDOWN", "RETRY KERNEL", "CLASSIFIED_RUNTIME_FAILURE"]) {
  if (errorPage.includes(forbidden)) throw new Error(`Error page still exposes ${forbidden}`);
}

const auth = requireAll("components/auth/AuthFormClient.tsx", ["velmere-field", "showPassword", "local.resetMessage", "Wallet optional"]);
for (const forbidden of ["Google OAuth", "server sessions", "Production auth requires", "LOCAL TERMINAL"]) {
  if (auth.includes(forbidden)) throw new Error(`Auth form still exposes ${forbidden}`);
}
requireAll("components/auth/LoginSecurityVisual.tsx", ["useLocale", "t.steps", "Portfel tylko na żądanie", "Wallet only when requested"]);

const cookie = requireAll("components/CookieConsent.tsx", ["pass628LayerStyle(\"floatingAction\")", "aria-expanded={showSettings}", "env(safe-area-inset-bottom)"]);
requireAll("messages/pl.json", ["Prywatność i pliki cookie", "Tylko niezbędne"]);
requireAll("messages/de.json", ["Datenschutz und Cookies", "Nur notwendig"]);
requireAll("messages/en.json", ["Privacy and cookies", "Necessary only"]);

const wallet = requireAll("components/wallet/WalletConnectOptions.tsx", ["<DrawerRoot", "wallet-other-list", "Zobacz wszystkie portfele", "Połączenie mobilne lub QR"]);
if (wallet.includes("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID")) throw new Error("Wallet UI exposes environment configuration");

requireAll("components/ui/LuxuryActionModal.tsx", ["<ModalRoot", "surface: \"luxury-action\"", "data-modal-scroll-region=\"true\""]);
requireAll("components/ui/SideActionPanel.tsx", ["<DrawerRoot", "velmere-side-drawer-panel", "data-modal-scroll-region=\"true\""]);
requireAll("components/Navbar.tsx", ["velmere-side-drawer-panel", "Dostawa i zwroty w UE", "Odkrywaj"]);

const productCard = requireAll("components/product/ProductCard.tsx", ["Product detail", "Detal produktu", "commerce.pending"]);
for (const forbidden of ["Technical blockers remain", "Techniczne blokady", "Operator-Seite"]) {
  if (productCard.includes(forbidden)) throw new Error(`Product card still exposes ${forbidden}`);
}
const productDetail = read("components/shop/ProductDetailClient.tsx");
for (const forbidden of ["provider i status produkcji", "Provider und Produktionsstatus", "provider and production status", "fake readiness"]) {
  if (productDetail.includes(forbidden)) throw new Error(`Product detail still exposes ${forbidden}`);
}

requireAll("app/globals.css", ["PASS685–692", ".velmere-field", ".velmere-header-safe-modal", "@media (prefers-reduced-motion: reduce)"]);

const changedTsx = [
  "components/ui/CommandPalette.tsx",
  "app/[locale]/error.tsx",
  "components/auth/AuthFormClient.tsx",
  "components/auth/LoginSecurityVisual.tsx",
  "components/CookieConsent.tsx",
  "components/wallet/WalletConnectOptions.tsx",
  "components/product/ProductCard.tsx",
  "components/shop/ProductDetailClient.tsx",
  "components/ui/LuxuryActionModal.tsx",
  "components/ui/SideActionPanel.tsx",
  "components/Navbar.tsx",
];

let ts = null;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch {
  // Syntax parsing is optional in dependency-free handoff archives.
}
if (ts) {
  for (const file of changedTsx) {
    const source = read(file);
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (parsed.parseDiagnostics.length) {
      const message = parsed.parseDiagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join(" | ");
      throw new Error(`${file}: ${message}`);
    }
  }
}

console.log(`PASS685–692 interaction finish verified · ${changedTsx.length} TSX surfaces · human copy · localized recovery · header-safe overlays`);
