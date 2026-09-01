[CmdletBinding()]
param(
  [string]$TransportRoot = $PSScriptRoot,
  [string]$CloneRoot = (Join-Path $env:GITHUB_WORKSPACE 'p46-exact-source'),
  [string]$ReceiptRoot = (Join-Path $env:GITHUB_WORKSPACE 'p46-win-result')
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $ReceiptRoot | Out-Null
$manifest = Join-Path $TransportRoot 'P46_BUNDLE_CHUNK_MANIFEST.json'
$bundle = Join-Path $env:RUNNER_TEMP 'p46-current-source.bundle'
python (Join-Path $TransportRoot 'reassemble-source-bundle.py') --manifest $manifest --output $bundle
$bundleSha = (Get-FileHash $bundle -Algorithm SHA256).Hash.ToLowerInvariant()
if ($bundleSha -ne '8b3000e19d78acb05b75facf442352b55e7e49cb7af76c64261f72c949c07b55') { throw "Bundle SHA mismatch: $bundleSha" }
git bundle verify $bundle
git config --global core.longpaths true
if (Test-Path $CloneRoot) { Remove-Item -Recurse -Force $CloneRoot }
git -c core.autocrlf=false -c core.eol=lf -c core.filemode=false -c core.longpaths=true clone --no-hardlinks $bundle $CloneRoot
git -C $CloneRoot config core.autocrlf false
git -C $CloneRoot config core.eol lf
git -C $CloneRoot config core.filemode false
git -C $CloneRoot config core.longpaths true
git -C $CloneRoot checkout --force 2d37f3c711aaf63b7f263971fccc93c5748f654e
$actualHead = (git -C $CloneRoot rev-parse HEAD).Trim()
if ($actualHead -ne '2d37f3c711aaf63b7f263971fccc93c5748f654e') { throw "Exact source commit mismatch: $actualHead" }
python (Join-Path $TransportRoot 'verify-git-bundle-source.py') --root $CloneRoot --identity (Join-Path $TransportRoot 'p46-source-identity.json') --output (Join-Path $ReceiptRoot 'P46_EXACT_WINDOWS_SOURCE_TRANSPORT_IDENTITY.json') --expected-commit 2d37f3c711aaf63b7f263971fccc93c5748f654e
python (Join-Path $TransportRoot 'audit-windows-paths.py') --identity (Join-Path $TransportRoot 'p46-source-identity.json') --output (Join-Path $ReceiptRoot 'P46_EXACT_WINDOWS_PATH_COMPATIBILITY.json')
