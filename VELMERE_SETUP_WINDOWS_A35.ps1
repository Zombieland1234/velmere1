param(
  [switch]$DiagnoseOnly,
  [int]$Attempts = 5
)
$ErrorActionPreference = "Stop"
$RequiredNode = "24.18.0"
$RequiredNpm = "11.16.0"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Current-Version([string]$Command, [string[]]$Arguments) {
  try { return ((& $Command @Arguments 2>$null) | Select-Object -First 1).Trim().TrimStart('v') }
  catch { return "missing" }
}
function Stop-WithGuidance([string]$Message) {
  Write-Host ""; Write-Host $Message -ForegroundColor Red
  Write-Host "Required: Node $RequiredNode / npm $RequiredNpm" -ForegroundColor Yellow
  Write-Host "Install nvm-windows, then run: nvm install $RequiredNode; nvm use $RequiredNode" -ForegroundColor Yellow
  exit 20
}

$nodeVersion = Current-Version "node.exe" @("--version")
$npmVersion = Current-Version "npm.cmd" @("--version")
Write-Host "Node: $nodeVersion (required $RequiredNode)"
Write-Host "npm : $npmVersion (required $RequiredNpm)"
Write-Host "Registry: $(& npm.cmd --force --loglevel=silent config get registry 2>$null)"

if ($nodeVersion -ne $RequiredNode) {
  $nvm = Get-Command nvm.exe -ErrorAction SilentlyContinue
  if (-not $nvm) { Stop-WithGuidance "Wrong Node version and nvm-windows was not found." }
  Write-Host "Switching Node with nvm-windows..." -ForegroundColor Cyan
  & nvm.exe install $RequiredNode
  if ($LASTEXITCODE -ne 0) { Stop-WithGuidance "nvm could not install Node $RequiredNode." }
  & nvm.exe use $RequiredNode
  if ($LASTEXITCODE -ne 0) { Stop-WithGuidance "nvm could not activate Node $RequiredNode." }
  $nodeVersion = Current-Version "node.exe" @("--version")
}
if ($nodeVersion -ne $RequiredNode) { Stop-WithGuidance "Node version remains incorrect." }

if ($npmVersion -ne $RequiredNpm) {
  Write-Host "Installing exact npm $RequiredNpm..." -ForegroundColor Cyan
  $previous = Get-Location
  try {
    Set-Location $env:TEMP
    & npm.cmd --force install --global "npm@$RequiredNpm" --registry=https://registry.npmjs.org/ --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
    if ($LASTEXITCODE -ne 0) { Stop-WithGuidance "Exact npm installation failed. Check proxy/firewall/registry access." }
  } finally { Set-Location $previous }
  $npmVersion = Current-Version "npm.cmd" @("--version")
}
if ($npmVersion -ne $RequiredNpm) { Stop-WithGuidance "npm version remains incorrect." }

& node.exe scripts/a35-install-diagnostics.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($DiagnoseOnly) { Write-Host "Diagnosis complete." -ForegroundColor Green; exit 0 }

$logDir = Join-Path $Root ".velmere\install"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$success = $false
for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
  $log = Join-Path $logDir "a35-npm-ci-attempt-$attempt.log"
  Write-Host "npm ci attempt $attempt/$Attempts..." -ForegroundColor Cyan
  & npm.cmd ci --registry=https://registry.npmjs.org/ --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 2>&1 | Tee-Object -FilePath $log
  $code = $LASTEXITCODE
  if ($code -eq 0) { $success = $true; break }
  $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
  $transient = $text -match "E503|503 Service Temporarily Unavailable|ETIMEDOUT|ECONNRESET|EAI_AGAIN|ENETUNREACH"
  if (-not $transient) {
    Write-Host "Non-transient npm failure. See $log" -ForegroundColor Red
    exit $code
  }
  $delay = [Math]::Min(60, [Math]::Pow(2, $attempt) * 5)
  Write-Host "Transient registry/network failure. Retrying in $delay seconds..." -ForegroundColor Yellow
  Start-Sleep -Seconds $delay
}
if (-not $success) {
  Write-Host "npm registry remained unavailable after $Attempts attempts." -ForegroundColor Red
  Write-Host "Check firewall/proxy, then rerun this script. Do not use --force to bypass the toolchain contract." -ForegroundColor Yellow
  exit 30
}

Write-Host "Rebuilding explicitly trusted native packages..." -ForegroundColor Cyan
& npm.cmd run install:trusted-native
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& npm.cmd run verify:runtime-contract
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Installation completed with exact toolchain." -ForegroundColor Green
