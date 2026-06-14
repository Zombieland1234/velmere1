import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const audit = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
const contract = read("lib/market-integrity/real-markets-data-contract.ts");
const route = read("app/api/market-integrity/real-markets/route.ts");
const css = read("app/globals.css");

const checks = [
  ["canonical contract version", contract.includes("velmere.real_markets.instrument.v1")],
  ["null-safe unavailable values", contract.includes("unavailableValuesRemainNull: true")],
  ["source timestamp contract", contract.includes("timestampRequiredForLiveLabel: true")],
  ["route exposes canonical quotes", route.includes("canonicalQuotes: quotes.map")],
  ["tri-state sorter", panel.includes("if (current.direction === \"desc\") return { key, direction: \"asc\" }")],
  ["30 day column", panel.includes('sortKey="change30d"')],
  ["shared modal root", panel.includes("<ModalRoot") && !panel.includes("zIndex: 2_000_000")],
  ["finite nested analysis layer", audit.includes('pass628LayerStyle("nestedModal")')],
  ["full-width terminal", css.includes("PASS762–764 · Real Markets")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [label] of failed) console.error(`FAIL: ${label}`);
  process.exit(1);
}
console.log("PASS762–764 Real Markets PASS");
