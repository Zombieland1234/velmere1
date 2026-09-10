const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/real-markets-catalog.ts';
let content = fs.readFileSync(file, 'utf8');

const oldRangeCfg = `export const rangeConfig = {
  "15m": { range: "5d", interval: "15m", maxCandles: 480 },
  "1h": { range: "1mo", interval: "1h", maxCandles: 720 },
  "4h": { range: "3mo", interval: "1h", maxCandles: 720 },
  "1d": { range: "1y", interval: "1d", maxCandles: 365 },
  "1w": { range: "5y", interval: "1wk", maxCandles: 260 },
  "1mo": { range: "10y", interval: "1mo", maxCandles: 180 },
} as const;`;

const newRangeCfg = `export const rangeConfig = {
  "15m": { range: "7d", interval: "15m", maxCandles: 672 },
  "1h": { range: "3mo", interval: "1h", maxCandles: 1400 },
  "4h": { range: "6mo", interval: "1h", maxCandles: 1400 },
  "1d": { range: "2y", interval: "1d", maxCandles: 730 },
  "1w": { range: "5y", interval: "1wk", maxCandles: 520 },
  "1mo": { range: "10y", interval: "1mo", maxCandles: 240 },
} as const;`;

if (content.includes(oldRangeCfg)) {
  content = content.replace(oldRangeCfg, newRangeCfg);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated rangeConfig with 2 years and more candles!');
} else {
  console.log('oldRangeCfg pattern not matched directly');
}
