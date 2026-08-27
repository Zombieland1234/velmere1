$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
function Assert-Exit([string]$Label){if($LASTEXITCODE -ne 0){throw "$Label failed with exit code $LASTEXITCODE"}}
function Assert([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}

$Root=(Get-Location).Path
$Work=Join-Path $Root 'r7-work'
$Next=$null
try {
  & pwsh -NoProfile -File (Join-Path $Root 'r7-risk-v5/run-r7-risk-v5-source.ps1') -Mode Prepare
  Assert-Exit 'Risk v5 exact source preparation'

  if(-not $env:ACTIONS_ID_TOKEN_REQUEST_URL -or -not $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN){throw 'risk_v5_oidc_environment_missing'}
  $Separator=if($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')){'&'}else{'?'}
  $OidcResponse=Invoke-RestMethod -Uri ($env:ACTIONS_ID_TOKEN_REQUEST_URL+$Separator+'audience=velmere-r7-risk-indicator-e2e') -Headers @{Authorization='Bearer '+$env:ACTIONS_ID_TOKEN_REQUEST_TOKEN} -Method Get -TimeoutSec 20
  $Oidc=[string]$OidcResponse.value
  if(-not $Oidc){throw 'risk_v5_oidc_token_missing'}
  Write-Host "::add-mask::$Oidc"
  $CapabilityResponse=Invoke-RestMethod -Uri 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-indicator-e2e-oidc' -Method Post -Headers @{Authorization='Bearer '+$Oidc} -ContentType 'application/json' -Body '{"action":"capability"}' -TimeoutSec 20
  if($CapabilityResponse.ok -ne $true){throw 'risk_v5_capability_provision_failed'}
  $Capability=[string]$CapabilityResponse.riskHistoryServerCapability
  if($Capability.Length -lt 48 -or $Capability.Length -gt 256){throw 'risk_v5_capability_contract_invalid'}
  Write-Host "::add-mask::$Capability"

  $env:VELMERE_RISK_HISTORY_PUBLIC_BRIDGE_URL='https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-history-public-bridge'
  $env:VELMERE_RISK_HISTORY_SERVER_CAPABILITY=$Capability
  $env:NEXT_TELEMETRY_DISABLED='1'
  $env:CI='1'

  $Stdout=Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDOUT.log'
  $Stderr=Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDERR.log'
  $NextBin=Join-Path $Work 'node_modules/next/dist/bin/next'
  if(-not(Test-Path -LiteralPath $NextBin -PathType Leaf)){throw 'risk_v5_next_cli_missing'}
  $Next=Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin,'dev','--webpack','-p','3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
  $Ready=$false
  for($Index=0;$Index -lt 120;$Index+=1){
    Start-Sleep -Seconds 1
    if($Next.HasExited){throw "risk_v5_next_exited:$($Next.ExitCode)"}
    try{$Probe=Invoke-WebRequest -Uri 'http://localhost:3100/pl' -UseBasicParsing -TimeoutSec 2 -SkipHttpErrorCheck;if($Probe.StatusCode -ge 200 -and $Probe.StatusCode -lt 500){$Ready=$true;break}}catch{}
  }
  if(-not $Ready){throw 'risk_v5_next_not_ready'}

  $Route='http://localhost:3100/api/market-integrity/history?id=multicall3-bsc&limit=10'
  $Response=Invoke-WebRequest -Uri $Route -Method Get -Headers @{'cache-control'='no-store'} -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 30
  Assert ([int]$Response.StatusCode -eq 200) "risk_v5_route_status_$([int]$Response.StatusCode)"
  $Body=$Response.Content | ConvertFrom-Json -Depth 50
  Assert ($Body.schemaVersion -eq 'velmere.risk-history.customer-route.v3') 'risk_v5_route_schema_invalid'
  Assert ($Body.mode -eq 'stored') 'risk_v5_route_mode_invalid'
  Assert ($Body.publication.evidenceState -eq 'verified') 'risk_v5_publication_not_verified'
  Assert ($Body.publication.liveClaimed -eq $false) 'risk_v5_live_claim_inflated'
  Assert ($Body.riskHistory.schemaVersion -eq 'velmere.risk-history.customer.v3') 'risk_v5_projection_schema_invalid'
  Assert ($Body.riskHistory.status -eq 'AVAILABLE') 'risk_v5_history_not_available'
  Assert ($Body.riskHistory.asset.canonicalAssetId -eq 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11') 'risk_v5_canonical_identity_invalid'
  Assert ([int]$Body.riskHistory.observations -eq 2) 'risk_v5_observation_count_invalid'
  Assert ($Body.riskHistory.storage.pageSource -eq 'DATABASE') 'risk_v5_not_database_backed'
  Assert ($Body.riskHistory.storage.pageReadState -eq 'DATABASE_PAGE_RESPONSE_VERIFIED') 'risk_v5_database_read_not_verified'
  Assert ($Body.riskHistory.storage.durableRetentionClaimed -eq $false) 'risk_v5_retention_claim_inflated'
  Assert ($Body.riskHistory.storage.backupRestoreProven -eq $false) 'risk_v5_restore_claim_inflated'
  Assert ([int]$Body.riskHistory.segments.Count -eq 2) 'risk_v5_methodology_segments_invalid'
  foreach($Point in @($Body.riskHistory.history)){
    Assert ($Point.isProbability -eq $false) 'risk_v5_probability_claim_inflated'
    Assert ($null -eq $Point.probabilityPercent) 'risk_v5_probability_percent_present'
  }
  $Serialized=$Body | ConvertTo-Json -Depth 50 -Compress
  foreach($Forbidden in @('"eventId"','"evidenceDigest"','"sourceAsOf"','SUPABASE_SERVICE_ROLE_KEY','x-velmere-risk-history-server-capability')){
    Assert (-not $Serialized.Contains($Forbidden)) "risk_v5_private_field_leak:$Forbidden"
  }

  $Duplicate=Invoke-WebRequest -Uri 'http://localhost:3100/api/market-integrity/history?id=multicall3-bsc&id=other&limit=10' -Method Get -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 20
  Assert ([int]$Duplicate.StatusCode -eq 400) 'risk_v5_duplicate_query_not_rejected'
  $Empty=Invoke-WebRequest -Uri 'http://localhost:3100/api/market-integrity/history?id=unknown-public-asset&limit=10' -Method Get -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 20
  Assert ([int]$Empty.StatusCode -eq 200) 'risk_v5_empty_route_status_invalid'
  $EmptyBody=$Empty.Content | ConvertFrom-Json -Depth 30
  Assert ($EmptyBody.riskHistory.status -eq 'EMPTY') 'risk_v5_empty_resolution_not_non_enumerating'
  Assert ([int]$EmptyBody.riskHistory.observations -eq 0) 'risk_v5_empty_resolution_observations_invalid'

  New-Item -ItemType Directory -Force -Path (Join-Path $Work 'artifacts/r7/risk-indicator') | Out-Null
  $Receipt=[ordered]@{
    schemaVersion='velmere.r7.risk-indicator-exact-source-e2e.v1';
    status='PASS_RISK_INDICATOR_EXACT_SOURCE_CUSTOMER_ROUTE';
    github=@{sha=$env:GITHUB_SHA;runId=$env:GITHUB_RUN_ID;runAttempt=[int]$env:GITHUB_RUN_ATTEMPT};
    source=@{fullSourceAggregateSha256=$env:R7_RISK_FULL_SOURCE_AGGREGATE_SHA256;executionSliceAggregateSha256=$env:R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256;executionSliceManifestSha256=$env:R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256;exactSourceBytes=$true};
    product=@{productSlug='risk-indicator';route='/api/market-integrity/history';canonicalAssetId='eip155:56:0xca11bde05977b3631167028862be2a173976ca11';realEvidence='MULTICALL3_BSC_EXACT_SOURCE_RUNTIME';observations=2;methodologySegments=2;databasePageVerified=$true;publicOnly=$true;scoreIsProbability=$false;tradeInstruction=$false;duplicateQueryRejected=$true;emptyResolutionNonEnumerating=$true};
    privacy=@{serviceRoleInApplication=$false;serverCapabilityReturned=$false;rawProviderPayloadReturned=$false;privateFieldsReturned=$false};
    limits=@{multiYearRetentionClaimed=$false;backupRestoreProven=$false};
    customerFinalCredit=$false;
    truthBoundary='Exact-source Risk Indicator customer route is proven against real, rights-safe Multicall3 evidence. Formal FINAL additionally requires exact Windows 52/52 x2 and source-authority binding for the identical source hashes.'
  }
  $ReceiptPath=Join-Path $Work 'artifacts/r7/risk-indicator/R7_RISK_INDICATOR_EXACT_SOURCE_E2E.json'
  $Receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $ReceiptPath -Encoding utf8
  Write-Host ($Receipt | ConvertTo-Json -Depth 30)
}
catch{
  if(Test-Path -LiteralPath (Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDOUT.log')){Get-Content -LiteralPath (Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDOUT.log') -Tail 160 -ErrorAction SilentlyContinue}
  if(Test-Path -LiteralPath (Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDERR.log')){Get-Content -LiteralPath (Join-Path $Work 'R7_RISK_INDICATOR_NEXT_STDERR.log') -Tail 160 -ErrorAction SilentlyContinue}
  throw
}
finally{
  if($Next -and -not $Next.HasExited){Stop-Process -Id $Next.Id -Force -ErrorAction SilentlyContinue}
}
