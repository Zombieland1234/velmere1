param(
  [ValidateSet('Prepare','Full')]
  [string]$Mode = 'Full'
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

function Assert-Exit([string]$Label) {
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}
function Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$Root = (Get-Location).Path
$Work = Join-Path $Root 'r7-work'
$Clean = Join-Path $Root 'r7-risk-v5-clean-source'
$PatchWork = Join-Path $Root 'r7-risk-v5-work'
New-Item -ItemType Directory -Force -Path $PatchWork | Out-Null

# Reuse the exact, already validated v4 transport reconstruction but stop it before
# fonts, npm, OIDC or product execution. This changes only the checkout-side harness;
# the reconstructed source bytes in r7-work remain the exact authority-bound v4 bytes.
$BaseHarness = Join-Path $Root 'diagnostic-current/run-r7-browser-current-e2e.ps1'
$BaseText = Get-Content -LiteralPath $BaseHarness -Raw
$StopAnchor = '  # Materialize exact licensed PDF font outside source authority.'
if (([regex]::Matches($BaseText,[regex]::Escape($StopAnchor))).Count -ne 1) {
  throw 'risk_v5_base_harness_stop_anchor_mismatch'
}
$BaseText = $BaseText.Replace(
  $StopAnchor,
  "  Write-Host 'Exact envfix v4 source reconstructed for Risk v5 overlay.'`r`n  exit 0`r`n`r`n$StopAnchor"
)
[IO.File]::WriteAllText($BaseHarness,$BaseText,[Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File (Join-Path $Root 'r7-harness/run-r7-browser-envfix-successor-e2e.ps1')
$ReconstructExit = $LASTEXITCODE
if (-not (Test-Path -LiteralPath (Join-Path $Work 'R7_EXECUTION_SLICE_MANIFEST.json') -PathType Leaf)) {
  throw "risk_v5_v4_reconstruction_missing:exit=$ReconstructExit"
}

# The envfix wrapper intentionally reports a missing Browser receipt because the
# child was stopped before product execution. Exact byte verification below is the
# sole acceptance criterion for this reconstruction stage.
Push-Location $Work
try {
@'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.json');
if(digest(manifestBytes)!==process.env.R7_V4_EXECUTION_SLICE_MANIFEST_SHA256)throw new Error('v4_manifest_sha_mismatch');
const manifest=JSON.parse(manifestBytes);
if(manifest.fileCount!==Number(process.env.R7_V4_FILE_COUNT)||manifest.payloadByteLength!==Number(process.env.R7_V4_PAYLOAD_BYTE_LENGTH)||manifest.testDenominator!==52)throw new Error('v4_manifest_denominator_mismatch');
const expected=[...manifest.files.map(r=>r.path),...manifest.archiveAdditionalPaths].sort();
const observed=[];const walk=(d,p='')=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const r=p?`${p}/${e.name}`:e.name,a=path.join(d,e.name),i=fs.lstatSync(a);if(i.isSymbolicLink())throw new Error(`v4_symlink:${r}`);if(e.isDirectory())walk(a,r);else if(e.isFile())observed.push(r);else throw new Error(`v4_nonregular:${r}`)}};walk('.');observed.sort();
if(JSON.stringify(observed)!==JSON.stringify(expected))throw new Error(`v4_path_set_mismatch:${observed.length}/${expected.length}`);
let body='',bytes=0;for(const row of manifest.files){const b=fs.readFileSync(row.path);if(b.length!==row.byteLength||digest(b)!==row.sha256)throw new Error(`v4_identity_mismatch:${row.path}`);body+=`${row.sha256}\t${row.byteLength}\t${row.path}\n`;bytes+=b.length;}
const aggregate=digest(Buffer.from(body));if(aggregate!==process.env.R7_V4_EXECUTION_SLICE_AGGREGATE_SHA256||bytes!==manifest.payloadByteLength)throw new Error('v4_aggregate_mismatch');
const full=manifest.fullSource,identity=JSON.parse(fs.readFileSync(full.identityPath,'utf8'));
if(full.aggregateIdentitySha256!==process.env.R7_V4_FULL_SOURCE_AGGREGATE_SHA256||full.manifestWithHeaderSha256!==process.env.R7_V4_FULL_SOURCE_MANIFEST_SHA256||identity.aggregateIdentitySha256!==full.aggregateIdentitySha256)throw new Error('v4_full_source_mismatch');
console.log(JSON.stringify({status:'PASS_EXACT_V4_SOURCE_RECONSTRUCTION',fileCount:manifest.fileCount,payloadByteLength:bytes,aggregate},null,2));
'@ | node
  Assert-Exit 'exact v4 reconstruction verification'
} finally { Pop-Location }

