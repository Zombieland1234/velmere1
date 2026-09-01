@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A46 - CUSTOMER UI + DATA PLANE ACCEPTANCE
echo ============================================================
call npm run accept:data:a46
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [A46] FAIL - review artifacts\pass35\a46 and the evidence ZIP.
) else (
  echo.
  echo [A46] PASS - evidence: artifacts\pass35\PASS35_A46_DATA_ACCEPTANCE_EVIDENCE.zip
)
exit /b %EXIT_CODE%
