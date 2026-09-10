const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/ai/angel-prompt-contract.ts';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('angel-prompt-contract has velmere141@gmail.com:', content.includes('velmere141@gmail.com'));
}
