$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-audit-basic-lifecycle-e2e-current.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-audit-basic-lifecycle-e2e-current-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

$BrokenReturn = 'return[pscustomobject]@{'
$CorrectReturn = 'return [pscustomobject]@{'
$ReturnCount = ([regex]::Matches($Text, [regex]::Escape($BrokenReturn))).Count
if ($ReturnCount -ne 1) { throw "audit_lifecycle_return_anchor_mismatch:$ReturnCount" }
$Text = $Text.Replace($BrokenReturn, $CorrectReturn)

$BrokenDepth = 'ConvertTo-Json -Depth20'
$CorrectDepth = 'ConvertTo-Json -Depth 20'
$DepthCount = ([regex]::Matches($Text, [regex]::Escape($BrokenDepth))).Count
if ($DepthCount -ne 2) { throw "audit_lifecycle_depth_anchor_mismatch:$DepthCount" }
$Text = $Text.Replace($BrokenDepth, $CorrectDepth)

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
