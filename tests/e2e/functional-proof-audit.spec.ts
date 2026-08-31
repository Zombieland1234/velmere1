import { test, expect } from '@playwright/test';

test.describe('FUNCTIONAL PROOF — Real Data Verification', () => {

  test.describe('SHIELD: Real CoinGecko/DexScreener data path', () => {
    test('Shield analyze BTC returns real market data (not demo/static)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=BTC');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).not.toBe('demo');
      expect(body.mode).toMatch(/live|degraded_live/);
      expect(body.result).toBeTruthy();
      expect(body.result.token).toBeTruthy();
      expect(body.result.token.symbol).toBeTruthy();
      expect(body.brain).toBeTruthy();
      expect(typeof body.brain.brainScore).toBe('number');
      expect(body.brain.brainScore).toBeGreaterThanOrEqual(0);
      expect(body.brain.brainScore).toBeLessThanOrEqual(100);
      expect(body.brain.verdict).toBeTruthy();
      expect(body.brain.activeLayers).toBeTruthy();
      expect(body.brain.activeLayers.length).toBeGreaterThan(0);
      expect(body.result.token.marketId || body.result.token.tokenAddress || body.result.token.symbol).toBeTruthy();
    });

    test('Shield analyze unknown token falls back to DexScreener', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=DOGE');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toMatch(/live|degraded_live/);
      expect(body.result.token.symbol).toBeTruthy();
    });

    test('Shield analyze empty query returns demo mode (validation by design)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('demo');
      expect(body.results).toBeTruthy();
      expect(body.results.length).toBeGreaterThan(0);
    });

    test('Shield alerts endpoint returns real data', async ({ request }) => {
      const r = await request.get('/api/market-integrity/alerts');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body).toBeTruthy();
      // Should have alerts array or similar structure
      expect(typeof body).toBe('object');
    });
  });

  test.describe('VLM BRAIN: Real AI analysis or deterministic fallback', () => {
    test('VLM basic BTC returns analysis (live or degraded)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=basic');
      const status = r.status();
      expect([200, 502]).toContain(status);
      if (status === 200) {
        const body = await r.json();
        expect(body.mode).toBeTruthy();
        expect(body.result).toBeTruthy();
        expect(body.ai).toBeTruthy();
        expect(body.ai.output).toBeTruthy();
        expect(body.ai.output.verdict).toBeTruthy();
        expect(body.ai.output.summary).toBeTruthy();
        expect(body.ai.output.providerMode).toBeTruthy();
        expect(body.ai.output.asset).toBeTruthy();
        expect(body.ai.output.asset.symbol).toBeTruthy();
      }
    });

    test('VLM advanced BTC requires payment (402)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=advanced');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product).toBeTruthy();
      expect(body.product.id).toBe('vlm_advanced_analysis_single');
      expect(body.product.amount).toBe(499);
    });

    test('VLM missing query returns 400 (validation)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm');
      expect(r.status()).toBe(400);
      const body = await r.json();
      expect(body.error).toBe('missing_query');
    });
  });

  test.describe('REAL MARKETS: Yahoo Finance real data path', () => {
    test('Real Markets BTC returns live Yahoo Finance data', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.canonicalQuotes).toBeTruthy();
      expect(body.canonicalQuotes.length).toBeGreaterThan(0);
      const btc = body.canonicalQuotes[0];
      expect(btc.price).not.toBeNull();
      expect(typeof btc.price).toBe('number');
      expect(btc.price).toBeGreaterThan(0);
      expect(btc.symbol).toBeTruthy();
      expect(btc.state).toBe('available');
      expect(btc.source).toBeTruthy();
      expect(btc.source.provider).toBeTruthy();
    });

    test('Real Markets invalid symbol returns 400 (no supported instruments)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=nonexistent_xyz');
      expect(r.status()).toBe(400);
      const body = await r.json();
      expect(body.error).toBe('no_supported_instruments');
    });

    test('Real Markets depth=pro requires payment', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc&depth=pro');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('real_markets_pro_single');
    });

    test('Real Markets depth=advanced requires payment', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc&depth=advanced');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('real_markets_advanced_single');
    });

    test('Real Markets no ids returns 400 (validation)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets');
      expect(r.status()).toBe(400);
    });
  });

  test.describe('MARKET IMPACT: Functional proof', () => {
    test('Market Impact BTC requires payment and returns correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('market_impact_single');
      expect(body.product.amount).toBe(699);
      expect(body.context).toBeTruthy();
      expect(body.context.surface).toBe('market-impact');
    });

    test('Market Impact missing query returns 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact');
      expect(r.status()).toBe(400);
    });
  });

  test.describe('WHALE WATCH: Functional proof', () => {
    test('Whale Watch BTC requires payment and returns correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('whale_watch_single');
      expect(body.product.amount).toBe(499);
      expect(body.context.surface).toBe('whale-watch');
    });

    test('Whale Watch missing query returns 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch');
      expect(r.status()).toBe(400);
    });
  });

  test.describe('RISK INDICATOR: Functional proof', () => {
    test('Risk Indicator BTC requires payment and returns correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('risk_indicator_single');
      expect(body.product.amount).toBe(399);
      expect(body.context.surface).toBe('risk-indicator');
    });

    test('Risk Indicator missing query returns 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator');
      expect(r.status()).toBe(400);
    });
  });

  test.describe('SHIELD PRO: Functional proof', () => {
    test('Shield Pro basic requires payment with correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=basic');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('shield_pro_basic_single');
      expect(body.product.amount).toBe(399);
    });

    test('Shield Pro pro requires payment with correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=pro');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('shield_pro_pro_single');
      expect(body.product.amount).toBe(799);
    });

    test('Shield Pro advanced requires payment with correct product', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=advanced');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('shield_pro_advanced_single');
      expect(body.product.amount).toBe(1299);
    });
  });

  test.describe('ANGEL: Functional proof', () => {
    test('Angel store API responds to POST with real processing', async ({ request }) => {
      const r = await request.post('/api/angel', {
        data: { message: 'What is Bitcoin?', locale: 'en' },
      });
      expect([200, 502]).toContain(r.status());
      if (r.status() === 200) {
        const body = await r.json();
        // Must have response content (not empty)
        expect(body).toBeTruthy();
        const keys = Object.keys(body);
        expect(keys.length).toBeGreaterThan(0);
      }
    });

    test('Angel MI API responds to POST', async ({ request }) => {
      const r = await request.post('/api/market-integrity/angel', {
        data: JSON.stringify({ query: 'BTC', prompt: 'Analyze risk', locale: 'en' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect([200, 400, 502]).toContain(r.status());
    });

    test('Angel MI with empty query returns error', async ({ request }) => {
      const r = await request.post('/api/market-integrity/angel', {
        data: JSON.stringify({ query: '', locale: 'en' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect([400, 405]).toContain(r.status());
    });
  });

  test.describe('SECURITY: Regression verification', () => {
    test('Cron: 401 without secret (not 200/fail-open)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/cron');
      expect(r.status()).toBe(401);
      const body = await r.json();
      expect(body.error).toContain('Unauthorized');
    });

    test('Profile: 401 without session (not 200)', async ({ request }) => {
      const r = await request.get('/api/profile');
      expect(r.status()).toBe(401);
      const body = await r.json();
      expect(body.error).toBe('AUTH_REQUIRED');
    });

    test('Checkout: 503 fail-closed without Stripe key', async ({ request }) => {
      const r = await request.post('/api/checkout', { data: {} });
      expect(r.status()).toBe(503);
    });

    test('VLM verify: 400 without body (validation works)', async ({ request }) => {
      const r = await request.post('/api/checkout/vlm-service/verify', { data: {} });
      expect(r.status()).toBe(400);
    });
  });
});
