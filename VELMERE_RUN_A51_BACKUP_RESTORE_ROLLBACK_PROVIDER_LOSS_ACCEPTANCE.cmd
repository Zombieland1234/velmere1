@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A51 - BACKUP RESTORE ROLLBACK PROVIDER LOSS
echo ============================================================
echo Disposable staging and controlled chaos only.
echo Production-like URLs are rejected. Secrets are never logged.
echo.
call npm run diagnose:runtime:a51
if errorlevel 1 exit /b 1
call npm run verify:source:a51
if errorlevel 1 exit /b 1
call npm run staging:backup-restore-rollback:a51
if errorlevel 1 exit /b 1
call npm run package:evidence:a51
if errorlevel 1 exit /b 1
echo.
echo A51 evidence created:
echo artifacts\pass35\PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE_EVIDENCE.zip
endlocal
