import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = path.resolve('p41-runtime');
const parts = Array.from({ length: 7 }, (_, index) =>
  path.join(base, `payload.part-${String(index).padStart(2, '0')}`),
);

for (const file of parts) {
  if (!fs.existsSync(file)) throw new Error(`Missing exact payload part: ${file}`);
}

const base64 = parts
  .map((file) => fs.readFileSync(file, 'utf8').trim())
  .join('');
const compressed = Buffer.from(base64, 'base64');
const digest = crypto.createHash('sha256').update(compressed).digest('hex');
const expectedDigest = '5b1423b61d346fdbff9d92c0ce4f30be40357f8edb09f36bf77e44025acdb061';

if (digest !== expectedDigest) {
  throw new Error(`Exact P40 payload SHA mismatch before runner: ${digest}`);
}

const runnerPath = path.join(base, 'run-p41.mjs');
let runner = fs.readFileSync(runnerPath, 'utf8');
const oldDigest = '146d08dac1402bd8e344ec56047868adc018e16535000bc6354c19a4fc88453a';
if (!runner.includes(oldDigest)) {
  throw new Error('Runner compressed-payload digest binding was not found');
}
runner = runner.replace(oldDigest, expectedDigest);
fs.writeFileSync(runnerPath, runner, 'utf8');

await import('./run-p41.mjs');
