import { test, expect } from '@playwright/test';

const BASE = '/api';
const TOKEN_ENDPOINT = `${BASE}/test/generate-paid-token`;

async function getToken(request: any, productId: string, opts?: { surface?: string; depth?: string; locale?: string; assetId?: string; symbol?: string }) {
  const data: Record<string, string> = { productId, locale: opts?.locale ?? 'en' };
  if (opts?.surface) data.surface = opts.surface;
  if (opts?.depth) data.depth = opts.depth;
  if (opts?.assetId) data.assetId = opts.assetId;
  if (opts?.symbol) data.symbol = opts.symbol;
  const r = await request.post(TOKEN_ENDPOINT, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.ok).toBe(true);
  return body.token as string;
}

test.describe('AUTHORIZED FLOW — Paid tiers with HMAC tokens', () => {
  test.describe('VLM ADVANCED: authorized flow', () => {
    test('VLM advanced BTC with valid token returns analysis', async ({ request }) => {
      const token = await getToken(request, 'vlm_advanced_analysis_single', { surface: 'shield', depth: 'advanced', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/vlm?query=BTC&depth=advanced&locale=en`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.result).toBeTruthy();
      expect(body.ai).toBeTruthy();
      expect(body.ai.output).toBeTruthy();
      expect(body.ai.output.verdict).toBeTruthy();
      expect(body.ai.output.summary).toBeTruthy();
      expect(body.ai.output.asset.symbol).toBeTruthy();
    });
  });

  test.describe('SHIELD PRO: authorized flows', () => {
    test('Shield Pro basic with valid token returns analysis', async ({ request }) => {
      const token = await getToken(request, 'shield_pro_basic_single', { surface: 'shield-pro', depth: 'basic', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/shield-pro?query=BTC&depth=basic&locale=en`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.result).toBeTruthy();
      expect(body.brain).toBeTruthy();
      expect(body.brain.brainScore).toBeGreaterThanOrEqual(0);
      expect(body.brain.brainScore).toBeLessThanOrEqual(100);
    });

    test('Shield Pro pro with valid token returns analysis', async ({ request }) => {
      const token = await getToken(request, 'shield_pro_pro_single', { surface: 'shield-pro', depth: 'pro', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/shield-pro?query=BTC&depth=pro&locale=en`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.ai).toBeTruthy();
      expect(body.ai.output.verdict).toBeTruthy();
    });

    test('Shield Pro advanced with valid token returns analysis', async ({ request }) => {
      const token = await getToken(request, 'shield_pro_advanced_single', { surface: 'shield-pro', depth: 'advanced', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/shield-pro?query=BTC&depth=advanced&locale=en`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.ai).toBeTruthy();
      expect(body.ai.output.verdict).toBeTruthy();
      expect(body.ai.output.summary).toBeTruthy();
    });
  });

  test.describe('MARKET IMPACT: authorized flow', () => {
    test('Market Impact BTC with valid token returns impact data', async ({ request }) => {
      const token = await getToken(request, 'market_impact_single', { surface: 'market-impact', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/market-impact?query=BTC`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.result).toBeTruthy();
      expect(body.impactAnalysis).toBe(true);
      expect(body.result.largeOrderImpact).toBeTruthy();
      expect(body.result.largeOrderImpact.length).toBeGreaterThan(0);
      expect(body.result.stressTest).toBeTruthy();
      expect(body.result.stressTest.length).toBeGreaterThan(0);
    });
  });

  test.describe('WHALE WATCH: authorized flow', () => {
    test('Whale Watch with valid token returns whale data', async ({ request }) => {
      const token = await getToken(request, 'whale_watch_single', { surface: 'whale-watch', assetId: 'ETH', symbol: 'ETH' });
      const r = await request.get(`/api/market-integrity/whale-watch?query=ETH`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.whaleData).toBeTruthy();
      expect(body.whaleData.concentration).toBeTruthy();
      expect(body.whaleData.sellPressure).toBeTruthy();
      expect(body.whaleData.clusters).toBeTruthy();
      expect(body.whaleData.dataSources).toBeTruthy();
      expect(body.whaleData.warnings).toBeTruthy();
      expect(body.whaleData.dataCompleteness).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('AUDIT PRO REVIEW: authorized flow', () => {
    test('Audit Pro Review with valid token returns audit data', async ({ request }) => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const token = await getToken(request, 'audit_pro_review', { surface: 'audit', depth: 'pro', assetId: contractAddress, symbol: 'TestProject' });
      const r = await request.post(`/api/security/audit-watch`, {
        headers: {
          'x-velmere-paid-access': token,
          'Content-Type': 'application/json',
        },
        data: {
          projectName: 'TestProject',
          contractAddress,
          chain: 'ethereum',
          website: 'https://example.com',
          reviewLevel: 'pro_review',
          locale: 'en',
        },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.preview).toBeTruthy();
      expect(body.queueRecord).toBeTruthy();
      expect(body.accountMessage).toBeTruthy();
    });

    test('Audit Pro Review without token returns 402', async ({ request }) => {
      const r = await request.post(`/api/security/audit-watch`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          projectName: 'TestProject',
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          chain: 'ethereum',
          reviewLevel: 'pro_review',
          locale: 'en',
        },
      });
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });
  });

  test.describe('RISK INDICATOR: authorized flow', () => {
    test('Risk Indicator BTC with valid token returns risk data', async ({ request }) => {
      const token = await getToken(request, 'risk_indicator_single', { surface: 'risk-indicator', assetId: 'BTC', symbol: 'BTC' });
      const r = await request.get(`/api/market-integrity/risk-indicator?query=BTC`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('live');
      expect(body.riskIndicators).toBeTruthy();
      expect(typeof body.riskIndicators.overallScore).toBe('number');
      expect(body.riskIndicators.overallScore).toBeGreaterThanOrEqual(0);
      expect(body.riskIndicators.overallScore).toBeLessThanOrEqual(100);
      expect(body.riskIndicators.riskLevel).toBeTruthy();
      expect(body.riskIndicators.indicators).toBeTruthy();
      expect(body.riskIndicators.indicators.length).toBeGreaterThan(0);
      expect(body.riskIndicators.trend).toBeTruthy();
    });
  });

  test.describe('REAL MARKETS: authorized flows', () => {
    test('Real Markets pro with valid token returns enhanced data', async ({ request }) => {
      const token = await getToken(request, 'real_markets_pro_single', { surface: 'real-markets' });
      const r = await request.get(`/api/market-integrity/real-markets?ids=btc&depth=pro`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.canonicalQuotes).toBeTruthy();
      expect(body.canonicalQuotes.length).toBeGreaterThan(0);
      expect(body.canonicalQuotes[0].price).toBeGreaterThan(0);
    });

    test('Real Markets advanced with valid token returns enhanced data', async ({ request }) => {
      const token = await getToken(request, 'real_markets_advanced_single', { surface: 'real-markets' });
      const r = await request.get(`/api/market-integrity/real-markets?ids=btc&depth=advanced`, {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.canonicalQuotes).toBeTruthy();
      expect(body.canonicalQuotes.length).toBeGreaterThan(0);
    });
  });

  test.describe('TOKEN REJECTION: invalid tokens are rejected', () => {
    test('Random string token is rejected', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=advanced', {
        headers: { 'x-velmere-paid-access': 'invalid_token_string' },
      });
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });

    test('Expired/wrong product token is rejected', async ({ request }) => {
      const token = await getToken(request, 'shield_pro_basic_single', { surface: 'shield-pro', depth: 'basic' });
      const r = await request.get('/api/market-integrity/market-impact?query=BTC', {
        headers: { 'x-velmere-paid-access': token },
      });
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });
  });
});
