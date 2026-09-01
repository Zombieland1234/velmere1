@echo off
setlocal
cd /d "%~dp0"
if "%VELMERE_A61_PASS6_ZIP%"=="" (
  echo Set VELMERE_A61_PASS6_ZIP to the original VELMERE_PASS6_99_9_OFFLINE_CANDIDATE.zip.
  exit /b 2
)
if "%VELMERE_A61_PASS5_ZIP%"=="" (
  echo Set VELMERE_A61_PASS5_ZIP to the original VLM_PASS5.zip or VLM_PASS5(1).zip.
  exit /b 2
)
node scripts/pass36/verify-a61-historical-artifact-recovery.mjs --pass6-zip "%VELMERE_A61_PASS6_ZIP%" --pass5-zip "%VELMERE_A61_PASS5_ZIP%" --install
if errorlevel 1 exit /b %errorlevel%
npm run test:pass6:critical
exit /b %errorlevel%
