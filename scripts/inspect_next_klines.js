const fs = require('fs');
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.includes('kline')) files.push(full);
  }
}
walk('C:/Users/marci/Desktop/Nowy folder/app');
console.log('Kline route files in app:', files);
