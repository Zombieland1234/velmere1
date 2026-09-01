[CmdletBinding()]
param(
  [string]$TransportRoot = $PSScriptRoot,
  [string]$CloneRoot = (Join-Path $env:GITHUB_WORKSPACE 'p45-exact-source'),
  [string]$ReceiptRoot = (Join-Path $env:GITHUB_WORKSPACE 'p45-win-result')
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $ReceiptRoot | Out-Null
$manifest = Join-Path $TransportRoot 'P45_BUNDLE_CHUNK_MANIFEST.json'
$bundle = Join-Path $env:RUNNER_TEMP 'p43-current-source.bundle'
python (Join-Path $TransportRoot 'reassemble-source-bundle.py') --manifest $manifest --output $bundle
$bundleSha = (Get-FileHash $bundle -Algorithm SHA256).Hash.ToLowerInvariant()
if ($bundleSha -ne '9b60d92263abd093e9110b0b453bbe61aacfc85d02dd61525045007196ac880f') { throw "Bundle SHA mismatch: $bundleSha" }
git bundle verify $bundle
git config --global core.longpaths true
if (Test-Path $CloneRoot) { Remove-Item -Recurse -Force $CloneRoot }
git -c core.autocrlf=false -c core.eol=lf -c core.filemode=false -c core.longpaths=true clone --no-hardlinks $bundle $CloneRoot
git -C $CloneRoot config core.autocrlf false
git -C $CloneRoot config core.eol lf
git -C $CloneRoot config core.filemode false
git -C $CloneRoot config core.longpaths true
git -C $CloneRoot checkout --force 90021b3afdd56828db2baa1b88f249307dd6ad2e
$head = (git -C $CloneRoot rev-parse HEAD).Trim()
if ($head -ne '90021b3afdd56828db2baa1b88f249307dd6ad2e') { throw "Exact source commit mismatch: $head" }
python (Join-Path $TransportRoot 'verify-git-bundle-source.py') --root $CloneRoot --identity (Join-Path $TransportRoot 'p43-source-identity.json') --output (Join-Path $ReceiptRoot 'P45_EXACT_WINDOWS_SOURCE_TRANSPORT_IDENTITY.json') --expected-commit 90021b3afdd56828db2baa1b88f249307dd6ad2e
python (Join-Path $TransportRoot 'audit-windows-paths.py') --identity (Join-Path $TransportRoot 'p43-source-identity.json') --output (Join-Path $ReceiptRoot 'P45_EXACT_WINDOWS_PATH_COMPATIBILITY.json')
