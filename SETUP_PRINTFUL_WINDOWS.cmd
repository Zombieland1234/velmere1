@echo off
echo Velmere Printful local setup
if not exist .env.local.printful-ready (
  echo Brak .env.local.printful-ready. Rozpakuj patch w glownym folderze projektu.
  pause
  exit /b 1
)
copy .env.local.printful-ready .env.local
notepad .env.local
echo.
echo Po wklejeniu tokena do .env.local uruchom:
echo node scripts/printful-find-store-id.mjs
echo node scripts/printful-smoke-test.mjs
echo npm run dev
pause
