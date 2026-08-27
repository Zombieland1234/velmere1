$ErrorActionPreference='Stop'

$Source = Join-Path (Get-Location).Path 'r7-harness/run-r7-browser-promoted-successor-e2e.ps1'
if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw 'promoted_browser_e2e_harness_missing' }
$Runtime = Join-Path $env:RUNNER_TEMP 'run-r7-browser-envfix-successor-e2e-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# The first delta still targets the previously promoted Browser+Audit source. Give that
# transport its own expected identity while leaving the generated product E2E verifier
# bound to the final env-contract-fixed source identity.
$Replacements = @(
  @{ Old='$env:R7_EXECUTION_SLICE_AGGREGATE_SHA256'; New='$env:R7_PROMOTED_EXECUTION_SLICE_AGGREGATE_SHA256' },
  @{ Old='$env:R7_EXECUTION_SLICE_MANIFEST_SHA256'; New='$env:R7_PROMOTED_EXECUTION_SLICE_MANIFEST_SHA256' },
  @{ Old='$env:R7_FULL_SOURCE_AGGREGATE_SHA256'; New='$env:R7_PROMOTED_FULL_SOURCE_AGGREGATE_SHA256' },
  @{ Old='$env:R7_FULL_SOURCE_MANIFEST_SHA256'; New='$env:R7_PROMOTED_FULL_SOURCE_MANIFEST_SHA256' },
  @{ Old='$env:R7_FILE_COUNT'; New='$env:R7_PROMOTED_FILE_COUNT' },
  @{ Old='$env:R7_PAYLOAD_BYTE_LENGTH'; New='$env:R7_PROMOTED_PAYLOAD_BYTE_LENGTH' }
)
foreach ($Pair in $Replacements) { $Text=$Text.Replace([string]$Pair.Old,[string]$Pair.New) }

