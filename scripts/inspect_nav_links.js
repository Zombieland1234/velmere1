const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  
  // Find all links on the home page
  const links = await page.$$eval('a', els => els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute('href') })));
  console.log('Home links count:', links.length);
  console.log('Sample links:', JSON.stringify(links.filter(l => l.href && !l.href.startsWith('#')).slice(0, 30), null, 2));

  await browser.close();
})();
