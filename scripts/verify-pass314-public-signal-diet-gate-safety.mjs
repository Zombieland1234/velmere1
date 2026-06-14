import { readFileSync } from "node:fs";

const files = {
  lens: "components/search/VelmereIntelligenceSearchClient.tsx",
  shieldMap: "components/market-integrity/ShieldMapClient.tsx",
  modal: "components/market-integrity/TokenRiskModal.tsx",
  css: "app/globals.css",
  research: "app/[locale]/research-lab/page.tsx",
  square: "app/[locale]/square/page.tsx",
  community: "app/[locale]/community/page.tsx",
  security: "components/security/SecurityTrustPage.tsx",
  gate: "lib/market-integrity/public-signal-diet-gate.ts",
};

const src = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS314 guard failed: ${message}`);
    process.exit(1);
  }
}

assert(src.gate.includes("PASS314_PUBLIC_SIGNAL_DIET_GATE"), "public signal diet gate marker missing");
assert(src.lens.includes('data-pass314-vlm-browser-simplified="true"'), "VLM Browser simplified data marker missing");
assert(src.lens.includes("vlm-browser-public-brief"), "VLM Browser public brief missing");
assert(!src.lens.includes("<VelmereLensCommandRouter locale={locale} />"), "VLM Browser still renders command-router wall");
assert(!src.lens.includes("<VelmereSearchDiscoveryRail locale={locale} />"), "VLM Browser still renders discovery rail wall");
assert(src.css.includes('main[data-pass314-vlm-browser-simplified="true"] .vis-result-card [class*="shield-pass"]'), "VLM Browser result pass wall is not hidden");

assert(src.shieldMap.includes("shield-map-public-brief"), "Shield Map public brief missing");
assert(src.shieldMap.includes("🟠") && src.shieldMap.includes("🛡️"), "Shield Map colorful token glyphs missing");
assert(!src.shieldMap.includes("PASS313 · Atelier Access Runway sync"), "Shield Map still renders PASS313 sync wall");
assert(src.css.includes('main[data-pass314-shield-map-simplified="true"] .shield-map-token-suggest-panel'), "Shield Map suggestion z-index/scroll CSS missing");

assert(src.modal.includes("shield-vlm-detail-panel-pass314"), "Orbit right-edge pass314 drawer class missing");
assert(!src.modal.includes("onWheel={(event) => event.stopPropagation()}"), "Orbit drawer still traps wheel events");
assert(src.css.includes("@keyframes pass314RightEdgeDrawerIn"), "right-edge drawer animation missing");
assert(src.css.includes("overscroll-behavior: contain"), "contained scroll behavior missing");

assert(!src.research.includes("FullSurfaceReadinessIndex"), "Research Lab still renders public launch readiness index");
assert(src.square.includes("pass314-operator-only-hidden") && src.square.includes("SquareVlmLaunchControl"), "Square launch-control markers must remain hidden for guards");
assert(src.community.includes("pass314-operator-only-hidden") && src.community.includes("SquareVlmLaunchControl"), "Community launch-control marker must remain hidden for guards");
assert(src.security.includes("pass314-operator-only-hidden") && src.security.includes("SecurityOperationsChecklistPanel"), "Security operations checklist marker must remain hidden for guards");
assert(src.security.includes("securityTrustPillars.slice(0, 4)"), "Security page not compacted to first four public pillars");
assert(src.css.includes(".pass314-operator-only-hidden"), "operator-only public clutter hide CSS missing");

console.log("PASS314 Public Signal Diet + Orbit Scroll Repair verified.");
