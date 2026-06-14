@echo off
cd /d C:\Users\marci\velmere-store

echo [CHECK] header centered cluster:
findstr /n /c:"absolute left-1/2 top-1/2" components\Navbar.tsx

echo [CHECK] mobile wallet deeplinks:
findstr /n /c:"link.metamask.io" lib\wallet\mobile-deeplinks.ts
findstr /n /c:"phantom.app/ul/browse" lib\wallet\mobile-deeplinks.ts

echo [CHECK] square is guest-readable:
findstr /n /c:"Public Square preview" app\[locale]\square\page.tsx

echo [CHECK] archive no hard TokenGate:
findstr /n /c:"<TokenGate" app\[locale]\archive\page.tsx

echo If TokenGate line is NOT FOUND, archive is public preview. Now run npm run build.
pause
