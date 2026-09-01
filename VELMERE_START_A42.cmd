@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo VELMERE PASS35 A42 - CLEAN WINDOWS DEV START
echo ============================================================

if not exist "VELMERE_ACTIVE_PASS.txt" (
  echo [A42] ERROR: VELMERE_ACTIVE_PASS.txt is missing.
  exit /b 1
)

set /p VELMERE_PASS=<"VELMERE_ACTIVE_PASS.txt"
if /I not "%VELMERE_PASS%"=="VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY" (
  echo [A42] ERROR: wrong or mixed project folder.
  echo [A42] Observed pass: %VELMERE_PASS%
  echo [A42] Expected: VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY
  exit /b 1
)

echo [A42] Verifying source identity and runtime recovery contract...
call npm run diagnose:runtime:a42
if errorlevel 1 exit /b %errorlevel%

echo [A42] Starting from a clean generated Next state...
call npm run dev:clean:a42
exit /b %errorlevel%
