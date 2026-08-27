$ErrorActionPreference = 'Stop'

function Require([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
function New-RandomSecret([int]$Bytes=48){$Buffer=New-Object byte[] $Bytes;[Security.Cryptography.RandomNumberGenerator]::Fill($Buffer);return[Convert]::ToBase64String($Buffer)}
function Post([string]$Uri,[hashtable]$Headers,[object]$Body){
  $Response=Invoke-WebRequest -Uri $Uri -Method Post -Headers $Headers -ContentType 'application/json' -Body ($Body|ConvertTo-Json -Depth 30 -Compress) -SkipHttpErrorCheck -TimeoutSec 45
  $Parsed=$null;try{$Parsed=$Response.Content|ConvertFrom-Json -Depth 40}catch{}
  return[pscustomobject]@{Status=[int]$Response.StatusCode;Body=$Parsed;Raw=[string]$Response.Content}
}

$Root=(Get-Location).Path
$Work=Join-Path $Root 'r7-work'
$HelperUrl='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-pro-e2e-oidc'
$RestoreUrl='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-basic-staging-proof'
$Audience='velmere-r7-browser-pro-e2e'
$Next=$null
$UserIds=@()
$EntitlementIds=@()
$Oidc=$null
try{
  Require (Test-Path -LiteralPath $Work -PathType Container) 'browser_pro_exact_worktree_missing'
  Require (-not [string]::IsNullOrWhiteSpace($env:ACTIONS_ID_TOKEN_REQUEST_URL)) 'browser_pro_oidc_url_missing'
  Require (-not [string]::IsNullOrWhiteSpace($env:ACTIONS_ID_TOKEN_REQUEST_TOKEN)) 'browser_pro_oidc_request_token_missing'
  $Separator=if($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')){'&'}else{'?'}
  $TokenResponse=Invoke-RestMethod -Method Get -Uri ($env:ACTIONS_ID_TOKEN_REQUEST_URL+$Separator+'audience='+[Uri]::EscapeDataString($Audience)) -Headers @{Authorization='Bearer '+$env:ACTIONS_ID_TOKEN_REQUEST_TOKEN} -TimeoutSec 20
  $Oidc=[string]$TokenResponse.value
  Require ($Oidc.Split('.').Count -eq 3) 'browser_pro_oidc_missing'
  Write-Host "::add-mask::$Oidc"
  $OidcHeaders=@{Authorization='Bearer '+$Oidc;Accept='application/json'}
  $Provision=Post $HelperUrl $OidcHeaders @{action='provision'}
  Require ($Provision.Status -eq 200 -and $Provision.Body.ok -eq $true) ('browser_pro_provision_failed:'+($Provision.Raw.Substring(0,[Math]::Min(500,$Provision.Raw.Length))))
  $A=$Provision.Body.a;$B=$Provision.Body.b
  $UserIds=@([string]$A.userId,[string]$B.userId)
  $EntitlementId=[string]$Provision.Body.proEntitlementId
  $EntitlementIds=@($EntitlementId)
  $BrowserCapability=[string]$Provision.Body.browserServerCapability
  $EntitlementCapability=[string]$Provision.Body.entitlementServerCapability
  Require ($EntitlementId -match '^ent_[a-f0-9]{48}$') 'browser_pro_entitlement_contract_invalid'
  Require ($BrowserCapability.Length -ge 48 -and $EntitlementCapability.Length -ge 48) 'browser_pro_capability_contract_invalid'
  foreach($Secret in @([string]$A.accessToken,[string]$B.accessToken,$BrowserCapability,$EntitlementCapability)){Write-Host "::add-mask::$Secret"}

  $env:R7_BROWSER_PRO_GITHUB_OIDC=$Oidc
  $env:R7_BROWSER_PRO_HELPER_URL=$HelperUrl
  $env:R7_BROWSER_PRO_RESTORE_URL=$RestoreUrl
  $env:R7_BROWSER_PRO_USER_A_ID=[string]$A.userId
  $env:R7_BROWSER_PRO_USER_B_ID=[string]$B.userId
  $env:R7_BROWSER_PRO_USER_A_JWT=[string]$A.accessToken
  $env:R7_BROWSER_PRO_USER_B_JWT=[string]$B.accessToken
  $env:R7_BROWSER_PRO_ACCOUNT_A=[string]$A.accountId
  $env:R7_BROWSER_PRO_ACCOUNT_B=[string]$B.accountId
  $env:R7_BROWSER_PRO_ENTITLEMENT_ID=$EntitlementId
  $env:R7_BROWSER_PRO_E2E_BASE_URL='http://localhost:3100'
  $env:VELMERE_BROWSER_SERVER_CAPABILITY=$BrowserCapability
  $env:VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY=$EntitlementCapability
  $env:VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/velmere-product-entitlement-bridge'
  $env:VELMERE_ACCOUNT_ARTIFACT_WRITE_BRIDGE_URL='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-artifact-write-bridge'
  $env:VELMERE_DURABLE_COMPUTATION_BRIDGE_URL='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-durable-computation-bridge'
  $env:NEXT_PUBLIC_SUPABASE_URL='https://yljjyowcvjgjcamffnvd.supabase.co'
  $env:NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'
  $env:VELMERE_PDF_FONT_PATH=(Resolve-Path -LiteralPath (Join-Path $Work 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf')).Path
  $env:NEXT_TELEMETRY_DISABLED='1'
  $env:CI='1'
  $env:VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT=New-RandomSecret 48
  $env:VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT=New-RandomSecret 48
  $env:VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT=New-RandomSecret 48
  $env:VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET=New-RandomSecret 48
  foreach($Name in @('VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT','VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT','VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT','VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET')){Write-Host "::add-mask::$([Environment]::GetEnvironmentVariable($Name))"}

  New-Item -ItemType Directory -Force -Path (Join-Path $Work 'artifacts/r7/browser-pro')|Out-Null
  $Stdout=Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_NEXT_STDOUT.log'
  $Stderr=Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_NEXT_STDERR.log'
  $NextBin=Join-Path $Work 'node_modules/next/dist/bin/next'
  Require (Test-Path -LiteralPath $NextBin -PathType Leaf) 'browser_pro_next_cli_missing'
  $Next=Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin,'dev','--webpack','-p','3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
  $Ready=$false
  for($Index=0;$Index-lt 120;$Index+=1){
    Start-Sleep -Seconds 1
    if($Next.HasExited){throw "browser_pro_next_exited:$($Next.ExitCode)"}
    try{$Probe=Invoke-WebRequest -Uri 'http://localhost:3100/' -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 2;if($Probe.StatusCode-ge 200-and$Probe.StatusCode-lt 500){$Ready=$true;break}}catch{}
  }
  Require $Ready 'browser_pro_next_not_ready'
  & node (Join-Path $Work 'node_modules/tsx/dist/cli.mjs') (Join-Path $Root 'r7-browser-pro-harness/r7-browser-pro-candidate-e2e.mts')
  if($LASTEXITCODE-ne 0){throw "browser_pro_driver_failed:$LASTEXITCODE"}
  $ReceiptPath=Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_ENTITLEMENT_CANDIDATE_E2E.json'
  Require (Test-Path -LiteralPath $ReceiptPath -PathType Leaf) 'browser_pro_receipt_missing'
  $Receipt=Get-Content -LiteralPath $ReceiptPath -Raw|ConvertFrom-Json
  Require ($Receipt.status-eq'PASS_BROWSER_PRO_MATCHED_INPUT_ENTITLEMENT_CANDIDATE_E2E') 'browser_pro_receipt_not_pass'
  Write-Host 'Browser Pro matched-input entitlement candidate E2E PASS.'
}
catch{
  if($Work){Get-Content -LiteralPath (Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_NEXT_STDOUT.log') -Tail 240 -ErrorAction SilentlyContinue;Get-Content -LiteralPath (Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_NEXT_STDERR.log') -Tail 240 -ErrorAction SilentlyContinue}
  throw
}
finally{
  if($Next-and-not$Next.HasExited){Stop-Process -Id $Next.Id -Force -ErrorAction SilentlyContinue}
  if($Oidc-and$UserIds.Count-gt 0){
    try{
      $ReceiptPath=Join-Path $Work 'artifacts/r7/browser-pro/R7_BROWSER_PRO_ENTITLEMENT_CANDIDATE_E2E.json'
      if(Test-Path -LiteralPath $ReceiptPath -PathType Leaf){
        $Receipt=Get-Content -LiteralPath $ReceiptPath -Raw|ConvertFrom-Json
        foreach($SnapshotId in @([string]$Receipt.proArtifactId,[string]$Receipt.basicArtifactId)){
          if(-not[string]::IsNullOrWhiteSpace($SnapshotId)){try{Post $HelperUrl @{Authorization='Bearer '+$Oidc;Accept='application/json'} @{action='backup_erase';userId=$UserIds[0];snapshotId=$SnapshotId}|Out-Null}catch{Write-Warning "Browser Pro artifact cleanup failed for one snapshot"}}
        }
      }
      $Cleanup=Post $HelperUrl @{Authorization='Bearer '+$Oidc;Accept='application/json'} @{action='cleanup';userIds=$UserIds;entitlementIds=$EntitlementIds}
      Write-Host "Browser Pro ephemeral cleanup: users=$($Cleanup.Body.deleted), entitlements=$($Cleanup.Body.revoked)"
    }catch{Write-Warning 'Browser Pro cleanup did not fully confirm'}
  }
}
