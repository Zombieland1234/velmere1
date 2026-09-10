const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/customer-safe-renderer.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('contentObjectIds') || l.includes('BT') || l.includes('ET')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
