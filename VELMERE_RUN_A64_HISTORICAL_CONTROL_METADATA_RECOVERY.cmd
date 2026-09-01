@echo off
setlocal
if "%~1"=="" (
  echo Usage: VELMERE_RUN_A64_HISTORICAL_CONTROL_METADATA_RECOVERY.cmd ^<A53_SOURCE_ONLY.zip^>
  exit /b 2
)
set "VELMERE_A64_CONFIRM=I_UNDERSTAND_A64_INSTALLS_ONLY_HASH_BOUND_HISTORICAL_CONTROL_METADATA"
node scripts\a64-historical-control-metadata-recovery.mjs "%~1"
exit /b %ERRORLEVEL%
