param(
  [Parameter(Mandatory=$true)][string]$CleanSourceRoot,
  [Parameter(Mandatory=$true)][string]$EvidenceRoot,
  [Parameter(Mandatory=$true)][string]$ExpectedSourceManifestSha256
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne 'Win32NT') { throw 'Exact Windows release requires Windows.' }
$source = (Resolve-Path -LiteralPath $CleanSourceRoot).Path
$evidence = [IO.Path]::GetFullPath($EvidenceRoot)
if ($evidence.StartsWith($source.TrimEnd('\\') + '\\', [StringComparison]::OrdinalIgnoreCase)) { throw 'EvidenceRoot must be outside SOURCE.' }
if ($ExpectedSourceManifestSha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid source manifest SHA-256.' }
if ($env:STRIPE_SECRET_KEY -like 'sk_live_*' -or $env:STRIPE_PUBLISHABLE_KEY -like 'pk_live_*') { throw 'Live payment keys are forbidden.' }
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$node = (Get-Command node.exe -ErrorAction Stop).Source
$nodeVersion = (& $node --version).TrimStart('v')
if ($nodeVersion -ne '24.18.0') { throw "Expected Node 24.18.0, got $nodeVersion" }
Push-Location $source
try {
  & $node 'scripts/pass36/verify-a102r44p25-source-authority.mjs' | Set-Content -LiteralPath (Join-Path $evidence '01-authority.json') -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw 'Authority failed.' }
  & $node 'scripts/pass13/run-partitioned-eslint.mjs'
  if ($LASTEXITCODE -ne 0) { throw 'ESLint failed.' }
  & $node 'scripts/pass13/run-partitioned-typescript.mjs'
  if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed.' }
  & $node 'scripts/deployment/run-segmented-build.mjs' 'webpack'
  if ($LASTEXITCODE -ne 0) { throw 'Webpack failed.' }
  & $node 'scripts/deployment/run-segmented-build.mjs' 'turbopack'
  if ($LASTEXITCODE -ne 0) { throw 'Turbopack failed.' }
  throw 'ACTION_REQUIRED: run the canonical A60 production smoke/browser orchestration and bind all receipts before credit.'
} finally { Pop-Location }
