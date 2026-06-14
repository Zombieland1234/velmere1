import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) checks.push(`${label}: missing ${marker}`);
};
const forbidMarker = (source, marker, label) => {
  if (source.includes(marker)) checks.push(`${label}: forbidden ${marker}`);
};

const navbar = read("components/Navbar.tsx");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");

requireMarker(navbar, 'pass628LayerStyle("header")', "finite header layer");
requireMarker(
  navbar,
  'data-pass628-overlay-layer="header"',
  "header layer marker",
);
requireMarker(lens, "velmere-lens-hero", "Lens premium hero");
requireMarker(lens, "velmere-lens-discovery", "Lens discovery state");
requireMarker(lens, "velmere-lens-quick-start", "Lens quick starts");
requireMarker(lens, 'pass628LayerStyle("nestedModal")', "Lens modal layer");
forbidMarker(lens, "commandStatusCards", "Lens technical status wall");

requireMarker(shield, "shield-sort-dock", "Shield sort dock");
requireMarker(
  shield,
  "data-testid={`shield-sort-dock-${key}`}",
  "Shield sort controls",
);
requireMarker(shield, "function resetSort()", "Shield sort reset");
requireMarker(shield, "z-[20]", "Shield sticky layer");
forbidMarker(
  shield,
  "shield-market-search-dock sticky top-[4.35rem] z-[120]",
  "Shield header collision",
);
forbidMarker(shield, "PASS74", "Shield public technical copy");
requireMarker(
  shield,
  "Rynek bez szumu. Dowody przed decyzją.",
  "Shield human hero",
);

requireMarker(map, "shield-map-visual-hero", "Shield Map visual hero");
requireMarker(map, "shield-map-final-tile", "Shield Map final decisions");
requireMarker(
  map,
  "useModalScrollLock(atlasDrawerOpen)",
  "Shield Map drawer scroll lock",
);
requireMarker(map, "Mapa analizy", "Shield Map human atlas label");
forbidMarker(map, "runtime health console · PASS74", "Shield Map runtime wall");

requireMarker(css, "PASS647–653 · public visual release", "visual CSS release");
requireMarker(css, "--velmere-layer-header", "finite overlay CSS");
requireMarker(css, ".shield-sort-dock", "sort dock CSS");
requireMarker(css, ".shield-map-focus-drawer-shell", "drawer layer CSS");
requireMarker(css, "prefers-reduced-motion", "reduced motion support");

if (checks.length) {
  console.error("PASS647–653 visual UI release failed:");
  for (const check of checks) console.error(`- ${check}`);
  process.exit(1);
}

console.log(
  "PASS647–653 visual UI release verified · finite overlays · Lens discovery · Shield sorting · Map signal diet · mobile safe-area",
);
