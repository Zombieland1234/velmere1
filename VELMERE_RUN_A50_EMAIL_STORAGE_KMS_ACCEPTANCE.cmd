@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A50 - EMAIL + PRIVATE STORAGE + KMS ACCEPTANCE
echo ============================================================
echo Disposable staging only. Production-like URLs are rejected.
echo Secrets and recipient addresses are never written to evidence.
echo.
call npm run diagnose:runtime:a50
if errorlevel 1 exit /b 1
call npm run verify:source:a50
if errorlevel 1 exit /b 1
call npm run staging:email-storage-kms:a50
if errorlevel 1 exit /b 1
call npm run package:evidence:a50
if errorlevel 1 exit /b 1
echo.
echo A50 evidence created:
echo artifacts\pass35\PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE_EVIDENCE.zip
endlocal
