import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const client = read("components/market-integrity/MarketIntegrityClient.tsx");
const chart = read("components/market-integrity/AdvancedMarketChart.tsx");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");

assert(client.includes("function selectShieldSuggestions"), "exact-match suggestion gate missing");
assert(client.includes('aria-controls={suggestionsOpen ? "shield-search-results" : undefined}'));
assert(client.includes('aria-autocomplete="list"'));
assert(client.includes('event.key === "ArrowDown"'));
assert(client.includes('event.key === "ArrowUp"'));
assert(client.includes("highlightedSuggestionIndex"));
assert(client.includes('...pass628LayerStyle("listbox")'));
assert(client.includes('className="grid gap-3 p-3 lg:hidden"'));
assert(client.includes('className="shield-table-scroll-x hidden lg:block"'));
assert(client.includes('className="w-full table-fixed border-collapse text-left tabular-nums"'));
assert(!client.includes('min-w-[1080px] table-fixed'));
assert(!client.toLowerCase().includes("open ai"));

for (const key of ["price", "change1h", "change24h", "change7d", "change30d", "marketCap", "volume", "risk"]) {
  assert(client.includes(`sort="${key}"`), `missing sortable Shield column: ${key}`);
}

const wheelHandler = chart.slice(chart.indexOf("function onWheel"), chart.indexOf("function onKeyDown"));
assert(wheelHandler.includes("event.preventDefault()"));
assert(wheelHandler.includes("event.stopPropagation()"));
assert(chart.includes('data-modal-wheel-owner="true"'));
assert(chart.includes('data-chart-gesture-surface="pan-pinch-wheel"'));

assert(modal.includes('pass628LayerStyle("modal")'));
assert(modal.includes('data-velmere-overlay-layer="modal"'));
assert(modal.includes('data-modal-scroll-region="true"'));
assert(modal.includes('aria-modal="true"'));
assert(modal.includes('aria-labelledby="shield-token-modal-title"'));
assert(modal.includes('data-testid={`shield-chart-range-${item}`}'));

for (const marker of [
  "PASS757–761 · Shield terminal completion",
  '.shield-table-scroll-x[data-pass315-table-scroll-direct="true"]',
  '.shield-token-search-suggest-row[aria-selected="true"]',
  '.shield-modal-backdrop[data-velmere-overlay-layer="modal"]',
]) assert(css.includes(marker), `missing CSS marker: ${marker}`);

console.log("PASS757–761 Shield terminal PASS");
