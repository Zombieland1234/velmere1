#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { deriveBrowserRouteEvidence, derivePopupEvidence, ensureSafeDirectoryInsideRoot, isExpectedNextRscAbort, normalizeLoopbackBaseUrl } from "./pass36/a79-exact-build-browser-lib.mjs";
import { createA45QaFixtureUsage, generateA45QaFixture, installA45QaFixtureRoutes, loadA45QaFixture } from "./pass35/a45-browser-qa-fixture.mjs";
import { sanitizeA45EvidenceText, sanitizeA45HttpEvidenceUrl } from "./pass35/a45-browser-http-evidence.mjs";

const root = process.cwd();
const contractPath = path.join(root, "config/pass35/a45-exact-runtime-browser-acceptance.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const baseUrl = normalizeLoopbackBaseUrl(String(process.env.VELMERE_A45_BASE_URL ?? contract.baseUrl));
const localTls = baseUrl.startsWith("https://");
const bindings = {
  sourceManifestSha256: String(process.env.VELMERE_A79_SOURCE_MANIFEST_SHA256 ?? "").trim().toLowerCase() || null,
  runtimeInstanceSha256: String(process.env.VELMERE_A79_RUNTIME_INSTANCE_SHA256 ?? "").trim().toLowerCase() || null,
  browserExecutableSha256: String(process.env.VELMERE_A79_BROWSER_EXECUTABLE_SHA256 ?? "").trim().toLowerCase() || null,
  buildId: String(process.env.VELMERE_A79_BUILD_ID ?? "").trim() || null,
};
const outputRoot = path.join(root, "artifacts/pass35/a45");
const qaFixturePath = String(process.env.VELMERE_A45_QA_FIXTURE_PATH ?? "").trim();
const qaFixtureGeneration = process.env.VELMERE_A45_QA_FIXTURE_GENERATE === "1"
  ? generateA45QaFixture(root, qaFixturePath)
  : null;
const qaFixture = loadA45QaFixture(root, qaFixturePath);
const qaFixtureUsage = createA45QaFixtureUsage(qaFixture, qaFixtureGeneration);
const screenshotRoot = path.join(outputRoot, "screenshots");
ensureSafeDirectoryInsideRoot(root, "artifacts/pass35/a45/screenshots", { requireNewLeaf: true, label: "a45_screenshot_root" });

function sanitize(value) {
  return String(value).replace(/[^a-z0-9._-]+/giu, "-").replace(/^-+|-+$/gu, "");
}
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function httpErrorEvidence(httpResponse) {
  const request = httpResponse.request();
  return {
    ...sanitizeA45HttpEvidenceUrl(httpResponse.url()),
    status: httpResponse.status(),
    method: request.method(),
    resourceType: request.resourceType(),
    isNavigationRequest: request.isNavigationRequest(),
  };
}
function networkFailureCode(value) {
  const raw = String(value ?? "request_failed");
  return /^net::[A-Z0-9_]{1,80}$/u.test(raw) ? raw : "request_failed_redacted";
}
function requestFailureEvidence(request, expectedRscAbort) {
  return {
    ...sanitizeA45HttpEvidenceUrl(request.url()),
    error: networkFailureCode(request.failure()?.errorText),
    method: request.method(),
    resourceType: request.resourceType(),
    isNavigationRequest: request.isNavigationRequest(),
    classification: expectedRscAbort ? "expected_next_rsc_abort" : "request_failed",
  };
}
function createEvidenceCollector(limit = 60) {
  const items = [];
  let total = 0;
  return {
    add(value) { total += 1; if (items.length < limit) items.push(value); },
    get total() { return total; },
    get items() { return items; },
    summary() { return { total, retained: items.length, truncated: total > items.length, limit }; },
    snapshot() {
      const retainedItems = items.map((item) => structuredClone(item));
      return {
        items: retainedItems,
        summary: { total, retained: retainedItems.length, truncated: total > retainedItems.length, limit },
      };
    },
  };
}
function sanitizedBrokenImages(rows) {
  return rows.map(({ src, ...row }) => ({ ...row, source: sanitizeA45HttpEvidenceUrl(src) }));
}
function fatalText(text) {
  const value = String(text ?? "");
  return [
    "Internal Server Error",
    "Application error: a server-side exception has occurred",
    "Unexpected non-whitespace character after JSON",
    "Module build failed",
    "CssSyntaxError",
    "__next_error__",
  ].some((needle) => value.includes(needle));
}
function ignoredConsoleError(text) {
  const value = String(text ?? "").trim();
  return /^Download the React DevTools for a better development experience(?: at https:\/\/react\.dev\/link\/react-devtools)?\.?$/u.test(value)
    ? "exact_react_devtools_advisory"
    : null;
}
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error("playwright_unavailable; run: npx playwright install chromium");
  }
}
async function settleRelevantImages(page) {
  return page.evaluate(async () => {
    const pending = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      const opacity = Number.parseFloat(style.opacity || "1");
      return rect.width > 0
        && rect.height > 0
        && rect.bottom >= -240
        && rect.top <= window.innerHeight + 240
        && style.display !== "none"
        && style.visibility !== "hidden"
        && style.visibility !== "collapse"
        && Number.isFinite(opacity)
        && opacity > 0.01
        && !image.complete;
    });
    for (const image of pending) image.loading = "eager";
    await Promise.allSettled(pending.map((image) => new Promise((resolve) => {
      if (image.complete) { resolve("already_complete"); return; }
      const finish = () => {
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve("settled");
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 5_000);
    })));
    return { candidates: pending.length, incomplete: pending.filter((image) => !image.complete).length };
  });
}

