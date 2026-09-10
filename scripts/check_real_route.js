const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/route-registries/market-integrity.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach(l => {
  if (l.includes('real-markets')) console.log(l);
});
