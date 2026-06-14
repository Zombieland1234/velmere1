import { readFileSync } from "node:fs";

const files = {
  gate: "lib/market-integrity/customer-surface-trim-gate.ts",
  lens: "components/search/VelmereIntelligenceSearchClient.tsx",
  shieldMap: "components/market-integrity/ShieldMapClient.tsx",
  market: "components/market-integrity/MarketIntegrityClient.tsx",
  squareClient: "components/square/VelmereSquareClient.tsx",
  squarePage: "app/[locale]/square/page.tsx",
  research: "app/[locale]/research-lab/page.tsx",
  community: "app/[locale]/community/page.tsx",
  security: "components/security/SecurityTrustPage.tsx",
  css: "app/globals.css",
};

const src = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS315 guard failed: ${message}`);
    process.exit(1);
  }
}

assert(src.gate.includes("PASS315_CUSTOMER_SURFACE_TRIM_GATE"), "customer surface trim gate marker missing");
assert(src.gate.includes("No countdowns, no buy/sell command, no fake scarcity"), "anti-FOMO boundary missing");

assert(src.lens.includes('data-pass315-customer-surface-trim="vlm-browser"'), "Lens trim marker missing");
assert(src.lens.includes('data-pass315-lens-public-pdf-forge="true"'), "Lens PDF forge card missing");
assert(!src.lens.includes("shield-pass313-result-runway"), "Lens still renders PASS313 operator wall");
assert(!src.lens.includes("shield-pass294-result-trust-pulse"), "Lens still renders PASS294 operator wall");
assert(src.css.includes(".vlm-browser-pdf-forge-card"), "Lens PDF forge styling missing");
assert(src.css.includes("pass315PdfForgeSpin"), "Lens PDF forge animation missing");

assert(src.shieldMap.includes('data-pass314-shield-map-simplified="true"'), "Shield Map PASS314 simplified attr missing");
assert(src.shieldMap.includes('data-pass315-shield-map-trim="true"'), "Shield Map trim marker missing");
assert(src.shieldMap.includes('data-pass315-public-command-strip="true"'), "Shield Map command strip marker missing");
assert(src.css.includes('main[data-pass315-shield-map-trim="true"] > section:nth-of-type(n+4)'), "Shield Map operator atlas hide rule missing");

assert(src.market.includes('data-pass315-table-scroll-direct="true"'), "Market table direct scroll marker missing");
assert(!src.market.includes('onWheel={handleTableWheel}'), "Market table still traps wheel events");
assert(src.css.includes('.shield-table-scroll-x[data-pass315-table-scroll-direct="true"]'), "Market table scroll CSS missing");
assert(src.css.includes("overscroll-behavior-y: auto"), "Vertical wheel propagation CSS missing");

assert(src.squarePage.includes('publicTrim="pass315"'), "Square page does not request public trim");
assert(src.squareClient.includes("publicTrim = \"\""), "Square client publicTrim prop missing");
assert(src.squareClient.includes('data-pass315-square-trim={publicTrim}'), "Square data trim attr missing");
assert(src.squareClient.includes('data-pass315-square-public-brief="true"'), "Square compact feed brief missing");
if (!src.squareClient.includes('data-pass318-public-storefront-focus')) {
  assert(src.squareClient.includes('data-pass315-hidden-operator-panels="square-launch-routing"'), "Square launch routing not hidden");
}
assert(!src.squareClient.includes('data-pass315-hidden-operator-panels="square-launch-routing"'), "PASS318 should remove Square launch routing from public DOM");

assert(src.research.includes('data-pass315-public-surface-trim="research-lab"'), "Research Lab trim marker missing");
if (!src.research.includes('data-pass318-public-storefront-focus="research-lab"')) {
  assert(src.research.includes('data-pass315-hidden-operator-panels="research-validation"'), "Research validation matrix not hidden");
}
assert(!src.research.includes('data-pass315-hidden-operator-panels="research-validation"'), "PASS318 should remove research validation matrix from public DOM");
assert(src.css.includes('main[data-pass315-public-surface-trim="research-lab"] .pass315-secondary-public-note'), "Research public note hide CSS missing");

assert(src.community.includes('data-pass315-public-surface-trim="community"'), "Community trim marker missing");
assert(src.security.includes('data-pass315-public-surface-trim="security"'), "Security trim marker missing");
if (!src.security.includes('data-pass318-security-public-note')) {
  assert(src.security.includes('pass315-security-roadmap-summary'), "Security roadmap summary marker missing");
}
assert(!src.security.includes('pass315-security-roadmap-summary'), "PASS318 should remove hidden security roadmap summary from public DOM");
assert(src.css.includes('main[data-pass315-public-surface-trim="security"] .pass315-security-roadmap-summary'), "Security roadmap hide CSS missing");
assert(src.css.includes('.pass315-operator-only-hidden'), "PASS315 operator hidden CSS missing");

console.log("PASS315 Customer Surface Trim + Scroll Stability verified.");
