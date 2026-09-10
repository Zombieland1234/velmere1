const fs = require('fs');
const path = require('path');

function scan(dir) {
  let issues = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      issues = issues.concat(scan(full));
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.jsx')) {
      const c = fs.readFileSync(full, 'utf8');
      const r = /<a\s+[^>]*target=["']_blank["'][^>]*>/gi;
      let m;
      while ((m = r.exec(c)) !== null) {
        if (!m[0].includes('rel=') || (!m[0].includes('noopener') && !m[0].includes('noreferrer'))) {
          issues.push({ file: full, tag: m[0] });
        }
      }
    }
  }
  return issues;
}

const bad = scan('.');
console.log('Total unsafe target blank:', bad.length);
bad.forEach(b => console.log(b.file, b.tag));
