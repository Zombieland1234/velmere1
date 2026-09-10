const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/kline-route-handler.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const intervalMs = KLINE_INTERVAL_MS[range] || 60000;',
  'const intervalMs = (typeof (range as any) === "string" && range.endsWith("h") ? 3600000 : range.endsWith("d") ? 86400000 : 900000);'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed KLINE_INTERVAL_MS reference in kline-route-handler.ts!');
