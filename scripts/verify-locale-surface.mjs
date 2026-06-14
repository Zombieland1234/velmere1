import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const pl = readJson("messages/pl.json");
const de = readJson("messages/de.json");

const expected = [
  ["pl Common.close", pl.Common.close, "Zamknij"],
  ["pl Common.open", pl.Common.open, "Otwórz"],
  ["pl Common.loading", pl.Common.loading, "Ładowanie"],
  ["pl Nav.shop", pl.Nav.shop, "Sklep"],
  ["pl Nav.shopMenu", pl.Nav.shopMenu, "Menu sklepu"],
  ["pl Nav.connectWallet", pl.Nav.connectWallet, "Połącz portfel"],
  ["pl Footer.tagline", pl.Footer.tagline, "Luxury streetwear z prywatną warstwą cyfrową."],
  ["pl Footer.shipping", pl.Footer.shipping, "Dostawa"],
  ["pl Footer.returns", pl.Footer.returns, "Zwroty"],
  ["de Common.close", de.Common.close, "Schließen"],
  ["de Common.loading", de.Common.loading, "Lädt"],
  ["de Nav.shopMenu", de.Nav.shopMenu, "Shop-Menü"],
  ["de Nav.connectWallet", de.Nav.connectWallet, "Wallet verbinden"],
  ["de Footer.shipping", de.Footer.shipping, "Versand"],
  ["de Footer.returns", de.Footer.returns, "Rückgabe"],
];

for (const [label, actual, wanted] of expected) {
  if (actual !== wanted) errors.push(`${label}: expected "${wanted}", got "${actual}"`);
}

const footer = read("components/Footer.tsx");
if (!footer.includes("function footerCopy(locale: string)") || !footer.includes("useLocale()")) {
  errors.push("Footer must use locale-aware copy.");
}
for (const bad of [
  "const exploreLinks = [",
  "const legalLinks = [",
  "const microcopy = [",
]) {
  if (footer.includes(bad)) errors.push(`Footer must not use old hardcoded global ${bad}`);
}

const home = read("components/home/HomePageClient.tsx");
if (!home.includes("function homeCopy(locale: string)") || !(home.includes("const copy = homeCopy(useLocale())") || home.includes("const copy = homeCopy(locale)"))) {
  errors.push("Home page must use locale-aware homeCopy.");
}
if (home.includes("Enter quietly. Own the room.") && !home.includes("heroTitle: \"Enter quietly. Own the room.\"")) {
  errors.push("Home page has hardcoded English hero outside locale copy.");
}

const shieldMap = read("components/market-integrity/ShieldMapClient.tsx");
for (const needle of [
  "const pageCopy = useMemo",
  "const atlasNodes = useMemo",
  "const sourceRails = useMemo",
  "const investigatorProtocol = useMemo",
  "const commandRoomCards = useMemo",
  "const launchBridgeContracts = useMemo",
  "const brainImportLanes = useMemo",
]) {
  if (!shieldMap.includes(needle)) errors.push(`Shield Map missing locale-aware block: ${needle}`);
}

if (/"\{pageCopy\./.test(shieldMap)) {
  errors.push("Shield Map has pageCopy placeholder inside a string literal.");
}

for (const needle of ["brainImportKicker", "brainImportTitle", "brainImportBody", "brainImportBadge", "brainImportLanes.map"]) {
  if (!shieldMap.includes(needle)) errors.push(`Shield Map missing AI brain import lane marker: ${needle}`);
}

if (errors.length) {
  console.error("Locale surface verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Locale surface checks passed.");
