@echo off
setlocal
cd /d "%~dp0"
node scripts\pass36\verify-a62-offline-exact-runtime-dependency-bootstrap.mjs
if errorlevel 1 exit /b %errorlevel%
node scripts\a62-offline-exact-runtime-dependency-bootstrap.mjs
exit /b %errorlevel%