async function inspectImages(page) {
  return page.evaluate(() => {
    const items = [];
    let total = 0;
    for (const image of document.images) {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      const opacity = Number.parseFloat(style.opacity || "1");
      const rendered = rect.width > 0
        && rect.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden"
        && style.visibility !== "collapse"
        && Number.isFinite(opacity)
        && opacity > 0.01;
      const nearViewport = rect.bottom >= -240 && rect.top <= window.innerHeight + 240;
      const src = image.currentSrc || image.src;
      if (!src || !rendered || !nearViewport || (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)) continue;
      total += 1;
      if (items.length < 30) items.push({
        src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        loading: image.loading,
        rendered,
        nearViewport,
        width: rect.width,
        height: rect.height,
        opacity,
        relevant: true,
      });
    }
    return { items, total, truncated: total > items.length, inspectionFailed: false };
  });
}
async function inspectLayout(page) {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const overflow = Math.max(body.scrollWidth, html.scrollWidth) - Math.min(window.innerWidth, html.clientWidth);
    const bodyText = body.innerText || "";
    const invalidTokens = ["undefined", "NaN", "[object Object]"].filter((token) => bodyText.includes(token));
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyHeight: Math.max(body.scrollHeight, html.scrollHeight),
      horizontalOverflowPx: Math.max(0, overflow),
      invalidTokens,
      canvasCount: document.querySelectorAll("canvas").length,
      svgCount: document.querySelectorAll("svg").length,
    };
  });
}
async function inspectInteractionBoundaries(page) {
  const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.keyboard.press("Tab");
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      tagName: active?.tagName ?? null,
      id: active?.id || null,
      visible: active instanceof HTMLElement
        ? Boolean(active.offsetWidth || active.offsetHeight || active.getClientRects().length)
        : false,
      escapedBody: Boolean(active && active !== document.body && active !== document.documentElement),
    };
  });
  const zoom200 = await page.evaluate(() => {
    const root = document.documentElement;
    const previous = root.style.zoom;
    root.style.zoom = "2";
    const bodyText = document.body?.innerText ?? "";
    const result = {
      applied: getComputedStyle(root).zoom === "2",
      bodyVisible: document.body.getBoundingClientRect().height > 0 && bodyText.trim().length > 0,
      fatalTokenPresent: ["Internal Server Error", "__next_error__", "Application error"].some((token) => bodyText.includes(token)),
    };
    root.style.zoom = previous;
    return result;
  });
  return { reducedMotion, keyboardFocus, zoom200 };
}
async function routeCheck(browser, { locale, route, viewportName, viewport, screenshot }) {
  const context = await browser.newContext({
    viewport,
    locale: locale === "pl" ? "pl-PL" : locale === "de" ? "de-DE" : "en-IE",
    timezoneId: "Europe/Berlin",
    colorScheme: "dark",
    reducedMotion: "reduce",
    ignoreHTTPSErrors: localTls,
  });
  await installA45QaFixtureRoutes(context, qaFixture, qaFixtureUsage);
  const page = await context.newPage();
  const consoleErrors = createEvidenceCollector();
  const ignoredConsoleErrors = createEvidenceCollector();
  const pageErrors = createEvidenceCollector();
  const hydrationErrors = createEvidenceCollector();
  const httpErrors = createEvidenceCollector();
  const failedRequests = createEvidenceCollector();
  const ignoredRequestFailures = createEvidenceCollector();
  page.on("console", (message) => {
    const raw = message.text();
    if (message.type() === "error") {
      const classification = ignoredConsoleError(raw);
      if (classification) ignoredConsoleErrors.add({ ...sanitizeA45EvidenceText(raw, "ignored_console_error"), classification });
      else {
        consoleErrors.add(sanitizeA45EvidenceText(raw, "console_error"));
        if (/hydration|did not match|server rendered html/iu.test(raw)) hydrationErrors.add(sanitizeA45EvidenceText(raw, "hydration_error"));
      }
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.add(sanitizeA45EvidenceText(error.message, "page_error"));
    if (/hydration|did not match|server rendered html/iu.test(error.message)) hydrationErrors.add(sanitizeA45EvidenceText(error.message, "hydration_error"));
  });
  page.on("response", (httpResponse) => {
    if (httpResponse.status() < 400) return;
    httpErrors.add(httpErrorEvidence(httpResponse));
  });
  page.on("requestfailed", (request) => {
    const rawFailure = { url: request.url(), error: request.failure()?.errorText ?? "request_failed", method: request.method(), resourceType: request.resourceType(), isNavigationRequest: request.isNavigationRequest() };
    if (rawFailure.url.startsWith("data:") || rawFailure.url.startsWith("blob:")) return;
    const expectedRscAbort = isExpectedNextRscAbort(rawFailure, baseUrl);
    const evidence = requestFailureEvidence(request, expectedRscAbort);
    if (expectedRscAbort) ignoredRequestFailures.add(evidence);
    else failedRequests.add(evidence);
  });
  const url = `${baseUrl}/${locale}${route.suffix}`;
  const started = Date.now();
  let response = null;
  let navigationError = null;
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: contract.browserBudgets.routeTimeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.locator(route.selector).first().waitFor({ state: "attached", timeout: 30000 });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  } catch (error) {
    navigationError = sanitizeA45EvidenceText(error instanceof Error ? error.message : String(error), "navigation_error");
  }
  const html = await page.content().catch(() => "");
  const imageSettle = await settleRelevantImages(page).catch(() => ({ candidates: 0, incomplete: 1, inspectionFailed: true }));
  const layout = await inspectLayout(page).catch(() => ({ bodyHeight: 0, horizontalOverflowPx: 999999, invalidTokens: ["layout_unavailable"], canvasCount: 0, svgCount: 0 }));
  const imageInspection = await inspectImages(page).catch(() => ({ items: [], total: 0, truncated: true, inspectionFailed: true }));
  const brokenImages = sanitizedBrokenImages(imageInspection.items);
  let screenshotPath = null;
  let screenshotSha256 = null;
  if (screenshot && !navigationError) {
    screenshotPath = path.join(screenshotRoot, `${sanitize(locale)}-${sanitize(viewportName)}-${sanitize(route.id)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled", captureBeyondViewport: false });
    screenshotSha256 = sha256File(screenshotPath);
  }
  const status = response?.status() ?? null;
  const responseHeaders = response ? await response.allHeaders().catch(() => ({})) : {};
  const csp = responseHeaders["content-security-policy"] ?? "";
  const securityHeaders = {
    contentSecurityPolicyPresent: csp.length > 0,
    contentSecurityPolicySha256: csp ? crypto.createHash("sha256").update(csp).digest("hex") : null,
    contentSecurityPolicyBytes: Buffer.byteLength(csp),
    frameAncestorsDeclared: /(?:^|;)\s*frame-ancestors\s+/iu.test(csp),
    contentTypeOptionsNosniff: String(responseHeaders["x-content-type-options"] ?? "").toLowerCase() === "nosniff",
    referrerPolicyPresent: Boolean(responseHeaders["referrer-policy"]),
  };
  const selectorCount = await page.locator(route.selector).count().catch(() => 0);
  const observedFinalUrl = page.url();
  const finalUrl = observedFinalUrl === url ? url : sanitizeA45HttpEvidenceUrl(observedFinalUrl).url;
  const sameOrigin = (() => {
    try { return new URL(observedFinalUrl).origin === baseUrl; } catch { return false; }
  })();
  const interactions = navigationError
    ? { reducedMotion: false, keyboardFocus: { escapedBody: false }, zoom200: { applied: false, bodyVisible: false, fatalTokenPresent: true } }
    : await inspectInteractionBoundaries(page).catch(() => ({
      reducedMotion: false,
      keyboardFocus: { escapedBody: false },
      zoom200: { applied: false, bodyVisible: false, fatalTokenPresent: true },
    }));
  const fatalTokenPresent = fatalText(html);
  const evidenceSnapshot = {
    consoleErrors: consoleErrors.snapshot(),
    ignoredConsoleErrors: ignoredConsoleErrors.snapshot(),
    pageErrors: pageErrors.snapshot(),
    hydrationErrors: hydrationErrors.snapshot(),
    httpErrors: httpErrors.snapshot(),
    failedRequests: failedRequests.snapshot(),
    ignoredRequestFailures: ignoredRequestFailures.snapshot(),
  };
  const firstPartyFailures = evidenceSnapshot.failedRequests.items.filter((failure) => failure.originClass === "loopback");
  const row = {
    locale, route: route.id, viewport: viewportName, url, finalUrl, sameOrigin, status,
    durationMs: Date.now() - started, selector: route.selector, selectorCount,
    navigationError, fatalTokenPresent,
    consoleErrors: evidenceSnapshot.consoleErrors.items, ignoredConsoleErrors: evidenceSnapshot.ignoredConsoleErrors.items, pageErrors: evidenceSnapshot.pageErrors.items, httpErrors: evidenceSnapshot.httpErrors.items, failedRequests: evidenceSnapshot.failedRequests.items,
    ignoredRequestFailures: evidenceSnapshot.ignoredRequestFailures.items,
    evidenceCounts: {
      consoleErrors: evidenceSnapshot.consoleErrors.summary, ignoredConsoleErrors: evidenceSnapshot.ignoredConsoleErrors.summary, pageErrors: evidenceSnapshot.pageErrors.summary, hydrationErrors: evidenceSnapshot.hydrationErrors.summary,
      httpErrors: evidenceSnapshot.httpErrors.summary, failedRequests: evidenceSnapshot.failedRequests.summary, ignoredRequestFailures: evidenceSnapshot.ignoredRequestFailures.summary,
    },
    firstPartyFailureCount: firstPartyFailures.length,
    imageSettle, brokenImages, brokenImagesTotal: imageInspection.total, brokenImagesTruncated: imageInspection.truncated,
    hydrationErrors: evidenceSnapshot.hydrationErrors.items, securityHeaders, interactions, layout,
    screenshotPath: screenshotPath ? path.relative(root, screenshotPath).replaceAll("\\", "/") : null,
    screenshotSha256, ok: false,
  };
  row.ok = deriveBrowserRouteEvidence(row, { route, expectedUrl: url, baseUrl, budgets: contract.browserBudgets });
  await context.close();
  return row;
}
async function popupCheck(browser) {
  const context = await browser.newContext({
    viewport: contract.viewports.desktop,
    locale: "pl-PL",
    timezoneId: "Europe/Berlin",
    colorScheme: "dark",
    reducedMotion: "reduce",
    ignoreHTTPSErrors: localTls,
  });
  await installA45QaFixtureRoutes(context, qaFixture, qaFixtureUsage);
  const page = await context.newPage();
  const consoleErrors = createEvidenceCollector();
  const ignoredConsoleErrors = createEvidenceCollector();
  const pageErrors = createEvidenceCollector();
  const hydrationErrors = createEvidenceCollector();
  const httpErrors = createEvidenceCollector();
  const failedRequests = createEvidenceCollector();
  const ignoredRequestFailures = createEvidenceCollector();
  page.on("console", (message) => {
    const raw = message.text();
    if (message.type() === "error") {
      const classification = ignoredConsoleError(raw);
      if (classification) ignoredConsoleErrors.add({ ...sanitizeA45EvidenceText(raw, "popup_ignored_console_error"), classification });
      else {
        consoleErrors.add(sanitizeA45EvidenceText(raw, "popup_console_error"));
        if (/hydration|did not match|server rendered html/iu.test(raw)) hydrationErrors.add(sanitizeA45EvidenceText(raw, "popup_hydration_error"));
      }
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.add(sanitizeA45EvidenceText(error.message, "popup_page_error"));
    if (/hydration|did not match|server rendered html/iu.test(error.message)) hydrationErrors.add(sanitizeA45EvidenceText(error.message, "popup_hydration_error"));
  });
  page.on("response", (httpResponse) => {
    if (httpResponse.status() < 400) return;
    httpErrors.add(httpErrorEvidence(httpResponse));
  });
  page.on("requestfailed", (request) => {
    const rawFailure = { url: request.url(), error: request.failure()?.errorText ?? "request_failed", method: request.method(), resourceType: request.resourceType(), isNavigationRequest: request.isNavigationRequest() };
    if (rawFailure.url.startsWith("data:") || rawFailure.url.startsWith("blob:")) return;
    const expectedRscAbort = isExpectedNextRscAbort(rawFailure, baseUrl);
    const evidence = requestFailureEvidence(request, expectedRscAbort);
    if (expectedRscAbort) ignoredRequestFailures.add(evidence);
    else failedRequests.add(evidence);
  });
  const url = `${baseUrl}/pl/market-integrity`;
  let error = null;
  const tabRows = [];
  let modalBounds = null;
  let screenshotPath = null;
  let screenshotSha256 = null;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: contract.browserBudgets.routeTimeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    const row = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
    const retry = page.getByRole("button", { name: /Ponów pobieranie|Retry loading|Daten erneut laden/iu }).first();
    if (await row.count() === 0 && await retry.count() > 0) {
      await retry.click();
      await page.waitForTimeout(2500);
    }
    await row.waitFor({ state: "visible", timeout: 45000 });
    await row.click();
    const modal = page.locator(".vlm-asset-detail-modal").first();
    await modal.waitFor({ state: "visible", timeout: 30000 });
    modalBounds = await modal.boundingBox();
    for (const tabId of contract.requiredPopupTabs) {
      const tab = page.locator(`#vlm-asset-detail-tab-${tabId}`);
      await tab.waitFor({ state: "visible", timeout: 15000 });
      await tab.click();
      await page.waitForTimeout(500);
      tabRows.push({ tabId, selected: await tab.getAttribute("aria-selected"), visible: await tab.isVisible() });
    }
    screenshotPath = path.join(screenshotRoot, "pl-desktop-shield-popup-four-tabs.png");
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
    screenshotSha256 = sha256File(screenshotPath);
  } catch (caught) {
    error = sanitizeA45EvidenceText(caught instanceof Error ? caught.message : String(caught), "popup_error");
  }
  const viewport = page.viewportSize();
  const fitsViewport = Boolean(modalBounds && viewport && modalBounds.x >= -2 && modalBounds.y >= -2 && modalBounds.x + modalBounds.width <= viewport.width + 2 && modalBounds.y + modalBounds.height <= viewport.height + 2);
  const evidenceSnapshot = {
    consoleErrors: consoleErrors.snapshot(),
    ignoredConsoleErrors: ignoredConsoleErrors.snapshot(),
    pageErrors: pageErrors.snapshot(),
    hydrationErrors: hydrationErrors.snapshot(),
    httpErrors: httpErrors.snapshot(),
    failedRequests: failedRequests.snapshot(),
    ignoredRequestFailures: ignoredRequestFailures.snapshot(),
  };
  const popupImageInspection = await inspectImages(page).catch(() => ({ items: [], total: 0, truncated: true, inspectionFailed: true }));
  const popupBrokenImages = sanitizedBrokenImages(popupImageInspection.items);
  const result = {
    id: "shield-popup-four-tabs", url, finalUrl: page.url() === url ? url : sanitizeA45HttpEvidenceUrl(page.url()).url, tabRows, modalBounds, viewport, fitsViewport,
    consoleErrors: evidenceSnapshot.consoleErrors.items, ignoredConsoleErrors: evidenceSnapshot.ignoredConsoleErrors.items, pageErrors: evidenceSnapshot.pageErrors.items, hydrationErrors: evidenceSnapshot.hydrationErrors.items,
    httpErrors: evidenceSnapshot.httpErrors.items, failedRequests: evidenceSnapshot.failedRequests.items, ignoredRequestFailures: evidenceSnapshot.ignoredRequestFailures.items,
    evidenceCounts: {
      consoleErrors: evidenceSnapshot.consoleErrors.summary, ignoredConsoleErrors: evidenceSnapshot.ignoredConsoleErrors.summary, pageErrors: evidenceSnapshot.pageErrors.summary, hydrationErrors: evidenceSnapshot.hydrationErrors.summary,
      httpErrors: evidenceSnapshot.httpErrors.summary, failedRequests: evidenceSnapshot.failedRequests.summary, ignoredRequestFailures: evidenceSnapshot.ignoredRequestFailures.summary,
    },
    brokenImages: popupBrokenImages, brokenImagesTotal: popupImageInspection.total, brokenImagesTruncated: popupImageInspection.truncated,
    error, screenshotPath: screenshotPath ? path.relative(root, screenshotPath).replaceAll("\\", "/") : null, screenshotSha256, ok: false,
  };
  result.ok = derivePopupEvidence(result, { expectedUrl: url, requiredTabs: contract.requiredPopupTabs, baseUrl });
  await context.close();
  return result;
}

