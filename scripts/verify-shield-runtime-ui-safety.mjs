import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const shieldMap = read("components/market-integrity/ShieldMapClient.tsx");
const market = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");

const tokenRiskModalStart = modal.indexOf("export default function TokenRiskModal");
const tokenRiskModalBody = tokenRiskModalStart >= 0 ? modal.slice(tokenRiskModalStart) : "";

for (const needle of [
  "const ui = useMemo(() =>",
  "controlKicker",
  "controlTitle",
  "basicTitle",
  "advancedTitle",
]) {
  if (!tokenRiskModalBody.includes(needle)) {
    errors.push(`TokenRiskModal main scope missing UI copy: ${needle}`);
  }
}

if (tokenRiskModalBody.includes("{ui.controlKicker}") && !tokenRiskModalBody.includes("const ui = useMemo(() =>")) {
  errors.push("TokenRiskModal uses ui.controlKicker without main-scope ui object.");
}

for (const needle of [
  "useRef",
  "investigatorSuggestRef",
  "closeOnOutsidePointer",
  "document.addEventListener(\"pointerdown\", closeOnOutsidePointer, true)",
  "role=\"listbox\"",
]) {
  if (!shieldMap.includes(needle)) {
    errors.push(`ShieldMap suggestion dropdown missing outside-click/high-layer behaviour: ${needle}`);
  }
}

if (shieldMap.includes("onBlur={() => window.setTimeout(() => setSuggestionsOpen(false)")) {
  errors.push("ShieldMap suggestions must not rely on blur timeout; outside pointer should close them.");
}

for (const needle of [
  "shield-token-search-suggest-panel",
  "z-[10000]",
]) {
  if (!market.includes(needle)) {
    errors.push(`MarketIntegrity search suggestions missing high overlay marker: ${needle}`);
  }
}

for (const needle of [
  ".shield-investigator-live-console",
  "overflow: visible",
  ".shield-investigator-live-console form",
  "z-index: 10000",
  ".shield-token-search-suggest-panel",
]) {
  if (!css.includes(needle)) {
    errors.push(`globals.css missing suggestion overlay CSS: ${needle}`);
  }
}

if (errors.length) {
  console.error("Shield runtime UI safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Shield runtime UI safety checks passed.");
