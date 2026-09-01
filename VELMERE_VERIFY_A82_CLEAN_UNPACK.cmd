@echo off
setlocal
cd /d "%~dp0"
node scripts\pass36\verify-a82-clean-unpack-sequence.mjs
endlocal