# Insert the exact seven-file environment-contract/identity overlay after the promoted
# delta has been applied and before the base harness verifies every final source byte.
$Anchor = "  } finally { Pop-Location }`n`n'@"
if (([regex]::Matches($Text,[regex]::Escape($Anchor))).Count -ne 1) { throw 'envfix_overlay_anchor_mismatch' }
$Overlay = @'
  } finally { Pop-Location }

  # Apply the exact env-contract overlay that repaired the sole Windows v3 51/52 failure.
  $EnvReceiptPath='r7-envfix-v4/R7_ENV_CONTRACT_FIX_PATCH_RECEIPT.json'
  if ((Get-FileHash -LiteralPath $EnvReceiptPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_ENVFIX_RECEIPT_SHA256) { throw 'envfix_receipt_sha_mismatch' }
  $EnvReceipt=Get-Content -LiteralPath $EnvReceiptPath -Raw | ConvertFrom-Json
  if ($EnvReceipt.schemaVersion -ne 'velmere.r7.env-contract-fix-overlay.v1' -or $EnvReceipt.status -ne 'PASS_DETERMINISTIC_EXACT_OVERLAY_BUILT') { throw 'envfix_receipt_invalid' }
  if ([string]$EnvReceipt.base.executionSliceAggregateSha256 -ne $env:R7_PROMOTED_EXECUTION_SLICE_AGGREGATE_SHA256 -or
      [string]$EnvReceipt.base.executionSliceManifestSha256 -ne $env:R7_PROMOTED_EXECUTION_SLICE_MANIFEST_SHA256 -or
      [string]$EnvReceipt.base.fullSourceAggregateSha256 -ne $env:R7_PROMOTED_FULL_SOURCE_AGGREGATE_SHA256 -or
      [string]$EnvReceipt.base.fullSourceManifestSha256 -ne $env:R7_PROMOTED_FULL_SOURCE_MANIFEST_SHA256 -or
      [int]$EnvReceipt.base.fileCount -ne [int]$env:R7_PROMOTED_FILE_COUNT -or
      [int64]$EnvReceipt.base.payloadByteLength -ne [int64]$env:R7_PROMOTED_PAYLOAD_BYTE_LENGTH) { throw 'envfix_base_binding_invalid' }
  if ([string]$EnvReceipt.target.executionSliceAggregateSha256 -ne $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -or
      [string]$EnvReceipt.target.executionSliceManifestSha256 -ne $env:R7_EXECUTION_SLICE_MANIFEST_SHA256 -or
      [string]$EnvReceipt.target.fullSourceAggregateSha256 -ne $env:R7_FULL_SOURCE_AGGREGATE_SHA256 -or
      [string]$EnvReceipt.target.fullSourceManifestSha256 -ne $env:R7_FULL_SOURCE_MANIFEST_SHA256 -or
      [int]$EnvReceipt.target.fileCount -ne [int]$env:R7_FILE_COUNT -or
      [int64]$EnvReceipt.target.payloadByteLength -ne [int64]$env:R7_PAYLOAD_BYTE_LENGTH) { throw 'envfix_target_binding_invalid' }
  if ([int64]$EnvReceipt.patch.byteLength -ne [int64]$env:R7_ENVFIX_PATCH_BYTE_LENGTH -or
      [string]$EnvReceipt.patch.sha256 -ne $env:R7_ENVFIX_PATCH_SHA256 -or
      [int64]$EnvReceipt.patch.gzip.byteLength -ne [int64]$env:R7_ENVFIX_GZIP_BYTE_LENGTH -or
      [string]$EnvReceipt.patch.gzip.sha256 -ne $env:R7_ENVFIX_GZIP_SHA256 -or
      [int64]$EnvReceipt.patch.gzip.base64ByteLength -ne [int64]$env:R7_ENVFIX_BASE64_BYTE_LENGTH -or
      [int]$EnvReceipt.patch.gzip.chunkCount -ne [int]$env:R7_ENVFIX_CHUNK_COUNT) { throw 'envfix_transport_binding_invalid' }

  $ObservedEnvChunks=@(Get-ChildItem -LiteralPath 'r7-envfix-v4/patch-gzip-b64' -File | Sort-Object Name)
  $ExpectedEnvNames=@($EnvReceipt.patch.chunks | ForEach-Object { [string]$_.name }) | Sort-Object
  $ObservedEnvNames=@($ObservedEnvChunks | ForEach-Object { $_.Name }) | Sort-Object
  if ($ObservedEnvChunks.Count -ne [int]$env:R7_ENVFIX_CHUNK_COUNT -or ($ExpectedEnvNames -join "`n") -ne ($ObservedEnvNames -join "`n")) { throw 'envfix_chunk_path_set_mismatch' }
  $EnvEncodedParts=[System.Collections.Generic.List[string]]::new()
  foreach($Row in @($EnvReceipt.patch.chunks)) {
    $P='r7-envfix-v4/patch-gzip-b64/'+[string]$Row.name
    if ((Get-Item -LiteralPath $P).Length -ne [int64]$Row.byteLength) { throw "envfix_chunk_length_mismatch:$P" }
    if ((Get-FileHash -LiteralPath $P -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$Row.sha256) { throw "envfix_chunk_sha_mismatch:$P" }
    $EnvEncodedParts.Add([IO.File]::ReadAllText($P,[Text.Encoding]::ASCII))
  }
  $EnvEncoded=[string]::Concat($EnvEncodedParts)
  if ([Text.Encoding]::ASCII.GetByteCount($EnvEncoded) -ne [int64]$env:R7_ENVFIX_BASE64_BYTE_LENGTH) { throw 'envfix_base64_length_mismatch' }
  $EnvGzip=Join-Path $Root 'diagnostic-current/work/envfix.patch.gz'
  try { [IO.File]::WriteAllBytes($EnvGzip,[Convert]::FromBase64String($EnvEncoded)) } catch { throw 'envfix_base64_decode_failed' }
  if ((Get-Item -LiteralPath $EnvGzip).Length -ne [int64]$env:R7_ENVFIX_GZIP_BYTE_LENGTH) { throw 'envfix_gzip_length_mismatch' }
  if ((Get-FileHash -LiteralPath $EnvGzip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_ENVFIX_GZIP_SHA256) { throw 'envfix_gzip_sha_mismatch' }
  $EnvPatch=Join-Path $Root 'diagnostic-current/work/envfix.patch'
  $Input=[IO.File]::OpenRead($EnvGzip);$Gzip=[IO.Compression.GzipStream]::new($Input,[IO.Compression.CompressionMode]::Decompress);$Output=[IO.File]::Create($EnvPatch)
  try { $Gzip.CopyTo($Output) } finally { $Output.Dispose();$Gzip.Dispose();$Input.Dispose() }
  if ((Get-Item -LiteralPath $EnvPatch).Length -ne [int64]$env:R7_ENVFIX_PATCH_BYTE_LENGTH) { throw 'envfix_patch_length_mismatch' }
  if ((Get-FileHash -LiteralPath $EnvPatch -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_ENVFIX_PATCH_SHA256) { throw 'envfix_patch_sha_mismatch' }
  Push-Location $Work
  try {
    git -c core.autocrlf=false apply --check --no-index $EnvPatch
    Assert-Exit 'envfix overlay check'
    git -c core.autocrlf=false apply --no-index $EnvPatch
    Assert-Exit 'envfix overlay apply'
  } finally { Pop-Location }

'@
$Text=$Text.Replace($Anchor,$Overlay+"'@")

[IO.File]::WriteAllText($Runtime,$Text,[Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $Runtime
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$ReceiptPath=Join-Path (Join-Path (Get-Location).Path 'r7-work') 'R7_BROWSER_BASIC_CURRENT_SUCCESSOR_ZERO_VERCEL_E2E.json'
if (-not (Test-Path -LiteralPath $ReceiptPath -PathType Leaf)) { throw 'envfix_browser_e2e_receipt_missing' }
$Receipt=Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
$Receipt | Add-Member -NotePropertyName exactPromotedSourceBytes -NotePropertyValue $true -Force
$Receipt | Add-Member -NotePropertyName exactEnvFixedSourceBytes -NotePropertyValue $true -Force
$Receipt | Add-Member -NotePropertyName productHotfixAppliedDuringE2E -NotePropertyValue $false -Force
$Receipt | Add-Member -NotePropertyName envContractOverlayApplied -NotePropertyValue $true -Force
$Receipt | Add-Member -NotePropertyName promotedFullSourceAggregateSha256 -NotePropertyValue $env:R7_FULL_SOURCE_AGGREGATE_SHA256 -Force
$Receipt | Add-Member -NotePropertyName promotedExecutionSliceAggregateSha256 -NotePropertyValue $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -Force
$Receipt | ConvertTo-Json -Depth 24 | Set-Content -LiteralPath $ReceiptPath -Encoding utf8
Write-Host 'Browser Basic exact env-contract-fixed source E2E PASS; no product hotfix was applied.'
