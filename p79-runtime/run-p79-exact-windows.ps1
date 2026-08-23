$ErrorActionPreference='Stop'
function Run([string]$cmd){ Write-Host "P79_RUN $cmd"; Invoke-Expression $cmd; if($LASTEXITCODE-ne0){throw "failed: $cmd"} }

git config core.autocrlf false
git config core.eol lf
New-Item -ItemType Directory -Force -Path p79-out | Out-Null

# Reconstruct exact P77R3 product bytes using the already-proven chain.
Run "python p73-runtime/reconstruct-p73r7-exact.py --work-root p75-work --out-root p79-out"
Run "python p75-runtime/apply-p75-advanced-automation-runtime.py --source-root p75-work/source --parent-manifest p75-work/P73R7_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P75_PARENT_SOURCE_PATCH.json"
Run "python p76r2-runtime/reconstruct-p76-base-apply.py --parts-dir p76-runtime --output p76-runtime/apply-p76-advanced-release-automation.py"
Run "python p76-runtime/apply-p76-advanced-release-automation.py --source-root p75-work/source --parent-manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P76_SOURCE_PATCH.json"
Run "python p76r2-runtime/apply-p76r2-typescript-repair.py --source-root p75-work/source --parent-manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P76R2_SOURCE_PATCH.json"
Run "python p77-runtime/apply-p77-deterministic-final-delivery.py --source-root p75-work/source --parent-manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P77_SOURCE_PATCH.json"
Run "python p77-runtime/test-p77-static.py --source-root p75-work/source --receipt p79-out/P77_STATIC_CONTROL_PARENT.json"

# Apply the compact exact P79 production diff. Preimage SHA is checked before patch; postimage and the full 1605-file projection are checked after patch.
Run "python p79-runtime/apply-p79-unified-diff.py --source-root p75-work/source --parent-manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --spec p79-runtime/P79_SOURCE_PATCH_SPEC.json --patch-b64 p79-runtime/P79_SOURCE_PATCH.diff.gz.b64 --manifest p75-work/P79_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P79_SOURCE_PATCH.json"
Copy-Item p75-work/P79_BUILD_PROJECTION_MANIFEST.json p79-out/

# Reconcile the proven native-Windows runner through P77 and bind its one controlled Next-generated mutation to P79.
Run "python p60-runtime/build-p60-reconciled-runner.py --input p49-build-projection/run-p47-product-windows-projection.mjs --output p75-work/run-p79.mjs --receipt p79-out/RUNNER_P60.json"
Run "python p66-runtime/patch-p66-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P66.json"
Run "python p68-runtime/patch-p68-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P68.json"
Run "python p69-runtime/patch-p69-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P69.json"
Run "python p69-runtime/patch-p69r2-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P69R2.json"
Run "python p71-runtime/patch-p71-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P71.json"
Run "python p71-runtime/patch-p71r1-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P71R1.json"
Run "python p71-runtime/patch-p71r3-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P71R3.json"
Run "python p72-runtime/patch-p72-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P72.json"
Run "python p72-runtime/patch-p72r3-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P72R3.json"
Run "python p73-runtime/patch-p73r4-reconciled-runner.py --runner p75-work/run-p79.mjs --receipt p79-out/RUNNER_P73R4.json"
Run "python p73-runtime/patch-p73r7-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P73R7_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P73R7.json"
Run "python p75-runtime/patch-p75-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P75.json"
Run "python p76-runtime/patch-p76-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P76.json"
Run "python p76r2-runtime/patch-p76r2-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P76R2.json"
Run "python p77-runtime/patch-p77-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P77.json"
Run "python p79-runtime/patch-p79-reconciled-runner.py --runner p75-work/run-p79.mjs --manifest p75-work/P79_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/RUNNER_P79.json"
Run "node --check p75-work/run-p79.mjs"
Run "node p75-work/run-p79.mjs --source-root p75-work/source --manifest p75-work/P79_BUILD_PROJECTION_MANIFEST.json --output-dir p79-out"

