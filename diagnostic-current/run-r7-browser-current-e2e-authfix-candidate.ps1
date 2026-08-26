$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-browser-current-e2e.ps1'
$Candidate = Join-Path $env:RUNNER_TEMP 'run-r7-browser-current-e2e-authfix-candidate-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# Keep transport semantics identical to the verified exact-Windows runner.
$OldCheck = 'git apply --check --no-index $PatchPath'
$NewCheck = 'git -c core.autocrlf=false apply --check --no-index $PatchPath'
$OldApply = 'git apply --no-index $PatchPath'
$NewApply = 'git -c core.autocrlf=false apply --no-index $PatchPath'
$OldBase = "$env:R7_E2E_BASE_URL = 'http://127.0.0.1:3100'"
$NewBase = "$env:R7_E2E_BASE_URL = 'http://localhost:3100'"
$InjectionAnchor = '  # Materialize exact licensed PDF font outside source authority.'

foreach ($Pair in @(
  @{ Old = $OldCheck; New = $NewCheck; Label = 'patch check' },
  @{ Old = $OldApply; New = $NewApply; Label = 'patch apply' },
  @{ Old = $OldBase; New = $NewBase; Label = 'base url' }
)) {
  if (([regex]::Matches($Text, [regex]::Escape([string]$Pair.Old))).Count -ne 1) {
    throw "candidate wrapper anchor mismatch: $($Pair.Label)"
  }
  $Text = $Text.Replace([string]$Pair.Old, [string]$Pair.New)
}
if (([regex]::Matches($Text, [regex]::Escape($InjectionAnchor))).Count -ne 1) {
  throw 'candidate wrapper hotfix injection anchor mismatch'
}

$PatchScript = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'patch-basic-paid-guard-auth-nonce-candidate.mjs')).Path
$HotfixBlock = @"
  # Candidate-only validation. Exact current bytes were verified immediately above.
  # Modify only the disposable workflow workspace; this is not current-source FINAL evidence.
  `$PolicyPath = Join-Path `$Work 'lib/commerce/vlm-advanced-only-access-policy.ts'
  & node '$PatchScript' `$PolicyPath
  if (`$LASTEXITCODE -ne 0) { throw "Basic paid-guard auth-nonce candidate patch failed: `$LASTEXITCODE" }
  `$env:R7_E2E_HOTFIX_CANDIDATE = 'basic_paid_guard_auth_nonce_fix_v1'
"@

$Text = $Text.Replace($InjectionAnchor, $HotfixBlock + "`r`n" + $InjectionAnchor)
Set-Content -LiteralPath $Candidate -Value $Text -Encoding utf8

& $Candidate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Reclassify generated evidence so this candidate can never masquerade as exact-current-byte FINAL proof.
$ReceiptPath = Join-Path (Join-Path (Get-Location).Path 'r7-work') 'R7_BROWSER_BASIC_CURRENT_SUCCESSOR_ZERO_VERCEL_E2E.json'
if (-not (Test-Path -LiteralPath $ReceiptPath -PathType Leaf)) { throw 'candidate_e2e_receipt_missing' }
$Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
$Receipt.status = 'PASS_BROWSER_BASIC_AUTH_NONCE_FIX_CANDIDATE_E2E_NOT_CURRENT_BYTES'
$Receipt.customerFinalCredit = $false
$Receipt | Add-Member -NotePropertyName hotfixCandidate -NotePropertyValue 'basic_paid_guard_auth_nonce_fix_v1' -Force
$Receipt | Add-Member -NotePropertyName exactCurrentSourceBytesAtProductExecution -NotePropertyValue $false -Force
$Receipt | Add-Member -NotePropertyName promotionRequiredBeforeFinal -NotePropertyValue $true -Force
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding utf8
Write-Host 'Browser Basic candidate E2E PASS. Current-source FINAL credit remains forbidden until the fix is promoted and exact Windows/source authority are re-bound.'
