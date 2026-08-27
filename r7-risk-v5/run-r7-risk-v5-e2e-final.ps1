$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-e2e.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-e2e-final-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$Old = "  & pwsh -NoProfile -File (Join-Path `$Root 'r7-risk-v5/run-r7-risk-v5-source.ps1') -Mode Prepare"
$New = "  & pwsh -NoProfile -File (Join-Path `$Root 'r7-risk-v5/run-r7-risk-v5-source-execution-slice-fixed.ps1') -Mode Prepare"
if (([regex]::Matches($Text,[regex]::Escape($Old))).Count -ne 1) {
  throw 'risk_v5_e2e_prepare_anchor_mismatch'
}
$Text = $Text.Replace($Old,$New)
[IO.File]::WriteAllText($Fixed,$Text,[Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
