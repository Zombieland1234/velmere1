@echo off
setlocal
node --import .\scripts\pass11\register-offline-ts-loader.mjs .\scripts\pass36\test-a88-brain-angel-risk-eval.ts || exit /b 1
node .\scripts\pass36\build-a88-current-root-descendant-manifest.mjs || exit /b 1
node .\scripts\pass36\verify-a88-current-root-descendant.mjs || exit /b 1
node --import .\scripts\pass11\register-offline-ts-loader.mjs .\scripts\pass36\verify-a88-brain-angel-risk-eval.ts || exit /b 1
endlocal
