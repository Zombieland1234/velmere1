import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.security-operations.015");

// Square/VLM launch control production guard
try {
  const squareVlmModel = read("lib/launch/square-vlm-launch-control.ts");
  const squareVlmComponent = read(
    "components/launch/SquareVlmLaunchControl.tsx",
  );
  const squarePage = read("app/[locale]/square/page.tsx");
  const vlmPage = read("app/[locale]/vlm-token/page.tsx");
  const communityPage = read("app/[locale]/community/page.tsx");
  for (const needle of [
    "squareVlmLaunchControl",
    "member-cockpit",
    "No ROI, no price promise",
  ]) {
    if (!squareVlmModel.includes(needle))
      errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a001.lib-launch-square-vlm-launch-control-missing-launch-cont")(
        `lib/launch/square-vlm-launch-control.ts: missing launch-control marker ${needle}.`,
      );
  }
  for (const needle of [
    "SquareVlmLaunchControl",
    "utility/access layer",
    "safety boundary",
  ]) {
    if (!squareVlmComponent.includes(needle))
      errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a002.components-launch-squarevlmlaunchcontrolx-missing-launch")(
        `components/launch/SquareVlmLaunchControl.tsx: missing launch-control UI marker ${needle}.`,
      );
  }
  if (
    !squarePage.includes('publicTrim="pass315"') &&
    !squarePage.includes('surface="square"')
  )
    errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a003.app-locale-square-pagex-squarevlmlaunchcontrol-surface-s")(
      "app/[locale]/square/page.tsx: SquareVlmLaunchControl surface=square missing.",
    );
  if (
    !vlmPage.includes("PASS318 route removal") &&
    !vlmPage.includes('surface="vlm"')
  )
    errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a004.app-locale-vlm-token-pagex-squarevlmlaunchcontrol-surfac")(
      "app/[locale]/vlm-token/page.tsx: SquareVlmLaunchControl surface=vlm missing.",
    );
  if (
    !communityPage.includes("data-pass318-public-storefront-focus") &&
    !communityPage.includes('surface="community"')
  )
    errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a005.app-locale-community-pagex-squarevlmlaunchcontrol-surfac")(
      "app/[locale]/community/page.tsx: SquareVlmLaunchControl surface=community missing.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "security.015.lib-launch-square-vlm-launch-control-missing-launch-cont.a006.square-vlm-launch-control-production-guard-failed-value")(
    `Square/VLM launch control production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.016");

// Commerce launch control production guard
try {
  const commerceModel = read("lib/launch/commerce-launch-control.ts");
  const commerceComponent = read("components/launch/CommerceLaunchControl.tsx");
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  for (const needle of [
    "commerceLaunchControl",
    "No payment flow, card entry",
    "Fulfillment provider truth",
  ]) {
    if (!commerceModel.includes(needle))
      errors.pushWithId.bind(errors, "security.016.lib-launch-commerce-launch-control-missing-commerce-laun.a001.lib-launch-commerce-launch-control-missing-commerce-laun")(
        `lib/launch/commerce-launch-control.ts: missing commerce launch marker ${needle}.`,
      );
  }
  for (const needle of [
    "CommerceLaunchControl",
    "operationally ready",
    "safety boundary",
  ]) {
    if (!commerceComponent.includes(needle))
      errors.pushWithId.bind(errors, "security.016.lib-launch-commerce-launch-control-missing-commerce-laun.a002.components-launch-commercelaunchcontrolx-missing-commerc")(
        `components/launch/CommerceLaunchControl.tsx: missing commerce UI marker ${needle}.`,
      );
  }
  if (!checkoutPage.includes('surface="checkout"'))
    errors.pushWithId.bind(errors, "security.016.lib-launch-commerce-launch-control-missing-commerce-laun.a003.app-locale-checkout-pagex-commercelaunchcontrol-surface")(
      "app/[locale]/checkout/page.tsx: CommerceLaunchControl surface=checkout missing.",
    );
  if (!cartPage.includes('surface="cart"'))
    errors.pushWithId.bind(errors, "security.016.lib-launch-commerce-launch-control-missing-commerce-laun.a004.app-locale-cart-pagex-commercelaunchcontrol-surface-cart")(
      "app/[locale]/cart/page.tsx: CommerceLaunchControl surface=cart missing.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "security.016.lib-launch-commerce-launch-control-missing-commerce-laun.a005.commerce-launch-control-production-guard-failed-value")(
    `Commerce launch control production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.017");

// Provider truth/admin gate production guard
try {
  const providerLedger = read("lib/launch/provider-truth-ledger.ts");
  const providerPanel = read("components/launch/ProviderTruthLedgerPanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "providerTruthLedger",
    "All SKU readiness",
    "buildProductProviderTruthSnapshot",
  ]) {
    if (!providerLedger.includes(needle))
      errors.pushWithId.bind(errors, "security.017.lib-launch-provider-truth-ledger-missing-provider-truth.a001.lib-launch-provider-truth-ledger-missing-provider-truth")(
        `lib/launch/provider-truth-ledger.ts: missing provider truth marker ${needle}.`,
      );
  }
  for (const needle of [
    "ProviderTruthLedgerPanel",
    "SKU and shipping need proof",
    "Provider, SKU i dostawa",
  ]) {
    if (!providerPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.017.lib-launch-provider-truth-ledger-missing-provider-truth.a002.components-launch-providertruthledgerpanelx-missing-prov")(
        `components/launch/ProviderTruthLedgerPanel.tsx: missing provider truth UI marker ${needle}.`,
      );
  }
  if (
    !adminPage.includes("adminGateCopy") ||
    !adminPage.includes("admin gate / launch control")
  ) {
    errors.pushWithId.bind(errors, "security.017.lib-launch-provider-truth-ledger-missing-provider-truth.a003.app-locale-admin-import-products-pagex-admin-gate-launch")(
      "app/[locale]/admin/import-products/page.tsx: admin gate launch-control notice missing.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.017.lib-launch-provider-truth-ledger-missing-provider-truth.a004.provider-truth-admin-gate-production-guard-failed-value")(
    `Provider truth/admin gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
