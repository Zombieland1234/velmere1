$ErrorActionPreference = 'Stop'
$Source = Join-Path $PSScriptRoot 'run-r7-browser-current-e2e.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-browser-current-e2e-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$OldCheck = 'git apply --check --no-index $PatchPath'
$NewCheck = 'git -c core.autocrlf=false apply --check --no-index $PatchPath'
$OldApply = 'git apply --no-index $PatchPath'
$NewApply = 'git -c core.autocrlf=false apply --no-index $PatchPath'
$OldBase = "$env:R7_E2E_BASE_URL = 'http://127.0.0.1:3100'"
$NewBase = "$env:R7_E2E_BASE_URL = 'http://localhost:3100'"
if (([regex]::Matches($Text, [regex]::Escape($OldCheck))).Count -ne 1) { throw 'e2e_patch_check_anchor_mismatch' }
if (([regex]::Matches($Text, [regex]::Escape($OldApply))).Count -ne 1) { throw 'e2e_patch_apply_anchor_mismatch' }
if (([regex]::Matches($Text, [regex]::Escape($OldBase))).Count -ne 1) { throw 'e2e_base_url_anchor_mismatch' }
$Text = $Text.Replace($OldCheck, $NewCheck).Replace($OldApply, $NewApply).Replace($OldBase, $NewBase)
Set-Content -LiteralPath $Fixed -Value $Text -Encoding utf8
& $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
