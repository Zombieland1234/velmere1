import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const directory = path.join(process.cwd(), 'p41-runtime');
const orderedParts = [
  'payload.part-00',
  'payload.part-01',
  'payload.part-02',
  'payload.part-03',
  'payload.exact-05',
  'payload.exact-06',
  'payload.exact-07',
  'payload.exact-08',
  'payload.part-06',
];

for (const name of orderedParts) {
  const filePath = path.join(directory, name);
  if (!fs.existsSync(filePath)) throw new Error(`Missing exact payload part: ${name}`);
}

const base64 = orderedParts
  .map((name) => fs.readFileSync(path.join(directory, name), 'utf8'))
  .join('')
  .trim();
const compressed = Buffer.from(base64, 'base64');
const digest = crypto.createHash('sha256').update(compressed).digest('hex');
const expectedDigest = '146d08dac1402bd8e344ec56047868adc018e16535000bc6354c19a4fc88453a';
if (digest !== expectedDigest) {
  throw new Error(`Exact P40 payload SHA mismatch before runner: ${digest}`);
}

for (const name of fs.readdirSync(directory)) {
  if (/^payload\.part-\d+$/.test(name)) {
    fs.renameSync(path.join(directory, name), path.join(directory, `${name}.ignored`));
  }
}
fs.writeFileSync(path.join(directory, 'payload.part-99'), base64, 'utf8');

await import('./run-p41.mjs');
