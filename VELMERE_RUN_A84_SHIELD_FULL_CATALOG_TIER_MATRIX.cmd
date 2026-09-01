@echo off
setlocal
node --experimental-strip-types scripts\pass36\test-a84-shield-full-catalog-tier-matrix.ts || exit /b 1
node scripts\pass36\build-a84-current-root-descendant-manifest.mjs || exit /b 1
node scripts\pass36\verify-a84-current-root-descendant.mjs || exit /b 1
node --experimental-strip-types scripts\pass36\verify-a84-shield-full-catalog-tier-matrix.ts || exit /b 1
endlocal
