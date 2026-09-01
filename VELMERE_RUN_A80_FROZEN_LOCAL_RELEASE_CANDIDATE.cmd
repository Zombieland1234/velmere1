@echo off
setlocal
if "%VELMERE_A80_OUTPUT%"=="" (
  echo VELMERE_A80_OUTPUT must point outside the source directory.
  exit /b 2
)
node scripts\a80-frozen-local-release-candidate.mjs --output "%VELMERE_A80_OUTPUT%" --a58-blocking-failures 0 --a58-archive-verified 1 --a58-clean-unpack-verified 1 --current-root-exact 1 --current-root-passed 30 --current-root-blocked 0 --current-root-semantic-failures 0 --current-root-source-immutable 1
exit /b %errorlevel%
