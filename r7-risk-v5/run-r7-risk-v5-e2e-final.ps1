$ErrorActionPreference = 'Stop'

# Reuse the exact constants from the manifest probe that already passed on Windows.
$ProbePath = Join-Path (Get-Location).Path '.github/workflows/r7-risk-v5-manifest-probe.yml'
if (-not (Test-Path -LiteralPath $ProbePath -PathType Leaf)) { throw 'risk_v5_manifest_probe_workflow_missing' }
$ProbeText = [IO.File]::ReadAllText($ProbePath,[Text.Encoding]::UTF8)
$Pairs = [regex]::Matches($ProbeText,"(?m)^      ([A-Z0-9_]+): '([^']*)'\s*$")
foreach ($Pair in $Pairs) {
  [Environment]::SetEnvironmentVariable([string]$Pair.Groups[1].Value,[string]$Pair.Groups[2].Value,'Process')
}
foreach ($Name in @(
  'R7_CANDIDATE','R7_PROMOTED_FILE_COUNT','R7_PROMOTED_PAYLOAD_BYTE_LENGTH',
  'R7_PROMOTED_EXECUTION_SLICE_AGGREGATE_SHA256','R7_PROMOTED_EXECUTION_SLICE_MANIFEST_SHA256',
  'R7_PROMOTED_FULL_SOURCE_AGGREGATE_SHA256','R7_PROMOTED_FULL_SOURCE_MANIFEST_SHA256',
  'R7_FILE_COUNT','R7_PAYLOAD_BYTE_LENGTH','R7_EXECUTION_SLICE_AGGREGATE_SHA256',
  'R7_EXECUTION_SLICE_MANIFEST_SHA256','R7_FULL_SOURCE_AGGREGATE_SHA256','R7_FULL_SOURCE_MANIFEST_SHA256',
  'R7_PACKAGE_JSON_SHA256','R7_PACKAGE_LOCK_SHA256','R7_RISK_PATCH_RECEIPT_SHA256',
  'R7_RISK_FILE_COUNT','R7_RISK_PAYLOAD_BYTE_LENGTH','R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256',
  'R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256','R7_RISK_FULL_SOURCE_AGGREGATE_SHA256',
  'R7_RISK_FULL_SOURCE_MANIFEST_SHA256','R7_RISK_BUNDLE_SHA256'
)) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name,'Process'))) {
    throw "risk_v5_e2e_environment_missing:$Name"
  }
}

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
