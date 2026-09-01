@echo off
setlocal
node scripts\a77-clean-root-governance-intake.mjs %*
exit /b %ERRORLEVEL%
