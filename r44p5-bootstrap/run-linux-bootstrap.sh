#!/usr/bin/env bash
set -euo pipefail

EXPECTED_LOCK_SHA256="${EXPECTED_LOCK_SHA256:?missing EXPECTED_LOCK_SHA256}"
EXPECTED_NODE="${EXPECTED_NODE:-v24.18.0}"
EXPECTED_NPM="${EXPECTED_NPM:-11.16.0}"
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:?missing PLAYWRIGHT_BROWSERS_PATH}"
export PLAYWRIGHT_BROWSERS_PATH

npm install --global 'npm@11.16.0'
test "$(node --version)" = "$EXPECTED_NODE"
test "$(npm --version)" = "$EXPECTED_NPM"
node --version > node-version.txt
npm --version > npm-version.txt
command -v node > node-path.txt
command -v npm > npm-path.txt
sha256sum "$(command -v node)" > node-executable-sha256.txt
sha256sum "$(command -v npm)" > npm-launcher-sha256.txt

rm -f package-lock.json
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
ACTUAL="$(sha256sum package-lock.json | awk '{print $1}')"
printf '%s  package-lock.json\n' "$ACTUAL" > package-lock-sha256.txt
if test "$ACTUAL" = "$EXPECTED_LOCK_SHA256"; then
  echo 'LOCK_MATCH=true' > lock-comparison.env
else
  echo 'LOCK_MATCH=false' > lock-comparison.env
  printf '%s  expected-r44p4-package-lock.json\n' "$EXPECTED_LOCK_SHA256" > expected-lock-sha256.txt
fi

rm -rf node_modules
npm ci --ignore-scripts --no-audit --no-fund 2>npm-ci-ignore-scripts.stderr.log | tee npm-ci-ignore-scripts.stdout.log
npm ls --all --json > npm-ls-ignore-scripts.json
node -e "const x=require('./npm-ls-ignore-scripts.json');if(x.problems?.length){console.error(x.problems);process.exit(1)}"

rm -rf node_modules
npm ci --no-audit --no-fund 2>npm-ci.stderr.log | tee npm-ci.stdout.log
npm ls --all --json > npm-ls.json
node -e "const x=require('./npm-ls.json');if(x.problems?.length){console.error(x.problems);process.exit(1)}"
npm audit --omit=dev --json > npm-audit-production.json || true
npm audit --json > npm-audit-all.json || true
node - <<'NODE'
const fs=require('node:fs');
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const rows=[];
for(const [path,meta] of Object.entries(lock.packages||{})) if(path&&meta?.hasInstallScript) rows.push({path,version:meta.version||null,resolved:meta.resolved||null,integrity:meta.integrity||null});
rows.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync('lifecycle-script-packages.json',JSON.stringify({count:rows.length,rows},null,2)+'\n');
NODE

npx playwright install chromium
node - <<'NODE'
const fs=require('node:fs');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
(async()=>{const exe=chromium.executablePath();const b=fs.readFileSync(exe);const browser=await chromium.launch({headless:true});const version=browser.version();await browser.close();fs.writeFileSync('chromium-identity.json',JSON.stringify({playwrightVersion:require('playwright/package.json').version,executablePath:exe,executableSha256:crypto.createHash('sha256').update(b).digest('hex'),browserVersion:version},null,2)+'\n');})().catch(e=>{console.error(e);process.exit(1)});
NODE

RUNTIME_ROOT="$(dirname "$(dirname "$(readlink -f "$(command -v node)")")")"
echo "$RUNTIME_ROOT" > runtime-root.txt
tar --sort=name --mtime='UTC 2026-08-02' --owner=0 --group=0 --numeric-owner -czf exact-node-24.18.0-npm-11.16.0-linux-x64.tar.gz -C "$RUNTIME_ROOT" .
tar --sort=name --mtime='UTC 2026-08-02' --owner=0 --group=0 --numeric-owner -czf exact-node-modules-r44p4-linux-x64.tar.gz node_modules
tar --sort=name --mtime='UTC 2026-08-02' --owner=0 --group=0 --numeric-owner -czf exact-playwright-chromium-1.60.0-linux-x64.tar.gz -C "$PLAYWRIGHT_BROWSERS_PATH" .
sha256sum exact-*.tar.gz > exact-bundles-sha256.txt
python - <<'PY'
from pathlib import Path
import hashlib,json,os
rows=[]
for p in sorted(Path('.').glob('exact-*.tar.gz')):
    b=p.read_bytes(); rows.append({'name':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
actual=Path('package-lock-sha256.txt').read_text().split()[0]
expected=os.environ['EXPECTED_LOCK_SHA256']
Path('EXACT_BOOTSTRAP_MANIFEST.json').write_text(json.dumps({'node':'24.18.0','npm':'11.16.0','expectedLockSha256':expected,'generatedLockSha256':actual,'lockMatchesExpected':actual==expected,'bundles':rows},indent=2,sort_keys=True)+'\n')
PY
