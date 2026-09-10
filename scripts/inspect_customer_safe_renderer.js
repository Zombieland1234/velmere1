const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/customer-safe-renderer.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('customer-safe-renderer length:', content.length);
console.log(content.slice(0, 1500));
