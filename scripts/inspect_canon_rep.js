const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-canonical-report.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('audit-canonical-report.ts length:', content.length);
console.log(content.slice(0, 1500));
