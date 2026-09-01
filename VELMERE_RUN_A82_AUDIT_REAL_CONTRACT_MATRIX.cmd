@echo off
setlocal
cd /d "%~dp0"
node scripts\pass36\test-a82-audit-real-contract-matrix.mjs || exit /b 1
node scripts\pass36\build-a82-current-root-descendant-manifest.mjs || exit /b 1
node scripts\pass36\verify-a82-current-root-descendant.mjs || exit /b 1
node scripts\pass36\verify-a82-audit-real-contract-matrix.mjs || exit /b 1
endlocal