const { chromium } = await loadPlaywright();
const suppliedExecutable = String(process.env.VELMERE_PLAYWRIGHT_EXECUTABLE_PATH ?? "").trim();
let browserLaunches = 0;
async function launchBrowser() {
  try {
    browserLaunches += 1;
    return await chromium.launch({
      headless: true,
      ...(suppliedExecutable ? { executablePath: suppliedExecutable } : {}),
      ignoreDefaultArgs: ["--enable-features=CDPScreenshotNewSurface"],
      args: ["--disable-background-networking", "--disable-component-update", "--disable-default-apps", "--disable-extensions", "--disable-sync", "--disable-dev-shm-usage", "--disable-gpu", "--use-gl=swiftshader", "--use-angle=swiftshader"],
    });
  } catch {
    throw new Error("chromium_launch_failed; run: npx playwright install chromium");
  }
}
const tasks = [];
for (const locale of contract.locales) for (const route of contract.routes) tasks.push({ locale, route, viewportName: "desktop", viewport: contract.viewports.desktop, screenshot: locale === "pl" });
for (const route of contract.routes) tasks.push({ locale: "pl", route, viewportName: "mobile", viewport: contract.viewports.mobile, screenshot: true });
const rows = [];
const batchSize = 6;
for (let start = 0; start < tasks.length; start += batchSize) {
  const browser = await launchBrowser();
  try {
    for (const task of tasks.slice(start, start + batchSize)) {
      const row = await routeCheck(browser, task);
      rows.push(row);
      process.stdout.write(`[a45-browser] ${row.ok ? "PASS" : "FAIL"} ${task.locale} ${task.viewportName} ${task.route.id} -> ${row.status ?? "ERR"}\n`);
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
const popupBrowser = await launchBrowser();
let popup;
try {
  popup = await popupCheck(popupBrowser);
} finally {
  await popupBrowser.close().catch(() => {});
}
process.stdout.write(`[a45-browser] ${popup.ok ? "PASS" : "FAIL"} shield popup four tabs\n`);
const routeFailures = rows.filter((row) => !row.ok);
const failures = [...routeFailures, ...(popup.ok ? [] : [popup])];
const result = {
  schemaVersion: "velmere.pass35.a45.browser-acceptance.v2",
  revisionId: contract.revisionId,
  generatedAt: new Date().toISOString(),
  baseUrl,
  transport: {
    scheme: localTls ? "https" : "http",
    loopbackOnly: true,
    localCertificateTrustBypassed: localTls,
    productionCertificateVerified: false,
  },
  bindings,
  qaFixture: qaFixtureUsage,
  executionIsolation: { mode: "SIX_ROUTE_BROWSER_PROCESS_BATCH", batchSize, browserLaunches },
  truthBoundary: `${qaFixture ? "QA fixture interception is enabled and grants no provider, current-data, durable-storage, LIVE, paid-value or sale-readiness credit. " : ""}Local browser acceptance verifies route rendering, same-origin final URLs, CSP presence, HTTP 4xx/5xx responses, hydration/console/page errors, broken images, overflow, reduced-motion negotiation, keyboard focus, 200% zoom execution, desktop/mobile screenshots and the four-tab Shield popup. Browser processes are recycled in bounded six-route batches to contain cross-route resource leakage without changing the route or assertion denominator. A loopback self-signed TLS certificate may be trusted only by this harness and never proves a production certificate, staging, provider rights, customer outcomes, LIVE reliability or sale readiness.`,
  summary: { checks: rows.length + 1, passed: rows.length - routeFailures.length + (popup.ok ? 1 : 0), failed: failures.length },
  rows, popup, failures,
};
fs.writeFileSync(path.join(outputRoot, "PASS35_A45_BROWSER_ACCEPTANCE.json"), `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
if (result.summary.failed > 0) process.exitCode = 1;
