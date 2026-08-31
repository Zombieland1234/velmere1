import { test, expect } from '@playwright/test';

const TOKEN_ENDPOINT = '/api/test/generate-paid-token';

test('DIAGNOSTIC — Market Impact with real orderbook', async ({ request }) => {
  const tokenR = await request.post(TOKEN_ENDPOINT, {
    data: { productId: 'market_impact_single', surface: 'market-impact', assetId: 'BTC', symbol: 'BTC', locale: 'en' },
    headers: { 'Content-Type': 'application/json' },
  });
  const { token } = await tokenR.json();

  const r = await request.get('/api/market-integrity/market-impact?query=BTC', {
    headers: { 'x-velmere-paid-access': token },
  });
  const body = await r.json();
  console.log('Status:', r.status());
  console.log('Mode:', body.mode);
  console.log('Token symbol:', body.result?.token?.symbol);
  console.log('Token price:', body.result?.metrics?.currentPrice);
  console.log('Liquidity depth:', body.result?.liquidityDepth);
  console.log('Orderbook imbalance:', body.result?.orderbookImbalance);
  console.log('Orderbook source:', body.result?.orderbook?.source);
  console.log('Orderbook bestBid:', body.result?.orderbook?.bestBid);
  console.log('Orderbook bestAsk:', body.result?.orderbook?.bestAsk);
  console.log('Orderbook spread%:', body.result?.orderbook?.spreadPercent);
  console.log('Orderbook bidDepthUsd:', body.result?.orderbook?.bidDepthUsd);
  console.log('Orderbook askDepthUsd:', body.result?.orderbook?.askDepthUsd);
  console.log('Orderbook imbalance%:', body.result?.orderbook?.bidAskImbalancePercent);
  console.log('Sell slippage 10k:', body.result?.orderbook?.simulatedSellSlippage10k);
  console.log('Buy slippage 10k:', body.result?.orderbook?.simulatedBuySlippage10k);
  console.log('Risk points:', body.result?.orderbook?.riskPoints);
  console.log('Orderbook signals:', JSON.stringify(body.result?.orderbook?.signals));
  console.log('Large order impact count:', body.result?.largeOrderImpact?.length);
  if (body.result?.largeOrderImpact?.length > 0) {
    console.log('Large order sample:', JSON.stringify(body.result.largeOrderImpact[0]));
  }
  console.log('Stress test count:', body.result?.stressTest?.length);
  if (body.result?.stressTest?.length > 0) {
    console.log('Stress test sample:', JSON.stringify(body.result.stressTest[0]));
  }
  expect(r.status()).toBe(200);
  expect(body.result).toBeTruthy();
});
