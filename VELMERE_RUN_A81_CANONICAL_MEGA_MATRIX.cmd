@echo off
setlocal
cd /d "%~dp0"
node --experimental-strip-types scripts\pass36\test-a81-canonical-mega-matrix-orchestrator.ts
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\build-a81-current-root-descendant-manifest.mjs
if errorlevel 1 exit /b %errorlevel%
node scripts\pass36\verify-a81-current-root-descendant.mjs
if errorlevel 1 exit /b %errorlevel%
node --experimental-strip-types scripts\pass36\verify-a81-canonical-mega-matrix-orchestrator.ts
exit /b %errorlevel%
