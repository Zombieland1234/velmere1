@echo off
setlocal
node --experimental-strip-types scripts\pass36\test-a86-real-markets-cross-asset-matrix.ts
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\build-a86-current-root-descendant-manifest.mjs
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\verify-a86-current-root-descendant.mjs
if errorlevel 1 exit /b %errorlevel%
node --experimental-strip-types scripts\pass36\verify-a86-real-markets-cross-asset-matrix.ts
exit /b %errorlevel%
