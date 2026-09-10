const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/shield-basic-delivery-policy.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('payloadRequiresEvidenceWithheld')) {
    console.log(lines.slice(i, i + 30).join('\n'));
  }
});
