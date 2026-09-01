@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A45 - EXACT RUNTIME + BROWSER ACCEPTANCE
echo ============================================================
call npm run diagnose:runtime:a45
if errorlevel 1 exit /b %errorlevel%
echo [A45] Starting A44 visual master runtime for manual review...
call npm run dev:clean:a44
exit /b %errorlevel%
