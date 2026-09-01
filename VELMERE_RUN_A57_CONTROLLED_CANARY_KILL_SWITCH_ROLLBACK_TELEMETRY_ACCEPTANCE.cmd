@echo off
setlocal
cd /d "%~dp0"
node scripts\a57-runtime-diagnostics.mjs --write
if errorlevel 1 exit /b 1
node scripts\a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs
if errorlevel 1 exit /b 1
node scripts\a57-package-evidence.mjs
if errorlevel 1 exit /b 1
echo A57 VERIFIED evidence package created.
endlocal
