$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-audit-basic-lifecycle-e2e-current.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-audit-basic-lifecycle-e2e-current-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$Broken = 'return[pscustomobject]@{'
$Correct = 'return [pscustomobject]@{'
$Count = ([regex]::Matches($Text, [regex]::Escape($Broken))).Count
if ($Count -ne 1) { throw "audit_lifecycle_return_anchor_mismatch:$Count" }
$Text = $Text.Replace($Broken, $Correct)
[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
