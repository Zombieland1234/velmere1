const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/real-markets');
  await p.waitForTimeout(2000);
  const styles = await p.evaluate(() => {
    const msft = Array.from(document.querySelectorAll('*')).find(el => el.textContent === 'Microsoft' && el.children.length === 0);
    const row = msft ? msft.closest('div.flex') || msft.parentElement?.parentElement : null;
    const img = row ? row.querySelector('img') : null;
    const span = row ? row.querySelector('span.velmere-asset-logo') : null;
    
    // Find all matching CSS rules
    function getMatchedRules(el) {
      const matched = [];
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.selectorText && el.matches(rule.selectorText)) {
              matched.push({
                selector: rule.selectorText,
                cssText: rule.style.cssText
              });
            }
          }
        } catch (e) {}
      }
      return matched;
    }
    
    return {
      imgMatched: img ? getMatchedRules(img) : [],
      spanMatched: span ? getMatchedRules(span) : [],
      imgStyle: img ? img.getAttribute('style') : null,
      spanStyle: span ? span.getAttribute('style') : null
    };
  });
  console.log(JSON.stringify(styles, null, 2));
  await b.close();
})();