# Reconstruct and apply the one-chunk exact Risk v5 overlay.
$ReceiptPath = Join-Path $Root 'r7-risk-v5/R7_RISK_V5_PATCH_RECEIPT.json'
if (Sha256($ReceiptPath) -ne $env:R7_RISK_PATCH_RECEIPT_SHA256) { throw 'risk_v5_patch_receipt_sha_mismatch' }
$Receipt = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
if ($Receipt.schemaVersion -ne 'velmere.r7.risk-indicator-source-overlay.v1' -or $Receipt.status -ne 'PASS_DETERMINISTIC_EXACT_PATCH_BUILT') { throw 'risk_v5_patch_receipt_invalid' }
if ([string]$Receipt.base.fullSourceAggregateSha256 -ne $env:R7_V4_FULL_SOURCE_AGGREGATE_SHA256 -or
    [string]$Receipt.base.fullSourceManifestSha256 -ne $env:R7_V4_FULL_SOURCE_MANIFEST_SHA256 -or
    [string]$Receipt.target.fullSourceAggregateSha256 -ne $env:R7_RISK_FULL_SOURCE_AGGREGATE_SHA256 -or
    [string]$Receipt.target.fullSourceManifestSha256 -ne $env:R7_RISK_FULL_SOURCE_MANIFEST_SHA256 -or
    [string]$Receipt.target.executionSliceAggregateSha256 -ne $env:R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256 -or
    [string]$Receipt.target.executionSliceManifestSha256 -ne $env:R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256 -or
    [string]$Receipt.target.executionBundleSha256 -ne $env:R7_RISK_BUNDLE_SHA256 -or
    [int]$Receipt.target.executionSliceFileCount -ne [int]$env:R7_RISK_FILE_COUNT -or
    [int64]$Receipt.target.executionSlicePayloadByteLength -ne [int64]$env:R7_RISK_PAYLOAD_BYTE_LENGTH) {
  throw 'risk_v5_patch_identity_binding_invalid'
}
$Chunk = Join-Path $Root 'r7-risk-v5/part-00.txt'
if ((Get-Item -LiteralPath $Chunk).Length -ne [int64]$Receipt.patch.chunks[0].byteLength -or Sha256($Chunk) -ne [string]$Receipt.patch.chunks[0].sha256) { throw 'risk_v5_patch_chunk_invalid' }
$Encoded = [IO.File]::ReadAllText($Chunk,[Text.Encoding]::ASCII)
if ([Text.Encoding]::ASCII.GetByteCount($Encoded) -ne [int64]$Receipt.patch.gzip.base64ByteLength) { throw 'risk_v5_patch_base64_length_mismatch' }
$GzipPath = Join-Path $PatchWork 'risk-v5.patch.gz'
try { [IO.File]::WriteAllBytes($GzipPath,[Convert]::FromBase64String($Encoded)) } catch { throw 'risk_v5_patch_base64_decode_failed' }
if ((Get-Item -LiteralPath $GzipPath).Length -ne [int64]$Receipt.patch.gzip.byteLength -or Sha256($GzipPath) -ne [string]$Receipt.patch.gzip.sha256) { throw 'risk_v5_patch_gzip_invalid' }
$PatchPath = Join-Path $PatchWork 'risk-v5.patch'
$Input=[IO.File]::OpenRead($GzipPath);$Gzip=[IO.Compression.GzipStream]::new($Input,[IO.Compression.CompressionMode]::Decompress);$Output=[IO.File]::Create($PatchPath)
try { $Gzip.CopyTo($Output) } finally { $Output.Dispose();$Gzip.Dispose();$Input.Dispose() }
if ((Get-Item -LiteralPath $PatchPath).Length -ne [int64]$Receipt.patch.byteLength -or Sha256($PatchPath) -ne [string]$Receipt.patch.sha256) { throw 'risk_v5_patch_invalid' }
$env:GIT_CEILING_DIRECTORIES = $Root
Push-Location $Work
try {
  git -c core.autocrlf=false apply --check --no-index $PatchPath
  Assert-Exit 'Risk v5 patch check'
  git -c core.autocrlf=false apply --no-index $PatchPath
  Assert-Exit 'Risk v5 patch apply'
} finally { Pop-Location }

