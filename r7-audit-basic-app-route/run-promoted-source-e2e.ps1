param(
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-Sha256Bytes([byte[]]$Bytes) {
  return ([BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($Bytes))).Replace('-', '').ToLowerInvariant()
}

function Get-Sha256Text([string]$Text) {
  return Get-Sha256Bytes ([Text.Encoding]::UTF8.GetBytes($Text))
}

function Invoke-JsonPost([string]$Uri, [hashtable]$Headers, [object]$Body) {
  $Json = $Body | ConvertTo-Json -Depth 40 -Compress
  $Response = Invoke-WebRequest -Uri $Uri -Method Post -Headers $Headers -ContentType 'application/json' -Body $Json -SkipHttpErrorCheck -TimeoutSec 30
  $Parsed = $null
  try { $Parsed = $Response.Content | ConvertFrom-Json -Depth 50 } catch {}
  return [pscustomobject]@{
    Status = [int]$Response.StatusCode
    Body = $Parsed
    Raw = [string]$Response.Content
  }
}

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$RequiredEnvironment = @(
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'AUDIT_OIDC_AUDIENCE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VELMERE_AUDIT_CUSTOMER_BRIDGE_URL',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
  'GITHUB_SHA',
  'R7_RISK_FULL_SOURCE_AGGREGATE_SHA256',
  'R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256',
  'R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256',
  'R7_RISK_BUNDLE_SHA256',
  'R7_AUDIT_EXACT_DEPLOYED_SOURCE_SHA256',
  'PROMOTED_SOURCE_AGGREGATE_SHA256',
  'PROMOTED_SOURCE_MANIFEST_SHA256',
  'PROMOTED_RENDERER_SHA256',
  'PROMOTED_HARNESS_SHA256',
  'PROMOTED_WORKFLOW_SHA256'
)
foreach ($Name in $RequiredEnvironment) {
  Assert-True (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) "environment_missing:$Name"
}

$Separator = if ($env:ACTIONS_ID_TOKEN_REQUEST_URL.Contains('?')) { '&' } else { '?' }
$TokenUri = $env:ACTIONS_ID_TOKEN_REQUEST_URL + $Separator + 'audience=' + [Uri]::EscapeDataString($env:AUDIT_OIDC_AUDIENCE)
$TokenResponse = Invoke-RestMethod -Uri $TokenUri -Headers @{ Authorization = 'Bearer ' + $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN } -TimeoutSec 20
$Oidc = [string]$TokenResponse.value
Assert-True ($Oidc.Split('.').Count -eq 3) 'audit_promoted_oidc_missing'
Write-Host "::add-mask::$Oidc"

$OidcUri = $env:NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/r7-audit-basic-app-candidate-oidc'
$OidcHeaders = @{ Authorization = 'Bearer ' + $Oidc; Accept = 'application/json' }
$Provision = Invoke-JsonPost $OidcUri $OidcHeaders @{ action = 'provision' }
Assert-True ($Provision.Status -eq 200 -and $Provision.Body.ok -eq $true) ('provision_failed:' + $Provision.Raw.Substring(0, [Math]::Min(400, $Provision.Raw.Length)))

$A = $Provision.Body.a
$B = $Provision.Body.b
$env:VELMERE_AUDIT_SERVER_CAPABILITY = [string]$Provision.Body.auditServerCapability
Assert-True (-not [string]::IsNullOrWhiteSpace($env:VELMERE_AUDIT_SERVER_CAPABILITY)) 'audit_server_capability_missing'
Write-Host "::add-mask::$env:VELMERE_AUDIT_SERVER_CAPABILITY"

$StdOut = Join-Path $env:RUNNER_TEMP 'audit-promoted-next.stdout.log'
$StdErr = Join-Path $env:RUNNER_TEMP 'audit-promoted-next.stderr.log'
$Next = $null
$LocaleResults = [System.Collections.Generic.List[object]]::new()

try {
  $Next = Start-Process -FilePath 'node' -ArgumentList @(
    'node_modules/next/dist/bin/next',
    'dev',
    '--hostname',
    'localhost',
    '--port',
    '3112'
  ) -WorkingDirectory (Join-Path $PWD 'r7-work') -PassThru -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr

  $Ready = $false
  for ($Attempt = 0; $Attempt -lt 60; $Attempt += 1) {
    Start-Sleep -Seconds 2
    try {
      $Probe = Invoke-WebRequest -Uri 'http://localhost:3112/' -Method Get -SkipHttpErrorCheck -TimeoutSec 5
      if ([int]$Probe.StatusCode -ge 200) { $Ready = $true; break }
    } catch {}
  }
  Assert-True $Ready 'next_dev_not_ready'

  $Local = 'http://localhost:3112'
  $AHeaders = @{ Authorization = 'Bearer ' + [string]$A.accessToken; Accept = 'application/json' }
  $BHeaders = @{ Authorization = 'Bearer ' + [string]$B.accessToken; Accept = 'application/json' }
  $DirectAHeaders = @{
    Authorization = 'Bearer ' + [string]$A.accessToken
    'x-velmere-audit-server-capability' = $env:VELMERE_AUDIT_SERVER_CAPABILITY
    Accept = 'application/json'
  }
  $Target = '0x6666666666666666666666666666666666666666'
  $TargetHash = 'sha256:' + (Get-Sha256Text ('velmere-audit-contract-target-v1:56:' + $Target))
  $AccountHash = Get-Sha256Text ('velmere-account-binding-v1:' + [string]$A.accountId)
  $Tsx = Join-Path $PWD 'r7-work/node_modules/.bin/tsx.cmd'
  Assert-True (Test-Path -LiteralPath $Tsx -PathType Leaf) 'tsx_runtime_missing'

  foreach ($Locale in @('pl', 'en', 'de')) {
    $RequestId = 'audit-promoted-' + $Locale + '-' + $env:GITHUB_RUN_ID + '-' + $env:GITHUB_RUN_ATTEMPT
    $CaseInput = @{
      caseId = $RequestId
      requestId = $RequestId
      targetKind = 'contract'
      targetPrivate = $Target
      targetHash = $TargetHash
      targetChainId = '56'
      targetChainName = 'BSC'
      displayLabel = 'Audit Basic promoted source ' + $Locale
      tier = 'basic'
      locale = $Locale
      status = 'queued_basic_prescreen'
      accountId = [string]$A.accountId
      accountEmail = $null
      entitlementRequired = $false
      entitlementVerified = $false
      analysisStarted = $false
      intakeReceipt = @{
        schemaVersion = 'velmere.r7.audit-basic-promoted-intake.v1'
        promotedSourceAggregateSha256 = $env:PROMOTED_SOURCE_AGGREGATE_SHA256
        customerFinalCredit = $false
      }
      sourceCandidatesProtected = @{
        auditUrl = $null
        docsUrl = $null
        githubUrl = $null
        website = $null
      }
    }

    $Create = Invoke-JsonPost ($Local + '/api/audit/basic/case') $AHeaders $CaseInput
    Assert-True ($Create.Status -eq 200 -and $Create.Body.ok -eq $true -and $Create.Body.data.ok -eq $true) ('local_case_create_failed:' + $Create.Raw.Substring(0, [Math]::Min(600, $Create.Raw.Length)))
    $CaseRef = [string]$Create.Body.data.caseRef
    Assert-True ($CaseRef -match '^AUD-[A-F0-9]{10}$') ('created_case_ref_invalid:' + $CaseRef)

    $OwnerCase = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/case?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $AHeaders -SkipHttpErrorCheck -TimeoutSec 20
    Assert-True ([int]$OwnerCase.StatusCode -eq 200) "owner_case_read_failed:$Locale"
    $CrossCase = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/case?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $BHeaders -SkipHttpErrorCheck -TimeoutSec 20
    Assert-True ([int]$CrossCase.StatusCode -eq 404) "cross_account_case_not_denied:$Locale"

    $Claim = Invoke-JsonPost $OidcUri $OidcHeaders @{ action = 'claim'; caseRef = $CaseRef }
    Assert-True ($Claim.Status -eq 200 -and $Claim.Body.claim.ok -eq $true) ('claim_failed:' + $Claim.Raw.Substring(0, [Math]::Min(500, $Claim.Raw.Length)))

    $CreatedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    $GeneratedPdfPath = Join-Path $env:RUNNER_TEMP ("audit-promoted-$Locale-$CaseRef.pdf")
    # Run tsx from the reconstructed application root so its exact tsconfig
    # path alias (`@/*`) resolves against r7-work rather than the control repo.
    Push-Location 'r7-work'
    try {
      $RenderRaw = & $Tsx 'scripts/r7-audit-basic-localized-pdf.ts' $Locale $GeneratedPdfPath $CaseRef $CreatedAt
      Assert-True ($LASTEXITCODE -eq 0) "localized_pdf_renderer_failed:$Locale"
    } finally {
      Pop-Location
    }
    $Render = ([string]::Join('', [string[]]$RenderRaw)) | ConvertFrom-Json -Depth 20
    Assert-True ($Render.schemaVersion -eq 'velmere.r7.audit-basic-localized-pdf-render.v1') "localized_pdf_receipt_invalid:$Locale"
    Assert-True ($Render.locale -eq $Locale -and $Render.documentId -eq $CaseRef) "localized_pdf_binding_invalid:$Locale"
    Assert-True ([int]$Render.unsupportedGlyphReplacements -eq 0 -and [int]$Render.pageCount -ge 1) "localized_pdf_typography_invalid:$Locale"

    [byte[]]$Pdf = [IO.File]::ReadAllBytes($GeneratedPdfPath)
    $PdfDigest = 'sha256:' + (Get-Sha256Bytes $Pdf)
    Assert-True ($PdfDigest -eq [string]$Render.pdfSha256 -and $Pdf.Length -eq [int]$Render.pdfByteLength) "localized_pdf_bytes_invalid:$Locale"

    $ReportId = 'audit-promoted-report-' + $Locale + '-' + $env:GITHUB_RUN_ID + '-' + $env:GITHUB_RUN_ATTEMPT
    $ReportVersion = 'sha256:' + (Get-Sha256Text ('rv:' + $CaseRef))
    $SnapshotDigest = 'sha256:' + (Get-Sha256Text ('snap:' + $CaseRef))
    $SourceRoot = 'sha256:' + (Get-Sha256Text ('src:' + $CaseRef))
    $Snapshot = @{
      requestId = $RequestId
      tier = 'basic'
      locale = $Locale
      digest = $SnapshotDigest
      sourceReceiptRoot = $SourceRoot
      generatedAt = $CreatedAt
      renderContract = @{
        id = 'pass4808-deterministic-latin-extended-pagination-v1'
        planDigest = [string]$Render.planDigest
        pageCount = [int]$Render.pageCount
        renderedRowCount = [int]$Render.renderedRowCount
        unsupportedGlyphReplacements = [int]$Render.unsupportedGlyphReplacements
        pdfDigest = $PdfDigest
        pdfByteLength = $Pdf.Length
      }
      auditExecutionRelease = @{
        expectedTier = 'basic'
        caseRef = $CaseRef
        decision = 'ALLOW_COMPLETE'
        completionAllowed = $true
        persistAllowed = $true
        packetDigest = 'sha256:' + (Get-Sha256Text ('packet:' + $CaseRef))
        currentDeploymentReceiptDigest = 'sha256:' + (Get-Sha256Text ('deploy:' + $CaseRef))
        matchedInputDigest = 'sha256:' + (Get-Sha256Text ('input:' + $CaseRef))
        releaseBindingDigest = 'sha256:' + (Get-Sha256Text ('release:' + $CaseRef))
      }
      customerEligibility = @{ commercialUseReady = $true }
    }
    $RecordMaterial = @(
      'velmere.audit-basic-exact-immutable-pdf-artifact.v1',
      $ReportId,
      $CaseRef,
      $RequestId,
      $AccountHash,
      $TargetHash,
      $ReportVersion,
      $SnapshotDigest,
      $SourceRoot,
      $PdfDigest,
      [string]$Pdf.Length,
      'pass4808-deterministic-latin-extended-pagination-v1',
      $CreatedAt
    ) -join "`n"
    $RecordDigest = 'sha256:' + (Get-Sha256Text $RecordMaterial)
    $Payload = @{
      caseRef = $CaseRef
      workerPrincipal = [string]$Claim.Body.workerPrincipal
      leaseToken = [string]$Claim.Body.leaseToken
      reasonCode = 'worker_result'
      reportId = $ReportId
      requestId = $RequestId
      accountIdHash = $AccountHash
      targetHash = $TargetHash
      reportVersionHash = $ReportVersion
      snapshotDigest = $SnapshotDigest
      sourceReceiptRoot = $SourceRoot
      pdfDigest = $PdfDigest
      pdfByteLength = $Pdf.Length
      renderContractId = 'pass4808-deterministic-latin-extended-pagination-v1'
      recordDigest = $RecordDigest
      pdfBase64 = [Convert]::ToBase64String($Pdf)
      snapshotJson = $Snapshot
      createdAt = $CreatedAt
    }

    $Done = Invoke-JsonPost $env:VELMERE_AUDIT_CUSTOMER_BRIDGE_URL $DirectAHeaders @{
      schemaVersion = 'velmere.r7.audit-basic-customer-bridge-request.v1'
      action = 'complete_pdf'
      caseRef = $CaseRef
      payload = $Payload
    }
    Assert-True ($Done.Status -eq 200 -and $Done.Body.data.ok -eq $true) ('direct_completion_failed:' + $Done.Raw.Substring(0, [Math]::Min(500, $Done.Raw.Length)))

    $OwnerPdfPath = Join-Path $env:RUNNER_TEMP ("audit-promoted-owner-$Locale-$CaseRef.pdf")
    $OwnerPdf = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $AHeaders -OutFile $OwnerPdfPath -PassThru -SkipHttpErrorCheck -TimeoutSec 30
    [byte[]]$Observed = [IO.File]::ReadAllBytes($OwnerPdfPath)
    Assert-True ([int]$OwnerPdf.StatusCode -eq 200 -and (Get-Sha256Bytes $Observed) -eq $PdfDigest.Substring(7) -and $Observed.Length -eq $Pdf.Length) "owner_pdf_identity_failed:$Locale"
    $CrossPdf = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $BHeaders -SkipHttpErrorCheck -TimeoutSec 20
    Assert-True ([int]$CrossPdf.StatusCode -eq 404) "cross_account_pdf_not_denied:$Locale"

    $Delete = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $AHeaders -Method Delete -SkipHttpErrorCheck -TimeoutSec 30
    $DeleteJson = $Delete.Content | ConvertFrom-Json -Depth 20
    Assert-True ([int]$Delete.StatusCode -eq 200 -and $DeleteJson.ok -eq $true) "backup_erase_failed:$Locale"
    $BackupId = [string]$DeleteJson.backupId
    Assert-True ($BackupId -match '^abk_[a-f0-9]{64}$') "backup_id_invalid:$Locale"
    $AfterErase = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $AHeaders -SkipHttpErrorCheck -TimeoutSec 20
    Assert-True ([int]$AfterErase.StatusCode -eq 404) "owner_pdf_visible_after_erase:$Locale"

    $Restore = Invoke-JsonPost ($Local + '/api/audit/basic/report/restore?caseRef=' + [Uri]::EscapeDataString($CaseRef)) $AHeaders @{ backupId = $BackupId }
    Assert-True ($Restore.Status -eq 200 -and $Restore.Body.ok -eq $true) ('restore_failed:' + $Restore.Raw.Substring(0, [Math]::Min(500, $Restore.Raw.Length)))
    $RestoredPath = Join-Path $env:RUNNER_TEMP ("audit-promoted-restored-$Locale-$CaseRef.pdf")
    $RestoredPdf = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $AHeaders -OutFile $RestoredPath -PassThru -SkipHttpErrorCheck -TimeoutSec 30
    [byte[]]$ObservedRestored = [IO.File]::ReadAllBytes($RestoredPath)
    Assert-True ([int]$RestoredPdf.StatusCode -eq 200 -and (Get-Sha256Bytes $ObservedRestored) -eq $PdfDigest.Substring(7) -and $ObservedRestored.Length -eq $Pdf.Length) "restored_pdf_identity_failed:$Locale"
    $CrossRestored = Invoke-WebRequest -Uri ($Local + '/api/audit/basic/report?caseRef=' + [Uri]::EscapeDataString($CaseRef)) -Headers $BHeaders -SkipHttpErrorCheck -TimeoutSec 20
    Assert-True ([int]$CrossRestored.StatusCode -eq 404) "post_restore_cross_account_not_denied:$Locale"

    $LocaleResults.Add([ordered]@{
      locale = $Locale
      caseRef = $CaseRef
      caseRefSource = 'DATABASE_RETURNED'
      ownerCaseRead = 'PASS_200'
      crossAccountCase = 'PASS_404'
      pdfDigest = $PdfDigest
      pdfByteLength = $Pdf.Length
      renderPlanDigest = [string]$Render.planDigest
      renderPageCount = [int]$Render.pageCount
      unsupportedGlyphReplacements = [int]$Render.unsupportedGlyphReplacements
      ownerPdf = 'PASS_BYTE_IDENTICAL'
      crossAccountPdf = 'PASS_404'
      erase = 'PASS'
      postEraseOwner = 'PASS_404'
      restore = 'PASS'
      restoredPdf = 'PASS_BYTE_IDENTICAL'
      postRestoreCrossAccount = 'PASS_404'
      recordDigest = $RecordDigest
    })
  }

  $Receipt = [ordered]@{
    schemaVersion = 'velmere.r7.audit-basic-app-route-promoted-source-e2e.v1'
    status = 'PASS_PROMOTED_CURRENT_SOURCE'
    github = @{
      runId = $env:GITHUB_RUN_ID
      runAttempt = [int]$env:GITHUB_RUN_ATTEMPT
      headSha = $env:GITHUB_SHA
    }
    baseSourceAuthority = @{
      fullSourceAggregateSha256 = $env:R7_RISK_FULL_SOURCE_AGGREGATE_SHA256
      executionSliceAggregateSha256 = $env:R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256
      executionSliceManifestSha256 = $env:R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256
      executionBundleSha256 = $env:R7_RISK_BUNDLE_SHA256
      exactDeployedSourceSha256 = $env:R7_AUDIT_EXACT_DEPLOYED_SOURCE_SHA256
    }
    sourceAuthorityModel = 'RISK_V5_BASE_PLUS_AUDIT_APP_ROUTE_PROMOTED_COMPONENTS_V1'
    promotedRouteOverlay = @{
      aggregateSha256 = $env:PROMOTED_SOURCE_AGGREGATE_SHA256
      files = @(
        @{ path = 'app/api/audit/basic/case/route.ts'; sha256 = '3cb537a14cd3b4ea5c8d842cf9ed2db6cdef76d58c0a607f3c3e02630902fa81' },
        @{ path = 'app/api/audit/basic/report/restore/route.ts'; sha256 = 'fa7acef144db355894157e54c01367f3ffba860745b4407a07b950799cece063' },
        @{ path = 'app/api/audit/basic/report/route.ts'; sha256 = '2d9e5a40e6d129850f3da99294074ff78ad308470897c542124a830a9fbc91f1' },
        @{ path = 'lib/security/audit-basic-customer-bridge-client.ts'; sha256 = 'cd058d8c57ae2f8185a4ac50c20eb7c2f45c1a5dd3d72a5694d36e9dc57b60f9' },
        @{ path = 'lib/security/pro-audit-pdf/embedded-font-data.ts'; sha256 = 'e0b08419f49573415c9d2537420fe6277752a1662c15f5d5d9c0f1d2d83d9fb9' }
      )
      manifestSha256 = $env:PROMOTED_SOURCE_MANIFEST_SHA256
      persistedOnBranch = $true
      copiedWithoutGeneration = $true
    }
    promotedSource = @{
      persistedOnBranch = $true
      copiedWithoutGeneration = $true
      aggregateSha256 = $env:PROMOTED_SOURCE_AGGREGATE_SHA256
      manifestSha256 = $env:PROMOTED_SOURCE_MANIFEST_SHA256
      rendererSha256 = $env:PROMOTED_RENDERER_SHA256
      harnessSha256 = $env:PROMOTED_HARNESS_SHA256
      workflowSha256 = $env:PROMOTED_WORKFLOW_SHA256
    }
    promotedSourceExact = $true
    candidateOnly = $false
    locales = @('pl', 'en', 'de')
    localeResults = $LocaleResults
    typecheck = 'PASS'
    targetedEslint = 'PASS'
    webpack = 'PASS'
    customerProvision = 'PASS_OWNER_OIDC'
    deterministicPdfRenderer = 'PASS_EMBEDDED_FONTS'
    accountIsolation = 'PASS_ALL_LOCALES'
    backupEraseRestore = 'PASS_ALL_LOCALES'
    serviceRoleInApplication = $false
    qualifiedHumanReviewSubstituted = $false
    customerFinalCredit = $false
    truthBoundary = 'This proves the persisted promoted Audit Basic customer routes and localized account-bound PDF lifecycle. It does not replace qualified-human finding review and does not itself write Customer FINAL.'
  }
  $Receipt | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $OutputPath -Encoding utf8
  Write-Host ($Receipt | ConvertTo-Json -Depth 50)
}
finally {
  if ($Next -and -not $Next.HasExited) {
    Stop-Process -Id $Next.Id -Force -ErrorAction SilentlyContinue
  }
  if ($A -and $B) {
    try {
      $null = Invoke-JsonPost $OidcUri $OidcHeaders @{
        action = 'cleanup'
        userIds = @([string]$A.userId, [string]$B.userId)
      }
    } catch {
      Write-Warning ('audit_promoted_cleanup_failed:' + $_.Exception.Message)
    }
  }
}
