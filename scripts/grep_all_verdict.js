const fs = require('fs');
const files = [
  'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-report-customer-projection.ts',
  'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-basic-report-store.ts',
  'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-report-assembler.ts',
  'C:/Users/marci/Desktop/Nowy folder/components/security/SecurityAuditsCleanPage.tsx'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const txt = fs.readFileSync(f, 'utf8');
    if (txt.includes('VERDICT SUMMARY:') || txt.includes('PRZEGLĄD AUDYTU') || txt.includes('Floating Pragma')) {
      console.log('Found in:', f);
    }
  }
});
