import {  errors, fs, path, read, root, routeFileExistsOrHasAlias } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.runtime-release.019");
try {
  const cartSource = read("components/CartDrawer.tsx");
  const checkoutSuccess = read("app/[locale]/checkout/success/page.tsx");
  const checkoutCancel = read("app/[locale]/checkout/cancel/page.tsx");
  const commerceSurface = `${cartSource}\n${checkoutSuccess}\n${checkoutCancel}`;
  for (const banned of [
    "Order book",
    "ALLOCATED",
    "PX:",
    "acceptTokenPrefix",
  ]) {
    if (commerceSurface.includes(banned)) {
      errors.pushWithId.bind(errors, "release.019.commerce-copy-guard-remove-trading-token-gating-copy-val.a001.commerce-copy-guard-remove-trading-token-gating-copy-val")(
        `commerce copy guard: remove trading/token-gating copy '${banned}' from clothing cart/checkout surfaces.`,
      );
    }
  }
  if (/agreedToken|setAgreedToken/.test(cartSource)) {
    errors.pushWithId.bind(errors, "release.019.commerce-copy-guard-remove-trading-token-gating-copy-val.a002.components-cartdrawerx-token-agreement-checkbox-must-not")(
      "components/CartDrawer.tsx: token agreement checkbox must not block clothing checkout; VLM perks stay optional.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.019.commerce-copy-guard-remove-trading-token-gating-copy-val.a003.commerce-copy-guard-failed-value")(
    `Commerce copy guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.020");
try {
  const rootPagePath = path.join(root, "app/page.tsx");
  if (!routeFileExistsOrHasAlias("app/page.tsx")) {
    errors.pushWithId.bind(errors, "release.020.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a001.root-deployment-path-must-exist-as-app-pagex-or-a-regist")(
      "Root deployment path '/' must exist as app/page.tsx or a registered redirect to the default locale.",
    );
  } else if (fs.existsSync(rootPagePath)) {
    const rootPage = read("app/page.tsx");
    if (!/redirect\(["']\/pl["']\)/.test(rootPage)) {
      errors.pushWithId.bind(errors, "release.020.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a002.app-pagex-root-page-should-redirect-pl-to-avoid-vercel-r")(
        "app/page.tsx: root page should redirect('/pl') to avoid Vercel root-domain 404.",
      );
    }
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.020.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a003.root-route-guard-failed-value")(
    `Root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.021");
try {
  const navbar = read("components/Navbar.tsx");
  if (!/const\s+closeMenuPanel\s*=/.test(navbar)) {
    errors.pushWithId.bind(errors, "release.021.components-navbarx-side-menu-links-need-a-closemenupanel.a001.components-navbarx-side-menu-links-need-a-closemenupanel")(
      "components/Navbar.tsx: side menu links need a closeMenuPanel() handler so the mobile drawer closes after navigation.",
    );
  }
  const closeHits = [...navbar.matchAll(/onClick=\{closeMenuPanel\}/g)].length;
  if (closeHits < 4) {
    errors.pushWithId.bind(errors, "release.021.components-navbarx-side-menu-links-need-a-closemenupanel.a002.components-navbarx-expected-drawer-logo-menu-links-legal")(
      "components/Navbar.tsx: expected drawer logo, menu links, legal links, and language links to call closeMenuPanel on click.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.021.components-navbarx-side-menu-links-need-a-closemenupanel.a003.navbar-drawer-guard-failed-value")(
    `Navbar drawer guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.022");
try {
  const square = read("components/square/VelmereSquareClient.tsx");
  if (
    /addEventListener\("touchmove"[\s\S]{0,220}preventDefault/.test(square) ||
    /addEventListener\("wheel"[\s\S]{0,220}preventDefault/.test(square)
  ) {
    errors.pushWithId.bind(errors, "release.022.components-square-velmeresquareclientx-do-not-block-touc.a001.components-square-velmeresquareclientx-do-not-block-touc")(
      "components/square/VelmereSquareClient.tsx: do not block touchmove/wheel globally; mobile post modals must remain scrollable.",
    );
  }
  const legacyScrollablePostOverlay =
    /fixed inset-0 z-\[220\][^"`]*overflow-y-auto/.test(square);
  const unifiedScrollablePostModal =
    square.includes("velmere-header-safe-modal") &&
    square.includes("max-w-[82rem]") &&
    square.includes('data-modal-scroll-region="true"');
  const viewportScrollablePostModal =
    square.includes("velmere-viewport-dialog-root") &&
    square.includes("max-w-[82rem]") &&
    square.includes('data-modal-scroll-region="true"');
  if (
    !legacyScrollablePostOverlay &&
    !unifiedScrollablePostModal &&
    !viewportScrollablePostModal
  ) {
    errors.pushWithId.bind(errors, "release.022.components-square-velmeresquareclientx-do-not-block-touc.a002.components-square-velmeresquareclientx-post-modal-should")(
      "components/square/VelmereSquareClient.tsx: post modal should use the header-safe scroll region so long posts/comments remain scrollable on mobile.",
    );
  }
  const legacySafeClose =
    /top-\[calc\(env\(safe-area-inset-top\)\+0\.75rem\)\]/.test(square);
  const unifiedSafeClose =
    square.includes('data-mobile-safe-close="true"') &&
    (square.includes("velmere-header-safe-modal") ||
      square.includes("velmere-viewport-dialog-root"));
  if (!legacySafeClose && !unifiedSafeClose) {
    errors.pushWithId.bind(errors, "release.022.components-square-velmeresquareclientx-do-not-block-touc.a003.components-square-velmeresquareclientx-mobile-post-modal")(
      "components/square/VelmereSquareClient.tsx: mobile post modal needs a visible close button inside the header-safe modal edge.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.022.components-square-velmeresquareclientx-do-not-block-touc.a004.square-mobile-guard-failed-value")(
    `Square mobile guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.023");
try {
  const vlmSwitch = read("components/vlm/VlmModeSwitch.tsx");
  if (
    !/fixed inset-x-4 bottom-\[calc\(env\(safe-area-inset-bottom\)\+9\.25rem\)\]/.test(
      vlmSwitch,
    )
  ) {
    errors.pushWithId.bind(errors, "release.023.components-vlm-vlmmodeswitchx-mobile-basic-pro-switch-mu.a001.components-vlm-vlmmodeswitchx-mobile-basic-pro-switch-mu")(
      "components/vlm/VlmModeSwitch.tsx: mobile Basic/Pro switch must be centered above Angel with inset-x-4, not clipped on the right edge.",
    );
  }
  if (!/max-w-\[15\.5rem\]/.test(vlmSwitch)) {
    errors.pushWithId.bind(errors, "release.023.components-vlm-vlmmodeswitchx-mobile-basic-pro-switch-mu.a002.components-vlm-vlmmodeswitchx-mobile-basic-pro-control-n")(
      "components/vlm/VlmModeSwitch.tsx: mobile Basic/Pro control needs a max width so both labels stay visible.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.023.components-vlm-vlmmodeswitchx-mobile-basic-pro-switch-mu.a003.vlm-mobile-switch-guard-failed-value")(
    `VLM mobile switch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.024");
try {
  const rootPagePath = path.join(root, "app/page.tsx");
  if (!routeFileExistsOrHasAlias("app/page.tsx")) {
    errors.pushWithId.bind(errors, "release.024.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a001.root-deployment-path-must-exist-as-app-pagex-or-a-regist")(
      "Root deployment path '/' must exist as app/page.tsx or a registered redirect to the default locale.",
    );
  } else if (fs.existsSync(rootPagePath)) {
    const rootPage = read("app/page.tsx");
    if (!/redirect\(["']\/pl["']\)/.test(rootPage)) {
      errors.pushWithId.bind(errors, "release.024.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a002.app-pagex-root-page-should-redirect-pl-to-avoid-vercel-r")(
        "app/page.tsx: root page should redirect('/pl') to avoid Vercel root-domain 404.",
      );
    }
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.024.root-deployment-path-must-exist-as-app-pagex-or-a-regist.a003.root-route-guard-failed-value")(
    `Root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
