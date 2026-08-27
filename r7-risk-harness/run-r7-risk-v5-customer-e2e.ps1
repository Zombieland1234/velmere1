$ErrorActionPreference = 'Stop'

function Require([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function New-RandomSecret([int]$Bytes = 48) {
  $Buffer = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Fill($Buffer)
  return [Convert]::ToBase64String($Buffer)
}

$Root = (Get-Location).Path
$Work = Join-Path $Root 'r7-work'
Require (Test-Path -LiteralPath $Work -PathType Container) 'risk_exact_source_worktree_missing'
$RiskReceipt = Get-Content -LiteralPath 'r7-risk-v5/R7_RISK_V5_PATCH_RECEIPT.json' -Raw | ConvertFrom-Json
$env:R7_RISK_EXPECTED_FULL_SOURCE_AGGREGATE_SHA256 = [string]$RiskReceipt.target.fullSourceAggregateSha256
$env:R7_RISK_EXPECTED_EXECUTION_SLICE_AGGREGATE_SHA256 = [string]$RiskReceipt.target.executionSliceAggregateSha256
$env:R7_RISK_E2E_BASE_URL = 'http://localhost:3100'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:CI = '1'

# The helper is strict GitHub OIDC and returns only a short-lived server capability.
$Audience = 'velmere-r7-risk-v5-e2e'
$HelperUrl = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-v5-e2e-oidc'
$Separator = if ($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')) { '&' } else { '?' }
$OidcResponse = Invoke-RestMethod -Method Get -Uri ($env:ACTIONS_ID_TOKEN_REQUEST_URL + $Separator + 'audience=' + [Uri]::EscapeDataString($Audience)) -Headers @{ Authorization = 'Bearer ' + $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN } -TimeoutSec 20
$Oidc = [string]$OidcResponse.value
Require ($Oidc.Split('.').Count -eq 3) 'risk_e2e_oidc_missing'
Write-Host "::add-mask::$Oidc"
$Provision = Invoke-RestMethod -Method Post -Uri $HelperUrl -Headers @{ Authorization = 'Bearer ' + $Oidc } -ContentType 'application/json' -Body '{"action":"provision"}' -TimeoutSec 30
Require ($Provision.ok -eq $true) 'risk_e2e_provision_failed'
$Capability = [string]($Provision.riskServerCapability ?? $Provision.serverCapability ?? $Provision.capability)
Require ($Capability.Length -ge 48 -and $Capability.Length -le 256) 'risk_e2e_capability_invalid'
Write-Host "::add-mask::$Capability"

# Discover the exact environment names referenced by the promoted Risk module. This avoids
# inventing configuration names while keeping the values outside source authority.
$RiskModule = Join-Path $Work 'lib/market-integrity/risk-ledger.ts'
Require (Test-Path -LiteralPath $RiskModule -PathType Leaf) 'risk_ledger_module_missing'
$RiskText = Get-Content -LiteralPath $RiskModule -Raw
$Keys = @([regex]::Matches($RiskText, 'process\.env\.([A-Z0-9_]+)') | ForEach-Object { [string]$_.Groups[1].Value } | Sort-Object -Unique)
$UrlAssignments = 0
$CapabilityAssignments = 0
foreach ($Key in $Keys) {
  if ($Key -match 'RISK' -and $Key -match '(URL|ENDPOINT|BRIDGE)') {
    [Environment]::SetEnvironmentVariable($Key, 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-history-public-bridge', 'Process')
    $UrlAssignments += 1
  } elseif ($Key -match 'RISK' -and $Key -match 'CAPABILITY') {
    [Environment]::SetEnvironmentVariable($Key, $Capability, 'Process')
    $CapabilityAssignments += 1
  }
}
Require ($UrlAssignments -ge 1) 'risk_bridge_url_environment_not_discovered'
Require ($CapabilityAssignments -ge 1) 'risk_bridge_capability_environment_not_discovered'

$env:NEXT_PUBLIC_SUPABASE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'
$env:VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT = New-RandomSecret 48
$env:VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT = New-RandomSecret 48
$env:VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT = New-RandomSecret 48
$env:VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET = New-RandomSecret 48
foreach ($Name in @('VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT','VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT','VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT','VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET')) {
  Write-Host "::add-mask::$([Environment]::GetEnvironmentVariable($Name))"
}

New-Item -ItemType Directory -Force -Path (Join-Path $Work 'artifacts/r7/risk') | Out-Null
$Stdout = Join-Path $Work 'artifacts/r7/risk/R7_RISK_V5_NEXT_STDOUT.log'
$Stderr = Join-Path $Work 'artifacts/r7/risk/R7_RISK_V5_NEXT_STDERR.log'
$NextBin = Join-Path $Work 'node_modules/next/dist/bin/next'
Require (Test-Path -LiteralPath $NextBin -PathType Leaf) 'risk_next_cli_missing'
$Next = Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin, 'dev', '--webpack', '-p', '3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
try {
  $Ready = $false
  for ($Index = 0; $Index -lt 120; $Index += 1) {
    Start-Sleep -Seconds 1
    if ($Next.HasExited) { throw "risk_next_exited:$($Next.ExitCode)" }
    try {
      $Probe = Invoke-WebRequest -Uri 'http://localhost:3100/' -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 2
      if ($Probe.StatusCode -ge 200 -and $Probe.StatusCode -lt 500) { $Ready = $true; break }
    } catch { }
  }
  Require $Ready 'risk_next_not_ready'
  Push-Location $Work
  try {
    & node 'node_modules/tsx/dist/cli.mjs' (Join-Path $Root 'r7-risk-harness/r7-risk-v5-customer-e2e.mts')
    if ($LASTEXITCODE -ne 0) { throw "risk_customer_e2e_failed:$LASTEXITCODE" }
  } finally { Pop-Location }
} catch {
  Get-Content -LiteralPath $Stdout -Tail 220 -ErrorAction SilentlyContinue
  Get-Content -LiteralPath $Stderr -Tail 220 -ErrorAction SilentlyContinue
  throw
} finally {
  if ($Next -and -not $Next.HasExited) { Stop-Process -Id $Next.Id -Force -ErrorAction SilentlyContinue }
}

$ReceiptPath = Join-Path $Work 'artifacts/r7/risk/R7_RISK_INDICATOR_V5_CUSTOMER_E2E.json'
Require (Test-Path -LiteralPath $ReceiptPath -PathType Leaf) 'risk_customer_e2e_receipt_missing'
$Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
Require ($Receipt.status -eq 'PASS_RISK_INDICATOR_V5_CUSTOMER_ROUTE_E2E') 'risk_customer_e2e_receipt_not_pass'
$RecordBody = @{ action='record'; receipt=$Receipt } | ConvertTo-Json -Depth 30 -Compress
$Recorded = Invoke-RestMethod -Method Post -Uri $HelperUrl -Headers @{ Authorization = 'Bearer ' + $Oidc } -ContentType 'application/json' -Body $RecordBody -TimeoutSec 30
Require ($Recorded.ok -eq $true -and $Recorded.recorded -eq $true) 'risk_customer_evidence_record_failed'
Write-Host 'Risk Indicator v5 exact-source customer-route E2E and evidence recording PASS.'
