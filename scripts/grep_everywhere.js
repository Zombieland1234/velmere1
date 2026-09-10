const fs = require('fs');
const path = require('path');
function search(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (item === 'node_modules' || item === '.next' || item === '.git' || item === 'artifacts') continue;
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) search(full);
      else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js') || full.endsWith('.mjs')) {
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes('Floating Pragma') || c.includes('Uncached State Variable')) {
          console.log('MATCH:', full);
        }
      }
    } catch {}
  }
}
search('C:/Users/marci/Desktop/Nowy folder');
