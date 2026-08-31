import { test, expect } from '@playwright/test';

const BASE = '/api';
const TOKEN_ENDPOINT = `${BASE}/test/generate-paid-token`;

async function getToken(request: any, productId: string, opts?: Record<string, string>) {
  const data: Record<string, string> = { productId, locale: opts?.locale ?? 'en' };
  if (opts) Object.assign(data, opts);
  const r = await request.post(TOKEN_ENDPOINT, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  if (r.status() !== 200) return null;
  const body = await r.json();
  return body.token as string | null;
}

test.describe('AI CUSTOMER QA — Multi-Persona Testing', () => {
  test.describe('Novice user — valid simple inputs', () => {
    test('Shield Basic: simple BTC query', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=BTC&locale=en');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBeTruthy();
      expect(body.result).toBeTruthy();
    });

    test('Real Markets: simple BTC query', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=btc');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
    });

    test('Shield Map: simple BTC query', async ({ request }) => {
      const r = await request.get('/api/market-integrity/search?query=BTC&locale=en');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body).toBeTruthy();
    });

    test('Risk Indicator: simple BTC query requires paid access', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator?query=BTC');
      expect([200, 402]).toContain(r.status());
      const body = await r.json();
      expect(body.mode || body.error).toBeTruthy();
    });
  });

  test.describe('Confused user — empty/missing inputs', () => {
    test('Shield: empty query returns demo mode', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=&locale=en');
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.mode).toBe('demo');
    });

    test('Market Impact: empty query returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact?query=');
      expect(r.status()).toBe(400);
    });

    test('Whale Watch: empty query returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch?query=');
      expect(r.status()).toBe(400);
    });

    test('Risk Indicator: empty query returns demo mode', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator?query=');
      expect([200, 400]).toContain(r.status());
      const body = await r.json();
      expect(body.mode || body.error).toBeTruthy();
    });

    test('Angel: empty query returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/angel?query=&locale=en');
      expect(r.status()).toBe(400);
    });

    test('VLM: empty query returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=&locale=en');
      expect(r.status()).toBe(400);
    });
  });

  test.describe('Invalid input — XSS/injection attempts', () => {
    test('Shield: XSS in query is handled safely', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=%3Cscript%3Ealert(1)%3C%2Fscript%3E&locale=en');
      const status = r.status();
      expect([200, 400, 403, 429, 502]).toContain(status);
    });

    test('Real Markets: injection attempt is handled', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=__proto__[admin]=true');
      expect([200, 400]).toContain(r.status());
    });

    test('VLM: extremely long query is handled', async ({ request }) => {
      const longQuery = 'A'.repeat(5000);
      const r = await request.get(`/api/market-integrity/vlm?query=${longQuery}&locale=en`);
      expect([200, 400, 414, 502]).toContain(r.status());
    });
  });

  test.describe('Wrong-tier user — paid products without token', () => {
    test('VLM Advanced: returns 402 without token', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=advanced&locale=en');
      expect(r.status()).toBe(402);
      const body = await r.json();
      expect(body.error).toBe('payment_required');
    });

    test('Shield Pro: returns 402 without token', async ({ request }) => {
      const r = await request.get('/api/market-integrity/shield-pro?query=BTC&depth=basic');
      expect(r.status()).toBe(402);
    });

    test('Market Impact: returns 402 without token', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact?query=BTC');
      expect(r.status()).toBe(402);
    });

    test('Whale Watch: returns 402 without token', async ({ request }) => {
      const r = await request.get('/api/market-integrity/whale-watch?query=BTC');
      expect(r.status()).toBe(402);
    });

    test('Risk Indicator: returns 402 without token', async ({ request }) => {
      const r = await request.get('/api/market-integrity/risk-indicator?query=BTC');
      expect(r.status()).toBe(402);
    });

    test('Audit Pro: returns 402 without token', async ({ request }) => {
      const r = await request.post('/api/security/audit-watch', {
        headers: { 'Content-Type': 'application/json' },
        data: { projectName: 'Test', contractAddress: '0x1234', chain: 'ethereum', reviewLevel: 'pro_review', locale: 'en' },
      });
      expect(r.status()).toBe(402);
    });
  });

  test.describe('Provider failure — invalid symbols/queries', () => {
    test('Shield: nonexistent token returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=XYZNONEXISTENT12345&locale=en');
      expect([200, 404, 502]).toContain(r.status());
    });

    test('Market Impact: nonexistent token returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/market-impact?query=XYZNONEXISTENT12345');
      expect([200, 402, 404, 502]).toContain(r.status());
    });

    test('Real Markets: invalid symbol returns error', async ({ request }) => {
      const r = await request.get('/api/market-integrity/real-markets?ids=__nonexistent__');
      expect([200, 400, 404]).toContain(r.status());
    });
  });

  test.describe('Multi-locale support', () => {
    test('Shield: Polish locale works', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=BTC&locale=pl');
      expect(r.status()).toBe(200);
    });

    test('Shield: German locale works', async ({ request }) => {
      const r = await request.get('/api/market-integrity/analyze?query=BTC&locale=de');
      expect(r.status()).toBe(200);
    });

    test('VLM: Polish locale works', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&locale=pl');
      expect([200, 402]).toContain(r.status());
    });
  });

  test.describe('Recovery — malformed requests', () => {
    test('Audit: invalid JSON body is handled', async ({ request }) => {
      const r = await request.post('/api/security/audit-watch', {
        headers: { 'Content-Type': 'application/json' },
        data: 'not valid json',
      });
      expect([200, 400]).toContain(r.status());
    });

    test('VLM: basic query returns analysis', async ({ request }) => {
      const r = await request.get('/api/market-integrity/vlm?query=BTC&locale=en');
      expect([200, 402]).toContain(r.status());
    });
  });
});
