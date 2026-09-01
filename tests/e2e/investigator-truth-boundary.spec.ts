import { test, expect } from '@playwright/test';

test.describe('Investigator truth boundary', () => {
  test('missing query fails closed', async ({ request }) => {
    const response = await request.get('/api/market-integrity/investigator');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing query');
  });

  test('capability status is configuration-bound, not always available', async ({ request }) => {
    const response = await request.get('/api/market-integrity/investigator?query=BTC&locale=en');
    expect([200, 502]).toContain(response.status());
    const body = await response.json();

    if (response.status() === 200) {
      expect(['configured', 'not_configured']).toContain(body.engine?.generativeNarrative);
      expect(body.engine?.generativeNarrative).not.toBe('available');
    } else {
      expect(body.error).toBe('VLM Shield Investigator request failed');
    }
  });
});
