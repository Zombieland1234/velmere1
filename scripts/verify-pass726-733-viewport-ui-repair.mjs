import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const expect = (ok, label) => checks.push({ ok: Boolean(ok), label });

const navbar = read("components/Navbar.tsx");
const square = read("components/square/VelmereSquareClient.tsx");
const product = read("components/shop/ProductDetailClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const errorBoundary = read("app/[locale]/error.tsx");

expect(
  navbar.includes("<BodyPortal>"),
  "Navbar menu is rendered through the body portal",
);
expect(
  square.includes("velmere-viewport-dialog-root"),
  "Square post uses viewport-centred dialog root",
);
expect(
  !square.includes("<Plus"),
  "Square has no duplicate plus composer control",
);
expect(
  !square.includes("pass315-square-feed-brief velmere-quiet-notice"),
  "Square duplicate public brief is removed",
);
expect(
  product.includes("<BodyPortal>"),
  "Product size guide is rendered through the body portal",
);
expect(
  !product.includes("velmere-readout-card mb-4"),
  "Duplicate selected-size readout is removed",
);
expect(
  shield.includes("function SortHeader"),
  "Shield retains static column labels",
);
expect(
  /function SortHeader[\s\S]{0,1800}<button/.test(shield) &&
    shield.includes("onClick={() => updateSort(sort)}"),
  "Shield table headers are direct clickable sort controls",
);
expect(
  shield.includes("shield-centered-error-title"),
  "Shield errors use a centred premium dialog",
);
expect(
  !shield.includes("opening analysis"),
  "Technical opening-analysis toast is removed",
);
expect(
  modal.includes("event.stopPropagation();"),
  "Chart wheel stops page propagation",
);
expect(
  (modal.match(/onWheelCapture=\{handleChartWheel\}/g) ?? []).length >= 2,
  "Both chart surfaces capture wheel zoom",
);
expect(
  modal.includes("shield-ai-context-post"),
  "AI tier selector is followed by a contextual editorial card",
);
expect(
  !modal.includes('className="shield-vlm-zoom-controls"'),
  "Public Orbit +/- controls are removed",
);
expect(
  !modal.includes('className="shield-vlm-motion-toggle-mini'),
  "Public Orbit QA toggle is removed",
);
expect(
  css.includes("pass733-orbit-turn"),
  "Orbit receives a visible continuous rotation animation",
);
expect(
  css.includes("touch-action: none !important"),
  "Chart gesture surface contains wheel and touch input",
);
expect(
  css.includes("translate: -50% -50% !important"),
  "Header-safe modal uses independent CSS translate geometry",
);
expect(
  !errorBoundary.includes("RefreshCw"),
  "Error recovery does not show a childish refresh icon",
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} · ${check.label}`);
if (failed.length) {
  console.error(
    `\nPASS726–733 verifier failed: ${failed.length}/${checks.length}`,
  );
  process.exit(1);
}
console.log(
  `\nPASS726–733 viewport UI repair: PASS (${checks.length}/${checks.length})`,
);