# Verify every exact target byte and dependency/source binding.
Push-Location $Work
try {
@'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.json');
if(digest(manifestBytes)!==process.env.R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256)throw new Error('risk_v5_manifest_sha_mismatch');
const manifest=JSON.parse(manifestBytes);
if(manifest.fileCount!==Number(process.env.R7_RISK_FILE_COUNT)||manifest.payloadByteLength!==Number(process.env.R7_RISK_PAYLOAD_BYTE_LENGTH)||manifest.testDenominator!==52)throw new Error('risk_v5_manifest_denominator_mismatch');
const expected=[...manifest.files.map(r=>r.path),...manifest.archiveAdditionalPaths].sort();
const observed=[];const walk=(d,p='')=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const r=p?`${p}/${e.name}`:e.name,a=path.join(d,e.name),i=fs.lstatSync(a);if(i.isSymbolicLink())throw new Error(`risk_v5_symlink:${r}`);if(e.isDirectory())walk(a,r);else if(e.isFile())observed.push(r);else throw new Error(`risk_v5_nonregular:${r}`)}};walk('.');observed.sort();if(JSON.stringify(observed)!==JSON.stringify(expected))throw new Error(`risk_v5_path_set_mismatch:${observed.length}/${expected.length}`);
let body='',bytes=0;for(const row of manifest.files){const b=fs.readFileSync(row.path);if(b.length!==row.byteLength||digest(b)!==row.sha256)throw new Error(`risk_v5_identity_mismatch:${row.path}`);body+=`${row.sha256}\t${row.byteLength}\t${row.path}\n`;bytes+=b.length;}
const aggregate=digest(Buffer.from(body));if(aggregate!==process.env.R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256||manifest.aggregateIdentitySha256!==aggregate||bytes!==manifest.payloadByteLength)throw new Error('risk_v5_aggregate_mismatch');
if(!fs.readFileSync('R7_EXECUTION_SLICE_MANIFEST.tsv').equals(Buffer.from(body)))throw new Error('risk_v5_manifest_tsv_mismatch');
const full=manifest.fullSource,identity=JSON.parse(fs.readFileSync(full.identityPath,'utf8'));
if(full.aggregateIdentitySha256!==process.env.R7_RISK_FULL_SOURCE_AGGREGATE_SHA256||full.manifestWithHeaderSha256!==process.env.R7_RISK_FULL_SOURCE_MANIFEST_SHA256||identity.aggregateIdentitySha256!==full.aggregateIdentitySha256||digest(fs.readFileSync(full.manifestPath))!==full.manifestWithHeaderSha256)throw new Error('risk_v5_full_source_mismatch');
if(digest(fs.readFileSync('package.json'))!==process.env.R7_PACKAGE_JSON_SHA256||digest(fs.readFileSync('package-lock.json'))!==process.env.R7_PACKAGE_LOCK_SHA256)throw new Error('risk_v5_dependency_binding_mismatch');
console.log(JSON.stringify({status:'PASS_EXACT_RISK_V5_SOURCE_BYTES',fileCount:manifest.fileCount,payloadByteLength:bytes,aggregate,manifestSha256:digest(manifestBytes)},null,2));
'@ | node
  Assert-Exit 'exact Risk v5 source verification'
} finally { Pop-Location }

