@echo off
setlocal
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a100-incident-kill-switch-customer-communication-boundaries.ts
if errorlevel 1 exit /b %errorlevel%
node scripts/pass36/verify-a100-incident-kill-switch-customer-communication-boundaries.mjs
exit /b %errorlevel%
