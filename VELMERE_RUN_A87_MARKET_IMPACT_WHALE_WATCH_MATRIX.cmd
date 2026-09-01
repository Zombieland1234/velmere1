@echo off
setlocal
node --import .\scripts\pass11\register-offline-ts-loader.mjs scripts\pass36\test-a87-market-impact-whale-watch-matrix.ts
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\build-a87-current-root-descendant-manifest.mjs
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\verify-a87-current-root-descendant.mjs
if errorlevel 1 exit /b %errorlevel%
node --import .\scripts\pass11\register-offline-ts-loader.mjs scripts\pass36\verify-a87-market-impact-whale-watch-matrix.ts
exit /b %errorlevel%
