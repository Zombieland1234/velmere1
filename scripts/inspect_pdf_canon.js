const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-canonical-report.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('renderCanonicalReportToPdf') || l.includes('buildCustomerSafeMinimalPdf') || l.includes('buildPdfLines')) {
    console.log(lines.slice(i, i + 45).join('\n'));
  }
});

