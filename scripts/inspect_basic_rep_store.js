const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-basic-report-store.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('audit-basic-report-store length:', content.length);
console.log(content.slice(0, 1500));
