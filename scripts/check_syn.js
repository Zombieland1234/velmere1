const { spawnSync } = require('child_process');
const res = spawnSync('node', ['--check', 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/kline-route-handler.ts']);
console.log('stderr:', res.stderr.toString());
console.log('status:', res.status);
