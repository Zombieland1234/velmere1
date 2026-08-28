$ErrorActionPreference = 'Stop'

function Require([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function New-RandomSecret([int]$Bytes = 48) { $Buffer = New-Object byte[] $Bytes; [Security.Cryptography.RandomNumberGenerator]::Fill($Buffer); return [Convert]::ToBase64String($Buffer) }
function Invoke-JsonPost([string]$Uri, [hashtable]$Headers, [object]$Body) {
  $Response = Invoke-WebRequest -Uri $Uri -Method Post -Headers $Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 30 -Compress) -SkipHttpErrorCheck -TimeoutSec 45
  $Parsed = $null
  try { $Parsed = $Response.Content | ConvertFrom-Json -Depth 40 } catch { }
  return [pscustomobject]@{ Status = [int]$Response.StatusCode; Body = $Parsed; Raw = [string]$Response.Content }
}

$Root = (Get-Location).Path
$Work = Join-Path $Root 'r7-work'
$HelperUrl = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-advanced-e2e-oidc'
$RestoreUrl = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-basic-staging-proof'
$Audience = 'velmere-r7-browser-advanced-e2e'
$NextProcess = $null
$Oidc = $null
$UserIds = @()
$EntitlementIds = @()

try {
  Require (Test-Path -LiteralPath $Work -PathType Container) 'browser_advanced_exact_worktree_missing'
  $Separator = if ($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')) { '&' } else { '?' }
  $TokenUri = $env:ACTIONS_ID_TOKEN_REQUEST_URL + $Separator + 'audience=' + [Uri]::EscapeDataString($Audience)
  $Oidc = [string](Invoke-RestMethod -Method Get -Uri $TokenUri -Headers @{ Authorization = 'Bearer ' + $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN } -TimeoutSec 20).value
  Require ($Oidc.Split('.').Count -eq 3) 'browser_advanced_oidc_missing'
  Write-Host "::add-mask::$Oidc"
  $OidcHeaders = @{ Authorization = 'Bearer ' + $Oidc; Accept = 'application/json' }
  $Provision = Invoke-JsonPost $HelperUrl $OidcHeaders @{ action = 'provision' }
  Require ($Provision.Status -eq 200 -and $Provision.Body.ok -eq $true) ('browser_advanced_provision_failed:' + $Provision.Raw.Substring(0, [Math]::Min(500, $Provision.Raw.Length)))
  $A = $Provision.Body.a
  $B = $Provision.Body.b
  $UserIds = @([string]$A.userId, [string]$B.userId)
  $EntitlementId = [string]$Provision.Body.advancedEntitlementId
  $EntitlementIds = @($EntitlementId)
  $BrowserCapability = [string]$Provision.Body.browserServerCapability
  $EntitlementCapability = [string]$Provision.Body.entitlementServerCapability
  Require ($EntitlementId -match '^ent_[a-f0-9]{48}$') 'browser_advanced_entitlement_invalid'
  Require ($BrowserCapability.Length -ge 48 -and $EntitlementCapability.Length -ge 48) 'browser_advanced_capability_invalid'
  foreach ($Secret in @([string]$A.accessToken, [string]$B.accessToken, $BrowserCapability, $EntitlementCapability)) { Write-Host "::add-mask::$Secret" }

  $env:R7_BROWSER_ADVANCED_GITHUB_OIDC = $Oidc
  $env:R7_BROWSER_ADVANCED_HELPER_URL = $HelperUrl
  $env:R7_BROWSER_ADVANCED_RESTORE_URL = $RestoreUrl
  $env:R7_BROWSER_ADVANCED_USER_A_ID = [string]$A.userId
  $env:R7_BROWSER_ADVANCED_USER_B_ID = [string]$B.userId
  $env:R7_BROWSER_ADVANCED_USER_A_JWT = [string]$A.accessToken
  $env:R7_BROWSER_ADVANCED_USER_B_JWT = [string]$B.accessToken
  $env:R7_BROWSER_ADVANCED_ACCOUNT_A = [string]$A.accountId
  $env:R7_BROWSER_ADVANCED_ACCOUNT_B = [string]$B.accountId
  $env:R7_BROWSER_ADVANCED_ENTITLEMENT_ID = $EntitlementId
  $env:R7_BROWSER_ADVANCED_E2E_BASE_URL = 'http://localhost:3100'
  $env:VELMERE_BROWSER_SERVER_CAPABILITY = $BrowserCapability
  $env:VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY = $EntitlementCapability
  $env:VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/velmere-product-entitlement-bridge'
  $env:VELMERE_ACCOUNT_ARTIFACT_WRITE_BRIDGE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-artifact-write-bridge'
  $env:VELMERE_DURABLE_COMPUTATION_BRIDGE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-durable-computation-bridge'
  $env:NEXT_PUBLIC_SUPABASE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co'
  $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'
  $env:VELMERE_PDF_FONT_PATH = (Resolve-Path -LiteralPath (Join-Path $Work 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf')).Path
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $env:CI = '1'
  $env:VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET = New-RandomSecret 48
  foreach ($Name in @('VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT','VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT','VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT','VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET')) { Write-Host "::add-mask::$([Environment]::GetEnvironmentVariable($Name))" }

  $ArtifactDirectory = Join-Path $Work 'artifacts/r7/browser-advanced'
  New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
  $Stdout = Join-Path $ArtifactDirectory 'R7_BROWSER_ADVANCED_NEXT_STDOUT.log'
  $Stderr = Join-Path $ArtifactDirectory 'R7_BROWSER_ADVANCED_NEXT_STDERR.log'
  $NextBin = Join-Path $Work 'node_modules/next/dist/bin/next'
  Require (Test-Path -LiteralPath $NextBin -PathType Leaf) 'browser_advanced_next_cli_missing'
  $NextProcess = Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin, 'dev', '--webpack', '-p', '3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
  $Ready = $false
  for ($Index = 0; $Index -lt 120; $Index += 1) {
    Start-Sleep -Seconds 1
    if ($NextProcess.HasExited) { throw "browser_advanced_next_exited:$($NextProcess.ExitCode)" }
    try { $Probe = Invoke-WebRequest -Uri 'http://localhost:3100/' -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 2; if ($Probe.StatusCode -ge 200 -and $Probe.StatusCode -lt 500) { $Ready = $true; break } } catch { }
  }
  Require $Ready 'browser_advanced_next_not_ready'
  $Tsx = Join-Path $Work 'node_modules/tsx/dist/cli.mjs'
  $TsConfig = Join-Path $Work 'tsconfig.json'
  $Driver = Join-Path $Root 'r7-browser-advanced-harness/r7-browser-advanced-candidate-e2e.mts'
  Require (Test-Path -LiteralPath $TsConfig -PathType Leaf) 'browser_advanced_tsconfig_missing'
  Push-Location $Work
  try { & node $Tsx --tsconfig $TsConfig $Driver } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "browser_advanced_driver_failed:$LASTEXITCODE" }
  $ReceiptPath = Join-Path $ArtifactDirectory 'R7_BROWSER_ADVANCED_ENTITLEMENT_CANDIDATE_E2E.json'
  Require (Test-Path -LiteralPath $ReceiptPath -PathType Leaf) 'browser_advanced_receipt_missing'
  $Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
  Require ($Receipt.status -eq 'PASS_BROWSER_ADVANCED_MATCHED_INPUT_ENTITLEMENT_CANDIDATE_E2E') 'browser_advanced_receipt_not_pass'
  Write-Host 'Browser Advanced matched-input entitlement candidate E2E PASS.'
}
catch {
  Get-Content -LiteralPath (Join-Path $Work 'artifacts/r7/browser-advanced/R7_BROWSER_ADVANCED_NEXT_STDOUT.log') -Tail 240 -ErrorAction SilentlyContinue
  Get-Content -LiteralPath (Join-Path $Work 'artifacts/r7/browser-advanced/R7_BROWSER_ADVANCED_NEXT_STDERR.log') -Tail 240 -ErrorAction SilentlyContinue
  throw
}
finally {
  if ($NextProcess -and -not $NextProcess.HasExited) { Stop-Process -Id $NextProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($Oidc -and $UserIds.Count -gt 0) {
    try {
      $ReceiptPath = Join-Path $Work 'artifacts/r7/browser-advanced/R7_BROWSER_ADVANCED_ENTITLEMENT_CANDIDATE_E2E.json'
      if (Test-Path -LiteralPath $ReceiptPath -PathType Leaf) {
        $Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
        foreach ($SnapshotId in @([string]$Receipt.advancedArtifactId, [string]$Receipt.proArtifactId)) {
          if (-not [string]::IsNullOrWhiteSpace($SnapshotId)) {
            try { Invoke-JsonPost $HelperUrl @{ Authorization = 'Bearer ' + $Oidc; Accept = 'application/json' } @{ action = 'backup_erase'; userId = $UserIds[0]; snapshotId = $SnapshotId } | Out-Null }
            catch { Write-Warning 'Browser Advanced artifact cleanup failed for one snapshot.' }
          }
        }
      }
      $Cleanup = Invoke-JsonPost $HelperUrl @{ Authorization = 'Bearer ' + $Oidc; Accept = 'application/json' } @{ action = 'cleanup'; userIds = $UserIds; entitlementIds = $EntitlementIds }
      Write-Host "Browser Advanced cleanup: users=$($Cleanup.Body.deleted), entitlements=$($Cleanup.Body.revoked)"
    } catch { Write-Warning 'Browser Advanced cleanup did not fully confirm.' }
  }
}
