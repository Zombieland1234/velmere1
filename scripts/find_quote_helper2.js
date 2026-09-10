const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/pass4414-cross-asset-quote-format-helpers.ts';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('quoteForAsset')) {
    console.log(lines.slice(i, i + 25).join('\n'));
  }
});
