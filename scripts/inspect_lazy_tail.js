const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/lazy-route-dispatch.ts';
const content = fs.readFileSync(file, 'utf8');
console.log(content.slice(content.length - 1500));
