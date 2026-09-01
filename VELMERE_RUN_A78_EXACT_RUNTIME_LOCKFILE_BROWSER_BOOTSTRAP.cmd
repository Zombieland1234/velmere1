@echo off
setlocal
node scripts/pass36/build-a78-local-artifact-availability-receipt.mjs
if errorlevel 1 exit /b 1
node scripts/pass36/test-a78-exact-runtime-lockfile-browser-bootstrap.mjs
if errorlevel 1 exit /b 1
node scripts/pass36/build-a78-current-root-descendant-manifest.mjs
if errorlevel 1 exit /b 1
node scripts/pass36/verify-a78-current-root-descendant.mjs
if errorlevel 1 exit /b 1
node scripts/pass36/verify-a78-exact-runtime-lockfile-browser-bootstrap.mjs
