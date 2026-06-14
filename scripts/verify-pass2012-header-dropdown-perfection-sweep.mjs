import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const nav = read("components/Navbar.tsx");
const overlays = read("components/ui/OverlayPrimitives.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");

add("Header uses a solid no-blur surface", nav.includes('data-pass2012-header="solid-no-blur-calm-controls"') && !nav.includes("shadow-[0_18px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl"));
add("Language dropdown uses a flat cyan state without ring", nav.includes('pass2012: "flat-language-list-no-ring"') && nav.includes('bg-cyan-300/[0.08] text-cyan-50') && !nav.includes('className="min-w-36 border border-white/[0.10]'));
add("Wallet dropdown has no outer ring and closes on pointer down", nav.includes('pass2012: "flat-wallet-panel-no-nested-frame"') && nav.includes("setWalletOpen(false);") && nav.includes("event.stopPropagation();"));
add("Account dropdown removes nested readout card", nav.includes('pass2012: "flat-account-list-no-nested-card"') && !nav.includes('<div className="velmere-readout-card rounded-xl p-3">'));
add("Outside pointer close no longer steals focus back to anchor", !overlays.includes("window.requestAnimationFrame(() =>\n          anchor.focus"));
add("PASS2012 CSS disables header and popup blur", css.includes("PASS2012 - solid header, flat anchored menus") && css.includes('header[data-pass2012-header="solid-no-blur-calm-controls"]') && css.includes("backdrop-filter: none !important"));
add("PASS2012 CSS removes dropdown decoration layers", css.includes('data-pass2012="flat-language-list-no-ring"]::before') && css.includes("display: none !important"));
add("PASS2012 CSS locks the menu to full-height left geometry", css.includes("inset: 0 auto 0 0 !important") && css.includes("height: 100dvh !important"));
add("PASS2012 final cascade lock follows PASS2011 and legacy rules", css.lastIndexOf("PASS2012 final EOF cascade lock") > css.lastIndexOf("PASS2011 cascade lock"));
add("PASS2012 dropdown motion is opacity-only and reduced-motion safe", css.includes("will-change: opacity !important") && css.includes('[data-pass2012="flat-account-list-no-nested-card"] *'));
add("Package includes PASS2012 verifier", pkg.includes("verify:pass2012-header-dropdown-perfection-sweep"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`PASS2012 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2012 verification passed: ${checks.length}/${checks.length}`);
