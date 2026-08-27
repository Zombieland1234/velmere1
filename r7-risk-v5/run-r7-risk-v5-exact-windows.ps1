$ErrorActionPreference = 'Stop'

function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}
function Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$Root = (Get-Location).Path
$V4WorkflowPath = '.github/workflows/r7-successor-v4-exact-windows.yml'
Require (Test-Path -LiteralPath $V4WorkflowPath -PathType Leaf) 'v4_workflow_missing'

# Import the exact, commit-bound v4 Windows constants. The risk workflow overrides only
# the final source identity after retaining the v4 identity as the Risk overlay base.
$V4Workflow = [IO.File]::ReadAllText($V4WorkflowPath, [Text.Encoding]::UTF8)
$Pairs = [regex]::Matches($V4Workflow, "(?m)^      ([A-Z0-9_]+): '([^']*)'\s*$")
foreach ($Pair in $Pairs) {
  [Environment]::SetEnvironmentVariable([string]$Pair.Groups[1].Value, [string]$Pair.Groups[2].Value, 'Process')
}
foreach ($Name in @(
  'R7_BASE_PART_COUNT','R7_BASE_BUNDLE_SHA256','R7_BASE_EXECUTION_SLICE_AGGREGATE_SHA256','R7_BASE_TRANSPORT_RECEIPT_SHA256',
  'R7_PATCH_RECEIPT_SHA256','R7_PATCH_SHA256','R7_PATCH_BYTE_LENGTH','R7_PATCH_CHUNK_COUNT','R7_PATCH_GZIP_SHA256','R7_PATCH_GZIP_BYTE_LENGTH','R7_PATCH_BASE64_BYTE_LENGTH',
  'R7_PROMOTED_FILE_COUNT','R7_PROMOTED_PAYLOAD_BYTE_LENGTH','R7_PROMOTED_EXECUTION_SLICE_AGGREGATE_SHA256','R7_PROMOTED_EXECUTION_SLICE_MANIFEST_SHA256','R7_PROMOTED_FULL_SOURCE_AGGREGATE_SHA256','R7_PROMOTED_FULL_SOURCE_MANIFEST_SHA256',
  'R7_ENVFIX_RECEIPT_SHA256','R7_ENVFIX_PATCH_SHA256','R7_ENVFIX_PATCH_BYTE_LENGTH','R7_ENVFIX_GZIP_SHA256','R7_ENVFIX_GZIP_BYTE_LENGTH','R7_ENVFIX_BASE64_BYTE_LENGTH','R7_ENVFIX_CHUNK_COUNT',
  'R7_FILE_COUNT','R7_PAYLOAD_BYTE_LENGTH','R7_EXECUTION_SLICE_AGGREGATE_SHA256','R7_EXECUTION_SLICE_MANIFEST_SHA256','R7_FULL_SOURCE_AGGREGATE_SHA256','R7_FULL_SOURCE_MANIFEST_SHA256','R7_TARGET_BUNDLE_SHA256',
  'R7_PACKAGE_JSON_SHA256','R7_PACKAGE_LOCK_SHA256'
)) {
  Require (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, 'Process'))) "v4_environment_constant_missing:$Name"
}

# Preserve the last exact authority as the base of the Risk-only overlay.
$env:R7_RISK_BASE_FILE_COUNT = $env:R7_FILE_COUNT
$env:R7_RISK_BASE_PAYLOAD_BYTE_LENGTH = $env:R7_PAYLOAD_BYTE_LENGTH
$env:R7_RISK_BASE_EXECUTION_SLICE_AGGREGATE_SHA256 = $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256
$env:R7_RISK_BASE_EXECUTION_SLICE_MANIFEST_SHA256 = $env:R7_EXECUTION_SLICE_MANIFEST_SHA256
$env:R7_RISK_BASE_FULL_SOURCE_AGGREGATE_SHA256 = $env:R7_FULL_SOURCE_AGGREGATE_SHA256
$env:R7_RISK_BASE_FULL_SOURCE_MANIFEST_SHA256 = $env:R7_FULL_SOURCE_MANIFEST_SHA256
$env:R7_RISK_BASE_TARGET_BUNDLE_SHA256 = $env:R7_TARGET_BUNDLE_SHA256

