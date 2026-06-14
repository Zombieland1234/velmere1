import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
function check(id, file, predicate, message) {
  const text = read(file);
  const ok = predicate(text);
  checks.push({ id, file, ok, message });
}

check(
  "cart-visible-not-gated-by-hydration",
  "components/CartProvider.tsx",
  (s) =>
    (s.includes("const isOpen = rawIsOpen;") ||
      s.includes("const isOpen = rawIsOpen || forcedOpen")) &&
    !s.includes("const isOpen = hasHydrated ? rawIsOpen : false"),
  "Cart drawer visibility must not be blocked by persisted store hydration.",
);
check(
  "cart-open-forces-ui-ready",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("const ensureCartUiReady = useCallback") &&
    s.includes("ensureCartUiReady();") &&
    s.includes("rawOpenCart();"),
  "Opening the cart must force the UI ready before dispatching the open state.",
);
check(
  "cart-toggle-forces-ui-ready",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("ensureCartUiReady();") &&
    (s.includes("rawToggleCart();") ||
      s.includes('recordCartRuntime("toggleCart-open")')),
  "Toggling the cart must also bypass hydration stalls.",
);
check(
  "cart-add-item-forces-open",
  "components/CartProvider.tsx",
  (s) => s.includes("ensureCartUiReady();") && s.includes("rawAddItem(item);"),
  "Add-to-cart must force the drawer pathway before mutating the line item.",
);
check(
  "cart-hydration-has-catch-finally",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("persist.rehydrate") &&
    s.includes(".catch((error)") &&
    s.includes(".finally(finishHydration)") &&
    s.includes("cart UI stays usable"),
  "Persist hydration failures must not make the cart permanently invisible.",
);
check(
  "cart-force-open-event-has-no-recursive-open-cart-event",
  "components/CartProvider.tsx",
  (s) =>
    s.includes('"velmere:force-open-cart"') &&
    !s.includes('window.dispatchEvent(new CustomEvent("velmere:open-cart"'),
  "Optional force-open bridge must not dispatch recursive open-cart events.",
);
check(
  "cart-drawer-mounts-before-persist",
  "components/CartDrawer.tsx",
  (s) =>
    s.includes("if (!mounted) return null;") &&
    !s.includes("!mounted || !hasHydrated"),
  "Cart drawer must mount after client mount, even before persisted item hydration completes.",
);
check(
  "cart-drawer-pass1774-state-marker",
  "components/CartDrawer.tsx",
  (s) =>
    s.includes('"pass1774-cart": hasHydrated') &&
    s.includes('"force-open-before-persist-hydration"'),
  "Cart drawer must expose whether it opened before or after persisted hydration.",
);
check(
  "navbar-cart-trigger-force-marker",
  "components/Navbar.tsx",
  (s) =>
    s.includes('data-pass1774-cart-trigger="force-open-bottom-sheet"') &&
    s.includes("aria-controls={cartDrawerId}"),
  "Header cart trigger must target the bottom sheet and carry the force-open audit marker.",
);
check(
  "navbar-does-not-recursively-dispatch-open-cart",
  "components/Navbar.tsx",
  (s) =>
    !s.includes('new CustomEvent("velmere:open-cart"') &&
    !s.includes('new CustomEvent("velmere:force-open-cart"'),
  "Navbar should call context openCart directly and avoid recursive custom-event loops.",
);
check(
  "dropdown-guarantee-marker",
  "components/ui/OverlayPrimitives.tsx",
  (s) =>
    s.includes('data-pass1774-popup-guarantee="true"') &&
    s.includes('data-pass1734-popup-root="anchored-bounded-visible"'),
  "Dropdown body-portal surfaces must have the stronger popup guarantee marker.",
);
check(
  "cart-css-force-visible",
  "app/globals.css",
  (s) =>
    s.includes("PASS1774–1813 · real cart/dropdown force-open audit") &&
    s.includes("#velmere-cart-bottom-sheet[data-pass1774-cart]") &&
    s.includes("visibility: visible !important") &&
    s.includes("z-index: 1810 !important"),
  "CSS must guarantee the cart surface is visible above the page and header.",
);
check(
  "dropdown-css-force-visible",
  "app/globals.css",
  (s) =>
    s.includes('[data-pass1774-popup-guarantee="true"]') &&
    s.includes("z-index: 1820 !important"),
  "CSS must keep dropdowns above header/content with pointer events enabled.",
);
check(
  "cart-remains-bottom-sheet",
  "components/CartDrawer.tsx",
  (s) =>
    s.includes('motionPreset="bottom"') &&
    s.includes('surfaceId="velmere-cart-bottom-sheet"') &&
    s.includes('surface: "cart-bottom-sheet"'),
  "Cart remains bottom-sheet only.",
);
check(
  "audit-doc-exists",
  "docs/progress/PASS1774_1813_CART_POPUP_ROOT_CAUSE_AUDIT.md",
  (s) => s.includes("Root cause fixed") && s.includes("Persist hydration"),
  "Progress doc must explain the real root-cause fix, not just a marker.",
);
check(
  "package-script-registered",
  "package.json",
  (s) => s.includes('"verify:pass1774-1813-cart-popup-root-cause-audit"'),
  "package.json must expose the verifier.",
);

let failed = 0;
for (const item of checks) {
  if (item.ok) {
    console.log(`PASS ${item.id}`);
  } else {
    failed += 1;
    console.error(`FAIL ${item.id} :: ${item.file} :: ${item.message}`);
  }
}
if (failed) {
  console.error(
    `\nPASS1774–1813 cart/popup root-cause audit failed: ${failed}/${checks.length}`,
  );
  process.exit(1);
}
console.log(
  `\nPASS1774–1813 cart/popup root-cause audit passed: ${checks.length}/${checks.length}`,
);
