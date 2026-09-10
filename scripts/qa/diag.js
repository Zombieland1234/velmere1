const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/market-integrity');
  await p.waitForTimeout(2000);
  const sel = await p.evaluate(() => {
    const btc = Array.from(document.querySelectorAll('*')).find(el => el.textContent === 'Bitcoin' && el.children.length === 0);
    if (!btc) return 'BTC not found';
    let row = btc;
    while (row && !row.getAttribute('role')?.includes('button') && !row.className?.includes('row') && row.tagName !== 'TR') {
      row = row.parentElement;
    }
    return {
      tag: row?.tagName,
      className: row?.className,
      role: row?.getAttribute('role'),
      attributes: Array.from(row?.attributes || []).map(a => `${a.name}="${a.value}"`)
    };
  });
  console.log('ROW SELECTOR INFO:', sel);
  await b.close();
})();
