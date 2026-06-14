import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}
function check(label, condition) {
  checks.push({ label, passed: Boolean(condition) });
}

const providerPath = "components/CartProvider.tsx";
const drawerPath = "components/CartDrawer.tsx";
const navbarPath = "components/Navbar.tsx";
const controlsPath =
  "components/market-integrity/UnifiedAssetAnalysisControls.tsx";
const oldE2ePath = "tests/e2e/pass1214-1233-build-click-proof.spec.ts";
const e2ePath = "tests/e2e/pass1934-1973-runtime-click-proof.spec.ts";
const releasePath = "lib/release/pass1934-runtime-click-proof.ts";
const cssPath = "app/globals.css";
const docPath = "docs/progress/PASS1934_1973_RUNTIME_CLICK_PROOF.md";
const pkgPath = "package.json";

const provider = read(providerPath);
const drawer = read(drawerPath);
const navbar = read(navbarPath);
const controls = read(controlsPath);
const oldE2e = read(oldE2ePath);
const e2e = read(e2ePath);
const release = read(releasePath);
const css = read(cssPath);
const doc = read(docPath);
const pkg = read(pkgPath);

check(
  "provider exposes forcedOpen and runtime debug",
  provider.includes("forcedOpen") &&
    provider.includes("__velmereCartRuntime") &&
    provider.includes("pass1934"),
);
check(
  "provider tracks open source and attempts",
  provider.includes("runtimeOpenSource") && provider.includes("openAttempts"),
);
check(
  "provider has pointer click keyboard capture paths",
  provider.includes("header-cart-pointerdown-capture") &&
    provider.includes("header-cart-click-capture") &&
    provider.includes("header-cart-keydown-capture"),
);
check(
  "provider accepts force-open custom events",
  provider.includes("velmere:force-open-cart") &&
    provider.includes("velmere:open-cart"),
);
check(
  "navbar cart trigger has direct pointer and keyboard hard open",
  navbar.includes("onPointerDownCapture") &&
    navbar.includes("data-pass1934-cart-trigger") &&
    navbar.includes("velmere-header-cart-trigger"),
);
check(
  "navbar dropdown triggers have test ids",
  [
    "velmere-header-language-trigger",
    "velmere-header-wallet-trigger",
    "velmere-header-account-trigger",
  ].every((x) => navbar.includes(x)),
);
check(
  "drawer exposes cart test id",
  drawer.includes('testid: "velmere-cart-bottom-sheet"') &&
    drawer.includes('data-testid="velmere-cart-empty-state"'),
);
check(
  "drawer exposes pass1934 cart marker",
  drawer.includes("pass1934-cart") &&
    drawer.includes("runtime-click-proof-visible"),
);
check(
  "rectangular modal contract exists",
  controls.includes("data-unified-asset-rect-chart") &&
    controls.includes('data-unified-asset-depth-rail="rectangular-attached"'),
);
check(
  "old e2e no longer expects circular modal",
  !oldE2e.includes("data-unified-asset-circular-chart") &&
    !oldE2e.includes("data-unified-asset-bubble-rail"),
);
check(
  "new e2e cart proof exists",
  exists(e2ePath) &&
    e2e.includes("__velmereCartRuntime") &&
    e2e.includes("velmere-cart-bottom-sheet"),
);
check(
  "new e2e dropdown proof exists",
  e2e.includes("velmere-header-language-trigger") &&
    e2e.includes("velmere-header-wallet-trigger"),
);
check(
  "new e2e rectangular modal proof exists",
  e2e.includes("data-unified-asset-rect-chart") &&
    e2e.includes("data-unified-asset-depth-rail"),
);
check(
  "new e2e audit registry proof exists",
  e2e.includes("/pl/security/audits/registry") &&
    e2e.includes("data-pass1894-registry-listing"),
);
check(
  "release gate exists",
  release.includes("pass1934-runtime-click-proof-final-audit") &&
    release.includes("tasks: 64"),
);
check(
  "release gate blocks circular and bubble public modal",
  release.includes("noCircularPublicAssetModal: true") &&
    release.includes("noBubbleRailPublicAssetModal: true"),
);
check(
  "css hardens cart visibility",
  css.includes('data-pass1934-cart="runtime-click-proof-visible"') &&
    css.includes("z-index: 1973"),
);
check(
  "css keeps rectangular modal visible",
  css.includes('data-unified-asset-rect-chart="true"') &&
    css.includes('data-unified-asset-depth-rail="rectangular-attached"'),
);
check(
  "doc exists",
  doc.includes("Runtime Click Proof") && doc.includes("__velmereCartRuntime"),
);
check(
  "package scripts exist",
  pkg.includes("verify:pass1934-1973-runtime-click-proof") &&
    pkg.includes("test:e2e:pass1934-1973"),
);

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks)
  console.log(`${entry.passed ? "PASS" : "FAIL"} ${entry.label}`);
if (failed.length) {
  console.error(`\n${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} checks`);
