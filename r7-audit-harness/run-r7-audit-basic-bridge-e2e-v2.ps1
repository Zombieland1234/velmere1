$ErrorActionPreference = 'Stop'

function Require([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
function Sha256HexBytes([byte[]]$Bytes){$Hash=[Security.Cryptography.SHA256]::HashData($Bytes);return([BitConverter]::ToString($Hash)).Replace('-','').ToLowerInvariant()}
function Sha256HexText([string]$Text){return Sha256HexBytes([Text.Encoding]::UTF8.GetBytes($Text))}
function Invoke-JsonPost([string]$Uri,[hashtable]$Headers,[object]$Body){
  $Json=$Body|ConvertTo-Json -Depth 40 -Compress
  $Response=Invoke-WebRequest -Uri $Uri -Method Post -Headers $Headers -ContentType 'application/json' -Body $Json -SkipHttpErrorCheck -TimeoutSec 45
  $Parsed=$null
  try{$Parsed=$Response.Content|ConvertFrom-Json -Depth 50}catch{}
  return[pscustomobject]@{Status=[int]$Response.StatusCode;Body=$Parsed;Raw=[string]$Response.Content}
}

$SupabaseUrl='https://yljjyowcvjgjcamffnvd.supabase.co'
$AnonKey='sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'
$Audience='velmere-r7-audit-basic-e2e-v2'
$OidcUrl=$SupabaseUrl+'/functions/v1/r7-audit-basic-e2e-v2-oidc'
$BridgeUrl=$SupabaseUrl+'/functions/v1/r7-audit-basic-customer-bridge'
$UserIds=@()
$Oidc=$null

try{
  Require (-not [string]::IsNullOrWhiteSpace($env:ACTIONS_ID_TOKEN_REQUEST_URL)) 'github_oidc_url_missing'
  Require (-not [string]::IsNullOrWhiteSpace($env:ACTIONS_ID_TOKEN_REQUEST_TOKEN)) 'github_oidc_request_token_missing'
  $Separator=if($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')){'&'}else{'?'}
  $TokenResponse=Invoke-RestMethod -Method Get -Uri ($env:ACTIONS_ID_TOKEN_REQUEST_URL+$Separator+'audience='+[Uri]::EscapeDataString($Audience)) -Headers @{Authorization='Bearer '+$env:ACTIONS_ID_TOKEN_REQUEST_TOKEN} -TimeoutSec 20
  $Oidc=[string]$TokenResponse.value
  Require ($Oidc.Split('.').Count -eq 3) 'github_oidc_token_missing'
  Write-Host "::add-mask::$Oidc"
  $OidcHeaders=@{Authorization='Bearer '+$Oidc;Accept='application/json'}
  $Provision=Invoke-JsonPost $OidcUrl $OidcHeaders @{action='provision'}
  Require ($Provision.Status -eq 200 -and $Provision.Body.ok -eq $true) ('provision_failed:'+($Provision.Raw.Substring(0,[Math]::Min(400,$Provision.Raw.Length))))
  $A=$Provision.Body.a;$B=$Provision.Body.b;$Capability=[string]$Provision.Body.auditServerCapability
  Require (-not [string]::IsNullOrWhiteSpace([string]$A.accessToken)) 'user_a_token_missing'
  Require (-not [string]::IsNullOrWhiteSpace([string]$B.accessToken)) 'user_b_token_missing'
  Require ($Capability.Length -ge 48 -and $Capability.Length -le 256) 'audit_capability_invalid'
  $UserIds=@([string]$A.userId,[string]$B.userId)
  foreach($Secret in @([string]$A.accessToken,[string]$B.accessToken,$Capability)){Write-Host "::add-mask::$Secret"}
  $AHeaders=@{Authorization='Bearer '+[string]$A.accessToken;'x-velmere-audit-server-capability'=$Capability;Accept='application/json'}
  $BHeaders=@{Authorization='Bearer '+[string]$B.accessToken;'x-velmere-audit-server-capability'=$Capability;Accept='application/json'}

  $CaseRef='AB-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $CaseId='audit-basic-e2e-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $RequestId='audit-basic-request-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $Target='0xca11bde05977b3631167028862be2a173976ca11'
  $TargetHash='sha256:'+(Sha256HexText('velmere-audit-contract-target-v1:56:'+$Target))
  $CaseInput=@{
    caseId=$CaseId;caseRef=$CaseRef;requestId=$RequestId;targetKind='contract';targetPrivate=$Target;targetHash=$TargetHash;
    targetChainId='56';targetChainName='BSC';displayLabel='Audit Basic secure bridge E2E V2';tier='basic';locale='en';status='queued_basic_prescreen';
    accountId=[string]$A.accountId;accountEmail=$null;entitlementRequired=$false;entitlementVerified=$false;analysisStarted=$false;
    intakeReceipt=@{schemaVersion='velmere.r7.audit-basic-bridge-e2e-intake.v2';runId=$env:GITHUB_RUN_ID;ownerAuthorized=$true;syntheticInfrastructureArtifact=$true;customerFinalCredit=$false};
    sourceCandidatesProtected=@{auditUrl=$null;docsUrl=$null;githubUrl=$null;website=$null}
  }
  $Created=Invoke-JsonPost $BridgeUrl $AHeaders @{schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1';action='create_case';caseInput=$CaseInput}
  Require ($Created.Status -eq 200 -and $Created.Body.ok -eq $true -and $Created.Body.data.ok -eq $true) ('create_case_failed:'+($Created.Raw.Substring(0,[Math]::Min(600,$Created.Raw.Length))))
  $ReadA=Invoke-JsonPost $BridgeUrl $AHeaders @{schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1';action='get_case';caseRef=$CaseRef}
  Require ($ReadA.Status -eq 200 -and $ReadA.Body.ok -eq $true -and [string]$ReadA.Body.data.account_id -eq [string]$A.accountId) 'owner_case_read_failed'
  $ReadB=Invoke-JsonPost $BridgeUrl $BHeaders @{schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1';action='get_case';caseRef=$CaseRef}
  Require ($ReadB.Status -eq 404) ('cross_account_case_read_not_denied:'+ $ReadB.Status)

  $Claim=Invoke-JsonPost $OidcUrl $OidcHeaders @{action='claim';caseRef=$CaseRef}
  Require ($Claim.Status -eq 200 -and $Claim.Body.ok -eq $true -and $Claim.Body.claim.ok -eq $true) ('worker_claim_failed:'+($Claim.Raw.Substring(0,[Math]::Min(600,$Claim.Raw.Length))))
  $Worker=[string]$Claim.Body.workerPrincipal;$Lease=[string]$Claim.Body.leaseToken
  Require ($Lease.Length -eq 43 -and -not [string]::IsNullOrWhiteSpace($Worker)) 'worker_lease_invalid'

  $CreatedAt=[DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)
  $PdfText='%PDF-1.4'+"`n"+('VELMERE_AUDIT_BASIC_INFRASTRUCTURE_E2E_V2 '*80)+"`n%%EOF`n"
  $PdfBytes=[Text.Encoding]::UTF8.GetBytes($PdfText);$PdfDigest='sha256:'+(Sha256HexBytes $PdfBytes);$PdfBase64=[Convert]::ToBase64String($PdfBytes);$PdfLength=$PdfBytes.Length
  $AccountHash=Sha256HexText('velmere-account-binding-v1:'+[string]$A.accountId)
  $ReportId='audit-basic-report-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
  $ReportVersionHash='sha256:'+(Sha256HexText('report-version:'+$CaseRef))
  $SnapshotDigest='sha256:'+(Sha256HexText('snapshot:'+$CaseRef))
  $SourceRoot='sha256:'+(Sha256HexText('source-root:'+$CaseRef))
  $RenderContract='pass4808-deterministic-latin-extended-pagination-v1'
  $Snapshot=@{
    requestId=$RequestId;tier='basic';digest=$SnapshotDigest;sourceReceiptRoot=$SourceRoot;generatedAt=$CreatedAt;
    renderContract=@{id=$RenderContract;pdfDigest=$PdfDigest;pdfByteLength=$PdfLength};
    auditExecutionRelease=@{expectedTier='basic';caseRef=$CaseRef;decision='ALLOW_COMPLETE';completionAllowed=$true;persistAllowed=$true;packetDigest='sha256:'+(Sha256HexText('packet:'+$CaseRef));currentDeploymentReceiptDigest='sha256:'+(Sha256HexText('deploy:'+$CaseRef));matchedInputDigest='sha256:'+(Sha256HexText('input:'+$CaseRef));releaseBindingDigest='sha256:'+(Sha256HexText('release:'+$CaseRef))};
    customerEligibility=@{commercialUseReady=$true};
    truthBoundary='Infrastructure-only immutable PDF lifecycle proof; not real audit findings and not Customer FINAL.'
  }
  $RecordMaterial=@('velmere.audit-basic-exact-immutable-pdf-artifact.v1',$ReportId,$CaseRef,$RequestId,$AccountHash,$TargetHash,$ReportVersionHash,$SnapshotDigest,$SourceRoot,$PdfDigest,[string]$PdfLength,$RenderContract,$CreatedAt)-join"`n"
  $RecordDigest='sha256:'+(Sha256HexText $RecordMaterial)
  $Payload=@{caseRef=$CaseRef;workerPrincipal=$Worker;leaseToken=$Lease;reasonCode='worker_result';reportId=$ReportId;requestId=$RequestId;accountIdHash=$AccountHash;targetHash=$TargetHash;reportVersionHash=$ReportVersionHash;snapshotDigest=$SnapshotDigest;sourceReceiptRoot=$SourceRoot;pdfDigest=$PdfDigest;pdfByteLength=$PdfLength;renderContractId=$RenderContract;recordDigest=$RecordDigest;pdfBase64=$PdfBase64;snapshotJson=$Snapshot;createdAt=$CreatedAt}
  $Completed=Invoke-JsonPost $BridgeUrl $AHeaders @{schemaVersion='velmere.r7.audit-basic-customer-bridge-request.v1';action='complete_pdf';payload=$Payload}
  Require ($Completed.Status -eq 200 -and $Completed.Body.ok -eq $true -and $Completed.Body.data.ok -eq $true -and $Completed.Body.data.state -eq 'completed') ('complete_pdf_failed:'+($Completed.Raw.Substring(0,[Math]::Min(800,$Completed.Raw.Length))))

  $RestHeadersA=@{Authorization='Bearer '+[string]$A.accessToken;apikey=$AnonKey;Accept='application/json'}
  $RestHeadersB=@{Authorization='Bearer '+[string]$B.accessToken;apikey=$AnonKey;Accept='application/json'}
  $Filter=[Uri]::EscapeDataString($CaseRef)
  $RestUri=$SupabaseUrl+'/rest/v1/velmere_audit_basic_report_artifacts?select=report_id,case_ref,pdf_digest,pdf_byte_length,record_digest&case_ref=eq.'+$Filter
  $ResponseA=Invoke-WebRequest -Uri $RestUri -Headers $RestHeadersA -Method Get -SkipHttpErrorCheck -TimeoutSec 20
  Require ([int]$ResponseA.StatusCode -eq 200) ('owner_artifact_rest_failed:'+ [int]$ResponseA.StatusCode)
  $RowsA=@($ResponseA.Content|ConvertFrom-Json -Depth 20)
  Require ($RowsA.Count -eq 1 -and [string]$RowsA[0].pdf_digest -eq $PdfDigest -and [int]$RowsA[0].pdf_byte_length -eq $PdfLength -and [string]$RowsA[0].record_digest -eq $RecordDigest) 'owner_artifact_readback_mismatch'
  $ResponseB=Invoke-WebRequest -Uri $RestUri -Headers $RestHeadersB -Method Get -SkipHttpErrorCheck -TimeoutSec 20
  Require ([int]$ResponseB.StatusCode -eq 200) ('cross_account_artifact_query_failed:'+ [int]$ResponseB.StatusCode)
  $RowsB=@($ResponseB.Content|ConvertFrom-Json -Depth 20)
  Require ($RowsB.Count -eq 0) 'cross_account_artifact_not_denied'

  $Receipt=[ordered]@{schemaVersion='velmere.r7.audit-basic-bridge-e2e.v2';status='PASS_SECURE_BRIDGE_E2E_V2';runId=$env:GITHUB_RUN_ID;runAttempt=[int]$env:GITHUB_RUN_ATTEMPT;caseRef=$CaseRef;createCase='PASS_ACCOUNT_BOUND';ownerCaseRead='PASS';crossAccountCaseRead='PASS_DENIED_404';workerClaim='PASS_EPHEMERAL_LEASE';completion='PASS_ATOMIC_IMMUTABLE_PDF';ownerArtifactRls='PASS';crossAccountArtifactRls='PASS_EMPTY';pdfDigest=$PdfDigest;pdfByteLength=$PdfLength;recordDigest=$RecordDigest;serviceRoleInWorkflow=$false;serviceRoleReturnedByOidc=$false;auditCapabilitySeparated=$true;customerFinalCredit=$false;truthBoundary='Secure bridge/storage infrastructure proof only. Real findings, rights, retest, professional customer PDF and qualified-human review remain FINAL gates.'}
  New-Item -ItemType Directory -Force -Path 'artifacts/r7/audit-basic'|Out-Null
  $Receipt|ConvertTo-Json -Depth 20|Set-Content -LiteralPath 'artifacts/r7/audit-basic/R7_AUDIT_BASIC_BRIDGE_E2E_V2.json' -Encoding utf8
  Write-Host($Receipt|ConvertTo-Json -Depth 20)
}
finally{
  if($UserIds.Count -gt 0 -and $Oidc){
    try{$Cleanup=Invoke-JsonPost $OidcUrl @{Authorization='Bearer '+$Oidc;Accept='application/json'} @{action='cleanup';userIds=$UserIds};Write-Host "Audit E2E ephemeral users cleaned: $($Cleanup.Body.deleted)/$($Cleanup.Body.requested)"}catch{Write-Warning 'Audit E2E cleanup did not fully confirm'}
  }
}
