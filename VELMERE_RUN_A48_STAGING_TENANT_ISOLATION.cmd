@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A48 - STAGING TENANT ISOLATION ACCEPTANCE
echo ============================================================
echo This command uses disposable staging accounts and database only.
echo It refuses localhost and production-like URLs.
echo Secrets are read from environment and are not written to receipts.
echo.
call npm run diagnose:runtime:a48
if errorlevel 1 exit /b 1
call npm run verify:source:a48
if errorlevel 1 exit /b 1
call npm run staging:tenant-isolation:a48
if errorlevel 1 exit /b 1
call npm run package:evidence:a48
if errorlevel 1 exit /b 1
echo.
echo A48 staging evidence created:
echo artifacts\pass35\PASS35_A48_STAGING_TENANT_ISOLATION_EVIDENCE.zip
endlocal
