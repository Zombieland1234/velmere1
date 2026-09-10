const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', async res => {
    if (res.url().includes('quotes') || res.url().includes('markets') || res.url().includes('real-markets')) {
      console.log('NETWORK URL:', res.url(), 'STATUS:', res.status());
    }
  });

  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const text = await page.innerText('body');
  console.log('Body includes AAPL:', text.includes('Apple'));
  console.log('Body includes dane niedostępne:', text.includes('dane niedostępne'));

  await browser.close();
})();
