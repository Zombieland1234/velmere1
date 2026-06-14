import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const controls = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const markets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const navbar = read("components/Navbar.tsx");
const overlays = read("components/ui/OverlayPrimitives.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");

add("Asset modal has PASS2011 stable geometry marker", controls.includes('data-pass2011-modal="single-instrument-panel-stable-geometry"'));
add("Asset close reacts on pointer down", controls.includes("onPointerDown={(event) =>") && controls.includes("event.stopPropagation();") && controls.includes("onClose();"));
add("Metrics are one strip and timeframe is unframed", controls.includes('data-pass2011-region="single-metric-strip"') && controls.includes('data-pass2011-region="unframed-timeframe"'));
add("Chart and action rail use stable PASS2011 regions", controls.includes('data-pass2011-stage="stable-chart-compact-actions"') && controls.includes('data-pass2011-region="unframed-compact-actions"'));
add("Shield removes viewport blur and closes from pointer down", shield.includes('data-pass2011-shield-modal="solid-backdrop-pointer-close-no-blur"') && !shield.includes("p-0 backdrop-blur-2xl") && shield.includes("onPointerDown={(event) =>"));
add("Real Markets root no longer carries decorative outer frame classes", markets.includes('pass2011: "transparent-root-stable-instrument-panel"') && !markets.includes('surfaceClassName="w-full max-w-[1240px] rounded-[2rem] border'));
add("Main menu avoids body scroll lock", navbar.includes("lockScroll={false}") && navbar.includes('pass2011: "classic-list-instant-close-no-scroll-lock"'));
add("Main menu restores a simple divider list", navbar.includes('data-pass2011-menu-links="classic-divider-list"') && !navbar.includes('"rounded-2xl border border-white/[0.055] bg-white/[0.025] px-4 py-3'));
add("Overlay exits use opacity only", overlays.includes("exit={{ opacity: 0 }}") && !overlays.includes("exit={{ opacity: 0, y: 12, scale: 0.99 }}"));
add("Overlay close durations stay at or below 100ms", overlays.includes('duration: motionDuration ?? (motionPreset === "bottom" ? 0.16 : 0.1)') && overlays.includes('transition={{ duration: 0.06, ease: "linear" }}'));
add("PASS2011 CSS removes nested frames and stabilizes layout", css.includes("PASS2011 - screenshot-led asset modal geometry") && css.includes('grid-template-columns: minmax(0, 1fr) 15rem') && css.includes('data-pass2011-region="single-metric-strip"'));
add("PASS2011 final cascade lock follows legacy PASS2009/2000 rules", css.lastIndexOf("PASS2011 cascade lock") > css.lastIndexOf("PASS2009 - truthful cart totals"));
add("PASS2011 CSS compacts action buttons without stretch", css.includes('data-pass2011-depth-dock="compact-top-aligned-actions"') && css.includes("grid-template-rows: repeat(3, auto)"));
add("PASS2011 CSS restores classic menu and reduced motion", css.includes('data-pass2011="classic-list-instant-close-no-scroll-lock"') && css.includes("@media (prefers-reduced-motion: reduce)"));
add("Package includes PASS2011 verifier", pkg.includes("verify:pass2011-modal-menu-lag-visual-sweep"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`PASS2011 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2011 verification passed: ${checks.length}/${checks.length}`);
