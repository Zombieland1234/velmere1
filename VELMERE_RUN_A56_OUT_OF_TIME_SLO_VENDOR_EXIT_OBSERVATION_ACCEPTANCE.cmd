@echo off
setlocal
cd /d "%~dp0"
node scripts\a56-runtime-diagnostics.mjs --write
if errorlevel 1 exit /b 1
node scripts\a56-out-of-time-slo-vendor-exit-observation-acceptance.mjs
if errorlevel 1 exit /b 1
node scripts\a56-package-evidence.mjs
if errorlevel 1 exit /b 1
echo A56 VERIFIED evidence package created.
endlocal
