@echo off
setlocal
cd /d "%~dp0"
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a89-account-auth-tenant-privacy-red-team.ts || exit /b 1
node scripts/pass36/build-a89-current-root-descendant-manifest.mjs || exit /b 1
node scripts/pass36/verify-a89-current-root-descendant.mjs || exit /b 1
node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/verify-a89-account-auth-tenant-privacy-red-team.ts || exit /b 1
node scripts/pass36/verify-a89-clean-unpack-sequence.mjs || exit /b 1
echo PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION
endlocal
