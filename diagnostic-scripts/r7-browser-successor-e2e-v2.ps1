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
$RunId = [string]$env:GITHUB_RUN_ID
if ($RunId -notmatch '^\d{1,20}$') { throw 'invalid_github_run_id' }

try {
  # Reconstruct the exact R7 v15 execution slice.
  $Parts = @(Get-ChildItem -LiteralPath (Join-Path $Root 'r7-runtime/parts') -File | Sort-Object Name)
  if ($Parts.Count -ne 36) { throw "transport_part_denominator_mismatch:$($Parts.Count)" }
  $Encoded = [System.Collections.Generic.List[string]]::new()
  foreach ($Part in $Parts) {
    $Encoded.Add((Get-Content -LiteralPath $Part.FullName -Raw).TrimEnd("`r", "`n"))
  }
  $BundlePath = Join-Path $Root 'r7-runtime/R7_EXECUTION_SLICE.tar.zst'
  [IO.File]::WriteAllBytes($BundlePath, [Convert]::FromBase64String([string]::Concat($Encoded)))
  $BundleHash = (Get-FileHash -LiteralPath $BundlePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($BundleHash -ne 'fb4c3d2a9524ec4f60f2d21cb430131bf11cfc99b108c96d2ad7d8543c941c87') {
    throw "bundle_sha_mismatch:$BundleHash"
  }
  $TarPath = Join-Path $Root 'r7-runtime/R7_EXECUTION_SLICE.tar'
  $Zstd = (Get-Command zstd.exe -ErrorAction Stop).Source
  & $Zstd -d -f $BundlePath -o $TarPath
  Assert-Exit 'zstd reconstruction'
  New-Item -ItemType Directory -Force -Path $Work | Out-Null
  tar.exe -xf $TarPath -C $Work
  Assert-Exit 'tar extraction'

  # Apply the exact, hash-bound successor patch to the reconstructed worktree.
  $EncodedPatch = (Get-Content -LiteralPath (Join-Path $Root 'diagnostic-patches/successor-v3.patch.gz.b64') -Raw).Trim()
  if ($EncodedPatch.Length -ne 10788) { throw "successor_patch_base64_length_mismatch:$($EncodedPatch.Length)" }
  $GzipPath = Join-Path $Root 'successor-v3.patch.gz'
  [IO.File]::WriteAllBytes($GzipPath, [Convert]::FromBase64String($EncodedPatch))
  $GzipSha = (Get-FileHash -LiteralPath $GzipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($GzipSha -ne 'cf34c02b25c7077c45f95eafe88b0b3ae184c6ce6e66ffdc7c4f63ef0aa7b7c4') {
    throw "successor_patch_gzip_sha_mismatch:$GzipSha"
  }
  gzip -t $GzipPath
  Assert-Exit 'successor patch gzip CRC'
  gzip -d -f $GzipPath
  Assert-Exit 'successor patch gzip decode'
  $PatchPath = Join-Path $Root 'successor-v3.patch'
  $PatchSha = (Get-FileHash -LiteralPath $PatchPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($PatchSha -ne '147435282063175d633d06ce5c313c9c8b9887bbe389645c292dbf2596884a54') {
    throw "successor_patch_sha_mismatch:$PatchSha"
  }
  git apply --check --directory=r7-work successor-v3.patch
  Assert-Exit 'successor patch check'
  git apply --directory=r7-work successor-v3.patch
  Assert-Exit 'successor patch apply'

  $ExpectedChanged = [ordered]@{
    'lib/jobs/durable-computation-replay.ts' = '193c1a8afa8bc2c508fe533b22a254c5a2713163fd1bca7e54ffbcd4eb9fb26c'
    'lib/reporting/account-customer-artifact-store.ts' = '285a7d92fc4dc741cb68722f8b44f89296c8013252a0435c277ec45c9d23a91e'
    'lib/server/search-route-modules/lens-report.ts' = '89b2f78454661c0f32f67358d7663541a26d65211bfc89403533d5b1e8b5c336'
    'supabase/migrations/20260825054159_r7_browser_basic_user_authenticated_atomic_store.sql' = '8f5ed1c95487a014e41bf291e2f09a49a162e7204074412733e83046d5b2f18e'
    'supabase/migrations/20260825054301_r7_browser_basic_user_authenticated_durable_computation.sql' = 'ddcbcb20f8e8f5ed6353b2a19fac0e85b630f486f69a9436a7233094b0bf5d30'
    'supabase/migrations/20260825060000_r7_browser_basic_authenticated_rpc_abuse_hardening.sql' = '333c938e48148c3428f2663324dbe3873cb511665b143d152e6e79281c001ab3'
    'supabase/migrations/20260825063000_r7_browser_basic_server_capability_hardening.sql' = 'ae69781f26e771ccc77332ebc5457e567f1c10479c8fdd89645655e630060845'
  }
  foreach ($Relative in $ExpectedChanged.Keys) {
    $Path = Join-Path $Work $Relative
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "successor_file_missing:$Relative" }
    $Observed = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($Observed -ne $ExpectedChanged[$Relative]) { throw "successor_file_sha_mismatch:$Relative:$Observed" }
  }

  # Materialize the exact licensed PDF font, external to the source authority.
  $FontDir = Join-Path $Work 'r7-runtime/external-assets'
  New-Item -ItemType Directory -Force -Path $FontDir | Out-Null
  Copy-Item -LiteralPath (Join-Path $Root 'r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf') -Destination (Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf') -Force
  Copy-Item -LiteralPath (Join-Path $Root 'r7-runtime/external-assets/OFL-Manrope.txt') -Destination (Join-Path $FontDir 'OFL-Manrope.txt') -Force
  $FontPath = Join-Path $FontDir 'manrope-pdf-latin-plus-ext.ttf'
  $FontSha = (Get-FileHash -LiteralPath $FontPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($FontSha -ne 'a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa') { throw 'font_sha_mismatch' }
  $env:VELMERE_PDF_FONT_PATH = (Resolve-Path -LiteralPath $FontPath).Path

  # Exact runtime install. setup-node already pins Node; bootstrap npm outside project root.
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

  # Get two short-lived owner-authorized user sessions plus a server capability through strict GitHub OIDC.
  $OidcUrl = "$env:ACTIONS_ID_TOKEN_REQUEST_URL&audience=velmere-r7-browser-e2e-v2"
  $Oidc = (Invoke-RestMethod -Uri $OidcUrl -Headers @{ Authorization = "Bearer $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN" }).value
  $Provision = Invoke-RestMethod -Method Post -Uri 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-e2e-oidc-session-v2' -Headers @{ Authorization = "Bearer $Oidc" } -ContentType 'application/json' -Body '{"action":"provision"}'
  if (-not $Provision.ok) { throw 'oidc_provision_failed' }
  $UserIds = @([string]$Provision.a.userId, [string]$Provision.b.userId)
  foreach ($Secret in @([string]$Provision.a.accessToken, [string]$Provision.b.accessToken, [string]$Provision.serverCapability)) {
    Write-Host "::add-mask::$Secret"
  }
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
  foreach ($Name in @('VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT','VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT','VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT','VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET')) {
    Write-Host "::add-mask::$([Environment]::GetEnvironmentVariable($Name))"
  }

  # Copy the exact test driver into the reconstructed product tree.
  $TestSource = Join-Path $Root 'diagnostic-scripts/r7-browser-successor-live-e2e.mts'
  $TestDest = Join-Path $Work 'scripts/current-execution/r7-browser-successor-live-e2e.mts'
  Copy-Item -LiteralPath $TestSource -Destination $TestDest -Force

  # Start Next directly. This intentionally bypasses only the historical A42 dev-bootstrap wrapper,
  # which is absent from the execution slice; it does not bypass any product route or data/auth gate.
  $Stdout = Join-Path $Work 'R7_BROWSER_E2E_NEXT_STDOUT.log'
  $Stderr = Join-Path $Work 'R7_BROWSER_E2E_NEXT_STDERR.log'
  $NextBin = Join-Path $Work 'node_modules/next/dist/bin/next'
  if (-not (Test-Path -LiteralPath $NextBin -PathType Leaf)) { throw 'next_cli_missing' }
  $NextProcess = Start-Process -FilePath 'node.exe' -ArgumentList @($NextBin, 'dev', '--webpack', '-p', '3100') -WorkingDirectory $Work -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
  $NextProcess.Id | Set-Content -LiteralPath (Join-Path $Work 'R7_BROWSER_E2E_NEXT_PID.txt')

  $Ready = $false
  for ($Index = 0; $Index -lt 120; $Index += 1) {
    Start-Sleep -Seconds 1
    if ($NextProcess.HasExited) {
      Get-Content -LiteralPath $Stdout -Tail 160 -ErrorAction SilentlyContinue
      Get-Content -LiteralPath $Stderr -Tail 160 -ErrorAction SilentlyContinue
      throw "next_cli_exited:$($NextProcess.ExitCode)"
    }
    try {
      $Probe = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/' -UseBasicParsing -TimeoutSec 2 -SkipHttpErrorCheck
      if ($Probe.StatusCode -ge 200 -and $Probe.StatusCode -lt 500) { $Ready = $true; break }
    } catch { }
  }
  if (-not $Ready) {
    Get-Content -LiteralPath $Stdout -Tail 160 -ErrorAction SilentlyContinue
    Get-Content -LiteralPath $Stderr -Tail 160 -ErrorAction SilentlyContinue
    throw 'next_cli_not_ready'
  }

  Push-Location $Work
  try {
    npx tsx scripts/current-execution/r7-browser-successor-live-e2e.mts
    Assert-Exit 'Browser Basic live product-route E2E'
  } catch {
    Get-Content -LiteralPath $Stdout -Tail 200 -ErrorAction SilentlyContinue
    Get-Content -LiteralPath $Stderr -Tail 200 -ErrorAction SilentlyContinue
    throw
  } finally { Pop-Location }
}
finally {
  if ($NextProcess -and -not $NextProcess.HasExited) {
    Stop-Process -Id $NextProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($UserIds.Count -gt 0 -and $env:ACTIONS_ID_TOKEN_REQUEST_URL -and $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    try {
      $OidcUrl = "$env:ACTIONS_ID_TOKEN_REQUEST_URL&audience=velmere-r7-browser-e2e-v2"
      $Oidc = (Invoke-RestMethod -Uri $OidcUrl -Headers @{ Authorization = "Bearer $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN" }).value
      $Body = @{ action = 'cleanup'; userIds = $UserIds } | ConvertTo-Json -Compress
      $Cleanup = Invoke-RestMethod -Method Post -Uri 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-browser-e2e-oidc-session-v2' -Headers @{ Authorization = "Bearer $Oidc" } -ContentType 'application/json' -Body $Body
      Write-Host "Ephemeral E2E users cleaned: $($Cleanup.deleted)/$($Cleanup.requested)"
    } catch {
      Write-Warning "Ephemeral E2E cleanup failed: $($_.Exception.Message)"
    }
  }
}
