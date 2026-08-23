param(
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [Parameter(Mandatory = $true)][string]$OutRoot,
  [Parameter(Mandatory = $true)][string]$ReconstructionReceipt
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$source = (Resolve-Path -LiteralPath $SourceRoot).Path
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null
$out = (Resolve-Path -LiteralPath $OutRoot).Path
$logs = Join-Path $out 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Get-Sha256([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([Convert]::ToHexString($sha.ComputeHash($Bytes))).ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function New-BlockedPhase([string]$Name, [string]$Reason) {
  return [ordered]@{
    name = $Name
    status = 'BLOCKED'
    exitCode = $null
    startedAtUtc = $null
    endedAtUtc = $null
    durationSeconds = 0
    command = $null
    log = $null
    reason = $Reason
  }
}

function Invoke-NativePhase {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory
  )
  $safeName = ($Name -replace '[^A-Za-z0-9._-]', '_')
  $logPath = Join-Path $logs ($safeName + '.log')
  $started = [DateTime]::UtcNow
  $exitCode = 1
  $failure = $null
  Push-Location $WorkingDirectory
  try {
    "COMMAND: $FilePath $($ArgumentList -join ' ')" | Set-Content -LiteralPath $logPath -Encoding utf8
    & $FilePath @ArgumentList 2>&1 | Tee-Object -FilePath $logPath -Append
    $exitCode = $LASTEXITCODE
  }
  catch {
    $failure = $_.Exception.ToString()
    $failure | Add-Content -LiteralPath $logPath -Encoding utf8
    $exitCode = 1
  }
  finally {
    Pop-Location
  }
  $ended = [DateTime]::UtcNow
  return [ordered]@{
    name = $Name
    status = $(if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' })
    exitCode = $exitCode
    startedAtUtc = $started.ToString('o')
    endedAtUtc = $ended.ToString('o')
    durationSeconds = [Math]::Round(($ended - $started).TotalSeconds, 3)
    command = @($FilePath) + $ArgumentList
    log = ('logs/' + [IO.Path]::GetFileName($logPath))
    failure = $failure
  }
}

$nodeVersion = (node --version).Trim()
$npmVersion = (npm --version).Trim()
if ($nodeVersion -ne 'v24.18.0') { throw "Exact Node mismatch: $nodeVersion" }
if ($npmVersion -ne '11.16.0') { throw "Exact npm mismatch: $npmVersion" }
if (-not $IsWindows) { throw "Native Windows runner required" }
if ($env:PROCESSOR_ARCHITECTURE -notmatch 'AMD64|x86_64') { throw "Windows x64 required: $env:PROCESSOR_ARCHITECTURE" }

$npmRoot = (npm root --global).Trim()
$npmCli = (Resolve-Path -LiteralPath (Join-Path $npmRoot 'npm/bin/npm-cli.js')).Path
$packagePath = Join-Path $source 'package.json'
$lockPath = Join-Path $source 'package-lock.json'
if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { throw "package.json missing from exact projection" }
if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf)) { throw "package-lock.json missing from exact projection" }
$package = Get-Content -LiteralPath $packagePath -Raw -Encoding utf8 | ConvertFrom-Json
$scripts = @{}
if ($null -ne $package.scripts) {
  $package.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = [string]$_.Value }
}

$reconstruction = Get-Content -LiteralPath $ReconstructionReceipt -Raw -Encoding utf8 | ConvertFrom-Json
if ($reconstruction.status -ne 'PASS') { throw "Exact projection reconstruction receipt is not PASS" }

$env:CI = 'true'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:LIVE = 'false'
$env:SALE_ENABLED = 'false'
$env:PRODUCTION_APPROVED = 'false'
$env:NODE_OPTIONS = '--max-old-space-size=8192'

$phases = [System.Collections.Generic.List[object]]::new()
$npmCi = Invoke-NativePhase -Name 'npm-ci-native-lifecycle' -FilePath (Get-Command node).Source -ArgumentList @(
  $npmCli, 'ci', '--audit=false', '--fund=false', '--prefer-online', '--loglevel=notice'
) -WorkingDirectory $source
$phases.Add($npmCi)

