$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-audit-basic-bridge-e2e-v2.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-audit-basic-bridge-e2e-v2-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

$Repairs = @(
  @{ Broken = 'return[pscustomobject]@{'; Correct = 'return [pscustomobject]@{'; Label = 'return_syntax' },
  @{ Broken = '$ReadA.Body.data.account_id'; Correct = '$ReadA.Body.data.accountId'; Label = 'case_account_schema' }
)
foreach ($Repair in $Repairs) {
  $Count = ([regex]::Matches($Text, [regex]::Escape([string]$Repair.Broken))).Count
  if ($Count -ne 1) { throw "audit_bridge_v2_$($Repair.Label)_anchor_mismatch:$Count" }
  $Text = $Text.Replace([string]$Repair.Broken, [string]$Repair.Correct)
}

$ReadAnchor = '  $ReadA=Invoke-JsonPost $BridgeUrl $AHeaders @{schemaVersion=''velmere.r7.audit-basic-customer-bridge-request.v1'';action=''get_case'';caseRef=$CaseRef}'
$ReadReplacement = '  $CaseRef=[string]$Created.Body.data.caseRef' + "`n" + $ReadAnchor
$ReadCount = ([regex]::Matches($Text, [regex]::Escape($ReadAnchor))).Count
if ($ReadCount -ne 1) { throw "audit_bridge_v2_canonical_case_ref_anchor_mismatch:$ReadCount" }
$Text = $Text.Replace($ReadAnchor, $ReadReplacement)

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
