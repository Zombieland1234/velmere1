const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/lazy-route-dispatch.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('catch (error)');
console.log(content.slice(idx, idx + 800));
