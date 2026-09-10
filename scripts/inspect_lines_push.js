const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/render-pro-audit-pdf.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('lines.push(') && (l.includes('VERDICT') || l.includes('FINDINGS') || l.includes('AUDIT') || l.includes('PRZEGLĄD'))) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
