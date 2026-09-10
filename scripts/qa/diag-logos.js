const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/real-markets');
  await p.waitForTimeout(2000);
  const html = await p.evaluate(() => {
    const apple = Array.from(document.querySelectorAll('*')).find(el => el.textContent === 'Apple' && el.children.length === 0);
    if (!apple) return 'Apple not found';
    let row = apple;
    for (let i = 0; i < 4; i++) {
      if (row.parentElement) row = row.parentElement;
    }
    return row.outerHTML;
  });
  console.log(html);
  await b.close();
})();
