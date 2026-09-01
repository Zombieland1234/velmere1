#!/usr/bin/env node
import fs from 'node:fs';

const reportsDir = 'reports';
fs.mkdirSync(reportsDir, { recursive: true });

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
const smokePack = readJson('reports/PASS2123_HOSTED_SMOKE_PACK.json') || {};
const baseUrl = process.env.VELMERE_HOSTED_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
const runLive = process.argv.includes('--run-live') && Boolean(baseUrl);

const canonicalRoutes = Array.isArray(smokePack.routes) ? smokePack.routes : [
  '/', '/en', '/en/shop', '/en/market-integrity', '/en/real-markets', '/en/lens', '/en/security', '/en/account',
  '/pl', '/pl/shop', '/pl/market-integrity', '/pl/real-markets', '/pl/lens', '/de', '/de/shop', '/de/security'
];
const interactions = Array.isArray(smokePack.interactions) ? smokePack.interactions : [
  'open_menu', 'open_cart', 'open_wallet', 'open_language', 'open_asset_modal', 'open_pdf_preview', 'close_overlay_with_escape'
];

const result = {
  pass: 'PASS2141',
  name: 'Hosted smoke runner hardening',
  status: baseUrl ? (runLive ? 'LIVE_MODE_REQUESTED' : 'STATIC_READY_LIVE_NOT_REQUESTED') : 'STATIC_READY_BASE_URL_BLOCKED',
  baseUrlPresent: Boolean(baseUrl),
  runLive,
  guardrails: [
    'No production mutation routes are hit by default',
    'Live mode requires --run-live and VELMERE_HOSTED_BASE_URL',
    'Overlay checks stay customer-safe and do not submit orders',
    'Mobile/desktop matrix remains evidence-only until Playwright runtime is installed'
  ],
  routes: canonicalRoutes.map((route) => ({ route, method: 'GET', mutationSafe: true, expected: '2xx_or_3xx' })),
  interactions: interactions.map((id) => ({ id, requiresBrowserRuntime: true, expected: 'open_close_without_scroll_leak' })),
  summary: { routeCount: canonicalRoutes.length, interactionCount: interactions.length, canRunLiveHere: runLive },
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync('reports/PASS2141_HOSTED_SMOKE_RUNNER_HARDENING.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