$RiskReceiptPath = 'r7-risk-v5/R7_RISK_V5_PATCH_RECEIPT.json'
Require (Test-Path -LiteralPath $RiskReceiptPath -PathType Leaf) 'risk_v5_receipt_missing'
$RiskReceipt = Get-Content -LiteralPath $RiskReceiptPath -Raw | ConvertFrom-Json
Require ($RiskReceipt.schemaVersion -eq 'velmere.r7.risk-indicator-source-overlay.v1') 'risk_v5_receipt_schema_invalid'
Require ($RiskReceipt.status -eq 'PASS_DETERMINISTIC_EXACT_PATCH_BUILT') 'risk_v5_receipt_status_invalid'
Require ([string]$RiskReceipt.base.fullSourceAggregateSha256 -eq $env:R7_RISK_BASE_FULL_SOURCE_AGGREGATE_SHA256) 'risk_v5_base_full_source_mismatch'
Require ([string]$RiskReceipt.base.fullSourceManifestSha256 -eq $env:R7_RISK_BASE_FULL_SOURCE_MANIFEST_SHA256) 'risk_v5_base_full_manifest_mismatch'

# Bind the final Windows campaign to the Risk target, never to the preceding v4 bytes.
$env:R7_FILE_COUNT = [string]$RiskReceipt.target.executionSliceFileCount
$env:R7_PAYLOAD_BYTE_LENGTH = [string]$RiskReceipt.target.executionSlicePayloadByteLength
$env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 = [string]$RiskReceipt.target.executionSliceAggregateSha256
$env:R7_EXECUTION_SLICE_MANIFEST_SHA256 = [string]$RiskReceipt.target.executionSliceManifestSha256
$env:R7_FULL_SOURCE_AGGREGATE_SHA256 = [string]$RiskReceipt.target.fullSourceAggregateSha256
$env:R7_FULL_SOURCE_MANIFEST_SHA256 = [string]$RiskReceipt.target.fullSourceManifestSha256
$env:R7_TARGET_BUNDLE_SHA256 = [string]$RiskReceipt.target.executionBundleSha256
$env:R7_PACKAGE_JSON_SHA256 = [string]$RiskReceipt.target.packageJsonSha256
$env:R7_PACKAGE_LOCK_SHA256 = [string]$RiskReceipt.target.packageLockSha256
$env:R7_CANDIDATE = [string]$RiskReceipt.candidate
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:CI = '1'
$env:GIT_CEILING_DIRECTORIES = $Root
$env:VELMERE_PDF_FONT_PATH = Join-Path $Root 'r7-work/r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf'

