$ErrorActionPreference='Stop'

function Sha256HexBytes([byte[]]$Bytes) {
  $Hash=[Security.Cryptography.SHA256]::HashData($Bytes)
  return ([BitConverter]::ToString($Hash)).Replace('-','').ToLowerInvariant()
}
function Sha256HexText([string]$Text) { return Sha256HexBytes ([Text.Encoding]::UTF8.GetBytes($Text)) }
function Invoke-JsonPost([string]$Uri,[hashtable]$Headers,[object]$Body) {
  $Json=$Body | ConvertTo-Json -Depth 40 -Compress
  $R=Invoke-WebRequest -Uri $Uri -Method Post -Headers $Headers -ContentType 'application/json' -Body $Json -SkipHttpErrorCheck -TimeoutSec 30
  $Parsed=$null
  try { $Parsed=$R.Content | ConvertFrom-Json -Depth 50 } catch {}
  return [pscustomobject]@{ Status=[int]$R.StatusCode; Body=$Parsed; Raw=[string]$R.Content }
}

if (-not $env:ACTIONS_ID_TOKEN_REQUEST_URL -or -not $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN) { throw 'github_oidc_environment_missing' }
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_ANON_KEY -or -not $env:AUDIT_OIDC_AUDIENCE) { throw 'audit_e2e_environment_missing' }
$Sep = if ($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')) { '&' } else { '?' }
$TokenResponse=Invoke-RestMethod -Uri ($env:ACTIONS_ID_TOKEN_REQUEST_URL+$Sep+'audience='+[Uri]::EscapeDataString($env:AUDIT_OIDC_AUDIENCE)) -Headers @{ Authorization='Bearer '+$env:ACTIONS_ID_TOKEN_REQUEST_TOKEN } -Method Get -TimeoutSec 20
$Oidc=[string]$TokenResponse.value
if (-not $Oidc) { throw 'github_oidc_token_missing' }
$OidcUrl=$env:SUPABASE_URL+'/functions/v1/r7-audit-basic-e2e-oidc'
$BridgeUrl=$env:SUPABASE_URL+'/functions/v1/r7-audit-basic-customer-bridge'
$OidcHeaders=@{ Authorization='Bearer '+$Oidc; Accept='application/json' }
$A=$null; $B=$null; $CaseRef=''
try {
  $Provision=Invoke-JsonPost $OidcUrl $OidcHeaders @{ action='provision' }
  if ($Provision.Status -ne 200 -or $Provision.Body.ok -ne $true) { throw ('provision_failed:'+($Provision.Raw.Substring(0,[Math]::Min(500,$Provision.Raw.Length)))) }
  $A=$Provision.Body.a; $B=$Provision.Body.b; $Capability=[string]$Provision.Body.auditServerCapability
  if (-not $A.accessToken -or -not $B.accessToken -or -not $A.userId -or -not $B.userId -or $Capability.Length -ne 96) { throw 'provision_contract_invalid' }
  $AHeaders=@{ Authorization='Bearer '+[string]$A.accessToken; 'x-velmere-audit-server-capability'=$Capability; Accept='application/json' }
  $BHeaders=@{ Authorization='Bearer '+[string]$B.accessToken; 'x-velmere-audit-server-capability'=$Capability; Accept='application/json' }

  $CaseId='audit-basic-e2e-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $RequestId='audit-basic-request-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $Target='0x3333333333333333333333333333333333333333'
  $TargetHash='sha256:'+(Sha256HexText ('velmere-audit-contract-target-v1:56:'+$Target.ToLowerInvariant()))
  $CaseInput=@{
    caseId=$CaseId; caseRef='server-generated'; requestId=$RequestId; targetKind='contract'; targetPrivate=$Target.ToLowerInvariant(); targetHash=$TargetHash;
    targetChainId='56'; targetChainName='BSC'; displayLabel='Audit Basic bridge E2E'; tier='basic'; locale='en'; status='queued_basic_prescreen';
    accountId=[string]$A.accountId; accountEmail=$null; entitlementRequired=$false; entitlementVerified=$false; analysisStarted=$false;
    intakeReceipt=@{ schemaVersion='velmere.r7.audit-basic-bridge-e2e-intake.v3'; runId=$env:GITHUB_RUN_ID; runAttempt=$env:GITHUB_RUN_ATTEMPT; syntheticHarness=$true; customerFinalCredit=$false };
    sourceCandidatesProtected=@{ auditUrl=$null; docsUrl=$null; githubUrl=$null; website=$null };
  }
  $Created=Invoke-JsonPost $BridgeUrl $AHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='create_case'; caseInput=$CaseInput }
  if ($Created.Status -ne 200 -or $Created.Body.ok -ne $true) { throw ('create_case_failed:'+($Created.Raw.Substring(0,[Math]::Min(700,$Created.Raw.Length)))) }
  $CaseRef=[string]$Created.Body.data.caseRef
  if ($CaseRef -notmatch '^AUD-[A-F0-9]{10}$') { throw ('server_generated_case_ref_invalid:'+ $CaseRef) }

  $ReadA=Invoke-JsonPost $BridgeUrl $AHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='get_case'; caseRef=$CaseRef }
  if ($ReadA.Status -ne 200 -or $ReadA.Body.ok -ne $true -or [string]$ReadA.Body.data.accountId -ne [string]$A.accountId) { throw ('owner_case_read_failed:'+($ReadA.Raw.Substring(0,[Math]::Min(500,$ReadA.Raw.Length)))) }
  $ReadB=Invoke-JsonPost $BridgeUrl $BHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='get_case'; caseRef=$CaseRef }
  if ($ReadB.Status -ne 404) { throw ('cross_account_case_read_not_denied:'+ $ReadB.Status) }

  $Claim=Invoke-JsonPost $OidcUrl $OidcHeaders @{ action='claim'; caseRef=$CaseRef }
  if ($Claim.Status -ne 200 -or $Claim.Body.ok -ne $true -or $Claim.Body.claim.ok -ne $true) { throw ('worker_claim_failed:'+($Claim.Raw.Substring(0,[Math]::Min(700,$Claim.Raw.Length)))) }
  $Worker=[string]$Claim.Body.workerPrincipal; $Lease=[string]$Claim.Body.leaseToken
  if ($Lease.Length -ne 43 -or -not $Worker) { throw 'worker_lease_contract_invalid' }

  $CreatedAt=[DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)
  $PdfText='%PDF-1.4'+"`n"+('A'*1500)+"`n%%EOF`n"
  $PdfBytes=[Text.Encoding]::UTF8.GetBytes($PdfText)
  $PdfDigest='sha256:'+(Sha256HexBytes $PdfBytes)
  $PdfB64=[Convert]::ToBase64String($PdfBytes)
  $PdfLen=$PdfBytes.Length
  $AccountHash=Sha256HexText ('velmere-account-binding-v1:'+[string]$A.accountId)
  $ReportId='audit-basic-report-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $ReportVersionHash='sha256:'+(Sha256HexText ('report-version:'+$CaseRef))
  $SnapshotDigest='sha256:'+(Sha256HexText ('snapshot:'+$CaseRef))
  $SourceRoot='sha256:'+(Sha256HexText ('source-root:'+$CaseRef))
  $Snapshot=@{
    requestId=$RequestId; tier='basic'; digest=$SnapshotDigest; sourceReceiptRoot=$SourceRoot; generatedAt=$CreatedAt;
    renderContract=@{ id='pass4808-deterministic-latin-extended-pagination-v1'; pdfDigest=$PdfDigest; pdfByteLength=$PdfLen };
    auditExecutionRelease=@{
      expectedTier='basic'; caseRef=$CaseRef; decision='ALLOW_COMPLETE'; completionAllowed=$true; persistAllowed=$true;
      packetDigest='sha256:'+(Sha256HexText ('packet:'+$CaseRef)); currentDeploymentReceiptDigest='sha256:'+(Sha256HexText ('deploy:'+$CaseRef));
      matchedInputDigest='sha256:'+(Sha256HexText ('input:'+$CaseRef)); releaseBindingDigest='sha256:'+(Sha256HexText ('release:'+$CaseRef));
    };
    customerEligibility=@{ commercialUseReady=$true };
  }
  $RecordMaterial=@('velmere.audit-basic-exact-immutable-pdf-artifact.v1',$ReportId,$CaseRef,$RequestId,$AccountHash,$TargetHash,$ReportVersionHash,$SnapshotDigest,$SourceRoot,$PdfDigest,[string]$PdfLen,'pass4808-deterministic-latin-extended-pagination-v1',$CreatedAt) -join "`n"
  $RecordDigest='sha256:'+(Sha256HexText $RecordMaterial)
  $Payload=@{
    caseRef=$CaseRef; workerPrincipal=$Worker; leaseToken=$Lease; reasonCode='worker_result'; reportId=$ReportId; requestId=$RequestId; accountIdHash=$AccountHash;
    targetHash=$TargetHash; reportVersionHash=$ReportVersionHash; snapshotDigest=$SnapshotDigest; sourceReceiptRoot=$SourceRoot; pdfDigest=$PdfDigest; pdfByteLength=$PdfLen;
    renderContractId='pass4808-deterministic-latin-extended-pagination-v1'; recordDigest=$RecordDigest; pdfBase64=$PdfB64; snapshotJson=$Snapshot; createdAt=$CreatedAt;
  }
  $Completed=Invoke-JsonPost $BridgeUrl $AHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='complete_pdf'; payload=$Payload }
  if ($Completed.Status -ne 200 -or $Completed.Body.ok -ne $true -or $Completed.Body.data.ok -ne $true -or $Completed.Body.data.state -ne 'completed') { throw ('complete_pdf_failed:'+($Completed.Raw.Substring(0,[Math]::Min(900,$Completed.Raw.Length)))) }

  $ReportRead=Invoke-JsonPost $BridgeUrl $AHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='read_report'; reportId=$ReportId }
  if ($ReportRead.Status -ne 200 -or $ReportRead.Body.ok -ne $true) { throw ('owner_bridge_report_read_failed:'+($ReportRead.Raw.Substring(0,[Math]::Min(700,$ReportRead.Raw.Length)))) }
  $ReturnedPdf=[Convert]::FromBase64String([string]$ReportRead.Body.pdfBase64)
  if ((Sha256HexBytes $ReturnedPdf) -ne $PdfDigest.Replace('sha256:','') -or $ReturnedPdf.Length -ne $PdfLen) { throw 'owner_bridge_report_pdf_mismatch' }
  $ReportReadB=Invoke-JsonPost $BridgeUrl $BHeaders @{ schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1'; action='read_report'; reportId=$ReportId }
  if ($ReportReadB.Status -ne 404) { throw ('cross_account_bridge_report_not_denied:'+ $ReportReadB.Status) }

  $RestHeadersA=@{ Authorization='Bearer '+[string]$A.accessToken; apikey=$env:SUPABASE_ANON_KEY; Accept='application/json' }
  $RestHeadersB=@{ Authorization='Bearer '+[string]$B.accessToken; apikey=$env:SUPABASE_ANON_KEY; Accept='application/json' }
  $Filter=[Uri]::EscapeDataString($CaseRef)
  $RestUri=$env:SUPABASE_URL+'/rest/v1/velmere_audit_basic_report_artifacts?select=report_id,case_ref,pdf_digest,pdf_byte_length,record_digest&case_ref=eq.'+$Filter
  $RA=Invoke-WebRequest -Uri $RestUri -Headers $RestHeadersA -Method Get -SkipHttpErrorCheck -TimeoutSec 20
  if ([int]$RA.StatusCode -ne 200) { throw ('owner_artifact_rest_failed:'+ $RA.StatusCode) }
  $RowsA=$RA.Content | ConvertFrom-Json -Depth 20
  if ($RowsA.Count -ne 1 -or [string]$RowsA[0].pdf_digest -ne $PdfDigest -or [int]$RowsA[0].pdf_byte_length -ne $PdfLen -or [string]$RowsA[0].record_digest -ne $RecordDigest) { throw 'owner_artifact_readback_mismatch' }
  $RB=Invoke-WebRequest -Uri $RestUri -Headers $RestHeadersB -Method Get -SkipHttpErrorCheck -TimeoutSec 20
  if ([int]$RB.StatusCode -ne 200) { throw ('cross_account_artifact_query_failed:'+ $RB.StatusCode) }
  $RowsB=$RB.Content | ConvertFrom-Json -Depth 20
  if ($RowsB.Count -ne 0) { throw 'cross_account_artifact_not_denied' }

  $Receipt=[ordered]@{
    schemaVersion='velmere.r7.audit-basic-bridge-e2e.v3'; status='PASS_SECURE_BRIDGE_E2E'; runId=$env:GITHUB_RUN_ID; runAttempt=$env:GITHUB_RUN_ATTEMPT; caseRef=$CaseRef;
    createCase='PASS_ACCOUNT_BOUND_SERVER_IDENTITY'; ownerCaseRead='PASS'; crossAccountCaseRead='PASS_DENIED_404'; workerClaim='PASS_EPHEMERAL_LEASE';
    completion='PASS_ATOMIC_IMMUTABLE_PDF'; ownerBridgeReportRead='PASS_EXACT_PDF'; crossAccountBridgeReportRead='PASS_DENIED_404'; ownerArtifactRls='PASS'; crossAccountArtifactRls='PASS_EMPTY';
    pdfDigest=$PdfDigest; pdfByteLength=$PdfLen; recordDigest=$RecordDigest; serviceRoleInWorkflow=$false; serviceRoleReturnedByOidc=$false; auditCapabilitySeparated=$true; customerFinalCredit=$false;
    truthBoundary='Secure Audit Basic service bridge is proven end-to-end with ephemeral owner-bound users and an exact immutable PDF artifact. This remains bridge/storage evidence only; real audit findings, provider rights, retest and exact customer product route remain separate FINAL gates.'
  }
  New-Item -ItemType Directory -Force -Path 'artifacts/r7/audit-basic' | Out-Null
  $Receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath 'artifacts/r7/audit-basic/R7_AUDIT_BASIC_BRIDGE_E2E.json' -Encoding utf8
  Write-Host ($Receipt | ConvertTo-Json -Depth 20)
}
finally {
  if ($A -and $B -and $Oidc) {
    try {
      $Cleanup=Invoke-JsonPost $OidcUrl $OidcHeaders @{ action='cleanup'; userIds=@([string]$A.userId,[string]$B.userId); caseRef=$CaseRef }
      if ($Cleanup.Status -ne 200 -or $Cleanup.Body.ok -ne $true) { Write-Warning ('ephemeral cleanup not fully confirmed: '+$Cleanup.Raw.Substring(0,[Math]::Min(300,$Cleanup.Raw.Length))) }
    } catch { Write-Warning ('ephemeral cleanup exception: '+$_.Exception.Message) }
  }
}