# Preserve an untouched exact source copy for deterministic bundle rebuild.
Remove-Item -Recurse -Force $Clean -ErrorAction SilentlyContinue
Copy-Item -LiteralPath $Work -Destination $Clean -Recurse -Force

# Materialize the exact external licensed font outside source authority.
$FontDir = Join-Path $Work 'r7-runtime/external-assets'
New-Item -ItemType Directory -Force -Path $FontDir | Out-Null
Copy-Item -LiteralPath (Join-Path $Root 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf') -Destination (Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf') -Force
Copy-Item -LiteralPath (Join-Path $Root 'r7-runtime/external-assets/OFL-Manrope.txt') -Destination (Join-Path $FontDir 'OFL-Manrope.txt') -Force
$env:VELMERE_PDF_FONT_PATH = (Resolve-Path -LiteralPath (Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf')).Path

Push-Location $env:RUNNER_TEMP
try {
  npm install --global npm@11.16.0 --ignore-scripts --audit=false --fund=false
  Assert-Exit 'npm 11.16.0 pin'
} finally { Pop-Location }
if ((node --version).Trim() -ne 'v24.18.0' -or (npm --version).Trim() -ne '11.16.0') { throw 'risk_v5_exact_runtime_mismatch' }
Push-Location $Work
try {
  npm ci --ignore-scripts=false --audit=false --fund=false 2>&1 | Tee-Object -FilePath 'R7_NPM_CI.log'
  Assert-Exit 'Risk v5 npm ci'
} finally { Pop-Location }
$env:R7_VERIFIED_NODE_VERSION='v24.18.0'
$env:R7_VERIFIED_NPM_VERSION='11.16.0'
$env:R7_VERIFIED_NPM_IGNORE_SCRIPTS='false'

if ($Mode -eq 'Prepare') {
  Write-Host 'Risk v5 exact source prepared and dependencies installed.'
  exit 0
}

New-Item -ItemType Directory -Force -Path (Join-Path $Work 'artifacts/r7/windows') | Out-Null
Push-Location $Work
try {
  npm run build:webpack 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_WEBPACK.log'; Assert-Exit 'Risk v5 Webpack'
  npm run typecheck 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_TYPESCRIPT.log'; Assert-Exit 'Risk v5 TypeScript'
  npm run lint 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_ESLINT.log'; Assert-Exit 'Risk v5 ESLint'
  npm run build:turbopack 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_TURBOPACK.log'; Assert-Exit 'Risk v5 Turbopack'
  node scripts/r7/run-r7-current-execution-campaign.mjs --run-label windows-run1 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_CAMPAIGN_RUN1.log'; Assert-Exit 'Risk v5 campaign run1'
  node scripts/r7/run-r7-current-execution-campaign.mjs --run-label windows-run2 2>&1 | Tee-Object -FilePath 'artifacts/r7/windows/R7_CAMPAIGN_RUN2.log'; Assert-Exit 'Risk v5 campaign run2'
  node scripts/r7/compare-r7-campaigns.mjs artifacts/r7/current-execution/R7_CURRENT_EXECUTION_CAMPAIGN_windows-run1.json artifacts/r7/current-execution/R7_CURRENT_EXECUTION_CAMPAIGN_windows-run2.json
  Assert-Exit 'Risk v5 repeatability'
} finally { Pop-Location }

# Rebuild the exact deterministic target bundle from the untouched source copy.
$RebuildSurface = Join-Path $Root 'r7-risk-v5-target-rebuild'
Remove-Item -Recurse -Force $RebuildSurface -ErrorAction SilentlyContinue
$BuildLog = Join-Path $Work 'artifacts/r7/windows/R7_TARGET_BUNDLE_REBUILD.log'
& python (Join-Path $Clean 'scripts/r7/build-r7-windows-transport.py') `
  --slice $Clean `
  --surface $RebuildSurface `
  --workflow-template (Join-Path $Clean 'scripts/r7/templates/r7-final-exact-windows.yml.template') `
  --branch $env:GITHUB_REF_NAME `
  --pdf-font (Join-Path $Root 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf') `
  --pdf-font-license (Join-Path $Root 'r7-runtime/external-assets/OFL-Manrope.txt') 2>&1 | Tee-Object -FilePath $BuildLog
Assert-Exit 'Risk v5 deterministic bundle rebuild'
$BuildJson = Get-Content -LiteralPath $BuildLog -Raw | ConvertFrom-Json
if ([string]$BuildJson.bundleSha256 -ne $env:R7_RISK_BUNDLE_SHA256 -or [string]$BuildJson.executionSliceAggregateSha256 -ne $env:R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256) { throw 'risk_v5_rebuilt_bundle_identity_mismatch' }

Push-Location $Work
try {
  $One=Get-Content 'artifacts/r7/current-execution/R7_CURRENT_EXECUTION_CAMPAIGN_windows-run1.json' -Raw | ConvertFrom-Json
  $Two=Get-Content 'artifacts/r7/current-execution/R7_CURRENT_EXECUTION_CAMPAIGN_windows-run2.json' -Raw | ConvertFrom-Json
  $Repeat=Get-Content 'artifacts/r7/current-execution/R7_CURRENT_EXECUTION_REPEATABILITY.json' -Raw | ConvertFrom-Json
  if ($One.summary.PASS -ne 52 -or $Two.summary.PASS -ne 52 -or -not $One.exactWindowsCredit -or -not $Two.exactWindowsCredit -or $Repeat.status -ne 'PASS_OUTCOME_REPEATABLE') { throw 'risk_v5_windows_campaign_not_final_pass' }
  $WorkflowPath=Join-Path $Root '.github/workflows/r7-risk-v5-exact-windows.yml'
  $Final=[ordered]@{
    schemaVersion='velmere.r7.risk-v5-final-exact-windows.v1';
    candidate='R7_MERGED_CURRENT_SOURCE';
    status='PASS_EXACT_WINDOWS_52_X2'; finalPass=$true;
    github=@{ sha=$env:GITHUB_SHA; ref=$env:GITHUB_REF; runId=$env:GITHUB_RUN_ID; runAttempt=[int]$env:GITHUB_RUN_ATTEMPT; workflowSha256=(Sha256 $WorkflowPath) };
    source=@{ fullSourceAggregateSha256=$env:R7_RISK_FULL_SOURCE_AGGREGATE_SHA256; fullSourceManifestSha256=$env:R7_RISK_FULL_SOURCE_MANIFEST_SHA256; executionSliceAggregateSha256=$env:R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256; executionSliceManifestSha256=$env:R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256; executionBundleSha256=$env:R7_RISK_BUNDLE_SHA256; packageJsonSha256=$env:R7_PACKAGE_JSON_SHA256; packageLockSha256=$env:R7_PACKAGE_LOCK_SHA256; fileCount=[int]$env:R7_RISK_FILE_COUNT; payloadByteLength=[int64]$env:R7_RISK_PAYLOAD_BYTE_LENGTH; testDenominator=52 };
    runs=@(@{label=$One.runLabel;summary=$One.summary},@{label=$Two.runLabel;summary=$Two.summary});
    repeatability=@{classificationStable=$Repeat.classificationStable;exitCodeStable=$Repeat.exitCodeStable;aggregateSha256=$Repeat.aggregateSha256};
    deterministicBundleRebuild='PASS'; secrets=0; customerFinalCredit=$false;
    truthBoundary='Exact Windows engineering and 52/52 x2 proof for Risk v5 source. Source-authority and Risk Indicator customer FINAL remain separate guarded gates.'
  }
  $Final | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath 'artifacts/r7/windows/R7_RISK_V5_FINAL_EXACT_WINDOWS_RECEIPT.json' -Encoding utf8
  Write-Host ($Final | ConvertTo-Json -Depth 20)
} finally { Pop-Location }
