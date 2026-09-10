const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/real-markets');
  await p.waitForTimeout(2000);
  const data = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('span.velmere-asset-logo')).slice(0, 5).map(el => ({
      outerHTML: el.outerHTML,
      computedColor: window.getComputedStyle(el).color,
      computedFilter: window.getComputedStyle(el).filter,
      imgSrc: el.querySelector('img')?.src,
      imgLoaded: el.querySelector('img')?.className,
      imgComputedFilter: el.querySelector('img') ? window.getComputedStyle(el.querySelector('img')).filter : null,
      spanFallback: el.querySelector('span')?.innerText,
      spanStyle: el.querySelector('span')?.outerHTML
    }));
  });
  console.log(JSON.stringify(data, null, 2));
  await b.close();
})();
