const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/local-development-market-reference.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('local-dev lines:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('buildLocalDevelopmentKlineReference')) {
    console.log(lines.slice(i, i + 40).join('\n'));
  }
});