# Reconstruct and verify the already promoted v4 runner transport.
$V4RunnerReceiptPath = 'r7-runner-v4/R7_WINDOWS_RUNNER_V4_RECEIPT.json'
Require (Test-Path -LiteralPath $V4RunnerReceiptPath -PathType Leaf) 'v4_runner_receipt_missing'
$V4RunnerReceipt = Get-Content -LiteralPath $V4RunnerReceiptPath -Raw | ConvertFrom-Json
Require ($V4RunnerReceipt.status -eq 'PASS_DETERMINISTIC_RUNNER_BUILT') 'v4_runner_receipt_status_invalid'
$Chunks = @(Get-ChildItem -LiteralPath 'r7-runner-v4/runner-gzip-b64' -File | Sort-Object Name)
Require ($Chunks.Count -eq [int]$V4RunnerReceipt.gzip.chunkCount) 'v4_runner_chunk_count_mismatch'
$ExpectedNames = @($V4RunnerReceipt.gzip.chunks | ForEach-Object { [string]$_.name }) | Sort-Object
$ObservedNames = @($Chunks | ForEach-Object { $_.Name }) | Sort-Object
Require (($ExpectedNames -join "`n") -eq ($ObservedNames -join "`n")) 'v4_runner_chunk_path_set_mismatch'
$EncodedParts = [System.Collections.Generic.List[string]]::new()
foreach ($Row in @($V4RunnerReceipt.gzip.chunks)) {
  $Path = 'r7-runner-v4/runner-gzip-b64/' + [string]$Row.name
  Require ((Get-Item -LiteralPath $Path).Length -eq [int64]$Row.byteLength) "v4_runner_chunk_length_mismatch:$Path"
  Require ((Sha256 $Path) -eq [string]$Row.sha256) "v4_runner_chunk_sha_mismatch:$Path"
  $EncodedParts.Add([IO.File]::ReadAllText($Path, [Text.Encoding]::ASCII))
}
$Encoded = [string]::Concat($EncodedParts)
Require ([Text.Encoding]::ASCII.GetByteCount($Encoded) -eq [int]$V4RunnerReceipt.gzip.base64ByteLength) 'v4_runner_base64_length_mismatch'
New-Item -ItemType Directory -Force -Path 'r7-risk-runner-work' | Out-Null
$GzipPath = 'r7-risk-runner-work/run-r7-v4-base.ps1.gz'
[IO.File]::WriteAllBytes($GzipPath, [Convert]::FromBase64String($Encoded))
Require ((Get-Item -LiteralPath $GzipPath).Length -eq [int]$V4RunnerReceipt.gzip.byteLength) 'v4_runner_gzip_length_mismatch'
Require ((Sha256 $GzipPath) -eq [string]$V4RunnerReceipt.gzip.sha256) 'v4_runner_gzip_sha_mismatch'
$V4RunnerPath = 'r7-risk-runner-work/run-r7-v4-base.ps1'
$Input = [IO.File]::OpenRead($GzipPath)
$Gzip = [IO.Compression.GzipStream]::new($Input, [IO.Compression.CompressionMode]::Decompress)
$Output = [IO.File]::Create($V4RunnerPath)
try { $Gzip.CopyTo($Output) } finally { $Output.Dispose(); $Gzip.Dispose(); $Input.Dispose() }
Require ((Get-Item -LiteralPath $V4RunnerPath).Length -eq [int]$V4RunnerReceipt.source.byteLength) 'v4_runner_source_length_mismatch'
Require ((Sha256 $V4RunnerPath) -eq [string]$V4RunnerReceipt.source.sha256) 'v4_runner_source_sha_mismatch'

# In the env-fix application block only, redirect final identity checks to the preserved
# v4 base. The later exact-byte verifier, builds, campaigns and deterministic rebuild
# remain bound to the new Risk target environment values above.
$RunnerText = [IO.File]::ReadAllText($V4RunnerPath, [Text.Encoding]::UTF8)
$EnvToken = 'r7-envfix-v4/R7_ENV_CONTRACT_FIX_PATCH_RECEIPT.json'
$EnvStart = $RunnerText.IndexOf($EnvToken, [StringComparison]::Ordinal)
Require ($EnvStart -ge 0) 'v4_runner_envfix_block_missing'
$VerifyToken = "const manifestBytes = fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.json');"
$VerifyIndex = $RunnerText.IndexOf($VerifyToken, $EnvStart, [StringComparison]::Ordinal)
Require ($VerifyIndex -gt $EnvStart) 'v4_runner_final_verifier_missing'
$PopToken = '} finally { Pop-Location }'
$PopIndex = $RunnerText.LastIndexOf($PopToken, $VerifyIndex, [StringComparison]::Ordinal)
Require ($PopIndex -gt $EnvStart) 'v4_runner_envfix_apply_end_missing'
$EnvApplyEnd = $PopIndex + $PopToken.Length
$EnvBlock = $RunnerText.Substring($EnvStart, $EnvApplyEnd - $EnvStart)
$ReplacementCount = 0
foreach ($Pair in @(
  @{ Old='$env:R7_FILE_COUNT'; New='$env:R7_RISK_BASE_FILE_COUNT' },
  @{ Old='$env:R7_PAYLOAD_BYTE_LENGTH'; New='$env:R7_RISK_BASE_PAYLOAD_BYTE_LENGTH' },
  @{ Old='$env:R7_EXECUTION_SLICE_AGGREGATE_SHA256'; New='$env:R7_RISK_BASE_EXECUTION_SLICE_AGGREGATE_SHA256' },
  @{ Old='$env:R7_EXECUTION_SLICE_MANIFEST_SHA256'; New='$env:R7_RISK_BASE_EXECUTION_SLICE_MANIFEST_SHA256' },
  @{ Old='$env:R7_FULL_SOURCE_AGGREGATE_SHA256'; New='$env:R7_RISK_BASE_FULL_SOURCE_AGGREGATE_SHA256' },
  @{ Old='$env:R7_FULL_SOURCE_MANIFEST_SHA256'; New='$env:R7_RISK_BASE_FULL_SOURCE_MANIFEST_SHA256' },
  @{ Old='$env:R7_TARGET_BUNDLE_SHA256'; New='$env:R7_RISK_BASE_TARGET_BUNDLE_SHA256' }
)) {
  $Count = ([regex]::Matches($EnvBlock, [regex]::Escape([string]$Pair.Old))).Count
  if ($Count -gt 0) {
    $EnvBlock = $EnvBlock.Replace([string]$Pair.Old, [string]$Pair.New)
    $ReplacementCount += $Count
  }
}
Require ($ReplacementCount -ge 6) "v4_runner_envfix_identity_rewrite_incomplete:$ReplacementCount"

