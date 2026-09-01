@echo off
setlocal
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/generate-a83-browser-lens-pdf-corpus.ts || exit /b 1
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a83-browser-lens-pdf-real-packet-matrix.ts || exit /b 1
python scripts/pass36/qa-a83-browser-lens-pdf-corpus.py || exit /b 1
node scripts/pass36/build-a83-source-evidence-summary.mjs || exit /b 1
node scripts/pass36/build-a83-current-root-descendant-manifest.mjs || exit /b 1
node scripts/pass36/verify-a83-current-root-descendant.mjs || exit /b 1
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/verify-a83-browser-lens-pdf-real-packet-matrix.ts || exit /b 1
endlocal
