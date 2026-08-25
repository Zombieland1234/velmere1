$ErrorActionPreference = 'Stop'
$Source = Join-Path $PSScriptRoot 'r7-browser-successor-e2e-v2.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'r7-browser-successor-e2e-v2-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$Text = $Text.Replace('successor_file_sha_mismatch:$Relative:$Observed', 'successor_file_sha_mismatch:${Relative}:$Observed')
Set-Content -LiteralPath $Fixed -Value $Text -Encoding utf8
& $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
