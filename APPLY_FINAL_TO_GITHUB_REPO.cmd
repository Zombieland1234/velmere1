@echo off
setlocal
set SRC=%~dp0
set DEST=C:\Users\marci\velmere-store

echo.
echo [VELMERE FINAL PATCH] Source: %SRC%
echo [VELMERE FINAL PATCH] Destination: %DEST%
echo.
if not exist "%DEST%\.git" (
  echo ERROR: %DEST% is not a git repository. Check path.
  pause
  exit /b 1
)
if not exist "%SRC%\lib\wallet\mobile-deeplinks.ts" (
  echo ERROR: mobile-deeplinks.ts missing from source. You extracted the wrong folder.
  pause
  exit /b 1
)
robocopy "%SRC%" "%DEST%" /MIR /XD .git node_modules .next out .vercel /XF .env .env.local
cd /d "%DEST%"
echo.
echo [CHECK] mobile deeplinks:
findstr /n /c:"link.metamask.io" lib\wallet\mobile-deeplinks.ts
findstr /n /c:"phantom.app/ul/browse" lib\wallet\mobile-deeplinks.ts
echo.
echo [CHECK] mobile audio hidden:
findstr /n /c:"hidden md:inline-flex" components\ui\AudioToggleButton.tsx
echo.
echo [CHECK] no full terminal tape:
findstr /n /c:"VELMERE KERNEL ACTIVE" components\ui\GlobalTerminalTicker.tsx
if %ERRORLEVEL% EQU 0 (
  echo WARNING: old terminal tape string still found.
) else (
  echo OK: old terminal tape string not found.
)
echo.
echo Now run:
echo npm install
echo npm run build
echo git add .
echo git commit -m "Apply verified final mobile wallet polish"
echo git push origin main
echo.
pause
