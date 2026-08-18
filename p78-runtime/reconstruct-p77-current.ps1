$ErrorActionPreference='Stop'
function Run([string]$cmd){ Invoke-Expression $cmd; if($LASTEXITCODE-ne0){throw "failed: $cmd"} }
git config core.autocrlf false
git config core.eol lf
New-Item -ItemType Directory -Force -Path p78-out | Out-Null
Run "python p73-runtime/reconstruct-p73r7-exact.py --work-root p78-work --out-root p78-out"
Run "python p75-runtime/apply-p75-advanced-automation-runtime.py --source-root p78-work/source --parent-manifest p78-work/P73R7_BUILD_PROJECTION_MANIFEST.json --manifest p78-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P75_PARENT_SOURCE_PATCH.json"
Run "python p76r2-runtime/reconstruct-p76-base-apply.py --parts-dir p76-runtime --output p76-runtime/apply-p76-advanced-release-automation.py"
Run "python p76-runtime/apply-p76-advanced-release-automation.py --source-root p78-work/source --parent-manifest p78-work/P75_BUILD_PROJECTION_MANIFEST.json --manifest p78-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P76_SOURCE_PATCH.json"
Run "python p76r2-runtime/apply-p76r2-typescript-repair.py --source-root p78-work/source --parent-manifest p78-work/P76_BUILD_PROJECTION_MANIFEST.json --manifest p78-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P76R2_SOURCE_PATCH.json"
Run "python p77-runtime/apply-p77-deterministic-final-delivery.py --source-root p78-work/source --parent-manifest p78-work/P76R2_BUILD_PROJECTION_MANIFEST.json --manifest p78-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P77_SOURCE_PATCH.json"
Copy-Item p78-work/P77_BUILD_PROJECTION_MANIFEST.json p78-out/P77_BUILD_PROJECTION_MANIFEST.json
$x=Get-Content p78-work/P77_BUILD_PROJECTION_MANIFEST.json -Raw | ConvertFrom-Json
if($x.projection.fileCount-ne1601){throw 'P77 fileCount mismatch'}
if($x.projection.payloadBytes-ne21037233){throw 'P77 payload mismatch'}
if($x.projection.sourceContentAggregateSha256-ne'354ec7229eb61dd55cccdae90c4a94576967f1c3beb9bad67909d847ccf1e032'){throw 'P77 aggregate mismatch'}
Write-Output 'PASS_EXACT_P77R3_RECONSTRUCTION_FOR_P78_DIAGNOSTIC'
