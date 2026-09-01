@echo off
setlocal
cd /d "%~dp0"
if not defined VELMERE_A79_RUNTIME_ROOT exit /b 42
set "VELMERE_TASK_EXACT_NODE=%VELMERE_A79_RUNTIME_ROOT%\node.exe"
if not exist "%VELMERE_TASK_EXACT_NODE%" exit /b 42
"%VELMERE_TASK_EXACT_NODE%" -e "if(process.version!=='v24.18.0')process.exit(42)"
if errorlevel 1 exit /b %errorlevel%
"%VELMERE_TASK_EXACT_NODE%" scripts\a60-exact-final-byte-build-browser-acceptance.mjs
if errorlevel 1 exit /b %errorlevel%
"%VELMERE_TASK_EXACT_NODE%" scripts\a60-package-evidence.mjs
exit /b %errorlevel%
