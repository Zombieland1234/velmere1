const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/ai/angel-prompt-contract.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('velmere141@gmail.com')) {
  content = content.replace(
    'export const ANGEL_SYSTEM_PROMPT =',
    '// Admin email: velmere141@gmail.com for direct user inquiries and handoff\nexport const ANGEL_SYSTEM_PROMPT ='
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched angel-prompt-contract with velmere141@gmail.com!');
}
