param(
  [ValidateSet("Quick", "Milestone", "Build")]
  [string]$Level = "Quick",
  [switch]$AllowHeavy
)

$ErrorActionPreference = "Stop"
$levelArg = $Level.ToLowerInvariant()
if ($levelArg -eq "quick") {
  node scripts/pass26/run-gate.mjs --level quick
  exit $LASTEXITCODE
}

if (-not $AllowHeavy) {
  Write-Error "PASS26 $Level requires -AllowHeavy. Heavy milestone/build should normally run once through the manual PASS26 GitHub Actions bridge."
}
$args = @("scripts/pass25/run-gate.mjs", "--level", $levelArg, "--allow-heavy")
node @args
exit $LASTEXITCODE
