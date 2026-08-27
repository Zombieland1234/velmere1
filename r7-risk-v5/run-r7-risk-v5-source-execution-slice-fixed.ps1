param(
  [ValidateSet('Prepare','Full')]
  [string]$Mode = 'Full'
)
$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-source.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-source-execution-slice-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# The Risk overlay is a full-source patch, while r7-work is the smaller execution slice.
# These two identity files intentionally live only in the full source tree. Ignore only
# those paths during slice application; the resulting execution manifest, aggregate,
# dependency hashes and deterministic bundle are still verified fail-closed afterwards.
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

# Repair four legacy command-style SHA calls. PowerShell functions are invoked with
# whitespace, not JavaScript-style parentheses; the old form becomes a parser error
# when it follows a boolean operator.
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

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed -Mode $Mode
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
