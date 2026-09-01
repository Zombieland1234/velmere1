@echo off
setlocal
cd /d "%~dp0"
node scripts\a55-runtime-diagnostics.mjs --write
if errorlevel 1 exit /b 1
node scripts\a55-independent-retest-legal-customer-release-acceptance.mjs
if errorlevel 1 exit /b 1
node scripts\a55-package-evidence.mjs
if errorlevel 1 exit /b 1
echo A55 VERIFIED evidence package created.
endlocal
