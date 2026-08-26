$ErrorActionPreference = 'Stop'

function Assert-Exit([string]$Label) {
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}
function New-RandomSecret([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer)
}

$Root = (Get-Location).Path
$Work = Join-Path $Root 'r7-work'
$NextProcess = $null
$UserIds = @()
$Oidc = $null
$HelperUrl = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-e2e-current-oidc'
$RestoreUrl = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-basic-staging-proof'

try {
  # Reconstruct the exact v15 base from the hash-bound transport receipt.
  $Base = Get-Content -LiteralPath 'r7-runtime/R7_WINDOWS_EXECUTION_TRANSPORT_RECEIPT.json' -Raw | ConvertFrom-Json
  if ($Base.schemaVersion -ne 'velmere.r7.windows-execution-transport.v4' -or [int]$Base.partCount -ne 36) { throw 'base_transport_identity_invalid' }
  $EncodedParts = [System.Collections.Generic.List[string]]::new()
  foreach ($Row in @($Base.parts)) {
    $Path = 'r7-runtime/' + [string]$Row.path
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "base_part_missing:$Path" }
    if ((Get-Item -LiteralPath $Path).Length -ne [int64]$Row.byteLength) { throw "base_part_length_mismatch:$Path" }
    $Hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($Hash -ne [string]$Row.sha256) { throw "base_part_sha_mismatch:$Path" }
    $Part = (Get-Content -LiteralPath $Path -Raw).TrimEnd("`r", "`n")
    if ($Part.Length -ne [int]$Row.base64CharacterLength) { throw "base_part_character_length_mismatch:$Path" }
    $EncodedParts.Add($Part)
  }
  $Encoded = [string]::Concat($EncodedParts)
  if ($Encoded.Length -ne [int64]$Base.base64EncodedLength) { throw 'base_encoded_length_mismatch' }
  New-Item -ItemType Directory -Force -Path 'diagnostic-current/work' | Out-Null
  $BaseBundle = Join-Path $Root 'diagnostic-current/work/v15.tar.zst'
  [IO.File]::WriteAllBytes($BaseBundle, [Convert]::FromBase64String($Encoded))
  if ((Get-FileHash -LiteralPath $BaseBundle -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$Base.bundle.sha256) { throw 'base_bundle_sha_mismatch' }
  $BaseTar = Join-Path $Root 'diagnostic-current/work/v15.tar'
  $Zstd = (Get-Command zstd.exe -ErrorAction Stop).Source
  & $Zstd -d -f $BaseBundle -o $BaseTar
  Assert-Exit 'base zstd decode'
  if ((Get-FileHash -LiteralPath $BaseTar -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$Base.tar.sha256) { throw 'base_tar_sha_mismatch' }
  New-Item -ItemType Directory -Force -Path $Work | Out-Null
  tar.exe -xf $BaseTar -C $Work
  Assert-Exit 'base tar extraction'

  # Reconstruct and apply the exact current successor patch.
  $PatchReceipt = Get-Content -LiteralPath 'r7-delta/R7_DELTA_SUCCESSOR_PATCH_RECEIPT.json' -Raw | ConvertFrom-Json
  if ($PatchReceipt.schemaVersion -ne 'velmere.r7.delta-successor-patch-transport.v3' -or $PatchReceipt.status -ne 'PASS_DETERMINISTIC_EXACT_PATCH_BUILT') { throw 'patch_receipt_invalid' }
  if ([string]$PatchReceipt.target.executionSliceAggregateSha256 -ne $env:R7_EXECUTION_SLICE_AGGREGATE_SHA256 -or [string]$PatchReceipt.target.executionSliceManifestSha256 -ne $env:R7_EXECUTION_SLICE_MANIFEST_SHA256) { throw 'patch_target_binding_invalid' }
  $PatchGzip = Join-Path $Root 'diagnostic-current/work/current.patch.gz'
  $Out = [IO.File]::Open($PatchGzip, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    foreach ($Row in @($PatchReceipt.patch.chunks)) {
      $Path = 'r7-delta/patch-gzip-parts/' + [string]$Row.name
      if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "patch_chunk_missing:$Path" }
      if ((Get-Item -LiteralPath $Path).Length -ne [int64]$Row.byteLength) { throw "patch_chunk_length_mismatch:$Path" }
      if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$Row.sha256) { throw "patch_chunk_sha_mismatch:$Path" }
      $Bytes = [IO.File]::ReadAllBytes($Path)
      $Out.Write($Bytes, 0, $Bytes.Length)
    }
  } finally { $Out.Dispose() }
  if ((Get-Item -LiteralPath $PatchGzip).Length -ne [int64]$PatchReceipt.patch.gzip.byteLength) { throw 'patch_gzip_length_mismatch' }
  if ((Get-FileHash -LiteralPath $PatchGzip -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$PatchReceipt.patch.gzip.sha256) { throw 'patch_gzip_sha_mismatch' }
  $PatchPath = Join-Path $Root 'diagnostic-current/work/current.patch'
  $Input = [IO.File]::OpenRead($PatchGzip)
  $Gzip = [IO.Compression.GzipStream]::new($Input, [IO.Compression.CompressionMode]::Decompress)
  $Output = [IO.File]::Create($PatchPath)
  try { $Gzip.CopyTo($Output) } finally { $Output.Dispose(); $Gzip.Dispose(); $Input.Dispose() }
  if ((Get-Item -LiteralPath $PatchPath).Length -ne [int64]$PatchReceipt.patch.byteLength) { throw 'patch_length_mismatch' }
  if ((Get-FileHash -LiteralPath $PatchPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$PatchReceipt.patch.sha256) { throw 'patch_sha_mismatch' }
  $env:GIT_CEILING_DIRECTORIES = $Root
  Push-Location $Work
  try {
    git apply --check --no-index $PatchPath
    Assert-Exit 'current successor patch check'
    git apply --no-index $PatchPath
    Assert-Exit 'current successor patch apply'
  } finally { Pop-Location }

  # Verify every exact current successor byte, not merely the patch application exit code.
  Push-Location $Work
  try {
@'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifestBytes = fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.json');
if (digest(manifestBytes) !== process.env.R7_EXECUTION_SLICE_MANIFEST_SHA256) throw new Error('manifest_sha_mismatch');
const manifest = JSON.parse(manifestBytes);
if (manifest.schemaVersion !== 'velmere.r7.execution-slice-manifest.v3' || manifest.candidate !== process.env.R7_CANDIDATE) throw new Error('manifest_identity_mismatch');
if (manifest.fileCount !== Number(process.env.R7_FILE_COUNT) || manifest.payloadByteLength !== Number(process.env.R7_PAYLOAD_BYTE_LENGTH) || manifest.testDenominator !== 52) throw new Error('manifest_denominator_mismatch');
const normalize = (value) => path.posix.normalize(value);
const listed = manifest.files.map((row) => row.path);
const additional = manifest.archiveAdditionalPaths;
const expected = [...listed, ...additional].sort();
if (new Set(expected).size !== expected.length || new Set(expected.map((value) => value.toLowerCase())).size !== expected.length) throw new Error('manifest_duplicate_or_windows_case_collision');
for (const value of expected) if (!value || value.startsWith('/') || value.includes('\\') || normalize(value) !== value || value.split('/').includes('..')) throw new Error(`unsafe_manifest_path:${value}`);
const observed = [];
const walk = (directory, prefix = '') => { for (const entry of fs.readdirSync(directory,{withFileTypes:true})) { const rel=prefix?`${prefix}/${entry.name}`:entry.name; const absolute=path.join(directory,entry.name); const info=fs.lstatSync(absolute); if(info.isSymbolicLink()) throw new Error(`symbolic_link_denied:${rel}`); if(entry.isDirectory()) walk(absolute,rel); else if(entry.isFile()) observed.push(rel); else throw new Error(`non_regular_path_denied:${rel}`); } };
walk('.'); observed.sort(); if(JSON.stringify(observed)!==JSON.stringify(expected)) throw new Error(`archive_path_set_mismatch:${observed.length}/${expected.length}`);
let body='', payloadByteLength=0;
for(const row of manifest.files){ const bytes=fs.readFileSync(row.path); const observedSha=digest(bytes); if(bytes.length!==row.byteLength||observedSha!==row.sha256) throw new Error(`identity_mismatch:${row.path}`); body+=`${row.sha256}\t${row.byteLength}\t${row.path}\n`; payloadByteLength+=bytes.length; }
const aggregate=digest(Buffer.from(body)); if(aggregate!==process.env.R7_EXECUTION_SLICE_AGGREGATE_SHA256||manifest.aggregateIdentitySha256!==aggregate||payloadByteLength!==manifest.payloadByteLength) throw new Error(`aggregate_mismatch:${aggregate}`);
if(!fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.tsv').equals(Buffer.from(body))) throw new Error('manifest_tsv_mismatch');
const packageSha=digest(fs.readFileSync('package.json')); const lockSha=digest(fs.readFileSync('package-lock.json'));
if(packageSha!==process.env.R7_PACKAGE_JSON_SHA256||lockSha!==process.env.R7_PACKAGE_LOCK_SHA256) throw new Error('dependency_source_sha_mismatch');
const full=manifest.fullSource; const fullIdentity=JSON.parse(fs.readFileSync(full.identityPath,'utf8'));
if(full.aggregateIdentitySha256!==process.env.R7_FULL_SOURCE_AGGREGATE_SHA256||full.manifestWithHeaderSha256!==process.env.R7_FULL_SOURCE_MANIFEST_SHA256) throw new Error('full_source_manifest_binding_mismatch');
if(digest(fs.readFileSync(full.manifestPath))!==full.manifestWithHeaderSha256||fullIdentity.aggregateIdentitySha256!==full.aggregateIdentitySha256||fullIdentity.manifestWithHeaderSha256!==full.manifestWithHeaderSha256) throw new Error('full_source_identity_mismatch');
console.log(JSON.stringify({status:'PASS_EXACT_CURRENT_SUCCESSOR_BYTES',fileCount:manifest.fileCount,payloadByteLength,aggregate,manifestSha256:digest(manifestBytes),customerFinalCredit:false},null,2));
'@ | node
    Assert-Exit 'exact current successor byte verification'
  } finally { Pop-Location }

  # Materialize exact licensed PDF font outside source authority.
  $FontDir = Join-Path $Work 'r7-runtime/external-assets'
  New-Item -ItemType Directory -Force -Path $FontDir | Out-Null
  Copy-Item -LiteralPath 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf' -Destination (Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf') -Force
  Copy-Item -LiteralPath 'r7-runtime/external-assets/OFL-Manrope.txt' -Destination (Join-Path $FontDir 'OFL-Manrope.txt') -Force
  $FontPath = Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf'
  if ((Get-FileHash -LiteralPath $FontPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa') { throw 'font_sha_mismatch' }
  $env:VELMERE_PDF_FONT_PATH = (Resolve-Path -LiteralPath $FontPath).Path

  Push-Location $env:RUNNER_TEMP
  try {
    npm install --global npm@11.16.0 --ignore-scripts --audit=false --fund=false
    Assert-Exit 'npm 11.16.0 pin'
  } finally { Pop-Location }
  if ((node --version).Trim() -ne 'v24.18.0') { throw "node_version_mismatch:$((node --version).Trim())" }
  if ((npm --version).Trim() -ne '11.16.0') { throw "npm_version_mismatch:$((npm --version).Trim())" }
  Push-Location $Work
  try {
    npm ci --ignore-scripts=false --audit=false --fund=false
    Assert-Exit 'npm ci'
  } finally { Pop-Location }

  # Strict GitHub OIDC -> ephemeral USER_A/USER_B + server capability. No stored project secret is used.
  $OidcUrl = "$env:ACTIONS_ID_TOKEN_REQUEST_URL&audience=velmere-r7-browser-current-e2e"
  $Oidc = (Invoke-RestMethod -Uri $OidcUrl -Headers @{ Authorization = "Bearer $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN" }).value
  Write-Host "::add-mask::$Oidc"
  $Provision = Invoke-RestMethod -Method Post -Uri $HelperUrl -Headers @{ Authorization = "Bearer $Oidc" } -ContentType 'application/json' -Body '{"action":"provision"}'
  if (-not $Provision.ok) { throw 'oidc_provision_failed' }
  $UserIds = @([string]$Provision.a.userId, [string]$Provision.b.userId)
  foreach ($Secret in @([string]$Provision.a.accessToken, [string]$Provision.b.accessToken, [string]$Provision.serverCapability)) { Write-Host "::add-mask::$Secret" }
  $env:R7_E2E_GITHUB_OIDC = $Oidc
  $env:R7_E2E_HELPER_URL = $HelperUrl
  $env:R7_E2E_RESTORE_URL = $RestoreUrl
  $env:R7_E2E_USER_A_ID = [string]$Provision.a.userId
  $env:R7_E2E_USER_B_ID = [string]$Provision.b.userId
  $env:R7_E2E_USER_A_JWT = [string]$Provision.a.accessToken
  $env:R7_E2E_USER_B_JWT = [string]$Provision.b.accessToken
  $env:R7_E2E_ACCOUNT_A = [string]$Provision.a.accountId
  $env:R7_E2E_ACCOUNT_B = [string]$Provision.b.accountId
  $env:VELMERE_BROWSER_SERVER_CAPABILITY = [string]$Provision.serverCapability
  $env:NEXT_PUBLIC_SUPABASE_URL = 'https://yljjyowcvjgjcamffnvd.supabase.co'
  $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_RTqLeQRrAJl6seP0ShSJlA_hyNo4Yz2'
  $env:R7_E2E_BASE_URL = 'http://127.0.0.1:3100'
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $env:CI = '1'
  $env:VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT = New-RandomSecret 48
  $env:VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET = New-RandomSecret 48
  foreach ($Name in @('VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT','VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT','VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT','VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET')) { Write-Host "::add-mask::$([Environment]::GetEnvironmentVariable($Name))" }

  $Stdout = Join-Path $Work 'R7_BROWSER_CURRENT_E2E_NEXT_STDOUT.log'
  $Stderr = Join-Path $Work 'R7_BROWSER_CURRENT_E2E_NEXT_STDERR.log'
  $NextBin = Join-Path $Work 'node_modules/next/dist/bin/next'
  if (-not (Test-Path -LiteralPath $NextBin -PathType Leaf)) { throw 'next_cli_missing' }
  $NextProcess = Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin, 'dev', '--webpack', '-p', '3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
  $Ready = $false
  for ($Index = 0; $Index -lt 120; $Index += 1) {
    Start-Sleep -Seconds 1
    if ($NextProcess.HasExited) { throw "next_cli_exited:$($NextProcess.ExitCode)" }
    try { $Probe = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/' -UseBasicParsing -TimeoutSec 2 -SkipHttpErrorCheck; if ($Probe.StatusCode -ge 200 -and $Probe.StatusCode -lt 500) { $Ready = $true; break } } catch { }
  }
  if (-not $Ready) { throw 'next_cli_not_ready' }

  Push-Location $Work
  try {
    & node 'node_modules/tsx/dist/cli.mjs' (Join-Path $Root 'diagnostic-current/r7-browser-current-live-e2e.mts')
    Assert-Exit 'Browser Basic current zero-Vercel E2E'
  } catch {
    Get-Content -LiteralPath $Stdout -Tail 200 -ErrorAction SilentlyContinue
    Get-Content -LiteralPath $Stderr -Tail 200 -ErrorAction SilentlyContinue
    throw
  } finally { Pop-Location }
}
finally {
  if ($NextProcess -and -not $NextProcess.HasExited) { Stop-Process -Id $NextProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($UserIds.Count -gt 0 -and $Oidc) {
    try {
      # If the E2E restored its artifact successfully, erase it again before deleting the test user.
      $ReceiptPath = Join-Path $Work 'R7_BROWSER_BASIC_CURRENT_SUCCESSOR_ZERO_VERCEL_E2E.json'
      if (Test-Path -LiteralPath $ReceiptPath -PathType Leaf) {
        $Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
        $CleanupArtifactBody = @{ action='backup_erase'; userId=$UserIds[0]; snapshotId=[string]$Receipt.artifactId } | ConvertTo-Json -Compress
        try { Invoke-RestMethod -Method Post -Uri $HelperUrl -Headers @{ Authorization = "Bearer $Oidc" } -ContentType 'application/json' -Body $CleanupArtifactBody | Out-Null } catch { Write-Warning "E2E artifact cleanup failed: $($_.Exception.Message)" }
      }
      $CleanupBody = @{ action='cleanup'; userIds=$UserIds } | ConvertTo-Json -Compress
      $Cleanup = Invoke-RestMethod -Method Post -Uri $HelperUrl -Headers @{ Authorization = "Bearer $Oidc" } -ContentType 'application/json' -Body $CleanupBody
      Write-Host "Ephemeral E2E users cleaned: $($Cleanup.deleted)/$($Cleanup.requested)"
    } catch { Write-Warning "Ephemeral E2E cleanup failed: $($_.Exception.Message)" }
  }
}
