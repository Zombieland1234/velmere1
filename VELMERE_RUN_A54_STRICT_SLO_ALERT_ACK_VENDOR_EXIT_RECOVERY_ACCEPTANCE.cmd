@echo off
setlocal
cd /d "%~dp0"

echo [A54] Exact runtime diagnostics and environment preflight...
call npm run diagnose:runtime:a54
if errorlevel 1 exit /b 1

echo [A54] Source manifest verification...
call npm run verify:source:a54
if errorlevel 1 exit /b 1

echo [A54] Contract and protected-integrity verification...
call npm run test:pass35:a54
if errorlevel 1 exit /b 1

echo [A54] Running strict disposable-staging drill...
call npm run staging:strict-slo-vendor-exit:a54
if errorlevel 1 exit /b 1

echo [A54] Packaging verified staging evidence only...
call npm run package:evidence:a54
if errorlevel 1 exit /b 1

echo [A54] VERIFIED staging evidence package created.
endlocal
