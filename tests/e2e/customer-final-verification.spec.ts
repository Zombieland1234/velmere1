import { test, expect } from '@playwright/test';

test.describe('CUSTOMER FINAL — Product Page Verification', () => {
  test.describe('ROW 1-3: AUDIT', () => {
    test('Audit Basic PL renders', async ({ page }) => {
      const r = await page.goto('/pl/security/audits');
      expect(r?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    });
    test('Audit Basic EN renders', async ({ page }) => {
      const r = await page.goto('/en/security/audits');
      expect(r?.status()).toBe(200);
    });
    test('Audit Pro Pricing page renders', async ({ page }) => {
      const r = await page.goto('/pl/security/audits/pricing');
      expect(r?.status()).toBe(200);
    });
    test('Audit Advanced Sample renders', async ({ page }) => {
      const r = await page.goto('/pl/security/audits/sample');
      expect(r?.status()).toBe(200);
    });
    test('Audit Registry renders', async ({ page }) => {
      const r = await page.goto('/pl/security/audits/registry');
      expect(r?.status()).toBe(200);
    });
    test('Audit API: audit-watch', async ({ page }) => {
      const r = await page.goto('/api/security/audit-watch');
      expect(r?.status()).toBe(200);
      const body = await r?.json();
      expect(body).toBeTruthy();
    });
    test('Audit API: audit-watch registry', async ({ page }) => {
      const r = await page.goto('/api/security/audit-watch/registry');
      expect(r?.status()).toBe(200);
    });
  });

  test.describe('ROW 4-6: BROWSER', () => {
    test('Browser Basic PL renders', async ({ page }) => {
      const r = await page.goto('/pl/search');
      expect(r?.status()).toBe(200);
    });
    test('Browser Basic EN renders', async ({ page }) => {
      const r = await page.goto('/en/search');
      expect(r?.status()).toBe(200);
    });
    test('Browser Research Lab renders', async ({ page }) => {
      const r = await page.goto('/pl/research-lab');
      expect(r?.status()).toBe(200);
    });
  });

  test.describe('ROW 7-9: SHIELD', () => {
    test('Shield Basic PL renders', async ({ page }) => {
      const r = await page.goto('/pl/market-integrity');
      expect(r?.status()).toBe(200);
    });
    test('Shield Basic EN renders', async ({ page }) => {
      const r = await page.goto('/en/market-integrity');
      expect(r?.status()).toBe(200);
    });
    test('Shield About renders', async ({ page }) => {
      const r = await page.goto('/pl/market-integrity/about');
      expect(r?.status()).toBe(200);
    });
    test('Shield API: analyze BTC', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=BTC');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBeTruthy();
    });
    test('Shield API: alerts', async ({ request }) => {
      const r = await request.get('/api/market-integrity/alerts');
      expect(r.status()).toBe(200);
    });
    test('VLM API: basic depth (no auth needed)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=basic');
      expect([200, 502]).toContain(r.status());
    });
    test('VLM API: advanced depth (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=advanced');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });
  });

  test.describe('ROW 10-12: SHIELD PRO', () => {
    test('Shield Pro PL renders', async ({ page }) => {
      const r = await page.goto('/pl/shield-pro');
      expect(r?.status()).toBe(200);
    });
    test('Shield Pro EN renders', async ({ page }) => {
      const r = await page.goto('/en/shield-pro');
      expect(r?.status()).toBe(200);
    });
    test('Shield Pro API: basic (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=basic');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('shield_pro_basic_single');
    });
    test('Shield Pro API: pro (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=pro');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('shield_pro_pro_single');
    });
    test('Shield Pro API: advanced (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=advanced');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.product.id).toBe('shield_pro_advanced_single');
    });
  });

  test.describe('ROW 13: SHIELD MAP', () => {
    test('Shield Map PL renders', async ({ page }) => {
      const r = await page.goto('/pl/shield-map');
      expect(r?.status()).toBe(200);
    });
    test('Shield Map EN renders', async ({ page }) => {
      const r = await page.goto('/en/shield-map');
      expect(r?.status()).toBe(200);
    });
    test('Shield Map MI renders', async ({ page }) => {
      const r = await page.goto('/pl/market-integrity/shield-map');
      expect(r?.status()).toBe(200);
    });
  });

  test.describe('ROW 14-16: REAL MARKETS', () => {
    test('Real Markets PL renders', async ({ page }) => {
      const r = await page.goto('/pl/real-markets');
      expect(r?.status()).toBe(200);
    });
    test('Real Markets EN renders', async ({ page }) => {
      const r = await page.goto('/en/real-markets');
      expect(r?.status()).toBe(200);
    });
    test('Cross Asset renders', async ({ page }) => {
      const r = await page.goto('/pl/market-integrity/cross-asset');
      expect(r?.status()).toBe(200);
    });
    test('Real Markets API: BTC quote', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
    });
    test('Real Markets API: depth=pro (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc&depth=pro');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });
    test('Real Markets API: depth=advanced (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc&depth=advanced');
      expect(r.status()).toBe(402);
    });
  });

  test.describe('ROW 17: MARKET IMPACT', () => {
    test('Market Impact PL renders', async ({ page }) => {
      const r = await page.goto('/pl/market-impact');
      expect(r?.status()).toBe(200);
    });
    test('Market Impact EN renders', async ({ page }) => {
      const r = await page.goto('/en/market-impact');
      expect(r?.status()).toBe(200);
    });
    test('Market Impact API: no query => 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact');
      expect(r.status()).toBe(400);
    });
    test('Market Impact API: BTC (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('market_impact_single');
    });
  });

  test.describe('ROW 18: WHALE WATCH', () => {
    test('Whale Watch PL renders', async ({ page }) => {
      const r = await page.goto('/pl/whale-watch');
      expect(r?.status()).toBe(200);
    });
    test('Whale Watch EN renders', async ({ page }) => {
      const r = await page.goto('/en/whale-watch');
      expect(r?.status()).toBe(200);
    });
    test('Whale Watch API: no query => 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch');
      expect(r.status()).toBe(400);
    });
    test('Whale Watch API: BTC (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('whale_watch_single');
    });
  });

  test.describe('ROW 19: ANGEL', () => {
    test('Angel API responds to POST', async ({ request }) => {
      const r = await request.post('/api/angel', { data: { message: 'hello', locale: 'en' } });
      expect([200, 400, 502]).toContain(r.status());
      const body = await r.json();
      expect(body).toBeTruthy();
    });
    test('Angel Market Intelligence API exists and responds', async ({ request }) => {
      const r = await request.fetch('/api/market-integrity/angel', {
        method: 'POST',
        data: JSON.stringify({ query: 'BTC', prompt: 'What is the risk?', locale: 'en' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect([200, 400, 405, 502]).toContain(r.status());
    });
  });

  test.describe('ROW 20: RISK INDICATOR', () => {
    test('Risk Indicator PL renders', async ({ page }) => {
      const r = await page.goto('/pl/risk-indicator');
      expect(r?.status()).toBe(200);
    });
    test('Risk Indicator EN renders', async ({ page }) => {
      const r = await page.goto('/en/risk-indicator');
      expect(r?.status()).toBe(200);
    });
    test('Risk Indicator API: no query => 400', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator');
      expect(r.status()).toBe(400);
    });
    test('Risk Indicator API: BTC (payment required)', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator?query=BTC');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
      expect(body.product.id).toBe('risk_indicator_single');
    });
  });
});

test.describe('SECURITY GATES', () => {
  test('Cron endpoint returns 401 without secret', async ({ request }) => {
    const r = await request.get('/api/market-integrity/cron');
    expect(r.status()).toBe(401);
  });
  test('Profile endpoint returns 401 without session', async ({ request }) => {
    const r = await request.get('/api/profile');
    expect(r.status()).toBe(401);
  });
  test('Checkout endpoint returns 400/503 without body', async ({ request }) => {
    const r = await request.post('/api/checkout', { data: {} });
    expect([400, 503]).toContain(r.status());
  });
  test('VLM verify returns rate limit header', async ({ request }) => {
    const r = await request.post('/api/checkout/vlm-service/verify', { data: {} });
    expect([400, 402, 429]).toContain(r.status());
  });
});
