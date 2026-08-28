param(
  [ValidateSet('Prepare','Full')]
  [string]$Mode = 'Full'
)
$ErrorActionPreference = 'Stop'

# Compatibility entrypoint for callers that still use the older execution-slice
# filename. The canonical exact Windows entrypoint now delegates to the maintained
# slice-safe source runner, so patching its text again would be stale and unsafe.
$Canonical = Join-Path $PSScriptRoot 'run-r7-risk-v5-exact-windows.ps1'
if (-not (Test-Path -LiteralPath $Canonical -PathType Leaf)) {
  throw 'risk_v5_canonical_exact_windows_runner_missing'
}
& pwsh -NoProfile -File $Canonical -Mode $Mode
if ($LASTEXITCODE -ne 0) {
  throw "risk_v5_canonical_exact_windows_runner_failed:$LASTEXITCODE"
}
