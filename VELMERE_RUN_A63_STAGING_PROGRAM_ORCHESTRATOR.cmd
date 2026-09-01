@echo off
setlocal
cd /d "%~dp0"
node scripts\a63-staging-program-orchestrator.mjs --execute %*
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo [VELMERE A63] program stopped fail-closed with exit code %RC%.
  exit /b %RC%
)
node scripts\a63-package-evidence.mjs
exit /b %ERRORLEVEL%
