$ErrorActionPreference = 'Stop'

$Source = Join-Path (Get-Location).Path 'diagnostic-current/run-r7-browser-current-e2e.ps1'
if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw 'base_browser_e2e_harness_missing' }
$Runtime = Join-Path $env:RUNNER_TEMP 'run-r7-browser-promoted-successor-e2e-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# Replace only transport/harness plumbing. No product source is patched here.
$StartMarker = '  # Reconstruct and apply the exact current successor patch.'
$EndMarker = '  # Verify every exact current successor byte, not merely the patch application exit code.'
$Start = $Text.IndexOf($StartMarker, [StringComparison]::Ordinal)
$End = $Text.IndexOf($EndMarker, $Start + $StartMarker.Length, [StringComparison]::Ordinal)
if ($Start -lt 0 -or $End -lt 0 -or $End -le $Start) { throw 'promoted_transport_block_anchor_missing' }

$TransportBlock = @'
  # Reconstruct and apply the exact promoted Browser+Audit successor patch (v4 text transport).
  $PatchReceiptPath = 'r7-delta-v2/R7_DELTA_SUCCESSOR_PATCH_RECEIPT_V4.json'
  if ((Get-FileHash -LiteralPath $PatchReceiptPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_PATCH_RECEIPT_SHA256) { throw 'patch_receipt_sha_mismatch' }
  $PatchReceipt = Get-Content -LiteralPath $PatchReceiptPath -Raw | ConvertFrom-Json
  if ($PatchReceipt.schemaVersion -ne 'velmere.r7.delta-successor-patch-transport.v4' -or $PatchReceipt.status -ne 'PASS_DETERMINISTIC_EXACT_PATCH_BUILT') { throw 'patch_receipt_invalid' }
  if ([string]$PatchReceipt.target.executionSliceAggregateSha256 -ne $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -or
      [string]$PatchReceipt.target.executionSliceManifestSha256 -ne $env:R7_EXECUTION_SLICE_MANIFEST_SHA256 -or
      [string]$PatchReceipt.target.fullSourceAggregateSha256 -ne $env:R7_FULL_SOURCE_AGGREGATE_SHA256 -or
      [string]$PatchReceipt.target.fullSourceManifestSha256 -ne $env:R7_FULL_SOURCE_MANIFEST_SHA256 -or
      [int]$PatchReceipt.target.fileCount -ne [int]$env:R7_FILE_COUNT -or
      [int64]$PatchReceipt.target.payloadByteLength -ne [int64]$env:R7_PAYLOAD_BYTE_LENGTH -or
      [string]$PatchReceipt.target.packageJsonSha256 -ne $env:R7_PACKAGE_JSON_SHA256 -or
      [string]$PatchReceipt.target.packageLockSha256 -ne $env:R7_PACKAGE_LOCK_SHA256) { throw 'patch_target_binding_invalid' }
  if ([int]$PatchReceipt.patch.chunkCount -ne [int]$env:R7_PATCH_CHUNK_COUNT -or
      [int64]$PatchReceipt.patch.gzip.byteLength -ne [int64]$env:R7_PATCH_GZIP_BYTE_LENGTH -or
      [string]$PatchReceipt.patch.gzip.sha256 -ne $env:R7_PATCH_GZIP_SHA256 -or
      [int64]$PatchReceipt.patch.base64ByteLength -ne [int64]$env:R7_PATCH_BASE64_BYTE_LENGTH -or
      [int64]$PatchReceipt.patch.byteLength -ne [int64]$env:R7_PATCH_BYTE_LENGTH -or
      [string]$PatchReceipt.patch.sha256 -ne $env:R7_PATCH_SHA256) { throw 'patch_transport_binding_invalid' }

  $ObservedPatchChunks = @(Get-ChildItem -LiteralPath 'r7-delta-v2/patch-gzip-b64' -File | Sort-Object Name)
  $ExpectedPatchNames = @($PatchReceipt.patch.chunks | ForEach-Object { [string]$_.name }) | Sort-Object
  $ObservedPatchNames = @($ObservedPatchChunks | ForEach-Object { $_.Name }) | Sort-Object
  if ($ObservedPatchChunks.Count -ne [int]$env:R7_PATCH_CHUNK_COUNT -or ($ExpectedPatchNames -join "`n") -ne ($ObservedPatchNames -join "`n")) { throw 'patch_chunk_path_set_mismatch' }
  $PatchEncodedParts = [System.Collections.Generic.List[string]]::new()
  foreach ($Row in @($PatchReceipt.patch.chunks)) {
    $Path = 'r7-delta-v2/patch-gzip-b64/' + [string]$Row.name
    if ((Get-Item -LiteralPath $Path).Length -ne [int64]$Row.byteLength) { throw "patch_chunk_length_mismatch:$Path" }
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$Row.sha256) { throw "patch_chunk_sha_mismatch:$Path" }
    $PatchEncodedParts.Add([IO.File]::ReadAllText($Path, [Text.Encoding]::ASCII))
  }
  $PatchEncoded = [string]::Concat($PatchEncodedParts)
  if ([Text.Encoding]::ASCII.GetByteCount($PatchEncoded) -ne [int64]$env:R7_PATCH_BASE64_BYTE_LENGTH) { throw 'patch_base64_length_mismatch' }
  $PatchGzip = Join-Path $Root 'diagnostic-current/work/current-v4.patch.gz'
  try { [IO.File]::WriteAllBytes($PatchGzip, [Convert]::FromBase64String($PatchEncoded)) } catch { throw 'patch_base64_decode_failed' }
  if ((Get-Item -LiteralPath $PatchGzip).Length -ne [int64]$env:R7_PATCH_GZIP_BYTE_LENGTH) { throw 'patch_gzip_length_mismatch' }
  if ((Get-FileHash -LiteralPath $PatchGzip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_PATCH_GZIP_SHA256) { throw 'patch_gzip_sha_mismatch' }
  $PatchPath = Join-Path $Root 'diagnostic-current/work/current-v4.patch'
  $Input = [IO.File]::OpenRead($PatchGzip)
  $Gzip = [IO.Compression.GzipStream]::new($Input, [IO.Compression.CompressionMode]::Decompress)
  $Output = [IO.File]::Create($PatchPath)
  try { $Gzip.CopyTo($Output) } finally { $Output.Dispose(); $Gzip.Dispose(); $Input.Dispose() }
  if ((Get-Item -LiteralPath $PatchPath).Length -ne [int64]$env:R7_PATCH_BYTE_LENGTH) { throw 'patch_length_mismatch' }
  if ((Get-FileHash -LiteralPath $PatchPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $env:R7_PATCH_SHA256) { throw 'patch_sha_mismatch' }
  $env:GIT_CEILING_DIRECTORIES = $Root
  Push-Location $Work
  try {
    git -c core.autocrlf=false apply --check --no-index $PatchPath
    Assert-Exit 'promoted successor patch check'
    git -c core.autocrlf=false apply --no-index $PatchPath
    Assert-Exit 'promoted successor patch apply'
  } finally { Pop-Location }

'@
$Text = $Text.Substring(0, $Start) + $TransportBlock + $Text.Substring($End)

# The promoted source already contains both secure bridge clients; only endpoint configuration belongs in the harness.
$CapabilityAnchor = '  $env:VELMERE_BROWSER_SERVER_CAPABILITY = [string]$Provision.serverCapability'
if (([regex]::Matches($Text, [regex]::Escape($CapabilityAnchor))).Count -ne 1) { throw 'bridge_env_anchor_mismatch' }
$Text = $Text.Replace(
  $CapabilityAnchor,
  $CapabilityAnchor + "`r`n  `$env:VELMERE_ACCOUNT_ARTIFACT_WRITE_BRIDGE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-artifact-write-bridge'" +
  "`r`n  `$env:VELMERE_DURABLE_COMPUTATION_BRIDGE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-durable-computation-bridge'"
)

# Use the canonical localhost host expected by the same-origin guard.
$Text = $Text.Replace("'http://127.0.0.1:3100'", "'http://localhost:3100'")

# Safe split probe: prove the same ephemeral USER_A JWT and user-RLS account binding before Next.js consumes it.
$AnonAnchor = "  `$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'"
if (([regex]::Matches($Text, [regex]::Escape($AnonAnchor))).Count -ne 1) { throw 'jwt_probe_anchor_mismatch' }
$JwtProbe = @'
  $JwtProbeHeaders = @{
    Authorization = "Bearer $([string]$Provision.a.accessToken)"
    apikey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  $AuthProbe = Invoke-WebRequest -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/auth/v1/user" -Headers $JwtProbeHeaders -Method Get -SkipHttpErrorCheck -TimeoutSec 15
  if ([int]$AuthProbe.StatusCode -ne 200) { throw "direct_supabase_auth_probe_failed:$([int]$AuthProbe.StatusCode)" }
  $RpcProbeHeaders = @{
    Authorization = "Bearer $([string]$Provision.a.accessToken)"
    apikey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
    'content-type' = 'application/json'
  }
  $RpcProbe = Invoke-WebRequest -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/velmere_current_account_id" -Headers $RpcProbeHeaders -Method Post -Body '{}' -SkipHttpErrorCheck -TimeoutSec 15
  if ([int]$RpcProbe.StatusCode -ne 200) { throw "direct_supabase_binding_rpc_failed:$([int]$RpcProbe.StatusCode)" }
  $RpcAccount = [string](ConvertFrom-Json ([string]$RpcProbe.Content))
  if ($RpcAccount -ne [string]$Provision.a.accountId) { throw 'direct_supabase_binding_rpc_account_mismatch' }
  Write-Host 'Direct Supabase USER_A JWT Auth + user-RLS account-binding RPC PASS.'
'@
$Text = $Text.Replace($AnonAnchor, $AnonAnchor + "`r`n" + $JwtProbe)

# Prevent a stale legacy harness from being silently accepted.
if ($Text.Contains('r7-delta/R7_DELTA_SUCCESSOR_PATCH_RECEIPT.json')) { throw 'legacy_patch_transport_remained' }
if ($Text.Contains('run-r7-browser-current-e2e-authfix-candidate')) { throw 'candidate_wrapper_reference_remained' }
if ($Text.Contains('patch-browser-zero-vercel-durable-bridge-candidate')) { throw 'candidate_product_patch_reference_remained' }
if ($Text.Contains('patch-browser-durable-computation-store-bridge-candidate')) { throw 'candidate_product_patch_reference_remained' }

[IO.File]::WriteAllText($Runtime, $Text, [Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $Runtime
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$ReceiptPath = Join-Path (Join-Path (Get-Location).Path 'r7-work') 'R7_BROWSER_BASIC_CURRENT_SUCCESSOR_ZERO_VERCEL_E2E.json'
if (-not (Test-Path -LiteralPath $ReceiptPath -PathType Leaf)) { throw 'promoted_browser_e2e_receipt_missing' }
$Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
$Receipt | Add-Member -NotePropertyName exactPromotedSourceBytes -NotePropertyValue $true -Force
$Receipt | Add-Member -NotePropertyName productHotfixAppliedDuringE2E -NotePropertyValue $false -Force
$Receipt | Add-Member -NotePropertyName promotedFullSourceAggregateSha256 -NotePropertyValue $env:R7_FULL_SOURCE_AGGREGATE_SHA256 -Force
$Receipt | Add-Member -NotePropertyName promotedExecutionSliceAggregateSha256 -NotePropertyValue $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -Force
$Receipt | ConvertTo-Json -Depth 24 | Set-Content -LiteralPath $ReceiptPath -Encoding utf8
Write-Host 'Browser Basic promoted-source zero-Vercel E2E PASS; no product hotfix was applied by the harness.'
