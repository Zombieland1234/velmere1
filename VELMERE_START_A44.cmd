@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo VELMERE PASS35 A44 - VISUAL MASTER + CURRENT ENGINE
echo ============================================================

if not exist "VELMERE_ACTIVE_PASS.txt" (
  echo [A44] ERROR: VELMERE_ACTIVE_PASS.txt is missing.
  exit /b 1
)
if not exist "VELMERE_A43_PATCH.txt" (
  echo [A44] ERROR: parent A43 patch marker is missing.
  exit /b 1
)
if not exist "VELMERE_A44_PATCH.txt" (
  echo [A44] ERROR: A44 patch marker is missing.
  exit /b 1
)

set /p VELMERE_PARENT=<"VELMERE_ACTIVE_PASS.txt"
if /I not "%VELMERE_PARENT%"=="VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY" (
  echo [A44] ERROR: wrong or mixed project folder.
  echo [A44] Observed runtime parent: %VELMERE_PARENT%
  exit /b 1
)

findstr /C:"VELMERE_PASS35_A43_WEBPACK_CSS_VISUAL_RUNTIME_RECOVERY" "VELMERE_A43_PATCH.txt" >nul
if errorlevel 1 (
  echo [A44] ERROR: A43 parent marker is invalid.
  exit /b 1
)
findstr /C:"VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING" "VELMERE_A44_PATCH.txt" >nul
if errorlevel 1 (
  echo [A44] ERROR: A44 patch marker is invalid.
  exit /b 1
)

echo [A44] Verifying visual master, current engine binding and runtime...
call npm run diagnose:runtime:a44
if errorlevel 1 exit /b %errorlevel%

echo [A44] Starting clean Webpack development runtime...
call npm run dev:clean:a44
exit /b %errorlevel%
