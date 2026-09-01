import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.security-operations.018");

// Product provider snapshot production guard
try {
  const productCard = read("components/product/ProductCard.tsx");
  const productDetail = read("components/shop/ProductDetailClient.tsx");
  const providerLedger = read("lib/launch/provider-truth-ledger.ts");
  for (const needle of [
    "buildProductProviderTruthSnapshot(product)",
    "providerSnapshot.score",
    "providerSnapshot.sourceMode",
  ]) {
    if (!productCard.includes(needle))
      errors.pushWithId.bind(errors, "security.018.components-product-productcardx-missing-provider-snapsho.a001.components-product-productcardx-missing-provider-snapsho")(
        `components/product/ProductCard.tsx: missing provider snapshot marker ${needle}.`,
      );
  }
  const providerDetailNeedles = productDetail.includes(
    'data-pass318-public-storefront-focus="product"',
  )
    ? [
        "buildProductProviderTruthSnapshot(selectedProduct)",
        "providerSnapshotTitle",
      ]
    : [
        "buildProductProviderTruthSnapshot(selectedProduct)",
        "providerSnapshotTitle",
        "providerSnapshot.missing.join",
      ];
  for (const needle of providerDetailNeedles) {
    if (!productDetail.includes(needle))
      errors.pushWithId.bind(errors, "security.018.components-product-productcardx-missing-provider-snapsho.a002.components-shop-productdetailclientx-missing-product-pro")(
        `components/shop/ProductDetailClient.tsx: missing product provider detail marker ${needle}.`,
      );
  }
  if (
    !providerLedger.includes("SKU truth snapshots now surface on cards/details")
  ) {
    errors.pushWithId.bind(errors, "security.018.components-product-productcardx-missing-provider-snapsho.a003.lib-launch-provider-truth-ledger-product-level-sku-snaps")(
      "lib/launch/provider-truth-ledger.ts: product-level SKU snapshot status missing.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.018.components-product-productcardx-missing-provider-snapsho.a004.product-provider-snapshot-production-guard-failed-value")(
    `Product provider snapshot production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.019");

// Shipping/returns truth production guard
try {
  const shippingReturnsModel = read("lib/launch/shipping-returns-truth.ts");
  const shippingReturnsPanel = read(
    "components/launch/ShippingReturnsTruthPanel.tsx",
  );
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const returnsPage = read("app/[locale]/legal/returns/page.tsx");
  for (const needle of [
    "shippingReturnsTruthMatrix",
    "Shipping costs",
    "Refund flow",
    "Provider exceptions",
  ]) {
    if (!shippingReturnsModel.includes(needle))
      errors.pushWithId.bind(errors, "security.019.lib-launch-shipping-returns-truth-missing-shipping-retur.a001.lib-launch-shipping-returns-truth-missing-shipping-retur")(
        `lib/launch/shipping-returns-truth.ts: missing shipping/returns marker ${needle}.`,
      );
  }
  for (const needle of [
    "ShippingReturnsTruthPanel",
    "Shipping and returns must be clear",
    "Dostawa i zwroty",
  ]) {
    if (!shippingReturnsPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.019.lib-launch-shipping-returns-truth-missing-shipping-retur.a002.components-launch-shippingreturnstruthpanelx-missing-shi")(
        `components/launch/ShippingReturnsTruthPanel.tsx: missing shipping/returns UI marker ${needle}.`,
      );
  }
  if (
    !checkoutPage.includes("data-pass318-public-storefront-focus") &&
    !checkoutPage.includes('surface="checkout"')
  )
    errors.pushWithId.bind(errors, "security.019.lib-launch-shipping-returns-truth-missing-shipping-retur.a003.app-locale-checkout-pagex-shippingreturnstruthpanel-surf")(
      "app/[locale]/checkout/page.tsx: ShippingReturnsTruthPanel surface=checkout missing.",
    );
  if (
    !returnsPage.includes("PASS318 route removal") &&
    !returnsPage.includes('surface="legal"')
  )
    errors.pushWithId.bind(errors, "security.019.lib-launch-shipping-returns-truth-missing-shipping-retur.a004.app-locale-legal-returns-pagex-shippingreturnstruthpanel")(
      "app/[locale]/legal/returns/page.tsx: ShippingReturnsTruthPanel surface=legal missing.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "security.019.lib-launch-shipping-returns-truth-missing-shipping-retur.a005.shipping-returns-truth-production-guard-failed-value")(
    `Shipping/returns truth production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.020");

// Payment/order readiness production guard
try {
  const paymentOrderModel = read("lib/launch/payment-order-readiness.ts");
  const paymentOrderPanel = read(
    "components/launch/PaymentOrderReadinessPanel.tsx",
  );
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  for (const needle of [
    "paymentOrderReadinessMatrix",
    "Payment provider",
    "Webhook and audit trail",
    "Customer emails",
  ]) {
    if (!paymentOrderModel.includes(needle))
      errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a001.lib-launch-payment-order-readiness-missing-payment-order")(
        `lib/launch/payment-order-readiness.ts: missing payment/order marker ${needle}.`,
      );
  }
  for (const needle of [
    "PaymentOrderReadinessPanel",
    "Payment and order state must be real",
    "Płatność i status",
  ]) {
    if (!paymentOrderPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a002.components-launch-paymentorderreadinesspanelx-missing-pa")(
        `components/launch/PaymentOrderReadinessPanel.tsx: missing payment/order UI marker ${needle}.`,
      );
  }
  const publicLaunchGate = read("lib/market-integrity/public-launch-surface-gate.ts");
  if (checkoutPage.includes("PaymentOrderReadinessPanel"))
    errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a003.app-locale-checkout-pagex-internal-paymentorderreadiness")("app/[locale]/checkout/page.tsx: internal PaymentOrderReadinessPanel must stay outside the customer surface.");
  if (cartPage.includes("PaymentOrderReadinessPanel"))
    errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a004.app-locale-cart-pagex-internal-paymentorderreadinesspane")("app/[locale]/cart/page.tsx: internal PaymentOrderReadinessPanel must stay outside the customer surface.");
  for (const needle of ["PaymentOrderReadinessPanel", "hiddenOperatorPanels", "product_or_action_first"]) {
    if (!publicLaunchGate.includes(needle)) errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a005.public-launch-surface-gate-missing-payment-order-marker")(`public launch surface gate missing payment/order marker ${needle}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.020.lib-launch-payment-order-readiness-missing-payment-order.a006.payment-order-readiness-production-guard-failed-value")(
    `Payment/order readiness production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.021");

// Order event ledger production guard
try {
  const orderEventModel = read("lib/launch/order-event-ledger.ts");
  const orderEventPanel = read("components/launch/OrderEventLedgerPanel.tsx");
  const checkoutPage = read("app/[locale]/checkout/page.tsx");
  const cartPage = read("app/[locale]/cart/page.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "orderEventLedgerMatrix",
    "Idempotency key",
    "Signed webhook verification",
    "Order timeline",
  ]) {
    if (!orderEventModel.includes(needle))
      errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a001.lib-launch-order-event-ledger-missing-order-event-marker")(
        `lib/launch/order-event-ledger.ts: missing order event marker ${needle}.`,
      );
  }
  for (const needle of [
    "OrderEventLedgerPanel",
    "Every order event needs a trace",
    "Każde zdarzenie",
  ]) {
    if (!orderEventPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a002.components-launch-ordereventledgerpanelx-missing-order-e")(
        `components/launch/OrderEventLedgerPanel.tsx: missing order event UI marker ${needle}.`,
      );
  }
  const publicLaunchGate = read("lib/market-integrity/public-launch-surface-gate.ts");
  if (checkoutPage.includes("OrderEventLedgerPanel"))
    errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a003.app-locale-checkout-pagex-internal-ordereventledgerpanel")("app/[locale]/checkout/page.tsx: internal OrderEventLedgerPanel must stay outside the customer surface.");
  if (cartPage.includes("OrderEventLedgerPanel"))
    errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a004.app-locale-cart-pagex-internal-ordereventledgerpanel-mus")("app/[locale]/cart/page.tsx: internal OrderEventLedgerPanel must stay outside the customer surface.");
  for (const needle of ["OrderEventLedgerPanel", "hiddenOperatorPanels", "product_or_action_first"]) {
    if (!publicLaunchGate.includes(needle)) errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a005.public-launch-surface-gate-missing-order-ledger-marker-v")(`public launch surface gate missing order-ledger marker ${needle}.`);
  }
  if (!adminPage.includes('surface="admin"'))
    errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a006.app-locale-admin-import-products-pagex-ordereventledgerp")(
      "app/[locale]/admin/import-products/page.tsx: OrderEventLedgerPanel surface=admin missing.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "security.021.lib-launch-order-event-ledger-missing-order-event-marker.a007.order-event-ledger-production-guard-failed-value")(
    `Order event ledger production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.022");

// Admin route gate production guard
try {
  const adminGateModel = read("lib/launch/admin-route-gate.ts");
  const adminGatePanel = read("components/launch/AdminRouteGatePanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminRouteGateMatrix",
    "Admin authentication",
    "Environment gate",
    "Secret redaction",
  ]) {
    if (!adminGateModel.includes(needle))
      errors.pushWithId.bind(errors, "security.022.lib-launch-admin-route-gate-missing-admin-gate-marker-va.a001.lib-launch-admin-route-gate-missing-admin-gate-marker-va")(
        `lib/launch/admin-route-gate.ts: missing admin gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminRouteGatePanel",
    "Admin tooling must stay private",
    "Admin tooling musi być prywatne",
  ]) {
    if (!adminGatePanel.includes(needle))
      errors.pushWithId.bind(errors, "security.022.lib-launch-admin-route-gate-missing-admin-gate-marker-va.a002.components-launch-adminroutegatepanelx-missing-admin-gat")(
        `components/launch/AdminRouteGatePanel.tsx: missing admin gate UI marker ${needle}.`,
      );
  }
  if (
    !adminPage.includes("AdminRouteGatePanel") ||
    !adminPage.includes('surface="admin"')
  ) {
    errors.pushWithId.bind(errors, "security.022.lib-launch-admin-route-gate-missing-admin-gate-marker-va.a003.app-locale-admin-import-products-pagex-adminroutegatepan")(
      "app/[locale]/admin/import-products/page.tsx: AdminRouteGatePanel surface=admin missing.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.022.lib-launch-admin-route-gate-missing-admin-gate-marker-va.a004.admin-route-gate-production-guard-failed-value")(
    `Admin route gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.023");

// Admin environment gate production guard
try {
  const adminEnvGate = read("lib/launch/admin-environment-gate.ts");
  const adminLockedPanel = read("components/launch/AdminToolsLockedPanel.tsx");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "getClientAdminEnvironmentGate",
    "NEXT_PUBLIC_ADMIN_TOOLS_ENABLED",
    "public_env_only",
  ]) {
    if (!adminEnvGate.includes(needle))
      errors.pushWithId.bind(errors, "security.023.lib-launch-admin-environment-gate-missing-admin-env-mark.a001.lib-launch-admin-environment-gate-missing-admin-env-mark")(
        `lib/launch/admin-environment-gate.ts: missing admin env marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminToolsLockedPanel",
    "Product import is hidden behind an environment gate",
    "Import produktów jest schowany",
  ]) {
    if (!adminLockedPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.023.lib-launch-admin-environment-gate-missing-admin-env-mark.a002.components-launch-admintoolslockedpanelx-missing-locked")(
        `components/launch/AdminToolsLockedPanel.tsx: missing locked panel marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminToolsLockedPanel",
    "if (!adminEnvironmentGate.isUnlocked)",
    "disabled={!adminEnvironmentGate.isUnlocked",
  ]) {
    if (!adminPage.includes(needle))
      errors.pushWithId.bind(errors, "security.023.lib-launch-admin-environment-gate-missing-admin-env-mark.a003.app-locale-admin-import-products-pagex-missing-admin-loc")(
        `app/[locale]/admin/import-products/page.tsx: missing admin locked surface marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.023.lib-launch-admin-environment-gate-missing-admin-env-mark.a004.admin-environment-gate-production-guard-failed-value")(
    `Admin environment gate production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.024");

// Admin auth/publish/secret production guard
try {
  const adminAuthContract = read("lib/launch/admin-server-auth-contract.ts");
  const publishGate = read("lib/launch/publish-permission-gate.ts");
  const secretPolicy = read("lib/launch/secret-redaction-policy.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminServerAuthContract",
    "Server auth provider",
    "Server kill switch",
  ]) {
    if (!adminAuthContract.includes(needle))
      errors.pushWithId.bind(errors, "security.024.lib-launch-admin-server-auth-contract-missing-admin-auth.a001.lib-launch-admin-server-auth-contract-missing-admin-auth")(
        `lib/launch/admin-server-auth-contract.ts: missing admin auth marker ${needle}.`,
      );
  }
  for (const needle of [
    "publishPermissionGate",
    "Active publish permission",
    "Audit before publish",
  ]) {
    if (!publishGate.includes(needle))
      errors.pushWithId.bind(errors, "security.024.lib-launch-admin-server-auth-contract-missing-admin-auth.a002.lib-launch-publish-permission-gate-missing-publish-gate")(
        `lib/launch/publish-permission-gate.ts: missing publish gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "secretRedactionPolicy",
    "Browser-visible secret scan",
    "Raw provider response redaction",
  ]) {
    if (!secretPolicy.includes(needle))
      errors.pushWithId.bind(errors, "security.024.lib-launch-admin-server-auth-contract-missing-admin-auth.a003.lib-launch-secret-redaction-policy-missing-secret-redact")(
        `lib/launch/secret-redaction-policy.ts: missing secret redaction marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminServerAuthContractPanel",
    "PublishPermissionGatePanel",
    "SecretRedactionPolicyPanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.pushWithId.bind(errors, "security.024.lib-launch-admin-server-auth-contract-missing-admin-auth.a004.app-locale-admin-import-products-pagex-missing-value")(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.024.lib-launch-admin-server-auth-contract-missing-admin-auth.a005.admin-auth-publish-secret-production-guard-failed-value")(
    `Admin auth/publish/secret production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.025");

// Admin mutation audit production guard
try {
  const redactedLogger = read("lib/launch/redacted-logger.ts");
  const adminMutationAudit = read("lib/launch/admin-mutation-audit.ts");
  const adminMutationPanel = read(
    "components/launch/AdminMutationAuditPanel.tsx",
  );
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "redactOperatorLogValue",
    "createSafeOperatorLogLine",
    "redactedLoggerLaunchNote",
  ]) {
    if (!redactedLogger.includes(needle))
      errors.pushWithId.bind(errors, "security.025.lib-launch-redacted-logger-missing-redacted-logger-marke.a001.lib-launch-redacted-logger-missing-redacted-logger-marke")(
        `lib/launch/redacted-logger.ts: missing redacted logger marker ${needle}.`,
      );
  }
  for (const needle of [
    "adminMutationAuditMatrix",
    "createAdminMutationAuditEnvelope",
    "Rollback context",
  ]) {
    if (!adminMutationAudit.includes(needle))
      errors.pushWithId.bind(errors, "security.025.lib-launch-redacted-logger-missing-redacted-logger-marke.a002.lib-launch-admin-mutation-audit-missing-mutation-audit-m")(
        `lib/launch/admin-mutation-audit.ts: missing mutation audit marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminMutationAuditPanel",
    "Every import and publish must leave a safe trail",
  ]) {
    if (!adminMutationPanel.includes(needle))
      errors.pushWithId.bind(errors, "security.025.lib-launch-redacted-logger-missing-redacted-logger-marke.a003.components-launch-adminmutationauditpanelx-missing-admin")(
        `components/launch/AdminMutationAuditPanel.tsx: missing admin mutation UI marker ${needle}.`,
      );
  }
  if (!adminPage.includes("AdminMutationAuditPanel"))
    errors.pushWithId.bind(errors, "security.025.lib-launch-redacted-logger-missing-redacted-logger-marke.a004.app-locale-admin-import-products-pagex-adminmutationaudi")(
      "app/[locale]/admin/import-products/page.tsx: AdminMutationAuditPanel missing.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "security.025.lib-launch-redacted-logger-missing-redacted-logger-marke.a005.admin-mutation-audit-production-guard-failed-value")(
    `Admin mutation audit production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.026");

// Admin audit persistence production guard
try {
  const adminAuditPersistence = read("lib/launch/admin-audit-persistence.ts");
  const publishRollbackContext = read("lib/launch/publish-rollback-context.ts");
  const supportSafeTimeline = read("lib/launch/support-safe-timeline.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuditPersistenceMatrix",
    "createAdminAuditPersistencePreview",
    "Persistent storage adapter",
  ]) {
    if (!adminAuditPersistence.includes(needle))
      errors.pushWithId.bind(errors, "security.026.lib-launch-admin-audit-persistence-missing-audit-persist.a001.lib-launch-admin-audit-persistence-missing-audit-persist")(
        `lib/launch/admin-audit-persistence.ts: missing audit persistence marker ${needle}.`,
      );
  }
  for (const needle of [
    "publishRollbackContextMatrix",
    "createPublishRollbackDiff",
    "Rollback id",
  ]) {
    if (!publishRollbackContext.includes(needle))
      errors.pushWithId.bind(errors, "security.026.lib-launch-admin-audit-persistence-missing-audit-persist.a002.lib-launch-publish-rollback-context-missing-rollback-mar")(
        `lib/launch/publish-rollback-context.ts: missing rollback marker ${needle}.`,
      );
  }
  for (const needle of [
    "supportSafeTimelineMatrix",
    "createSupportSafeTimelinePreview",
    "Support-safe copy",
  ]) {
    if (!supportSafeTimeline.includes(needle))
      errors.pushWithId.bind(errors, "security.026.lib-launch-admin-audit-persistence-missing-audit-persist.a003.lib-launch-support-safe-timeline-missing-support-timelin")(
        `lib/launch/support-safe-timeline.ts: missing support timeline marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminAuditPersistencePanel",
    "PublishRollbackContextPanel",
    "SupportSafeTimelinePanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.pushWithId.bind(errors, "security.026.lib-launch-admin-audit-persistence-missing-audit-persist.a004.app-locale-admin-import-products-pagex-missing-value")(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.026.lib-launch-admin-audit-persistence-missing-audit-persist.a005.admin-audit-persistence-production-guard-failed-value")(
    `Admin audit persistence production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
