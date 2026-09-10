const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/customer-safe-renderer.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(450, 485).join('\n'));
