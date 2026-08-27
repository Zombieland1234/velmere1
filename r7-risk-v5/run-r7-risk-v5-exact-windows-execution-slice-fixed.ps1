$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-exact-windows.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-exact-windows-execution-slice-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$NewLine = if ($Text.Contains("`r`n")) { "`r`n" } else { "`n" }

# The transported Risk patch contains two full-source-only identity files that are
# deliberately absent from the execution slice. Exclude only those paths, regenerate
# the execution manifest/TSV from the resulting exact files, and require all target
# hashes before the engineering and 52-test campaigns may continue.
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

$OldEnd = '} finally { Pop-Location }' + $NewLine + '# === End Risk Indicator v5 source overlay ==='
$NewEnd = '} finally { Pop-Location }' + $NewLine +
  '& node ''r7-risk-v5/regenerate-risk-v5-execution-manifest.mjs'' ''r7-work'' $RiskReceiptPath' + $NewLine +
  'if ($LASTEXITCODE -ne 0) { throw "risk_v5_manifest_regeneration_failed:$LASTEXITCODE" }' + $NewLine +
  '# === End Risk Indicator v5 source overlay ==='
$EndCount = ([regex]::Matches($Text, [regex]::Escape($OldEnd))).Count
if ($EndCount -ne 1) { throw "risk_v5_exact_manifest_regeneration_anchor_mismatch:$EndCount" }
$Text = $Text.Replace($OldEnd, $NewEnd)

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
