@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A52 - KILL SWITCH INCIDENT COMMUNICATION
echo ============================================================
echo Disposable staging incident drill only.
echo Production-like URLs are rejected. Secrets are never logged.
echo.
call npm run diagnose:runtime:a52
if errorlevel 1 exit /b 1
call npm run verify:source:a52
if errorlevel 1 exit /b 1
call npm run staging:incident-lifecycle:a52
if errorlevel 1 exit /b 1
call npm run package:evidence:a52
if errorlevel 1 exit /b 1
echo.
echo A52 evidence created:
echo artifacts\pass35\PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE_EVIDENCE.zip
endlocal
