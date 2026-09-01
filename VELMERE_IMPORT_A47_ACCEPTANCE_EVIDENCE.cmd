@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A47 - ACCEPTANCE EVIDENCE INTAKE
 echo ============================================================
call npm run diagnose:runtime:a47
if errorlevel 1 exit /b %errorlevel%
if "%~1"=="" goto defaults
if "%~2"=="" (
  echo [A47] Provide both ZIP files: A45 evidence and A46 evidence.
  echo Usage: VELMERE_IMPORT_A47_ACCEPTANCE_EVIDENCE.cmd "A45.zip" "A46.zip"
  exit /b 2
)
node scripts/a47-evidence-intake.mjs --a45 "%~1" --a46 "%~2"
set RESULT=%errorlevel%
node scripts/a47-package-evidence.mjs
exit /b %RESULT%
:defaults
node scripts/a47-evidence-intake.mjs
set RESULT=%errorlevel%
node scripts/a47-package-evidence.mjs
exit /b %RESULT%
