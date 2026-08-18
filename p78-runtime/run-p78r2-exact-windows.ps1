$ErrorActionPreference='Stop'
function Run([string]$cmd){ Invoke-Expression $cmd; if($LASTEXITCODE-ne0){throw "failed: $cmd"} }
git config core.autocrlf false
git config core.eol lf
New-Item -ItemType Directory -Force -Path p78-out | Out-Null
Run "python p73-runtime/reconstruct-p73r7-exact.py --work-root p75-work --out-root p78-out"
Run "python p75-runtime/apply-p75-advanced-automation-runtime.py --source-root p75-work/source --parent-manifest p75-work/P73R7_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P75_PARENT_SOURCE_PATCH.json"
Run "python p76r2-runtime/reconstruct-p76-base-apply.py --parts-dir p76-runtime --output p76-runtime/apply-p76-advanced-release-automation.py"
Run "python p76-runtime/apply-p76-advanced-release-automation.py --source-root p75-work/source --parent-manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P76_SOURCE_PATCH.json"
Run "python p76r2-runtime/apply-p76r2-typescript-repair.py --source-root p75-work/source --parent-manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P76R2_SOURCE_PATCH.json"
Run "python p77-runtime/apply-p77-deterministic-final-delivery.py --source-root p75-work/source --parent-manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P77_SOURCE_PATCH.json"
Run "python p78-runtime/apply-p78r2-verified-static-evidence.py --source-root p75-work/source --parent-manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/P78R2_SOURCE_PATCH.json"
Run "python p77-runtime/test-p77-static.py --source-root p75-work/source --receipt p78-out/P77_STATIC_CONTROL.json"
Copy-Item p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json p78-out/
Run "python p60-runtime/build-p60-reconciled-runner.py --input p49-build-projection/run-p47-product-windows-projection.mjs --output p75-work/run-p78.mjs --receipt p78-out/RUNNER_P60.json"
Run "python p66-runtime/patch-p66-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P66.json"
Run "python p68-runtime/patch-p68-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P68.json"
Run "python p69-runtime/patch-p69-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P69.json"
Run "python p69-runtime/patch-p69r2-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P69R2.json"
Run "python p71-runtime/patch-p71-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P71.json"
Run "python p71-runtime/patch-p71r1-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P71R1.json"
Run "python p71-runtime/patch-p71r3-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P71R3.json"
Run "python p72-runtime/patch-p72-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P72.json"
Run "python p72-runtime/patch-p72r3-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P72R3.json"
Run "python p73-runtime/patch-p73r4-reconciled-runner.py --runner p75-work/run-p78.mjs --receipt p78-out/RUNNER_P73R4.json"
Run "python p73-runtime/patch-p73r7-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P73R7_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P73R7.json"
Run "python p75-runtime/patch-p75-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P75.json"
Run "python p76-runtime/patch-p76-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P76.json"
Run "python p76r2-runtime/patch-p76r2-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P76R2.json"
Run "python p77-runtime/patch-p77-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P77.json"
Run "python p78-runtime/patch-p78r2-reconciled-runner.py --runner p75-work/run-p78.mjs --manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --receipt p78-out/RUNNER_P78R2.json"
Run "node --check p75-work/run-p78.mjs"
Run "node p75-work/run-p78.mjs --source-root p75-work/source --manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --output-dir p78-out"
if(Test-Path p73r7-work){Remove-Item p73r7-work -Recurse -Force};New-Item -ItemType Junction -Path p73r7-work -Target (Resolve-Path p75-work).Path | Out-Null
$env:P73_RESULT_DIR=(Resolve-Path p78-out).Path;$env:P73_SOURCE_ROOT=(Resolve-Path p75-work/source).Path;$env:TSX_TSCONFIG_PATH=(Resolve-Path p75-work/source/tsconfig.json).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p73-runtime/test-p73r7-full-authority.ts"}finally{Pop-Location}
$env:NODE_ENV='test';$env:P75_RESULT_DIR=(Resolve-Path p78-out).Path
Push-Location p75-work/source;try{Copy-Item ../../p75-runtime/test-p75-advanced-memory.ts ../../p75-runtime/test-p75-advanced-memory.mts -Force;Run "node ./node_modules/tsx/dist/cli.mjs ../../p75-runtime/test-p75-advanced-memory.mts"}finally{Pop-Location}
$env:P76_RESULT_DIR=(Resolve-Path p78-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p76-runtime/test-p76-release-envelope.ts"}finally{Pop-Location}
$env:P76R2_RESULT_DIR=(Resolve-Path p78-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p76r2-runtime/test-p76r2-release-envelope.ts"}finally{Pop-Location}
$env:P77_RESULT_DIR=(Resolve-Path p78-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p77-runtime/test-p77-deterministic-delivery.mts"}finally{Pop-Location}
$env:P78_RESULT_DIR=(Resolve-Path p78-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p78-runtime/test-p78r2-customer-static-evidence.ts"}finally{Pop-Location}
