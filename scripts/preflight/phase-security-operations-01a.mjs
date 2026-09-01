import {  errors, read, routeFileExistsOrHasAlias } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.security-operations.001");

try {
  const navbar = read("components/Navbar.tsx");
  if (!/ShoppingBag/.test(navbar) || !/aria-label="Open cart"/.test(navbar)) {
    errors.pushWithId.bind(errors, "security.001.components-navbarx-mobile-header-must-always-expose-the.a001.components-navbarx-mobile-header-must-always-expose-the")(
      "components/Navbar.tsx: mobile header must always expose the cart button with a ShoppingBag icon and Open cart label.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.001.components-navbarx-mobile-header-must-always-expose-the.a002.navbar-cart-guard-failed-value")(
    `Navbar cart guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.002");

try {
  const walletTypes = read("lib/wallet/types.ts");
  const walletButton = read("components/wallet/WalletConnectButton.tsx");
  const union =
    walletTypes.match(/export type WalletKind\s*=\s*([^;]+);/s)?.[1] ?? "";
  const kinds = [...union.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const kind of kinds) {
    if (!new RegExp(`${kind}\\s*:`).test(walletButton)) {
      errors.pushWithId.bind(errors, "security.002.components-wallet-walletconnectbuttonx-wallet-config-is.a001.components-wallet-walletconnectbuttonx-wallet-config-is")(
        `components/wallet/WalletConnectButton.tsx: WALLET_CONFIG is missing WalletKind '${kind}'.`,
      );
    }
  }
  if (!/Record<WalletKind/.test(walletButton)) {
    errors.pushWithId.bind(errors, "security.002.components-wallet-walletconnectbuttonx-wallet-config-is.a002.components-wallet-walletconnectbuttonx-wallet-config-sho")(
      "components/wallet/WalletConnectButton.tsx: WALLET_CONFIG should be typed as Record<WalletKind, ...> to prevent union indexing errors.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.002.components-wallet-walletconnectbuttonx-wallet-config-is.a003.wallet-config-guard-failed-value")(
    `Wallet config guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.003");

try {
  const productCard = read("components/product/ProductCard.tsx");
  const shopPage = read("components/shop/ShopPageClient.tsx");
  if (
    !/priority\?: boolean/.test(productCard) ||
    !/priority=\{priority\}/.test(productCard)
  ) {
    errors.pushWithId.bind(errors, "security.003.components-product-productcardx-productcard-must-accept.a001.components-product-productcardx-productcard-must-accept")(
      "components/product/ProductCard.tsx: ProductCard must accept a priority prop and pass it to the primary next/image for LCP safety.",
    );
  }
  if (!/priority=\{index < 2\}/.test(shopPage)) {
    errors.pushWithId.bind(errors, "security.003.components-product-productcardx-productcard-must-accept.a002.components-shop-shoppageclientx-first-visible-product-ca")(
      "components/shop/ShopPageClient.tsx: first visible product cards should pass priority={index < 2} to optimize above-the-fold mobile LCP.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.003.components-product-productcardx-productcard-must-accept.a003.product-image-optimization-guard-failed-value")(
    `Product image optimization guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.004");

try {
  const cartStore = read("store/useCartStore.ts");
  const cartProvider = read("components/CartProvider.tsx");
  const cartDrawer = read("components/CartDrawer.tsx");
  if (
    !/skipHydration:\s*true/.test(cartStore) ||
    !/hasHydrated/.test(cartStore)
  ) {
    errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a001.store-usecartstore-persisted-cart-needs-skiphydration-an")(
      "store/useCartStore.ts: persisted cart needs skipHydration and an explicit hasHydrated flag to prevent hydration flicker.",
    );
  }
  if (!/safeItems/.test(cartProvider)) {
    errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a002.components-cartproviderx-expose-safeitems-only-after-car")(
      "components/CartProvider.tsx: expose safeItems only after cart hydration to avoid SSR/client cart mismatch.",
    );
  }
  if (!/const isOpen = rawIsOpen/.test(cartProvider) || !/ensureCartUiReady/.test(cartProvider)) {
    errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a003.components-cartproviderx-cart-click-must-force-the-drawe")(
      "components/CartProvider.tsx: cart click must force the drawer UI open even when persisted storage hydration is pending or failed.",
    );
  }
  if (!/if \(!mounted\) return null/.test(cartDrawer) || /!mounted \|\| !hasHydrated/.test(cartDrawer)) {
    errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a004.components-cartdrawerx-drawer-should-mount-after-client")(
      "components/CartDrawer.tsx: drawer should mount after client mount and must not be hidden behind persisted cart hydration.",
    );
  }
  if (!/pass1774-cart/.test(cartDrawer)) {
    errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a005.components-cartdrawerx-missing-legacy-force-open-hydrati")(
      "components/CartDrawer.tsx: missing PASS1774 force-open hydration state marker.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.004.store-usecartstore-persisted-cart-needs-skiphydration-an.a006.cart-hydration-guard-failed-value")(
    `Cart hydration guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.005");

try {
  const proxy = read("proxy.ts");
  const hasRequiredExclusions =
    proxy.includes('"/api/:path*"') &&
    proxy.includes('"/((?!api|_next|_vercel).*)"') &&
    proxy.includes("PUBLIC_ASSET_PREFIXES") &&
    proxy.includes("PUBLIC_ASSET_EXTENSION") &&
    proxy.includes("isKnownPublicAssetPath") &&
    proxy.includes("if (isKnownPublicAssetPath(normalizedPath))");
  if (!hasRequiredExclusions) {
    errors.pushWithId.bind(errors, "security.005.proxy-matcher-must-exclude-api-next-vercel-and-static-fi.a001.proxy-matcher-must-exclude-api-next-vercel-and-static-fi")(
      "proxy.ts: matcher must cover API security headers while excluding api, _next, _vercel and static extensions from the localized page branch.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.005.proxy-matcher-must-exclude-api-next-vercel-and-static-fi.a002.proxy-matcher-guard-failed-value")(
    `Proxy matcher guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.006");

try {
  const printful = read("lib/printful/client.ts");
  if (
    /cache:\s*["']no-store["'][\s\S]{0,80}method\s*===\s*["']GET/.test(
      printful,
    ) ||
    !/revalidate:\s*options\.revalidate \?\? 3600/.test(printful)
  ) {
    errors.pushWithId.bind(errors, "security.006.lib-printful-client-get-requests-should-use-next-revalid.a001.lib-printful-client-get-requests-should-use-next-revalid")(
      "lib/printful/client.ts: GET requests should use Next revalidate cache by default to avoid Printful rate limiting.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.006.lib-printful-client-get-requests-should-use-next-revalid.a002.printful-cache-guard-failed-value")(
    `Printful cache guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.007");

try {
  const webhookRoute = read("app/api/stripe/webhook/route.ts");
  const webhookIngress = read("lib/payments/stripe-webhook/ingress.ts");
  const orderService = read("lib/db/order-service.ts");
  const routeDelegatesToIngress =
    /handleStripeWebhookRequest/.test(webhookRoute) &&
    /lib\/payments\/stripe-webhook\/ingress/.test(webhookRoute);
  if (!routeDelegatesToIngress) {
    errors.pushWithId.bind(errors, "security.007.app-api-stripe-webhook-route-stripe-webhook-route-must-d.a001.app-api-stripe-webhook-route-stripe-webhook-route-must-d")(
      "app/api/stripe/webhook/route.ts: Stripe webhook route must delegate to the typed ingress boundary.",
    );
  }
  if (
    !/stripe\.webhooks\.constructEvent/.test(webhookIngress) ||
    !/stripe-signature/.test(webhookIngress)
  ) {
    errors.pushWithId.bind(errors, "security.007.app-api-stripe-webhook-route-stripe-webhook-route-must-d.a002.lib-payments-stripe-webhook-ingress-stripe-webhook-must")(
      "lib/payments/stripe-webhook/ingress.ts: Stripe webhook must verify stripe-signature with constructEvent.",
    );
  }
  if (
    !/claimStripeWebhookEvent/.test(webhookIngress) ||
    !/markStripeWebhookEventProcessed/.test(webhookIngress) ||
    !/claimStripeWebhookEvent/.test(orderService) ||
    !/markStripeWebhookEventProcessed/.test(orderService)
  ) {
    errors.pushWithId.bind(errors, "security.007.app-api-stripe-webhook-route-stripe-webhook-route-must-d.a003.stripe-webhook-ingress-and-durable-order-service-must-pr")(
      "Stripe webhook ingress and durable order service must preserve claim/processed idempotency boundaries.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.007.app-api-stripe-webhook-route-stripe-webhook-route-must-d.a004.stripe-webhook-guard-failed-value")(
    `Stripe webhook guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.008");

try {
  const provider = read("components/wallet/Web3Provider.tsx");
  if (!/reconnectOnMount=\{false\}/.test(provider)) {
    errors.pushWithId.bind(errors, "security.008.components-wallet-web3providerx-set-reconnectonmount-fal.a001.components-wallet-web3providerx-set-reconnectonmount-fal")(
      "components/wallet/Web3Provider.tsx: set reconnectOnMount={false} to prevent wallet reconnect loops/hydration surprises.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.008.components-wallet-web3providerx-set-reconnectonmount-fal.a002.web3-provider-guard-failed-value")(
    `Web3 provider guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.009");

try {
  const neural = read("components/home/NeuralBrainVisual.tsx");
  if (!/lowPowerMode/.test(neural) || !/max-width: 767px/.test(neural)) {
    errors.pushWithId.bind(errors, "security.009.components-home-neuralbrainvisualx-mobile-canvas-must-ha.a001.components-home-neuralbrainvisualx-mobile-canvas-must-ha")(
      "components/home/NeuralBrainVisual.tsx: mobile canvas must have lowPowerMode to prevent battery drain and scroll lag.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.009.components-home-neuralbrainvisualx-mobile-canvas-must-ha.a002.mobile-animation-guard-failed-value")(
    `Mobile animation guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.010");

try {
  const localeLayout = read("app/[locale]/layout.tsx");
  const localeHome = read("app/[locale]/page.tsx");
  if (
    !/(?:setRequestLocale|unstable_setRequestLocale)\(locale\)/.test(
      localeLayout,
    )
  ) {
    errors.pushWithId.bind(errors, "security.010.app-locale-layoutx-locale-layout-must-call-setrequestloc.a001.app-locale-layoutx-locale-layout-must-call-setrequestloc")(
      "app/[locale]/layout.tsx: locale layout must call setRequestLocale(locale) so /pl, /en and /de resolve reliably on Vercel.",
    );
  }
  if (
    !/export default (?:async )?function HomePage/.test(localeHome) ||
    !/HomePageClient/.test(localeHome)
  ) {
    errors.pushWithId.bind(errors, "security.010.app-locale-layoutx-locale-layout-must-call-setrequestloc.a002.app-locale-pagex-locale-root-pages-pl-en-and-de-must-ren")(
      "app/[locale]/page.tsx: locale root pages /pl, /en and /de must render the homepage instead of falling to global 404.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.010.app-locale-layoutx-locale-layout-must-call-setrequestloc.a003.locale-root-route-guard-failed-value")(
    `Locale root route guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.011");

try {
  const requiredLocaleRoutes = [
    "page.tsx",
    "login/page.tsx",
    "account/page.tsx",
    "cart/page.tsx",
    "shop/page.tsx",
    "clothing/page.tsx",
    "square/page.tsx",
    "vlm-token/page.tsx",
    "market-integrity/page.tsx",
    "community/page.tsx",
    "contact/page.tsx",
    "returns/page.tsx",
    "shipping/page.tsx",
    "terms/page.tsx",
    "privacy/page.tsx",
  ];
  for (const route of requiredLocaleRoutes) {
    const routeFile = `app/[locale]/${route}`;
    if (!routeFileExistsOrHasAlias(routeFile)) {
      errors.pushWithId.bind(errors, "security.011.value-required-locale-route-or-registered-alias-is-missi.a001.value-required-locale-route-or-registered-alias-is-missi")(
        `${routeFile}: required locale route or registered alias is missing; Vercel may show a false 404.`,
      );
    }
  }

  const missingFallback = read("app/[locale]/[...missing]/page.tsx");
  if (
    !/LOGIN_ALIASES/.test(missingFallback) ||
    !/LoginPage/.test(missingFallback)
  ) {
    errors.pushWithId.bind(errors, "security.011.value-required-locale-route-or-registered-alias-is-missi.a002.app-locale-missing-pagex-catch-all-route-must-rescue-log")(
      "app/[locale]/[...missing]/page.tsx: catch-all route must rescue /login aliases so stale Vercel rewrites cannot show a false 404 for /pl/login.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.011.value-required-locale-route-or-registered-alias-is-missi.a003.locale-route-smoke-guard-failed-value")(
    `Locale route smoke guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.012");

try {
  const authGate = read("components/auth/AuthGate.tsx");
  const localeDeclarations = [
    ...authGate.matchAll(/const\s+locale\s*=\s*useLocale\(/g),
  ].length;
  if (localeDeclarations > 1) {
    errors.pushWithId.bind(errors, "security.012.components-auth-authgatex-uselocale-was-declared-as-cons.a001.components-auth-authgatex-uselocale-was-declared-as-cons")(
      "components/auth/AuthGate.tsx: useLocale() was declared as const locale more than once; keep one rawLocale/useLocale declaration to avoid SWC compile errors.",
    );
  }
  if (
    /const\s+locale\s*=\s*useLocale\(\);[\s\S]{0,240}const\s+locale\s*=\s*useLocale\(\)/.test(
      authGate,
    )
  ) {
    errors.pushWithId.bind(errors, "security.012.components-auth-authgatex-uselocale-was-declared-as-cons.a002.components-auth-authgatex-duplicate-locale-constant-dete")(
      "components/auth/AuthGate.tsx: duplicate locale constant detected near AuthGate; this breaks next dev/build.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.012.components-auth-authgatex-uselocale-was-declared-as-cons.a003.authgate-duplicate-locale-guard-failed-value")(
    `AuthGate duplicate-locale guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.013");

try {
  const navbar = read("components/Navbar.tsx");
  const proxy = read("proxy.ts");
  const authForm = read("components/auth/AuthFormClient.tsx");
  if (
    !/localizedLoginHref/.test(navbar) ||
    !/localizedAccountHref/.test(navbar)
  ) {
    errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a001.components-navbarx-account-header-icon-must-use-hard-loc")(
      "components/Navbar.tsx: account/header icon must use hard locale-prefixed login/account hrefs to avoid /login or false 404 navigation on Vercel.",
    );
  }
  if (
    /href=\{isMemberActive \? "\/account" : "\/login"\}/.test(navbar) ||
    /href="\/login"/.test(navbar)
  ) {
    errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a002.components-navbarx-do-not-use-raw-login-or-account-in-he")(
      "components/Navbar.tsx: do not use raw /login or /account in header/member navigation; use /${locale}/login or /${locale}/account.",
    );
  }
  for (const route of [
    "app/login/page.tsx",
    "app/account/page.tsx",
    "app/logowanie/page.tsx",
    "app/[locale]/login/page.tsx",
    "app/[locale]/account/page.tsx",
    "app/[locale]/logowanie/page.tsx",
    "app/[locale]/sign-in/page.tsx",
    "app/[locale]/signin/page.tsx",
  ]) {
    if (!routeFileExistsOrHasAlias(route)) {
      errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a003.value-auth-route-or-registered-alias-is-missing-login-me")(
        `${route}: auth route or registered alias is missing; login/member clicks may show 404.`,
      );
    }
  }
  if (!/ROOT_AUTH_ALIASES/.test(proxy) || !/LOCALE_AUTH_ALIASES/.test(proxy)) {
    errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a004.proxy-auth-aliases-must-redirect-login-account-and-pl-lo")(
      "proxy.ts: auth aliases must redirect /login, /account and /pl/logowanie-style paths to stable locale routes.",
    );
  }
  if (!/window\.location\.assign\(accountHref\)/.test(authForm)) {
    errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a005.components-auth-authformclientx-after-preview-login-redi")(
      "components/auth/AuthFormClient.tsx: after preview login, redirect with a hard locale-prefixed accountHref to avoid router locale confusion.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.013.components-navbarx-account-header-icon-must-use-hard-loc.a006.auth-route-hardening-guard-failed-value")(
    `Auth route hardening guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.014");

try {
  const marketPage = read("app/[locale]/market-integrity/page.tsx");
  const riskEngine = read("lib/market-integrity/risk-engine.ts");
  const apiRoute = read("app/api/market-integrity/analyze/route.ts");
  const client = read("components/market-integrity/MarketIntegrityClient.tsx");
  const riskCard = read("components/market-integrity/TokenRiskCard.tsx");
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  const klinesRoute = read("app/api/market-integrity/klines/route.ts");
  const sentinelRoute = read("app/api/market-integrity/sentinel/route.ts");
  const alertsLib = read("lib/market-integrity/risk-alerts.ts");
  if (!/(MarketIntegrityClient|ShieldRealMarketsParityClient)/.test(marketPage)) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a001.app-locale-market-integrity-pagex-market-integrity-route")(
      "app/[locale]/market-integrity/page.tsx: market integrity route must render the Shield dashboard.",
    );
  }
  if (
    !/analyzeTokenRisk/.test(riskEngine) ||
    /This is not an accusation/.test(riskEngine)
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a002.lib-market-integrity-risk-engine-engine-should-return-si")(
      "lib/market-integrity/risk-engine.ts: engine should return signal IDs/data only; legal/i18n copy belongs in UI messages.",
    );
  }
  if (
    !/api\.dexscreener\.com\/latest\/dex\/search/.test(apiRoute) &&
    !/analyzeDexScreenerToken/.test(apiRoute)
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a003.app-api-market-integrity-analyze-route-live-token-scan-s")(
      "app/api/market-integrity/analyze/route.ts: live token scan should stay server-side and use the data adapter, not client-side API keys.",
    );
  }
  if (
    !/legalDisclaimer/.test(riskCard) ||
    !/market-integrity-search/.test(client)
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a004.components-market-integrity-marketintegrityclientx-dashb")(
      "components/market-integrity/MarketIntegrityClient.tsx: dashboard must include search input and visible legal disclaimer rendering.",
    );
  }
  const unifiedChartModal =
    /UnifiedAssetModalShell/.test(modal) &&
    /PopupMarketChart/.test(modal) &&
    /api\/market-integrity\/klines/.test(modal);
  if (
    !unifiedChartModal &&
    (!/ExchangeCandlesChart/.test(modal) ||
      !/api\/market-integrity\/klines/.test(modal) ||
      !/chartMode === "candles"/.test(modal))
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a005.components-market-integrity-tokenriskmodalx-token-modal")(
      "components/market-integrity/TokenRiskModal.tsx: token modal must keep exchange-style candles/volume chart modes backed by the klines endpoint or the unified chart modal replacement.",
    );
  }
  if (
    !unifiedChartModal &&
    (!/OrderBookDepthChart/.test(modal) || !/chartMode === "depth"/.test(modal))
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a006.components-market-integrity-tokenriskmodalx-token-modal")(
      "components/market-integrity/TokenRiskModal.tsx: token modal must keep exchange-style order-book depth chart mode or the unified chart modal replacement.",
    );
  }
  if (!/(fetchBinanceKlines|fetchVerifiedKlines)/.test(klinesRoute)) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a007.app-api-market-integrity-klines-route-missing-binance-kl")(
      "app/api/market-integrity/klines/route.ts: missing Binance kline proxy for server-side OHLC chart data.",
    );
  }
  if (
    !/buildSentinelAlerts/.test(sentinelRoute) ||
    !/ShieldSentinelAlert/.test(alertsLib) ||
    !/sentinelAlerts/.test(client)
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a008.market-integrity-sentinel-dashboard-must-keep-the-server")(
      "market-integrity sentinel: dashboard must keep the server-side Sentinel alert agent and compact watch panel.",
    );
  }
  if (
    !/Shield scenario matrix/.test(modal) &&
    !(/UnifiedAssetModalShell/.test(modal) && /detailsSlot=/.test(modal) && /operatorCaseFile.primaryNextAction/.test(modal))
  ) {
    errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a009.components-market-integrity-tokenriskmodalx-modal-must-k")(
      "components/market-integrity/TokenRiskModal.tsx: modal must keep scenario matrix/evidence details or the unified source-gap-next-check details replacement.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.014.app-locale-market-integrity-pagex-market-integrity-route.a010.market-integrity-guard-failed-value")(
    `Market integrity guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