$RiskApplyBlock = @'

# === Apply exact Risk Indicator v5 source overlay ===
$RiskReceiptPath = 'r7-risk-v5/R7_RISK_V5_PATCH_RECEIPT.json'
$RiskReceipt = Get-Content -LiteralPath $RiskReceiptPath -Raw | ConvertFrom-Json
if ($RiskReceipt.schemaVersion -ne 'velmere.r7.risk-indicator-source-overlay.v1' -or $RiskReceipt.status -ne 'PASS_DETERMINISTIC_EXACT_PATCH_BUILT') { throw 'risk_v5_receipt_invalid' }
if ([string]$RiskReceipt.base.fullSourceAggregateSha256 -ne $env:R7_RISK_BASE_FULL_SOURCE_AGGREGATE_SHA256 -or
    [string]$RiskReceipt.base.fullSourceManifestSha256 -ne $env:R7_RISK_BASE_FULL_SOURCE_MANIFEST_SHA256) { throw 'risk_v5_base_binding_invalid' }
if ([string]$RiskReceipt.target.fullSourceAggregateSha256 -ne $env:R7_FULL_SOURCE_AGGREGATE_SHA256 -or
    [string]$RiskReceipt.target.fullSourceManifestSha256 -ne $env:R7_FULL_SOURCE_MANIFEST_SHA256 -or
    [string]$RiskReceipt.target.executionSliceAggregateSha256 -ne $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -or
    [string]$RiskReceipt.target.executionSliceManifestSha256 -ne $env:R7_EXECUTION_SLICE_MANIFEST_SHA256 -or
    [int]$RiskReceipt.target.executionSliceFileCount -ne [int]$env:R7_FILE_COUNT -or
    [int64]$RiskReceipt.target.executionSlicePayloadByteLength -ne [int64]$env:R7_PAYLOAD_BYTE_LENGTH -or
    [string]$RiskReceipt.target.executionBundleSha256 -ne $env:R7_TARGET_BUNDLE_SHA256 -or
    [string]$RiskReceipt.target.packageJsonSha256 -ne $env:R7_PACKAGE_JSON_SHA256 -or
    [string]$RiskReceipt.target.packageLockSha256 -ne $env:R7_PACKAGE_LOCK_SHA256) { throw 'risk_v5_target_binding_invalid' }
