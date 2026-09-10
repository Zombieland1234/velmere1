const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/render-pro-audit-pdf.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('render-pro-audit-pdf length:', content.length);
console.log(content.slice(0, 1500));
