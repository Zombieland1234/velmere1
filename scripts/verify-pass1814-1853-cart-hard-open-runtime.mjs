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
  "provider-has-local-forced-open",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("const [forcedOpen, setForcedOpen] = useState(false)") &&
    s.includes("const isOpen = rawIsOpen || forcedOpen"),
  "CartProvider must have a local hard-open state independent from persisted Zustand state.",
);
check(
  "open-cart-hard-opens-and-frame-confirms",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("setForcedOpen(true);") &&
    ((s.includes('recordCartRuntime("openCart-sync")') &&
      s.includes('recordCartRuntime("openCart-frame-confirm")')) ||
      (s.includes('requestCartOpen("openCart")') &&
        s.includes("recordCartRuntime(`${source}-frame-confirm`)"))),
  "openCart must hard-open immediately and confirm the store open on the next frame.",
);
check(
  "close-clears-forced-and-store",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("const closeCart = useCallback") &&
    s.includes("setForcedOpen(false);") &&
    s.includes("rawCloseCart();"),
  "closeCart must clear both local hard-open and store state.",
);
check(
  "toggle-no-longer-uses-persisted-toggle-for-opening",
  "components/CartProvider.tsx",
  (s) =>
    (s.includes('recordCartRuntime("toggleCart-open")') ||
      s.includes('requestCartOpen("toggleCart")')) &&
    !s.includes("rawToggleCart"),
  "toggleCart must not rely on persisted toggle for opening after popup failures.",
);
check(
  "header-cart-pointer-capture-fallback",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("onHeaderCartPointer") &&
    s.includes(
      'document.addEventListener("pointerdown", onHeaderCartPointer, true)',
    ) &&
    s.includes("header-cart"),
  "CartProvider must catch header-cart pointerdown even if React click timing breaks.",
);
check(
  "cart-runtime-debug-payload",
  "components/CartProvider.tsx",
  (s) =>
    s.includes("__velmereCartRuntime") &&
    s.includes("velmere:cart-runtime") &&
    s.includes("pass1814"),
  "CartProvider must expose a browser debug payload for future real click QA.",
);
check(
  "cart-drawer-pathname-close-ref-only",
  "components/CartDrawer.tsx",
  (s) =>
    s.includes("const closeCartRef = useRef(closeCart)") &&
    s.includes("closeCartRef.current = closeCart") &&
    s.includes("}, [pathname]);") &&
    !s.includes("useEffect(() => closeCart(), [closeCart, pathname])"),
  "CartDrawer must not close simply because closeCart identity changes during open.",
);
check(
  "cart-drawer-pass1814-marker",
  "components/CartDrawer.tsx",
  (s) =>
    s.includes('"pass1814-cart": "hard-open-local-state-or-store"') &&
    s.includes('surfaceId="velmere-cart-bottom-sheet"'),
  "CartDrawer must expose the PASS1814 hard-open surface marker.",
);
check(
  "navbar-cart-remains-context-direct",
  "components/Navbar.tsx",
  (s) =>
    s.includes('data-velmere-overlay-trigger="header-cart"') &&
    s.includes('onClick={() => openExclusiveHeaderSurface("cart")}') &&
    !s.includes('new CustomEvent("velmere:force-open-cart"'),
  "Navbar must keep direct context openCart usage and avoid recursive custom-event loops.",
);
check(
  "dropdowns-not-double-toggle-pointerdown",
  "components/Navbar.tsx",
  (s) =>
    !s.includes(
      'onPointerDownCapture={() => openExclusiveHeaderSurface("wallet")}',
    ) &&
    !s.includes(
      'onPointerDownCapture={() => openExclusiveHeaderSurface("account")}',
    ),
  "Dropdown buttons must not double-toggle open on pointerdown plus click.",
);
check(
  "css-hard-open-cart-lane",
  "app/globals.css",
  (s) =>
    s.includes("PASS1814–1853 · cart hard-open runtime repair") &&
    s.includes('data-pass1814-cart="hard-open-local-state-or-store"') &&
    s.includes("z-index: 1860 !important"),
  "CSS must include a stronger PASS1814 cart visibility lane.",
);
check(
  "doc-explains-root-cause-expansion",
  "docs/progress/PASS1814_1853_CART_HARD_OPEN_RUNTIME_REPAIR.md",
  (s) =>
    s.includes("Root-cause expansion") &&
    s.includes("local hard-open lane") &&
    s.includes("window.__velmereCartRuntime"),
  "Progress doc must explain the cart root-cause expansion and debug lane.",
);
check(
  "package-script-registered",
  "package.json",
  (s) => s.includes('"verify:pass1814-1853-cart-hard-open-runtime"'),
  "package.json must expose the PASS1814 verifier.",
);

let failed = 0;
for (const item of checks) {
  if (item.ok) console.log(`PASS ${item.id}`);
  else {
    failed += 1;
    console.error(`FAIL ${item.id} :: ${item.file} :: ${item.message}`);
  }
}
if (failed) {
  console.error(
    `\nPASS1814–1853 cart hard-open runtime repair failed: ${failed}/${checks.length}`,
  );
  process.exit(1);
}
console.log(
  `\nPASS1814–1853 cart hard-open runtime repair passed: ${checks.length}/${checks.length}`,
);
