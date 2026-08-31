import { test, expect } from '@playwright/test';

test.describe('DIAGNOSTIC — Dump actual API responses', () => {
  test('Dump Shield analyze BTC response', async ({ request }) => {
    const r = await request.get('/api/market-integrity/analyze?query=BTC');
    const body = await r.json();
    console.log('=== SHIELD ANALYZE BTC ===');
    console.log('Status:', r.status());
    console.log('Mode:', body.mode);
    console.log('Result token:', JSON.stringify(body.result?.token));
    console.log('Brain keys:', Object.keys(body.brain || {}));
    console.log('Brain riskScore:', body.brain?.riskScore);
    console.log('Brain riskLevel:', body.brain?.riskLevel);
    console.log('Brain pass422:', body.pass422 ? 'exists' : 'missing');
  });

  test('Dump VLM basic BTC response', async ({ request }) => {
    const r = await request.get('/api/market-integrity/vlm?query=BTC&depth=basic');
    console.log('=== VLM BASIC BTC ===');
    console.log('Status:', r.status());
    const text = await r.text();
    console.log('Body (first 1000):', text.substring(0, 1000));
  });

  test('Dump Real Markets BTC response', async ({ request }) => {
    const r = await request.get('/api/market-integrity/real-markets?ids=btc');
    const body = await r.json();
    console.log('=== REAL MARKETS BTC ===');
    console.log('Status:', r.status());
    console.log('OK:', body.ok);
    console.log('Quotes count:', body.canonicalQuotes?.length);
    if (body.canonicalQuotes?.length > 0) {
      console.log('First quote:', JSON.stringify(body.canonicalQuotes[0]));
    }
    console.log('Quotes keys:', body.canonicalQuotes ? Object.keys(body.canonicalQuotes[0] || {}) : 'none');
  });

  test('Dump Angel POST response', async ({ request }) => {
    const r = await request.post('/api/angel', {
      data: { message: 'What is Bitcoin?', locale: 'en' },
    });
    console.log('=== ANGEL POST ===');
    console.log('Status:', r.status());
    const text = await r.text();
    console.log('Body (first 1000):', text.substring(0, 1000));
  });

  test('Dump Angel MI POST response', async ({ request }) => {
    const r = await request.post('/api/market-integrity/angel', {
      data: JSON.stringify({ query: 'BTC', prompt: 'risk', locale: 'en' }),
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('=== ANGEL MI POST ===');
    console.log('Status:', r.status());
    const text = await r.text();
    console.log('Body (first 500):', text.substring(0, 500));
  });

  test('Dump Shield analyze empty query', async ({ request }) => {
    const r = await request.get('/api/market-integrity/analyze');
    console.log('=== SHIELD ANALYZE EMPTY ===');
    console.log('Status:', r.status());
    const text = await r.text();
    console.log('Body:', text.substring(0, 500));
  });
});
