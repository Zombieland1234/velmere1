$ErrorActionPreference = 'Stop'

$script:completed = New-Object System.Collections.Generic.List[string]
$script:status = 'IN_PROGRESS'
$script:errorText = $null
$script:startedAt = (Get-Date).ToUniversalTime().ToString('o')
$outDir = 'p78r3-windows-out'
$groundTruthDir = 'p78r3-windows-groundtruth'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $groundTruthDir | Out-Null

function RunExternal([string]$name, [scriptblock]$block) {
  Write-Host "P78R3 STEP START $name"
  & $block
  if ($LASTEXITCODE -ne 0) { throw "P78R3 external step failed: $name exit=$LASTEXITCODE" }
  $script:completed.Add($name)
  Write-Host "P78R3 STEP PASS $name"
}

function FileSha([string]$path) {
  return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function RequireProjection([string]$manifestPath, [int]$fileCount, [long]$payloadBytes, [string]$pathSet, [string]$aggregate, [string]$label) {
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $p = $manifest.projection
  if ($p.fileCount -ne $fileCount -or $p.payloadBytes -ne $payloadBytes -or $p.pathSetSha256 -ne $pathSet -or $p.sourceContentAggregateSha256 -ne $aggregate) {
    throw "$label frozen projection mismatch: $($p | ConvertTo-Json -Compress)"
  }
  $script:completed.Add("${label}_frozen_projection_identity")
}

try {
  git config core.autocrlf false
  git config core.eol lf

  if ($env:RUNNER_OS -ne 'Windows') { throw "native Windows required; RUNNER_OS=$env:RUNNER_OS" }
  if ((node --version).Trim() -ne 'v24.18.0') { throw "Node mismatch: $(node --version)" }
  if (-not $env:P47_NPM_CLI_PATH -or -not (Test-Path $env:P47_NPM_CLI_PATH)) { throw 'P47_NPM_CLI_PATH missing' }
  $npmVersion = (& node $env:P47_NPM_CLI_PATH --version).Trim()
  if ($LASTEXITCODE -ne 0 -or $npmVersion -ne '11.16.0') { throw "npm mismatch: $npmVersion" }
  $script:completed.Add('native_windows_node_npm')

  RunExternal 'reconstruct_p73r7' { python p73-runtime/reconstruct-p73r7-exact.py --work-root p75-work --out-root $outDir }
  RunExternal 'apply_p75' { python p75-runtime/apply-p75-advanced-automation-runtime.py --source-root p75-work/source --parent-manifest p75-work/P73R7_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P75_PARENT_SOURCE_PATCH.json" }
  RunExternal 'reconstruct_p76_apply' { python p76r2-runtime/reconstruct-p76-base-apply.py --parts-dir p76-runtime --output p76-runtime/apply-p76-advanced-release-automation.py }
  RunExternal 'apply_p76' { python p76-runtime/apply-p76-advanced-release-automation.py --source-root p75-work/source --parent-manifest p75-work/P75_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P76_SOURCE_PATCH.json" }
  RunExternal 'apply_p76r2' { python p76r2-runtime/apply-p76r2-typescript-repair.py --source-root p75-work/source --parent-manifest p75-work/P76_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P76R2_SOURCE_PATCH.json" }
  RunExternal 'apply_p77' { python p77-runtime/apply-p77-deterministic-final-delivery.py --source-root p75-work/source --parent-manifest p75-work/P76R2_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P77_SOURCE_PATCH.json" }
  RunExternal 'p77_static_parent' { python p77-runtime/test-p77-static.py --source-root p75-work/source --receipt "$outDir/P77_STATIC_PARENT.json" }
  RequireProjection 'p75-work/P77_BUILD_PROJECTION_MANIFEST.json' 1601 21037233 '40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59' '354ec7229eb61dd55cccdae90c4a94576967f1c3beb9bad67909d847ccf1e032' 'p77'

  RunExternal 'apply_p78r1' { python p78-runtime/apply-p78r1-audit-authority-customer-path.py --source-root p75-work/source --parent-manifest p75-work/P77_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P78R1_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P78R1_SOURCE_PATCH.json" }
  RequireProjection 'p75-work/P78R1_BUILD_PROJECTION_MANIFEST.json' 1601 21038083 '40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59' 'ea3c19a193d44055e00c3ca952d279f15b4df1813f977789e6ebcea203870a08' 'p78r1'
  RunExternal 'p78r1_static_parent' { python p78-runtime/test-p78r1-static.py --source-root p75-work/source --manifest p75-work/P78R1_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P78R1_STATIC_PARENT.json" }

  RunExternal 'apply_p78r2' { python p78-runtime/apply-p78r2-verified-static-evidence-handoff.py --source-root p75-work/source --parent-manifest p75-work/P78R1_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P78R2_SOURCE_PATCH.json" }
  RequireProjection 'p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json' 1601 21040272 '40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59' '7f161ad862642233a7f7984bd681353f4a1aced3a0f14e1492400a4609c0146f' 'p78r2'
  RunExternal 'p78r2_static_parent' { python p78-runtime/test-p78r2-static.py --source-root p75-work/source --manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P78R2_STATIC_PARENT.json" }

  RunExternal 'apply_p78r3' { python p78-runtime/apply-p78r3-erc2771-multicall-detector.py --source-root p75-work/source --parent-manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --receipt "$outDir/P78R3_SOURCE_PATCH.json" }
  RequireProjection 'p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json' 1602 21059203 '214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f' '6570f1ef462dcc2d84daf30576a84b2acc518d6ec16f6030b7f670280780b79f' 'p78r3'
  RunExternal 'p78r3_static' { python p78-runtime/test-p78r3-static.py --source-root p75-work/source --parent-manifest p75-work/P78R2_BUILD_PROJECTION_MANIFEST.json --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --source-receipt "$outDir/P78R3_SOURCE_PATCH.json" --receipt "$outDir/P78R3_STATIC_CONTROL.json" }
  RunExternal 'projection_preinstall' { python p78-runtime/verify-p78r3-projection.py --source-root p75-work/source --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --mode check --receipt "$outDir/P78R3_PROJECTION_PREINSTALL.json" --build-label preinstall }

  RunExternal 'fetch_pinned_thirdweb_pair' { python p78-runtime/fetch-p78r3-thirdweb-pinned.py --output-dir $groundTruthDir --receipt "$outDir/P78R3_THIRDWEB_PINNED_SOURCE_TRANSPORT.json" }

  $lockBefore = FileSha 'p75-work/source/package-lock.json'
  $packageBefore = FileSha 'p75-work/source/package.json'

  Push-Location p75-work/source
  try {
    RunExternal 'npm_ci_ignore_scripts' { & node $env:P47_NPM_CLI_PATH ci --ignore-scripts --include=dev --audit=false --fund=false }
    RunExternal 'npm_ls_all' { & node $env:P47_NPM_CLI_PATH ls --all }
    RunExternal 'native_next_swc_probe' {
      node -e "for (const p of ['next/package.json','react/package.json','react-dom/package.json','typescript/package.json','eslint/package.json','@next/swc-win32-x64-msvc/package.json']) require.resolve(p); const swc=require('@next/swc-win32-x64-msvc'); if(!swc) process.exit(2); console.log('PASS native package probes')"
    }
    RunExternal 'typescript_semantic' { node ./node_modules/typescript/bin/tsc --noEmit --pretty false }
    RunExternal 'eslint_zero_warning' { node ./node_modules/eslint/bin/eslint.js app components lib store i18n.ts navigation.ts proxy.ts routing.ts tailwind.config.ts next.config.mjs --ext .js,.mjs,.cjs,.ts,.tsx --max-warnings 0 }
  } finally { Pop-Location }

  $env:TSX_TSCONFIG_PATH = (Resolve-Path p75-work/source/tsconfig.json).Path

  $env:P78_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p78r1_runtime_negative_controls' { node ./node_modules/tsx/dist/cli.mjs ../../p78-runtime/test-p78r1-runtime.mts } } finally { Pop-Location }

  $env:P78R2_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p78r2_private_evidence_runtime_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p78-runtime/test-p78r2-runtime.mts } } finally { Pop-Location }

  $env:P78R3_RESULT_DIR = (Resolve-Path $outDir).Path
  $env:P78R3_GROUNDTRUTH_DIR = (Resolve-Path $groundTruthDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p78r3_detector_claim_report_runtime' { node ./node_modules/tsx/dist/cli.mjs ../../p78-runtime/test-p78r3-runtime.mts } } finally { Pop-Location }

  if (Test-Path p73r7-work) { Remove-Item p73r7-work -Recurse -Force }
  New-Item -ItemType Junction -Path p73r7-work -Target (Resolve-Path p75-work).Path | Out-Null
  $env:P73_RESULT_DIR = (Resolve-Path $outDir).Path
  $env:P73_SOURCE_ROOT = (Resolve-Path p75-work/source).Path
  Push-Location p75-work/source
  try { RunExternal 'p73r7_authority_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p73-runtime/test-p73r7-full-authority.ts } } finally { Pop-Location }

  $env:NODE_ENV = 'test'
  $env:P75_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try {
    Copy-Item ../../p75-runtime/test-p75-advanced-memory.ts ../../p75-runtime/test-p75-advanced-memory.mts -Force
    RunExternal 'p75_advanced_automation_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p75-runtime/test-p75-advanced-memory.mts }
  } finally { Pop-Location }

  $env:P76_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p76_release_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p76-runtime/test-p76-release-envelope.ts } } finally { Pop-Location }

  $env:P76R2_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p76r2_human_gate_negative_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p76r2-runtime/test-p76r2-release-envelope.ts } } finally { Pop-Location }

  $env:P77_RESULT_DIR = (Resolve-Path $outDir).Path
  Push-Location p75-work/source
  try { RunExternal 'p77_deterministic_delivery_regression' { node ./node_modules/tsx/dist/cli.mjs ../../p77-runtime/test-p77-deterministic-delivery.mts } } finally { Pop-Location }

  $nextEnvSnapshot = Join-Path (Resolve-Path $outDir).Path 'next-env.original.d.ts'
  RunExternal 'capture_next_env' { python p78-runtime/verify-p78r3-projection.py --source-root p75-work/source --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --mode capture-next-env --snapshot $nextEnvSnapshot --receipt "$outDir/P78R3_NEXT_ENV_CAPTURE.json" --build-label before_builds }

  Get-ChildItem p75-work/source -Force | Where-Object { $_.Name -eq '.next' -or $_.Name -like '.next-*' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  $env:NODE_ENV = 'production'
  $env:NODE_OPTIONS = '--max-old-space-size=6144'
  Push-Location p75-work/source
  try { RunExternal 'next_webpack_production_build' { node ./node_modules/next/dist/bin/next build --webpack } } finally { Pop-Location }
  RunExternal 'webpack_projection_mutation_control' { python p78-runtime/verify-p78r3-projection.py --source-root p75-work/source --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --mode post-build --snapshot $nextEnvSnapshot --receipt "$outDir/P78R3_WEBPACK_PROJECTION_CONTROL.json" --build-label webpack }

  if (Test-Path p75-work/source/.next) { Remove-Item p75-work/source/.next -Recurse -Force }
  Push-Location p75-work/source
  try { RunExternal 'next_turbopack_production_build' { node ./node_modules/next/dist/bin/next build --turbopack } } finally { Pop-Location }
  RunExternal 'turbopack_projection_mutation_control' { python p78-runtime/verify-p78r3-projection.py --source-root p75-work/source --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --mode post-build --snapshot $nextEnvSnapshot --receipt "$outDir/P78R3_TURBOPACK_PROJECTION_CONTROL.json" --build-label turbopack }
  RunExternal 'projection_final' { python p78-runtime/verify-p78r3-projection.py --source-root p75-work/source --manifest p75-work/P78R3_BUILD_PROJECTION_MANIFEST.json --mode check --receipt "$outDir/P78R3_PROJECTION_FINAL.json" --build-label final }

  $lockAfter = FileSha 'p75-work/source/package-lock.json'
  $packageAfter = FileSha 'p75-work/source/package.json'
  if ($lockBefore -ne $lockAfter -or $packageBefore -ne $packageAfter) { throw 'package-lock.json or package.json changed during P78R3 execution' }
  $script:completed.Add('package_lock_and_package_json_unchanged')

  $script:status = 'PASS'
} catch {
  $script:status = 'FAIL'
  $script:errorText = $_.Exception.Message
  Write-Error $_
} finally {
  $receipt = [ordered]@{
    schemaVersion = 'velmere.p78r3.exact-windows-engineering.v1'
    status = $script:status
    startedAt = $script:startedAt
    finishedAt = (Get-Date).ToUniversalTime().ToString('o')
    parent = [ordered]@{
      revision = 'P78R2/V17'
      aggregateSha256 = '7f161ad862642233a7f7984bd681353f4a1aced3a0f14e1492400a4609c0146f'
    }
    candidate = [ordered]@{
      revision = 'P78R3/V17'
      fileCount = 1602
      payloadBytes = 21059203
      pathSetSha256 = '214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f'
      aggregateSha256 = '6570f1ef462dcc2d84daf30576a84b2acc518d6ec16f6030b7f670280780b79f'
    }
    completedSteps = @($script:completed)
    completedStepCount = $script:completed.Count
    error = $script:errorText
    detectorTruth = [ordered]@{
      family = 'ERC2771_CONTEXT_MULTICALL_SENDER_SPOOFING'
      sourcePattern = 'TESTED'
      pinnedVulnerableFixedPair = 'TESTED'
      runtimeExploitability = 'WITHHELD_NOT_REPRODUCED'
      deployedBytecodeEquivalence = 'WITHHELD_NOT_PROVEN'
      formalAccuracy = 'WITHHELD'
      riskFloorPromotion = $false
    }
    zeroFakeCredit = [ordered]@{
      customerFinal = '0/20'
      auditFinalPdf = '0/3'
      rights = '2/203'
      paidValue = '0/10'
      saleEligible = '0/20'
      live = $false
    }
    truthBoundary = 'Native Windows engineering/regression proof for exact P78R3 bytes. A PASS proves deterministic reconstruction, static/type/lint/runtime regressions, pinned historical vulnerable/fixed source behavior, and dual Next builds. It does not prove deployed reachability/runtime exploitability, population detector accuracy, customer FINAL, final PDF, rights, paid value, sale eligibility, LIVE or WORLD_CLASS.'
  }
  $receipt | ConvertTo-Json -Depth 12 | Set-Content "$outDir/P78R3_EXACT_WINDOWS_ENGINEERING.json" -Encoding utf8
}

if ($script:status -ne 'PASS') { exit 1 }