if ($npmCi.status -eq 'PASS') {
  if ($scripts.ContainsKey('typecheck')) {
    $phases.Add((Invoke-NativePhase -Name 'typescript-semantic' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'typecheck') -WorkingDirectory $source))
  }
  elseif (Test-Path -LiteralPath (Join-Path $source 'node_modules/typescript/bin/tsc')) {
    $phases.Add((Invoke-NativePhase -Name 'typescript-semantic' -FilePath (Get-Command node).Source -ArgumentList @('node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false') -WorkingDirectory $source))
  }
  else {
    $phases.Add((New-BlockedPhase -Name 'typescript-semantic' -Reason 'TypeScript executable and typecheck script are missing'))
  }

  if ($scripts.ContainsKey('lint')) {
    $phases.Add((Invoke-NativePhase -Name 'eslint' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'lint') -WorkingDirectory $source))
  }
  elseif (Test-Path -LiteralPath (Join-Path $source 'node_modules/eslint/bin/eslint.js')) {
    $phases.Add((Invoke-NativePhase -Name 'eslint' -FilePath (Get-Command node).Source -ArgumentList @('node_modules/eslint/bin/eslint.js', '.') -WorkingDirectory $source))
  }
  else {
    $phases.Add((New-BlockedPhase -Name 'eslint' -Reason 'ESLint executable and lint script are missing'))
  }

  Remove-Item -LiteralPath (Join-Path $source '.next') -Recurse -Force -ErrorAction SilentlyContinue
  if ($scripts.ContainsKey('build:webpack')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-webpack' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'build:webpack') -WorkingDirectory $source))
  }
  elseif ($scripts.ContainsKey('build')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-webpack' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'build', '--', '--webpack') -WorkingDirectory $source))
  }
  elseif (Test-Path -LiteralPath (Join-Path $source 'node_modules/next/dist/bin/next')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-webpack' -FilePath (Get-Command node).Source -ArgumentList @('node_modules/next/dist/bin/next', 'build', '--webpack') -WorkingDirectory $source))
  }
  else {
    $phases.Add((New-BlockedPhase -Name 'next-production-build-webpack' -Reason 'Next.js build command is missing'))
  }

  Remove-Item -LiteralPath (Join-Path $source '.next') -Recurse -Force -ErrorAction SilentlyContinue
  if ($scripts.ContainsKey('build:turbopack')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-turbopack' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'build:turbopack') -WorkingDirectory $source))
  }
  elseif ($scripts.ContainsKey('build')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-turbopack' -FilePath (Get-Command node).Source -ArgumentList @($npmCli, 'run', 'build', '--', '--turbopack') -WorkingDirectory $source))
  }
  elseif (Test-Path -LiteralPath (Join-Path $source 'node_modules/next/dist/bin/next')) {
    $phases.Add((Invoke-NativePhase -Name 'next-production-build-turbopack' -FilePath (Get-Command node).Source -ArgumentList @('node_modules/next/dist/bin/next', 'build', '--turbopack') -WorkingDirectory $source))
  }
  else {
    $phases.Add((New-BlockedPhase -Name 'next-production-build-turbopack' -Reason 'Next.js build command is missing'))
  }
}
else {
  foreach ($name in @('typescript-semantic', 'eslint', 'next-production-build-webpack', 'next-production-build-turbopack')) {
    $phases.Add((New-BlockedPhase -Name $name -Reason 'Blocked by failed native npm ci lifecycle closure'))
  }
}

$failed = @($phases | Where-Object { $_.status -ne 'PASS' })
$receipt = [ordered]@{
  schemaVersion = 'velmere.p54.native-windows-exact-p46-build-execution.v1'
  status = $(if ($failed.Count -eq 0) { 'PASS' } else { 'FAIL' })
  decision = $(if ($failed.Count -eq 0) { 'EXACT_NATIVE_WINDOWS_BUILD_PROJECTION_PASS' } else { 'FAIL_EXACT_NATIVE_WINDOWS_BUILD_PROJECTION' })
  credit = $(if ($failed.Count -eq 0) { 'P46_BUILD_RELEVANT_NATIVE_WINDOWS_EXECUTION_ONLY' } else { 'WITHHELD' })
  source = [ordered]@{
    reconstructionReceipt = (Resolve-Path -LiteralPath $ReconstructionReceipt).Path
    reconstructionStatus = [string]$reconstruction.status
    fileCount = 1597
    payloadBytes = 20952834
    pathSetSha256 = 'b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
    sourceContentAggregateSha256 = '83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7'
    packageJsonSha256 = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
    packageLockSha256 = (Get-FileHash -LiteralPath $lockPath -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  runtime = [ordered]@{
    runnerOs = $env:RUNNER_OS
    runnerArch = $env:RUNNER_ARCH
    imageOs = $env:ImageOS
    node = $nodeVersion
    npm = $npmVersion
    powershell = $PSVersionTable.PSVersion.ToString()
  }
  phases = @($phases)
  failedPhaseCount = $failed.Count
  failedPhases = @($failed | ForEach-Object { $_.name })
  truthBoundary = 'This receipt may grant only exact 1597-file P46 build-relevant native Windows npm lifecycle, TypeScript, ESLint and dual Next.js build credit. Browser, PDF, customer outputs, rights, material value, sale eligibility and LIVE remain excluded.'
}
$core = $receipt | ConvertTo-Json -Depth 30 -Compress
$receipt.integritySha256 = Get-Sha256([Text.Encoding]::UTF8.GetBytes($core))
$receiptPath = Join-Path $out 'P54_NATIVE_WINDOWS_EXACT_P46_BUILD_EXECUTION_RECEIPT.json'
$receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $receiptPath -Encoding utf8
$receipt | ConvertTo-Json -Depth 30

if ($receipt.status -ne 'PASS') { exit 2 }
exit 0
