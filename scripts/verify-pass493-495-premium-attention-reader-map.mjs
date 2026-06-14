import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");
const requireText = (path, needles) => {
  const source = read(path);
  for (const needle of needles) {
    if (!source.includes(needle)) failures.push(`${path}: missing ${needle}`);
  }
};

requireText("lib/market-integrity/pass493-neural-attention-director.ts", [
  'version: "pass493-neural-attention-director"',
  "durationMs",
  "focusAxisId",
  "resolvePass493AttentionStep",
]);
requireText("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "data-pass493-neural-attention",
  "data-pass493-progressive-attention",
  "data-pass493-focused-confidence-axis",
  "data-pass493-evidence-spotlight",
  "aria-selected",
  "aria-pressed",
]);
requireText("lib/market-integrity/pass494-a4-reader-navigation.ts", [
  'version: "pass494-a4-reader-navigation"',
  "observerThresholds",
  "pass494ReaderProgress",
]);
requireText("components/search/VelmereIntelligenceSearchClient.tsx", [
  "readerScrollRef",
  "IntersectionObserver",
  "data-pass494-reader-navigation",
  "velmere-a4-page-anchor",
  "readerProgress.percent",
]);
requireText("components/market-integrity/ShieldMapCommandClient.tsx", [
  "data-pass495-shield-lane-controls",
  "pass492Focus.previousId",
  "pass492Focus.nextId",
  "Previous lane",
  "Next lane",
]);
requireText("lib/market-integrity/pass495-premium-polish-gate.ts", [
  'version: "pass495-premium-polish-gate"',
  "interactiveAxes",
  "activePageObserver",
  "simultaneousAttentionCap: 1",
]);
requireText("app/globals.css", [
  "PASS493–495",
  ".velmere-a4-reader-scroll",
  "scroll-snap-type: y proximity",
  "content-visibility: auto",
]);

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass493-495-premium-attention-reader-map"]) {
  failures.push("package.json missing PASS493–495 verifier script");
}
if (!String(pkg.scripts?.build).includes("verify:pass493-495-premium-attention-reader-map")) {
  failures.push("build pipeline does not execute PASS493–495 verifier");
}

if (failures.length) {
  console.error("PASS493–495 premium attention/reader/map verifier: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("PASS493–495 premium attention/reader/map verifier: PASS");
