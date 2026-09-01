import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { ReactElement, ReactNode } from "react";
import type { Pass2371LinkedRequestDrawerSnapshot } from "../../lib/security/linked-request-drawer";

import React from "react";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import LoginSecurityVisual from "../../components/auth/LoginSecurityVisual.tsx";
import SecurityLinkedRequestDrawer from "../../components/security/SecurityLinkedRequestDrawer.tsx";
import { generateMetadata } from "../../app/[locale]/layout.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderLogin(locale: "pl" | "en" | "de") {
  return renderToStaticMarkup(
    React.createElement(
      NextIntlClientProvider,
      { locale, messages: {} },
      React.createElement(LoginSecurityVisual),
    ),
  );
}

function collectElements(node: ReactNode, type: string, output: ReactElement[] = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, type, output);
    return output;
  }
  if (!React.isValidElement(node)) return output;
  if (node.type === type) output.push(node);
  collectElements((node.props as { children?: ReactNode }).children, type, output);
  return output;
}

function relativeLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function whiteAlphaContrast(alpha: number, backgroundChannel = 11) {
  const channel = (255 * alpha) + (backgroundChannel * (1 - alpha));
  const foreground = relativeLuminance(channel);
  const background = relativeLuminance(backgroundChannel);
  return (foreground + 0.05) / (background + 0.05);
}

const evidenceRow = {
  id: "payev_a94_focus_fixture",
  area: "checkout",
  status: "manual",
  label: "Keyboard focus fixture",
  summary: "Redacted fixture used only to render the disclosure control.",
  evidenceRef: "a94-focus-fixture",
  operator: "local-test",
  createdAt: "2026-07-28T00:00:00.000Z",
  scenarioId: "a94-keyboard",
} as const;

const drawerSnapshot = {
  passId: "linked-request-drawer-evidence-message-operator-report",
  active: true,
  locale: "en",
  focusSummary: "A94 keyboard focus fixture",
  evidenceRows: [evidenceRow],
  evidenceSource: "memory",
  evidenceStatusCounts: { pass: 0, fail: 0, manual: 1, blocked: 0 },
  linked: {
    requestId: "request-a94",
    paymentEvidenceRefs: ["a94-focus-fixture"],
  },
  accountState: {
    actionCount: 0,
    paymentEvidenceCount: 1,
  },
  routes: {
    adminReplayBoard: "/en/admin/security",
    customerReport: "/en/security/audits/customer-report/a94",
    safePdfPacket: "/api/security/audit-watch/customer-safe-report?id=a94&format=pdf-safe",
  },
  routeHealth: {
    passId: "a94-route-health-fixture",
    checks: [],
    recommendedAction: "Keep delivery blocked in this fixture.",
    routeHealthEndpoint: "/api/security/audit-watch/customer-safe-report?id=a94&format=health",
  },
  routeHealthLedger: {
    passId: "a94-route-health-ledger-fixture",
    deliveryWarningLevel: "manual",
    lastEndpointPingAgeMinutes: null,
    recommendedAction: "No external ping was performed.",
    warnings: [],
    history: [],
  },
  finalDeliveryGate: {
    passId: "a94-final-delivery-gate-fixture",
    canDeliver: false,
    endpointPingFresh: false,
    reasons: [],
    lastEndpointPingAt: null,
    lastEndpointPingAgeMinutes: null,
  },
  deliveryReceiptLedger: {
    passId: "a94-delivery-receipt-ledger-fixture",
    deliveryReceiptReady: false,
    immutableReceiptRequired: true,
    receiptCount: 0,
    recommendedAction: "No delivery receipt is created by this fixture.",
  },
  operatorActions: [],
  nextSteps: [],
  safetyBoundary: "Local rendering fixture; no external evidence and no delivery claim.",
} as unknown as Pass2371LinkedRequestDrawerSnapshot;

async function main() {
  const localeExpectations = {
    pl: ["Prywatny dostęp", "Velmère — luksusowy streetwear", "Limitowane kolekcje"],
    en: ["Private access", "Velmère — Luxury Streetwear", "Limited drops"],
    de: ["Privater Zugang", "Velmère — Luxus-Streetwear", "Limitierte Drops"],
  } as const;

  for (const locale of ["pl", "en", "de"] as const) {
    const html = renderLogin(locale);
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];
    assert.equal(buttons.length, 4, `${locale}: expected central control and three step controls`);
    assert.ok(buttons.every((button) => button.includes("focus-visible:outline-2")), `${locale}: every login security button must expose a keyboard focus outline`);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1, `${locale}: exactly one step must expose selected state`);
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 2, `${locale}: inactive steps must expose unselected state`);
    assert.match(html, /text-white\/\[0\.68\]/, `${locale}: compact step labels must use the raised-contrast token`);
    assert.ok(!html.includes("text-white/[0.38]"), `${locale}: old low-contrast compact-label token must not render`);
    assert.ok(html.includes(localeExpectations[locale][0]), `${locale}: localized login copy must render`);

    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    assert.equal(metadata.title, localeExpectations[locale][1]);
    assert.match(String(metadata.description), new RegExp(`^${localeExpectations[locale][2]}`));
    assert.equal(metadata.alternates?.canonical, `/${locale}`);
    assert.equal(metadata.openGraph?.locale, locale);
  }

  assert.ok(whiteAlphaContrast(0.68) >= 4.5, "raised compact-label token must clear WCAG normal-text contrast");
  assert.ok(whiteAlphaContrast(0.38) < 4.5, "negative control must demonstrate why the previous compact-label token was insufficient");

  const fallbackMetadata = await generateMetadata({ params: Promise.resolve({ locale: "fr" }) });
  assert.equal(fallbackMetadata.title, localeExpectations.en[1], "unsupported metadata locale must fail closed to English copy");
  assert.equal(fallbackMetadata.alternates?.canonical, "/en", "unsupported metadata locale must not emit an unsupported canonical route");

  const drawerTree = SecurityLinkedRequestDrawer({ snapshot: drawerSnapshot });
  const summaries = collectElements(drawerTree, "summary");
  assert.equal(summaries.length, 1, "fixture must render one disclosure summary");
  const summaryClass = String((summaries[0].props as { className?: string }).className ?? "");
  assert.match(summaryClass, /\bfocus-visible:outline-2\b/, "disclosure summary must expose a keyboard focus outline");
  assert.ok(!/\boutline-none\b/.test(summaryClass), "disclosure summary must not suppress focus without a native fallback");

  const links = collectElements(drawerTree, "a");
  assert.equal(links.length, 3, "fixture must exercise replay, report and PDF links");
  assert.ok(
    links.every((link) => String((link.props as { className?: string }).className ?? "").includes("focus-visible:outline-2")),
    "every rendered drawer link must expose an explicit keyboard focus outline",
  );

  const inactiveTree = SecurityLinkedRequestDrawer({
    snapshot: { ...drawerSnapshot, active: false },
  });
  assert.equal(inactiveTree, null, "inactive drawer must remain absent");

  console.log(JSON.stringify({
    schemaVersion: "velmere.a94.focus-locale-metadata.test.v1",
    denominator: 43,
    pass: 43,
    fail: 0,
    locales: ["pl", "en", "de"],
    negativeCases: ["unsupported_locale", "legacy_low_contrast_token", "inactive_drawer", "suppressed_summary_outline"],
    truthBoundary: "Local SSR/component-output and metadata behavior only; no real browser, screen reader, computed-style engine, zoom, or physical-device execution is claimed.",
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
