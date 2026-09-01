@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo VELMERE PASS35 A43 - WEBPACK CSS + VISUAL RUNTIME RECOVERY
echo ============================================================

if not exist "VELMERE_ACTIVE_PASS.txt" (
  echo [A43] ERROR: VELMERE_ACTIVE_PASS.txt is missing.
  exit /b 1
)
if not exist "VELMERE_A43_PATCH.txt" (
  echo [A43] ERROR: VELMERE_A43_PATCH.txt is missing.
  exit /b 1
)

set /p VELMERE_PARENT=<"VELMERE_ACTIVE_PASS.txt"
if /I not "%VELMERE_PARENT%"=="VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY" (
  echo [A43] ERROR: wrong or mixed project folder.
  echo [A43] Observed parent: %VELMERE_PARENT%
  exit /b 1
)

findstr /C:"VELMERE_PASS35_A43_WEBPACK_CSS_VISUAL_RUNTIME_RECOVERY" "VELMERE_A43_PATCH.txt" >nul
if errorlevel 1 (
  echo [A43] ERROR: A43 patch marker is invalid.
  exit /b 1
)

echo [A43] Verifying Webpack CSS purity, visual routes and data routes...
call npm run diagnose:runtime:a43
if errorlevel 1 exit /b %errorlevel%

echo [A43] Starting exact A42 runtime parent with the A43 compile hotfix...
call npm run dev:clean:a43
exit /b %errorlevel%
