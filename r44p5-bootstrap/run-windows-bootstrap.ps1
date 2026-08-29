$ErrorActionPreference = 'Stop'
$expectedLock = $env:EXPECTED_LOCK_SHA256
if (-not $expectedLock) { throw 'missing EXPECTED_LOCK_SHA256' }
if ((node --version).Trim() -ne 'v24.18.0') { throw 'Node version mismatch' }
npm install --global 'npm@11.16.0'
if ((npm --version).Trim() -ne '11.16.0') { throw 'npm version mismatch' }
node --version | Set-Content node-version-windows.txt
npm --version | Set-Content npm-version-windows.txt
$node = (Get-Command node).Source
$npm = (Get-Command npm).Source
$node | Set-Content node-path-windows.txt
$npm | Set-Content npm-path-windows.txt
(Get-FileHash -Algorithm SHA256 -LiteralPath $node).Hash.ToLowerInvariant() | Set-Content node-executable-sha256-windows.txt
(Get-FileHash -Algorithm SHA256 -LiteralPath $npm).Hash.ToLowerInvariant() | Set-Content npm-launcher-sha256-windows.txt
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath package-lock.json).Hash.ToLowerInvariant()
"$actual  package-lock.json" | Set-Content package-lock-sha256-windows.txt
if ($actual -eq $expectedLock) { 'LOCK_MATCH=true' | Set-Content lock-comparison-windows.env } else { 'LOCK_MATCH=false' | Set-Content lock-comparison-windows.env; "$expectedLock  expected-r44p4-package-lock.json" | Set-Content expected-lock-sha256-windows.txt }
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm ci --ignore-scripts --no-audit --no-fund *> npm-ci-ignore-scripts-windows.log
npm ls --all --json | Set-Content npm-ls-ignore-scripts-windows.json
node -e "const x=require('./npm-ls-ignore-scripts-windows.json');if(x.problems?.length){console.error(x.problems);process.exit(1)}"
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm ci --no-audit --no-fund *> npm-ci-windows.log
npm ls --all --json | Set-Content npm-ls-windows.json
node -e "const x=require('./npm-ls-windows.json');if(x.problems?.length){console.error(x.problems);process.exit(1)}"
cmd /c "npm audit --omit=dev --json > npm-audit-production-windows.json"; if ($LASTEXITCODE -gt 1) { throw 'npm production audit command failed' }
cmd /c "npm audit --json > npm-audit-all-windows.json"; if ($LASTEXITCODE -gt 1) { throw 'npm full audit command failed' }
@'
const fs=require('node:fs');const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));const rows=[];for(const [path,meta] of Object.entries(lock.packages||{}))if(path&&meta?.hasInstallScript)rows.push({path,version:meta.version||null,resolved:meta.resolved||null,integrity:meta.integrity||null});rows.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync('lifecycle-script-packages-windows.json',JSON.stringify({count:rows.length,rows},null,2)+'\n');
'@ | node
npx playwright install chromium
@'
const fs=require('node:fs'),crypto=require('node:crypto');const{chromium}=require('playwright');(async()=>{const exe=chromium.executablePath(),b=fs.readFileSync(exe),browser=await chromium.launch({headless:true}),version=browser.version();await browser.close();fs.writeFileSync('chromium-identity-windows.json',JSON.stringify({playwrightVersion:require('playwright/package.json').version,executablePath:exe,executableSha256:crypto.createHash('sha256').update(b).digest('hex'),browserVersion:version},null,2)+'\n');})().catch(e=>{console.error(e);process.exit(1)});
'@ | node
$runtimeRoot = Split-Path -Parent $node
$runtimeRoot | Set-Content runtime-root-windows.txt
$seven = (Get-Command 7z).Source
& $seven a -tzip -mx=7 exact-node-24.18.0-npm-11.16.0-windows-x64.zip "$runtimeRoot\*" | Out-Null
& $seven a -tzip -mx=7 exact-node-modules-r44p4-windows-x64.zip '.\node_modules\*' | Out-Null
& $seven a -tzip -mx=7 exact-playwright-chromium-1.60.0-windows-x64.zip "$env:PLAYWRIGHT_BROWSERS_PATH\*" | Out-Null
$rows=@()
Get-ChildItem exact-*.zip | Sort-Object Name | ForEach-Object { $rows += [ordered]@{name=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()} }
[ordered]@{node='24.18.0';npm='11.16.0';expectedLockSha256=$expectedLock;generatedLockSha256=$actual;lockMatchesExpected=($actual -eq $expectedLock);bundles=$rows} | ConvertTo-Json -Depth 5 | Set-Content EXACT_WINDOWS_BOOTSTRAP_MANIFEST.json
$rows | ForEach-Object { "$($_.sha256)  $($_.name)" } | Set-Content exact-windows-bundles-sha256.txt
