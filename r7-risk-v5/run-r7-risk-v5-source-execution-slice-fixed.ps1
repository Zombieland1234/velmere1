param(
  [ValidateSet('Prepare','Full')]
  [string]$Mode = 'Full'
)
$ErrorActionPreference = 'Stop'

# Every caller of this runner must use the same hash-bound constants as the
# already-green exact manifest probe. Load them from the checked-in workflow
# when a narrower caller (for example the final 52x2 workflow) did not repeat
# the full environment block. Existing explicit values are never overwritten.
$Root = (Get-Location).Path
$ProbePath = Join-Path $Root '.github/workflows/r7-risk-v5-manifest-probe.yml'
if (-not (Test-Path -LiteralPath $ProbePath -PathType Leaf)) {
  throw 'risk_v5_manifest_probe_environment_source_missing'
}
$ProbeText = [IO.File]::ReadAllText($ProbePath, [Text.Encoding]::UTF8)
$Pairs = [regex]::Matches($ProbeText, "(?m)^      ([A-Z0-9_]+): '([^']*)'\s*$")
if ($Pairs.Count -lt 30) {
  throw "risk_v5_manifest_probe_environment_incomplete:$($Pairs.Count)"
}
foreach ($Pair in $Pairs) {
  $Name = [string]$Pair.Groups[1].Value
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, 'Process'))) {
    [Environment]::SetEnvironmentVariable($Name, [string]$Pair.Groups[2].Value, 'Process')
  }
}
foreach ($Name in @(
  'R7_CANDIDATE',
  'R7_PROMOTED_EXECUTION_SLICE_MANIFEST_SHA256',
  'R7_V4_EXECUTION_SLICE_MANIFEST_SHA256',
  'R7_V4_EXECUTION_SLICE_AGGREGATE_SHA256',
  'R7_V4_FULL_SOURCE_AGGREGATE_SHA256',
  'R7_V4_FULL_SOURCE_MANIFEST_SHA256',
  'R7_RISK_PATCH_RECEIPT_SHA256',
  'R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256',
  'R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256',
  'R7_RISK_FULL_SOURCE_AGGREGATE_SHA256',
  'R7_RISK_FULL_SOURCE_MANIFEST_SHA256',
  'R7_RISK_BUNDLE_SHA256',
  'R7_PACKAGE_JSON_SHA256',
  'R7_PACKAGE_LOCK_SHA256'
)) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, 'Process'))) {
    throw "risk_v5_required_environment_missing:$Name"
  }
}

$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-source.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-source-execution-slice-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# The Risk overlay is a full-source patch, while r7-work is the smaller execution slice.
# Two identity files intentionally live only in the full source tree. Ignore only those
# paths during slice application, then deterministically regenerate the execution
# manifest/TSV and require the exact target aggregate, payload and manifest SHA.
$OldCheck = 'git -c core.autocrlf=false apply --check --no-index $PatchPath'
$NewCheck = 'git -c core.autocrlf=false apply --check --no-index --exclude=VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv --exclude=artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json $PatchPath'
$OldApply = 'git -c core.autocrlf=false apply --no-index $PatchPath'
$NewApply = 'git -c core.autocrlf=false apply --no-index --exclude=VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv --exclude=artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json $PatchPath'

if (([regex]::Matches($Text, [regex]::Escape($OldCheck))).Count -ne 1) {
  throw 'risk_v5_source_patch_check_anchor_mismatch'
}
if (([regex]::Matches($Text, [regex]::Escape($OldApply))).Count -ne 1) {
  throw 'risk_v5_source_patch_apply_anchor_mismatch'
}
$Text = $Text.Replace($OldCheck, $NewCheck).Replace($OldApply, $NewApply)

# Repair four legacy command-style SHA calls.
$ShaRepairs = @(
  @{ Old = 'Sha256($ReceiptPath)'; New = '(Sha256 $ReceiptPath)'; Label = 'receipt' },
  @{ Old = 'Sha256($Chunk)'; New = '(Sha256 $Chunk)'; Label = 'chunk' },
  @{ Old = 'Sha256($GzipPath)'; New = '(Sha256 $GzipPath)'; Label = 'gzip' },
  @{ Old = 'Sha256($PatchPath)'; New = '(Sha256 $PatchPath)'; Label = 'patch' }
)
foreach ($Repair in $ShaRepairs) {
  $Count = ([regex]::Matches($Text, [regex]::Escape([string]$Repair.Old))).Count
  if ($Count -ne 1) { throw "risk_v5_source_sha_call_anchor_mismatch:$($Repair.Label):$Count" }
  $Text = $Text.Replace([string]$Repair.Old, [string]$Repair.New)
}

$RegenerationAnchor = "  Assert-Exit 'Risk v5 patch apply'`n} finally { Pop-Location }`n`n# Verify every exact target byte and dependency/source binding."
$RegenerationBlock = "  Assert-Exit 'Risk v5 patch apply'`n} finally { Pop-Location }`n`n& node (Join-Path `$Root 'r7-risk-v5/regenerate-risk-v5-execution-manifest.mjs') `$Work `$ReceiptPath`nAssert-Exit 'Risk v5 execution manifest regeneration'`n`n# Verify every exact target byte and dependency/source binding."
$AnchorCount = ([regex]::Matches($Text, [regex]::Escape($RegenerationAnchor))).Count
if ($AnchorCount -ne 1) { throw "risk_v5_manifest_regeneration_anchor_mismatch:$AnchorCount" }
$Text = $Text.Replace($RegenerationAnchor, $RegenerationBlock)

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed -Mode $Mode
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
