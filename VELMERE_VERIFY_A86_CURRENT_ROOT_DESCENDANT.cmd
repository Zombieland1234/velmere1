@echo off
setlocal
node scripts\pass36\verify-a86-current-root-descendant.mjs
exit /b %errorlevel%
