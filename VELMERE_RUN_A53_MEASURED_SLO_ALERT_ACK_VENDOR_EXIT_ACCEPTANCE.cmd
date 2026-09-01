@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A53 - MEASURED SLO + ALERT ACK + VENDOR EXIT
echo ============================================================
echo Disposable staging measurement and vendor-exit drill only.
echo Production-like URLs are rejected. Secrets are never logged.
echo.
call npm run diagnose:runtime:a53
if errorlevel 1 exit /b 1
call npm run verify:source:a53
if errorlevel 1 exit /b 1
call npm run staging:slo-vendor-exit:a53
if errorlevel 1 exit /b 1
call npm run package:evidence:a53
if errorlevel 1 exit /b 1
echo.
echo A53 evidence created:
echo artifacts\pass35\PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE_EVIDENCE.zip
endlocal
