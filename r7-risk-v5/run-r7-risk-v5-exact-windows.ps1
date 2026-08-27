param(
  [ValidateSet('Prepare','Full')]
  [string]$Mode = 'Full'
)
$ErrorActionPreference = 'Stop'

# Canonical Risk v5 entrypoint. The slice-safe source runner performs:
# exact v4 reconstruction -> Risk overlay -> deterministic manifest regeneration ->
# exact byte verification -> pinned npm lifecycle -> builds -> 52/52 x2 -> bundle rebuild.
$Runner = Join-Path $PSScriptRoot 'run-r7-risk-v5-source-execution-slice-fixed.ps1'
if (-not (Test-Path -LiteralPath $Runner -PathType Leaf)) {
  throw 'risk_v5_slice_safe_runner_missing'
}
& pwsh -NoProfile -File $Runner -Mode $Mode
if ($LASTEXITCODE -ne 0) {
  throw "risk_v5_slice_safe_runner_failed:$LASTEXITCODE"
}