# Retain parent runtime regressions on the new bytes.
if(Test-Path p73r7-work){Remove-Item p73r7-work -Recurse -Force};New-Item -ItemType Junction -Path p73r7-work -Target (Resolve-Path p75-work).Path | Out-Null
$env:P73_RESULT_DIR=(Resolve-Path p79-out).Path;$env:P73_SOURCE_ROOT=(Resolve-Path p75-work/source).Path;$env:TSX_TSCONFIG_PATH=(Resolve-Path p75-work/source/tsconfig.json).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p73-runtime/test-p73r7-full-authority.ts"}finally{Pop-Location}
$env:NODE_ENV='test';$env:P75_RESULT_DIR=(Resolve-Path p79-out).Path
Push-Location p75-work/source;try{Copy-Item ../../p75-runtime/test-p75-advanced-memory.ts ../../p75-runtime/test-p75-advanced-memory.mts -Force;Run "node ./node_modules/tsx/dist/cli.mjs ../../p75-runtime/test-p75-advanced-memory.mts"}finally{Pop-Location}
$env:P76_RESULT_DIR=(Resolve-Path p79-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p76-runtime/test-p76-release-envelope.ts"}finally{Pop-Location}
$env:P76R2_RESULT_DIR=(Resolve-Path p79-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p76r2-runtime/test-p76r2-release-envelope.ts"}finally{Pop-Location}
$env:P77_RESULT_DIR=(Resolve-Path p79-out).Path
Push-Location p75-work/source;try{Run "node ./node_modules/tsx/dist/cli.mjs ../../p77-runtime/test-p77-deterministic-delivery.mts"}finally{Pop-Location}

# Temporarily reconstruct only P78/P79 harness files inside the exact source tree so relative imports bind to the exact product bytes.
# The harness bundle is not part of the product projection and is removed before the final identity check.
Run "python p79-runtime/reconstruct-p79-harnesses.py --bundle-b64 p79-runtime/P79_HARNESSES.tar.gz.b64 --output-dir p75-work/source --receipt p79-out/P79_HARNESS_RECONSTRUCTION.json"
Push-Location p75-work/source
try{
 Run "python scripts/p78/test-p78-static.py"
 Run "python scripts/p78/test-p78r3-customer-path-static.py"
 Run "python scripts/p79/test-p79-static.py"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p78/test-p78-private-provider-evidence-runtime.mjs"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p78/test-p78-standard-json-customer-path-runtime.mjs"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p78/test-p78-thirdweb-micro-corpus-runtime.mjs"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p79/test-p79-dominott-historical-ground-truth-runtime.mjs"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p79/test-p79-registry-customer-path-runtime.mjs"
 Run "node ./node_modules/tsx/dist/cli.mjs scripts/p79/test-p79-basic-pdf-historical-artifact-runtime.mjs"
} finally { Pop-Location }

# Export bounded receipts/artifact before cleaning the temporary test overlay.
New-Item -ItemType Directory -Force -Path p79-out/p78-current | Out-Null
New-Item -ItemType Directory -Force -Path p79-out/p79-current | Out-Null
New-Item -ItemType Directory -Force -Path p79-out/p79-artifacts | Out-Null
if(Test-Path p75-work/source/receipts/p78){Copy-Item p75-work/source/receipts/p78/*.json p79-out/p78-current/ -Force}
if(Test-Path p75-work/source/receipts/p79){Copy-Item p75-work/source/receipts/p79/*.json p79-out/p79-current/ -Force}
if(Test-Path p75-work/source/artifacts/closure/p79){Copy-Item p75-work/source/artifacts/closure/p79/* p79-out/p79-artifacts/ -Force}
Remove-Item p75-work/source/scripts -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item p75-work/source/receipts -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item p75-work/source/artifacts -Recurse -Force -ErrorAction SilentlyContinue
Run "python p79-runtime/verify-p79-projection.py --source-root p75-work/source --manifest p75-work/P79_BUILD_PROJECTION_MANIFEST.json --receipt p79-out/P79_POST_REGRESSION_PROJECTION.json"