if ([int]$RiskReceipt.patch.gzip.chunkCount -ne 1 -or [int]$RiskReceipt.patch.chunks.Count -ne 1) { throw 'risk_v5_chunk_denominator_invalid' }
$RiskRow = $RiskReceipt.patch.chunks[0]
$RiskChunkPath = 'r7-risk-v5/' + [string]$RiskRow.name
if (-not (Test-Path -LiteralPath $RiskChunkPath -PathType Leaf)) { throw 'risk_v5_chunk_missing' }
if ((Get-Item -LiteralPath $RiskChunkPath).Length -ne [int64]$RiskRow.byteLength) { throw 'risk_v5_chunk_length_mismatch' }
if ((Get-FileHash -LiteralPath $RiskChunkPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$RiskRow.sha256) { throw 'risk_v5_chunk_sha_mismatch' }
$RiskEncoded = [IO.File]::ReadAllText($RiskChunkPath, [Text.Encoding]::ASCII)
if ([Text.Encoding]::ASCII.GetByteCount($RiskEncoded) -ne [int64]$RiskReceipt.patch.gzip.base64ByteLength) { throw 'risk_v5_base64_length_mismatch' }
New-Item -ItemType Directory -Force -Path 'r7-risk-overlay-work' | Out-Null
$RiskGzipPath = 'r7-risk-overlay-work/risk-v5.patch.gz'
try { [IO.File]::WriteAllBytes($RiskGzipPath, [Convert]::FromBase64String($RiskEncoded)) } catch { throw 'risk_v5_base64_decode_failed' }
if ((Get-Item -LiteralPath $RiskGzipPath).Length -ne [int64]$RiskReceipt.patch.gzip.byteLength) { throw 'risk_v5_gzip_length_mismatch' }
if ((Get-FileHash -LiteralPath $RiskGzipPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$RiskReceipt.patch.gzip.sha256) { throw 'risk_v5_gzip_sha_mismatch' }
$RiskPatchPath = 'r7-risk-overlay-work/risk-v5.patch'
$RiskInput = [IO.File]::OpenRead($RiskGzipPath)
$RiskGzip = [IO.Compression.GzipStream]::new($RiskInput, [IO.Compression.CompressionMode]::Decompress)
$RiskOutput = [IO.File]::Create($RiskPatchPath)
try { $RiskGzip.CopyTo($RiskOutput) } finally { $RiskOutput.Dispose(); $RiskGzip.Dispose(); $RiskInput.Dispose() }
if ((Get-Item -LiteralPath $RiskPatchPath).Length -ne [int64]$RiskReceipt.patch.byteLength) { throw 'risk_v5_patch_length_mismatch' }
if ((Get-FileHash -LiteralPath $RiskPatchPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$RiskReceipt.patch.sha256) { throw 'risk_v5_patch_sha_mismatch' }
Push-Location 'r7-work'
try {
  git -c core.autocrlf=false apply --check --no-index (Resolve-Path -LiteralPath ('../' + $RiskPatchPath)).Path
  if ($LASTEXITCODE -ne 0) { throw "risk_v5_patch_check_failed:$LASTEXITCODE" }
  git -c core.autocrlf=false apply --no-index (Resolve-Path -LiteralPath ('../' + $RiskPatchPath)).Path
  if ($LASTEXITCODE -ne 0) { throw "risk_v5_patch_apply_failed:$LASTEXITCODE" }
} finally { Pop-Location }
# === End Risk Indicator v5 source overlay ===
'@

$EffectiveText = $RunnerText.Substring(0, $EnvStart) + $EnvBlock + $RiskApplyBlock + $RunnerText.Substring($EnvApplyEnd)
$EffectivePath = 'r7-risk-runner-work/run-r7-risk-v5-effective.ps1'
[IO.File]::WriteAllText($EffectivePath, $EffectiveText, [Text.UTF8Encoding]::new($false))
$EffectiveSha = Sha256 $EffectivePath
$EffectiveReceipt = [ordered]@{
  schemaVersion = 'velmere.r7.risk-v5-effective-windows-runner.v1'
  status = 'PASS_DETERMINISTIC_TRANSFORMATION_BUILT'
  baseRunnerSha256 = [string]$V4RunnerReceipt.source.sha256
  effectiveRunnerSha256 = $EffectiveSha
  envfixIdentityReplacementCount = $ReplacementCount
  riskFullSourceAggregateSha256 = $env:R7_FULL_SOURCE_AGGREGATE_SHA256
  riskExecutionSliceAggregateSha256 = $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256
  riskExecutionBundleSha256 = $env:R7_TARGET_BUNDLE_SHA256
  workflowSha = [string]$env:GITHUB_SHA
  customerFinalCredit = $false
}
$EffectiveReceipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath 'r7-risk-runner-work/R7_RISK_V5_EFFECTIVE_WINDOWS_RUNNER_RECEIPT.json' -Encoding utf8

& pwsh -NoProfile -File $EffectivePath
if ($LASTEXITCODE -ne 0) { throw "risk_v5_exact_windows_runner_failed:$LASTEXITCODE" }
