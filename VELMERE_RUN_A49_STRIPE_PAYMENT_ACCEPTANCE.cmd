@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo VELMERE PASS35 A49 - STRIPE TEST PAYMENT ACCEPTANCE
echo ============================================================
echo Stripe TEST MODE and disposable staging only.
echo Live keys and production-like URLs are rejected.
echo.
call npm run diagnose:runtime:a49
if errorlevel 1 exit /b 1
call npm run verify:source:a49
if errorlevel 1 exit /b 1
call npm run staging:stripe-payment:a49
if errorlevel 1 exit /b 1
call npm run package:evidence:a49
if errorlevel 1 exit /b 1
echo.
echo A49 evidence created:
echo artifacts\pass35\PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE_EVIDENCE.zip
endlocal
