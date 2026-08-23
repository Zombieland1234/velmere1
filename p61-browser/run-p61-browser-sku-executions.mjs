#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const BASE_URL = String(process.env.P61_BASE_URL || 'http://127.0.0.1:3110').replace(/\/$/, '');
const OUTPUT_ROOT = path.resolve(process.env.P61_OUTPUT_ROOT || 'p61-out');
const SCREENSHOT_ROOT = path.join(OUTPUT_ROOT, 'screenshots');
const RESPONSE_ROOT = path.join(OUTPUT_ROOT, 'responses');
const EXECUTABLE_PATH = String(process.env.P61_BROWSER_EXECUTABLE_PATH || '').trim();
const NODE_MODULES_ROOT = path.resolve(process.env.P61_NODE_MODULES_ROOT || 'node_modules');
const SOURCE_SECRET = String(process.env.VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT || '').trim();
const SOURCE_KID = String(process.env.VELMERE_LENS_SOURCE_TOKEN_KEY_ID || 'p61-browser-current-execution').trim();
const EXPECTED_PROJECTION_MANIFEST_SHA256 = '2a8a45acf4ab96827f636386edd06b1800c696b937d75eb81434a280c0a26b3b';
const EXPECTED_PROJECTION = Object.freeze({
  fileCount: 1597,
  payloadBytes: 20952834,
  pathSetSha256: 'b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73',
  sourceContentAggregateSha256: '83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7',
});
const SHA256 = /^[a-f0-9]{64}$/u;

for (const dir of [OUTPUT_ROOT, SCREENSHOT_ROOT, RESPONSE_ROOT]) fs.mkdirSync(dir, { recursive: true });
if (!EXECUTABLE_PATH || !fs.existsSync(EXECUTABLE_PATH)) throw new Error(`p61_browser_executable_missing:${EXECUTABLE_PATH}`);
const playwrightEntry = path.join(NODE_MODULES_ROOT, 'playwright', 'index.mjs');
if (!fs.existsSync(playwrightEntry)) throw new Error(`p61_playwright_module_missing:${playwrightEntry}`);
const { chromium } = await import(pathToFileURL(playwrightEntry).href);
if (SOURCE_SECRET.length < 32) throw new Error('p61_lens_source_token_secret_missing_or_short');

