import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const allowMissing = process.argv.includes('--allow-missing');
const root = 'test-results/pass1274-runtime-visual-qa';
const minimumBytes = 2048;
const minimumWidth = 96;
const minimumHeight = 40;
const required = [
  { name: 'lens-reader-desktop-eth.png', viewport: 'desktop', route: '/pl/search' },
  { name: 'lens-pdf-frame-desktop-eth.png', viewport: 'desktop', route: '/pl/search' },
  { name: 'lens-reader-mobile-eth.png', viewport: 'mobile', route: '/pl/search' },
  { name: 'header-language-mobile.png', viewport: 'mobile', route: '/pl' },
  { name: 'header-wallet-mobile.png', viewport: 'mobile', route: '/pl' },
  { name: 'header-cart-mobile.png', viewport: 'mobile', route: '/pl' },
  { name: 'shield-unified-modal.png', viewport: 'desktop', route: '/pl/market-integrity' },
  { name: 'real-markets-unified-modal.png', viewport: 'desktop', route: '/pl/market-integrity/cross-asset' },
];

function readPngDimensions(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const checks = required.map((item) => {
  const path = join(root, item.name);
  const sidecarPath = `${path}.json`;
  const exists = existsSync(path);
  const bytes = exists ? statSync(path).size : 0;
  const dimensions = exists ? readPngDimensions(path) : null;
  const sidecar = existsSync(sidecarPath) ? readJson(sidecarPath) : null;
  const sidecarOk = Boolean(
    sidecar &&
      sidecar.pass === 'PASS1314-1333' &&
      sidecar.artifact === item.name &&
      sidecar.route === item.route &&
      sidecar.viewport === item.viewport &&
      typeof sidecar.selector === 'string' &&
      sidecar.selector.length > 8,
  );
  const pngOk = Boolean(
    exists &&
      bytes >= minimumBytes &&
      dimensions &&
      dimensions.width >= minimumWidth &&
      dimensions.height >= minimumHeight,
  );
  return {
    ...item,
    path,
    sidecarPath,
    exists,
    bytes,
    dimensions,
    sidecarOk,
    ok: pngOk && sidecarOk,
  };
});

for (const check of checks) {
  const status = check.ok ? 'PASS' : allowMissing ? 'PENDING' : 'FAIL';
  const size = check.dimensions ? `${check.dimensions.width}x${check.dimensions.height}` : 'no-dimensions';
  const sidecar = check.sidecarOk ? 'sidecar-ok' : 'sidecar-missing-or-invalid';
  console.log(`${status} ${check.name} ${check.exists ? `${check.bytes} bytes ${size} ${sidecar}` : 'missing'}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length && !allowMissing) {
  console.error(`\nPASS1314 Playwright artifact validator failed: ${failed.length}/${checks.length} screenshots missing, too small, invalid PNG, or missing PASS1314 sidecar metadata.`);
  process.exit(1);
}

if (failed.length && allowMissing) {
  console.log(`\nPASS1314 Playwright artifact validator pending: ${failed.length}/${checks.length} screenshots still need browser execution with sidecar metadata.`);
} else {
  console.log(`\nPASS1314 Playwright artifact validator passed: ${checks.length}/${checks.length}`);
}
