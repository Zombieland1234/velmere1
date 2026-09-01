@echo off
setlocal
node scripts\pass36\verify-a86-clean-unpack-sequence.mjs
exit /b %errorlevel%