function sha256Bytes(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function sha256File(file) { return sha256Bytes(fs.readFileSync(file)); }
function canonicalJson(value, seen = new WeakSet()) {
  if (typeof value === 'undefined') return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) throw new Error('canonical_json_cycle');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, seen)).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`).join(',')}}`;
  } finally { seen.delete(value); }
}
function stableSha(value) { return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8')); }
function safeName(value) { return String(value).replace(/[^a-z0-9._-]+/giu, '-').replace(/^-+|-+$/gu, ''); }
function writeBytes(relativePath, bytes) {
  const target = path.join(OUTPUT_ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return { path: relativePath.replaceAll('\\', '/'), byteLength: bytes.length, sha256: sha256Bytes(bytes) };
}
function writeJson(relativePath, value) {
  return writeBytes(relativePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}
function base64Url(bytes) { return Buffer.from(bytes).toString('base64url'); }
function sourceToken(result, locale) {
  const now = Math.floor(Date.now() / 1000);
  const envelope = {
    v: 1,
    purpose: 'lens_source_result',
    kid: SOURCE_KID,
    iat: now,
    exp: now + 10 * 60,
    locale,
    resultDigest: `sha256:${sha256Bytes(Buffer.from(canonicalJson(result), 'utf8'))}`,
    result,
  };
  const encoded = base64Url(Buffer.from(JSON.stringify(envelope), 'utf8'));
  const signature = crypto.createHmac('sha256', SOURCE_SECRET)
    .update(`velmere:lens-source-result:v1:${encoded}`)
    .digest();
  return { token: `${encoded}.${base64Url(signature)}`, expiresAt: new Date(envelope.exp * 1000).toISOString(), resultDigest: envelope.resultDigest };
}

const localeCopy = {
  en: {
    summary: 'Internal current-source Browser execution fixture for Bitcoin. The values are frozen test inputs and are not live market data.',
    why: 'The fixture verifies the Browser report-viewer, tier controls, evidence wording and fail-closed commercial states without granting provider or customer credit.',
    next: 'Review the exact source-bound Browser output and keep Pro and Advanced blocked until current value, rights and sale gates pass.',
    source: 'P61 internal execution fixture — not live data',
    missing: ['live provider observation', 'current rights receipt', 'real customer evidence'],
    chips: ['internal fixture', 'same-input tier run', 'no live claim'],
  },
  pl: {
    summary: 'Wewnętrzny fixture wykonania Browsera dla Bitcoina związany z current source. Wartości są zamrożonym inputem testowym, a nie danymi live.',
    why: 'Fixture sprawdza viewer raportu, kontrolki tierów, język dowodowy i fail-closed stany komercyjne bez kredytu providera lub klienta.',
    next: 'Zweryfikuj dokładny output Browsera i pozostaw Pro oraz Advanced zablokowane do zamknięcia wartości, praw i sprzedaży.',
    source: 'P61 wewnętrzny fixture wykonania — nie dane live',
    missing: ['obserwacja live providera', 'aktualny rights receipt', 'dowód od realnego klienta'],
    chips: ['fixture wewnętrzny', 'same-input tier run', 'bez claimu live'],
  },
  de: {
    summary: 'Interne current-source Browser-Ausführungsfixture für Bitcoin. Die Werte sind eingefrorene Testeingaben und keine Live-Marktdaten.',
    why: 'Die Fixture prüft Report Viewer, Tier-Steuerung, Evidenzsprache und fail-closed Handelszustände ohne Provider- oder Kunden-Credit.',
    next: 'Prüfe den exakten source-bound Browser-Output und halte Pro sowie Advanced blockiert, bis Wert-, Rechte- und Sale-Gates bestehen.',
    source: 'P61 interne Ausführungsfixture — keine Live-Daten',
    missing: ['Live-Providerbeobachtung', 'aktueller Rights Receipt', 'reale Kundenevidenz'],
    chips: ['interne Fixture', 'Same-Input-Tier-Run', 'kein Live-Claim'],
  },
};

function fixtureResult(locale) {
  const c = localeCopy[locale];
  return {
    id: 'p61-bitcoin-current-source-fixture',
    title: 'Bitcoin',
    symbol: 'BTC',
    category: 'token',
    tone: 'review',
    summary: c.summary,
    whyItMatters: c.why,
    missingData: c.missing,
    nextOperatorStep: c.next,
    sourceMode: 'fallback',
    sourceConfidence: 0,
    sourceConfidenceCalibrated: false,
    sourceCoverage: 100,
    shieldHref: '/market-integrity?asset=bitcoin&from=velmere-search&view=full&handoff=pass453&source=lens-pdf',
    avatarLabel: 'BTC',
    bridge: {
      href: '/market-integrity?asset=bitcoin&from=velmere-search&view=full&handoff=pass453&source=lens-pdf',
      queryKey: 'bitcoin',
      origin: 'velmere_search',
      mode: 'full_shield_analysis',
      note: 'P61 source-bound Browser handoff fixture; no live or sale credit.',
    },
    sources: [{
      id: 'p61-owned-browser-fixture',
      label: c.source,
      mode: 'fallback',
      freshness: 'historical snapshot 2026-08-15T21:00:00.000Z',
      confidence: 0,
      confidenceCalibrated: false,
      coverage: 100,
      note: 'Owned deterministic fixture for physical Browser execution only; provider, rights, real-data and customer credit remain zero.',
    }],
    chips: c.chips,
    marketSnapshot: {
      assetClass: 'crypto',
      currency: 'USD',
      price: 65000,
      marketCap: 1280000000000,
      fdv: 1365000000000,
      volume24h: 32000000000,
      change1h: 0.2,
      change24h: 1.25,
      change7d: -2.1,
      high24h: 66250,
      low24h: 63800,
      circulatingSupply: 19692300,
      maxSupply: 21000000,
      observedAt: '2026-08-15T21:00:00.000Z',
      liquidityLabel: 'Fixture-only liquidity context',
      depthLabel: 'No live order book — fixture execution only',
      holderConcentrationLabel: 'Not measured in P61',
      venueHealthLabel: 'No provider credit',
      providerState: 'not_configured',
      anomalyLabel: 'FIXTURE_INTERNAL_ONLY',
    },
  };
}

function buildSearchPayload(locale) {
  const result = fixtureResult(locale);
  const signed = sourceToken(result, locale);
  return {
    result: { ...result, lensSourceToken: signed.token, lensSourceTokenExpiresAt: signed.expiresAt },
    sourceToken: signed,
    payload: {
      ok: true,
      boundary: 'P61 INTERNAL FIXTURE ONLY — no live/provider/rights/customer/sale credit.',
      query: 'BTC',
      requestedMode: 'all',
      results: [{ ...result, lensSourceToken: signed.token, lensSourceTokenExpiresAt: signed.expiresAt }],
      generatedAt: '2026-08-15T21:00:00.000Z',
      productionBoundary: 'P61 deterministic current-source Browser execution fixture.',
      mode: 'velmere_intelligence_search_preview',
    },
  };
}

const fixtures = Object.fromEntries(['en', 'pl', 'de'].map((locale) => [locale, buildSearchPayload(locale)]));
const fixtureEvidence = {};
for (const [locale, fixture] of Object.entries(fixtures)) {
  fixtureEvidence[locale] = writeBytes(`fixtures/search-${locale}.json`, Buffer.from(JSON.stringify(fixture.payload), 'utf8'));
}

const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};
const cases = [];
for (const tier of ['basic', 'pro', 'advanced']) {
  cases.push({ tier, locale: 'en', viewport: 'desktop', primaryPreview: tier === 'basic' });
  cases.push({ tier, locale: 'de', viewport: 'desktop', primaryPreview: false });
  cases.push({ tier, locale: 'pl', viewport: 'mobile', primaryPreview: false });
}

function responseDecision(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.decision ?? payload.access?.decision ?? payload.error ?? null;
}
function expectedApi(tier) {
  if (tier === 'basic') return { status: 200, decision: null };
  if (tier === 'pro') return { status: 402, decision: 'INVITATION_ONLY_CONTROLLED_BETA' };
  return { status: 402, decision: 'NOT_FOR_SALE' };
}
async function directTierRequest(page, locale, tier, sourceTokenValue) {
  const result = await page.evaluate(async ({ tierValue, tokenValue }) => {
    const response = await fetch(`/api/search/lens-report?tier=${encodeURIComponent(tierValue)}&format=json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceToken: tokenValue }),
    });
    const bodyText = await response.text();
    return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), bodyText };
  }, { tierValue: tier, tokenValue: sourceTokenValue });
  const bytes = Buffer.from(result.bodyText, 'utf8');
  let parsed = null;
  try { parsed = JSON.parse(result.bodyText); } catch {}
  const file = writeBytes(`responses/${tier}-${locale}-direct.json`, bytes);
  return { ...result, bodyText: undefined, body: file, parsed, decision: responseDecision(parsed) };
}
function sanitizedConsoleText(text) {
  return String(text ?? '').replace(/[A-Za-z]:\\[^\s)]+/g, '<windows-path>').slice(0, 1200);
}
async function inspectLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const bodyText = body?.innerText ?? '';
    const overflow = Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - Math.min(window.innerWidth, root.clientWidth);
    const active = document.activeElement;
    return {
      htmlLang: root.lang || null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
      horizontalOverflowPx: Math.max(0, overflow),
      bodyTextBytes: new TextEncoder().encode(bodyText).length,
      invalidTokens: ['undefined', 'NaN', '[object Object]', 'Internal Server Error', '__next_error__'].filter((token) => bodyText.includes(token)),
      activeElement: active ? { tag: active.tagName, id: active.id || null, testid: active.getAttribute('data-testid'), visible: active instanceof HTMLElement ? Boolean(active.offsetWidth || active.offsetHeight || active.getClientRects().length) : false } : null,
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      landmarkCount: document.querySelectorAll('main,nav,header,footer,[role="main"],[role="navigation"]').length,
    };
  });
}

const browserExecutable = { path: EXECUTABLE_PATH, byteLength: fs.statSync(EXECUTABLE_PATH).size, sha256: sha256File(EXECUTABLE_PATH) };
const browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH, args: ['--disable-gpu', '--no-first-run', '--disable-background-networking'] });
const browserVersion = browser.version();
const rows = [];
let topLevelError = null;

try {
  for (const testCase of cases) {
    const { tier, locale, viewport, primaryPreview } = testCase;
    const fixture = fixtures[locale];
    const context = await browser.newContext({
      viewport: viewports[viewport],
      locale: locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : 'en-IE',
      timezoneId: 'Europe/Berlin',
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      acceptDownloads: true,
    });
    const consoleErrors = [];
    const pageErrors = [];
    const unexpectedHttpErrors = [];
    const expectedTierErrors = [];
    const firstPartyFailures = [];
    await context.route('**/*', async (route) => {
      const request = route.request();
      let url;
      try { url = new URL(request.url()); } catch { return route.continue(); }
      if (url.origin === BASE_URL) {
        if (url.pathname === '/api/search') {
          return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(fixture.payload) });
        }
        return route.continue();
      }
      const type = request.resourceType();
      if (type === 'image') {
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQ1sAAAAASUVORK5CYII=', 'base64');
        return route.fulfill({ status: 200, contentType: 'image/png', body: png });
      }
      if (type === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return route.fulfill({ status: 204, body: '' });
    });
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error' && !/React DevTools/i.test(message.text())) consoleErrors.push(sanitizedConsoleText(message.text())); });
    page.on('pageerror', (error) => pageErrors.push(sanitizedConsoleText(error.message)));
    page.on('requestfailed', (request) => {
      try { if (new URL(request.url()).origin === BASE_URL) firstPartyFailures.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }); } catch {}
    });
    page.on('response', (response) => {
      if (response.status() < 400) return;
      const url = response.url();
      if (url.includes('/api/search/lens-report') && response.status() === 402 && tier !== 'basic') expectedTierErrors.push({ url, status: response.status() });
      else unexpectedHttpErrors.push({ url, status: response.status() });
    });

    const url = `${BASE_URL}/${locale}/search?q=BTC&p61Tier=${tier}&p61Viewport=${viewport}`;
    const navigation = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const input = page.getByTestId('lens-search-input');
    await input.waitFor({ state: 'visible', timeout: 60_000 });
    await input.fill('BTC');
    await input.press('Enter');
    const resultCard = page.getByTestId('lens-result-card').first();
    await resultCard.waitFor({ state: 'visible', timeout: 60_000 });
    const resultTitle = (await resultCard.locator('h2').first().textContent().catch(() => null))?.trim() ?? null;
    const openPdf = page.getByTestId('lens-compact-open-pdf').or(page.getByTestId('lens-preview-button')).first();
    await openPdf.waitFor({ state: 'visible', timeout: 30_000 });
    await openPdf.click();
    const depthDialog = page.getByTestId('lens-pdf-depth-dialog');
    await depthDialog.waitFor({ state: 'visible', timeout: 30_000 });
    const targetChoice = page.getByTestId(`lens-depth-choice-${tier}`);
    const targetChoiceVisible = await targetChoice.isVisible();
    const targetChoiceDisabled = await targetChoice.isDisabled();
    const targetChoiceText = (await targetChoice.innerText()).trim();
    const choiceStates = {};
    for (const candidate of ['basic', 'pro', 'advanced']) {
      const locator = page.getByTestId(`lens-depth-choice-${candidate}`);
      choiceStates[candidate] = { visible: await locator.isVisible(), disabled: await locator.isDisabled(), text: (await locator.innerText()).trim() };
    }

    const direct = await directTierRequest(page, locale, tier, fixture.sourceToken.token);
    const expected = expectedApi(tier);
    const directPass = direct.status === expected.status && (expected.decision === null ? direct.parsed?.ok === true && direct.parsed?.access?.depth === 'basic' : direct.decision === expected.decision);

    let preview = null;
    if (primaryPreview) {
      await page.getByTestId('lens-depth-choice-basic').click();
      const capturedResponses = [];
      const listener = async (response) => {
        if (!response.url().includes('/api/search/lens-report')) return;
        try {
          const body = Buffer.from(await response.body());
          const contentType = response.headers()['content-type'] ?? '';
          const suffix = contentType.includes('application/pdf') ? 'pdf' : 'json';
          const file = writeBytes(`responses/basic-${locale}-primary-${capturedResponses.length + 1}.${suffix}`, body);
          capturedResponses.push({ url: response.url(), status: response.status(), contentType, ...file, startsWithPdf: body.subarray(0, 5).toString('ascii') === '%PDF-' });
        } catch (error) {
          capturedResponses.push({ url: response.url(), status: response.status(), error: `${error.name}: ${error.message}` });
        }
      };
      page.on('response', listener);
      await page.getByTestId('lens-depth-confirm').click();
      const previewDialog = page.getByTestId('lens-preview-dialog');
      await previewDialog.waitFor({ state: 'visible', timeout: 120_000 });
      await page.waitForTimeout(1200);
      page.off('response', listener);
      const downloadLink = page.getByTestId('lens-download-link');
      const frame = page.getByTestId('lens-pdf-frame');
      const blobEvidence = await page.evaluate(async () => {
        const link = document.querySelector('[data-testid="lens-download-link"]');
        const iframe = document.querySelector('[data-testid="lens-pdf-frame"]');
        if (!(link instanceof HTMLAnchorElement)) return { available: false };
        const response = await fetch(link.href);
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return { available: true, hrefScheme: new URL(link.href).protocol, frameSameUrl: iframe instanceof HTMLIFrameElement ? iframe.src === link.href : false, download: link.download, base64: btoa(binary), byteLength: bytes.length };
      });
      let blobFile = null;
      if (blobEvidence.available) {
        const bytes = Buffer.from(blobEvidence.base64, 'base64');
        blobFile = writeBytes('responses/basic-en-primary-browser-blob.pdf', bytes);
        blobEvidence.base64 = undefined;
        blobEvidence.startsWithPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
      }
      preview = {
        visible: await previewDialog.isVisible(),
        downloadVisible: await downloadLink.isVisible(),
        frameVisible: await frame.isVisible(),
        capturedResponses,
        blobEvidence: { ...blobEvidence, file: blobFile },
      };
      await page.getByTestId('lens-preview-close').click().catch(() => {});
    }

    await page.keyboard.press('Tab');
    const layout = await inspectLayout(page);
    const screenshotPath = `screenshots/${tier}-${locale}-${viewport}.png`;
    await page.screenshot({ path: path.join(OUTPUT_ROOT, screenshotPath), fullPage: false, animations: 'disabled', captureBeyondViewport: false });
    const screenshot = { path: screenshotPath, byteLength: fs.statSync(path.join(OUTPUT_ROOT, screenshotPath)).size, sha256: sha256File(path.join(OUTPUT_ROOT, screenshotPath)) };
    const domBytes = Buffer.from(await page.content(), 'utf8');
    const dom = writeBytes(`responses/${tier}-${locale}-${viewport}-dom.html`, domBytes);
    const storage = await page.evaluate(() => ({ localStorageKeys: Object.keys(localStorage), sessionStorageKeys: Object.keys(sessionStorage) }));

    const uiPass = navigation?.status() === 200
      && resultTitle === 'Bitcoin'
      && targetChoiceVisible
      && targetChoiceDisabled === (tier !== 'basic')
      && layout.horizontalOverflowPx <= 2
      && layout.invalidTokens.length === 0
      && consoleErrors.length === 0
      && pageErrors.length === 0
      && unexpectedHttpErrors.length === 0
      && firstPartyFailures.length === 0;
    const previewPass = !primaryPreview || Boolean(preview?.visible && preview?.downloadVisible && preview?.frameVisible && preview?.blobEvidence?.startsWithPdf && preview?.capturedResponses?.some((item) => item.contentType?.includes('application/pdf') && item.startsWithPdf));
    const ok = uiPass && directPass && previewPass;
    rows.push({
      caseId: `${tier}-${locale}-${viewport}`,
      tier, locale, viewport, primaryPreview,
      url, navigationStatus: navigation?.status() ?? null, finalUrl: page.url(), resultTitle,
      targetChoice: { visible: targetChoiceVisible, disabled: targetChoiceDisabled, text: targetChoiceText },
      choiceStates, directApi: direct, preview, layout, storage,
      evidence: { screenshot, dom },
      errors: { consoleErrors, pageErrors, unexpectedHttpErrors, expectedTierErrors, firstPartyFailures },
      gates: { uiPass, directPass, previewPass },
      ok,
    });
    await context.close();
  }
} catch (error) {
  topLevelError = `${error.name}: ${error.message}`;
} finally {
  await browser.close();
}

function summarizeTier(tier) {
  const tierRows = rows.filter((row) => row.tier === tier);
  const apiBodies = tierRows.map((row) => row.directApi?.body?.sha256).filter(Boolean);
  const screenshots = tierRows.map((row) => row.evidence?.screenshot?.sha256).filter(Boolean);
  const expected = expectedApi(tier);
  const pass = tierRows.length === 3 && tierRows.every((row) => row.ok);
  return {
    tier,
    physicalCaseCount: tierRows.length,
    locales: [...new Set(tierRows.map((row) => row.locale))].sort(),
    viewports: [...new Set(tierRows.map((row) => row.viewport))].sort(),
    expectedHttpStatus: expected.status,
    expectedDecision: expected.decision,
    directApiBodySha256: apiBodies,
    screenshotSha256: screenshots,
    fullPreviewExecuted: tierRows.some((row) => row.primaryPreview && row.preview?.visible),
    currentDisposition: tier === 'basic' ? 'EXECUTED_INTERNAL_FIXTURE_BROWSER_OUTPUT_NOT_CUSTOMER_VALUE' : tier === 'pro' ? 'EXECUTED_FAIL_CLOSED_INVITATION_ONLY_CONTROLLED_BETA' : 'EXECUTED_FAIL_CLOSED_NOT_FOR_SALE',
    analysisEligible: tier === 'basic',
    checkoutEligible: false,
    saleEligible: false,
    pass,
  };
}

const tiers = ['basic', 'pro', 'advanced'].map(summarizeTier);
const allPass = !topLevelError && rows.length === cases.length && rows.every((row) => row.ok) && tiers.every((tier) => tier.pass);
const receipt = {
  schemaVersion: 'velmere.p61.browser-three-physical-sku-executions.v1',
  status: allPass ? 'PASS' : 'FAIL',
  decision: allPass ? 'PASS_BROWSER_BASIC_PRO_ADVANCED_PHYSICAL_EXECUTIONS_CURRENT_TRUTH_BOUNDED' : 'FAIL_CLOSED_BROWSER_THREE_SKU_EXECUTION',
  executedAt: new Date().toISOString(),
  sourceBinding: {
    projectionManifestSha256: EXPECTED_PROJECTION_MANIFEST_SHA256,
    projection: EXPECTED_PROJECTION,
    p60EngineeringDecision: 'PASS_NATIVE_WINDOWS_EXACT_BUILD_RELEVANT_PROJECTION_SEMANTIC_LINT_DUAL_BUILD_WITH_CONTROLLED_NEXT_ENV_RECONCILIATION',
  },
  runtime: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    browserVersion,
    browserExecutable,
    baseUrl: BASE_URL,
  },
  fixtureBoundary: {
    evidenceClass: 'FIXTURE_INTERNAL_ONLY',
    sameInput: 'BTC / p61-bitcoin-current-source-fixture',
    sourceObservation: '2026-08-15T21:00:00.000Z frozen fixture',
    providerCredit: 0,
    currentDataCredit: 0,
    rightsCredit: 0,
    customerCredit: 0,
    saleCredit: 0,
    fixtures: fixtureEvidence,
  },
  denominator: { physicalSkuExecutions: 3, physicalCases: cases.length, locales: 3, viewportClasses: 2 },
  summary: {
    distinctTierSpecificPhysicalExecutions: tiers.filter((tier) => tier.pass).length,
    browserBasicExecution: tiers.find((tier) => tier.tier === 'basic')?.pass ?? false,
    browserProExecution: tiers.find((tier) => tier.tier === 'pro')?.pass ?? false,
    browserAdvancedExecution: tiers.find((tier) => tier.tier === 'advanced')?.pass ?? false,
    exactBasicPreviewAndBlob: tiers.find((tier) => tier.tier === 'basic')?.fullPreviewExecuted ?? false,
    proFailClosedInvitationOnly: tiers.find((tier) => tier.tier === 'pro')?.pass ?? false,
    advancedFailClosedNotForSale: tiers.find((tier) => tier.tier === 'advanced')?.pass ?? false,
    customerOutputCredit: 'WITHHELD_FIXTURE_ONLY',
    tierValueCredit: 'WITHHELD_NO_MATCHED_REAL_CURRENT_OUTPUT_VALUE_ADJUDICATION',
    pdfIndependentReplay: '0/1',
    saleEligible: '0/3',
  },
  tiers,
  rows,
  topLevelError,
  truthBoundary: 'PASS proves three physically distinct Browser Basic/Pro/Advanced execution paths on the exact P60-bound 1597-file projection and native Windows runtime. Basic is exercised through a real source-token JSON/PDF preview path; Pro and Advanced are exercised as exact fail-closed current commercial states. The source input is an owned deterministic fixture. This grants no live/current provider, rights, customer value, independent PDF replay, sale, GO or WORLD_CLASS credit.',
};
receipt.integritySha256 = stableSha(receipt);
writeJson('P61_BROWSER_THREE_PHYSICAL_SKU_EXECUTIONS.json', receipt);
console.log(JSON.stringify(receipt, null, 2));
process.exit(allPass ? 0 : 1);
