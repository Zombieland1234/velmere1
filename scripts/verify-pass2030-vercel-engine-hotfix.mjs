import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const npmrc = fs.readFileSync('.npmrc', 'utf8');
const nvm = fs.readFileSync('.nvmrc', 'utf8').trim();
const nodeVersion = fs.readFileSync('.node-version', 'utf8').trim();

const checks = [
  ['package node engine accepts Vercel 24.15.0', pkg.engines?.node === '>=24.15.0 <25'],
  ['package npm engine accepts Vercel 11.12.1', pkg.engines?.npm === '>=11.12.0 <12'],
  ['package-lock root node engine patched', lock.packages?.['']?.engines?.node === '>=24.15.0 <25'],
  ['package-lock root npm engine patched', lock.packages?.['']?.engines?.npm === '>=11.12.0 <12'],
  ['.npmrc disables engine strict', /(?:^|\n)engine-strict=false(?:\n|$)/.test(npmrc)],
  ['vercel install forces npm_config_engine_strict=false', vercel.installCommand?.includes('npm_config_engine_strict=false')],
  ['.nvmrc aligned with Vercel actual node', nvm === '24.15.0'],
  ['.node-version aligned with Vercel actual node', nodeVersion === '24.15.0'],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) {
  console.error(`PASS2030 failed ${failed.length} checks`);
  process.exit(1);
}
console.log('PASS2030 Vercel engine hotfix ready.');
