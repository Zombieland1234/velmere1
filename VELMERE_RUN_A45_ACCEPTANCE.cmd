@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A45 - ONE-SHOT ACCEPTANCE
echo ============================================================
node -v
npm -v
call npm run accept:runtime:a45
set CODE=%ERRORLEVEL%
echo.
if "%CODE%"=="0" (
  echo [A45] PASS - evidence: artifacts\pass35\PASS35_A45_ACCEPTANCE_EVIDENCE.zip
) else (
  echo [A45] FAIL - inspect artifacts\pass35\a45 and logs.
)
exit /b %CODE%
