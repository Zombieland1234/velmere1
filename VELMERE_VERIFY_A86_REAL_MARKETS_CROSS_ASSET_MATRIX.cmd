@echo off
setlocal
node --experimental-strip-types scripts\pass36\verify-a86-real-markets-cross-asset-matrix.ts
exit /b %errorlevel%
