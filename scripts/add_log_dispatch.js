const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/lazy-route-dispatch.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `  return handler(request);`;
const replacement = `  try {
    return await handler(request);
  } catch (err) {
    console.error('[lazy-route-dispatch ERROR]', key, err);
    return response({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added error logging to lazy-route-dispatch.ts!');
} else {
  console.log('Target not found in lazy-route-dispatch.ts');
}
