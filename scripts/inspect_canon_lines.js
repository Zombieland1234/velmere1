const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-canonical-report.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('function canonicalReportToPdfLines');
console.log(content.slice(idx, idx + 1800));
