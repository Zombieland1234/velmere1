$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-exact-windows.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-exact-windows-execution-slice-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

# The transported Risk patch contains full-source identity files that are deliberately
# absent from the execution slice. Exclude only those two paths at slice-apply time.
# The exact target manifest, aggregate, package hashes, 52-test campaigns and rebuilt
# bundle remain mandatory and fail closed.
$OldCheck = "  git -c core.autocrlf=false apply --check --no-index (Resolve-Path -LiteralPath ('../' + `$RiskPatchPath)).Path"
$NewCheck = "  git -c core.autocrlf=false apply --check --no-index --exclude=VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv --exclude=artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json (Resolve-Path -LiteralPath ('../' + `$RiskPatchPath)).Path"
$OldApply = "  git -c core.autocrlf=false apply --no-index (Resolve-Path -LiteralPath ('../' + `$RiskPatchPath)).Path"
$NewApply = "  git -c core.autocrlf=false apply --no-index --exclude=VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv --exclude=artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json (Resolve-Path -LiteralPath ('../' + `$RiskPatchPath)).Path"

if (([regex]::Matches($Text, [regex]::Escape($OldCheck))).Count -ne 1) {
  throw 'risk_v5_exact_patch_check_anchor_mismatch'
}
if (([regex]::Matches($Text, [regex]::Escape($OldApply))).Count -ne 1) {
  throw 'risk_v5_exact_patch_apply_anchor_mismatch'
}
$Text = $Text.Replace($OldCheck, $NewCheck).Replace($OldApply, $NewApply)
[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
