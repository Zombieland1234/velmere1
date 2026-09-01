@echo off
setlocal
cd /d "%~dp0"
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a88r1-route-preflight.ts || exit /b 1
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a88r1-semantic-route-privacy-pdf.ts || exit /b 1
node scripts/pass36/build-a88r1-current-root-descendant-manifest.mjs || exit /b 1
node scripts/pass36/verify-a88r1-current-root-descendant.mjs || exit /b 1
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/verify-a88r1-semantic-route-privacy-pdf.ts || exit /b 1
node scripts/pass36/verify-a88r1-pdf-evidence-summary.mjs || exit /b 1
node scripts/pass36/verify-a88r1-clean-unpack-sequence.mjs --bridge-smoke || exit /b 1
endlocal
