const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/customer-safe-renderer.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('export function planCustomerSafePdf');
console.log(content.slice(idx, idx + 1800));
