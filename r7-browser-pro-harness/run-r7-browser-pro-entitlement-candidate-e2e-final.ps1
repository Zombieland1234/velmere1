$ErrorActionPreference = 'Stop'

$SourcePath = Join-Path $PSScriptRoot 'run-r7-browser-pro-entitlement-candidate-e2e-v3.ps1'
$RuntimePath = Join-Path $env:RUNNER_TEMP 'run-r7-browser-pro-entitlement-candidate-e2e-final-runtime.ps1'
$Text = Get-Content -LiteralPath $SourcePath -Raw
$Pairs = @(
  @{ Old = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-pro-e2e-oidc'; New = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-pro-e2e-final-oidc'; Label = 'helper' },
  @{ Old = "`$Audience = 'velmere-r7-browser-pro-e2e'"; New = "`$Audience = 'velmere-r7-browser-pro-e2e-final'"; Label = 'audience' }
)
foreach ($Pair in $Pairs) {
  $Count = ([regex]::Matches($Text, [regex]::Escape([string]$Pair.Old))).Count
  if ($Count -ne 1) { throw "browser_pro_final_wrapper_anchor_mismatch:$($Pair.Label):$Count" }
  $Text = $Text.Replace([string]$Pair.Old, [string]$Pair.New)
}
[IO.File]::WriteAllText($RuntimePath, $Text, [Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $RuntimePath
if ($LASTEXITCODE -ne 0) { throw "browser_pro_final_e2e_failed:$LASTEXITCODE" }

$Audience = 'velmere-r7-browser-pro-e2e-final'
$Separator = if ($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')) { '&' } else { '?' }
$TokenUri = $env:ACTIONS_ID_TOKEN_REQUEST_URL + $Separator + 'audience=' + [Uri]::EscapeDataString($Audience)
$Oidc = [string](Invoke-RestMethod -Method Get -Uri $TokenUri -Headers @{ Authorization = 'Bearer ' + $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN } -TimeoutSec 20).value
if ($Oidc.Split('.').Count -ne 3) { throw 'browser_pro_final_record_oidc_missing' }
Write-Host "::add-mask::$Oidc"
$Work = Join-Path (Get-Location).Path 'r7-work'
$E2ePath = Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_ENTITLEMENT_CANDIDATE_E2E.json'
$PatchPath = Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_ENTITLEMENT_PATCH_RECEIPT.json'
if (-not (Test-Path -LiteralPath $E2ePath -PathType Leaf)) { throw 'browser_pro_final_e2e_receipt_missing' }
if (-not (Test-Path -LiteralPath $PatchPath -PathType Leaf)) { throw 'browser_pro_final_patch_receipt_missing' }
$E2e = Get-Content -LiteralPath $E2ePath -Raw | ConvertFrom-Json -Depth 40
$Patch = Get-Content -LiteralPath $PatchPath -Raw | ConvertFrom-Json -Depth 40
$Body = @{ action = 'record'; e2eReceipt = $E2e; patchReceipt = $Patch } | ConvertTo-Json -Depth 50 -Compress
$Response = Invoke-WebRequest -Method Post -Uri 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-pro-e2e-final-oidc' -Headers @{ Authorization = 'Bearer ' + $Oidc; Accept = 'application/json' } -ContentType 'application/json' -Body $Body -SkipHttpErrorCheck -TimeoutSec 45
if ([int]$Response.StatusCode -ne 200) { throw "browser_pro_final_record_http_$([int]$Response.StatusCode):$(([string]$Response.Content).Substring(0,[Math]::Min(400,([string]$Response.Content).Length)))" }
$Recorded = $Response.Content | ConvertFrom-Json -Depth 30
if ($Recorded.ok -ne $true -or $Recorded.recorded -ne $true) { throw 'browser_pro_final_record_contract_failed' }
$Recorded | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_CANDIDATE_EVIDENCE_RECORD.json') -Encoding utf8
Write-Host 'Browser Pro canonical candidate evidence recorded append-only.'
