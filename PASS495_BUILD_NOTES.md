# PASS495 build notes

- Node w sandboxie: 22.16.0
- Node zadeklarowany przez projekt: 20.x
- `npm install`: PASS, 902 pakiety
- wszystkie verifiery PASS480–495: PASS
- `check:i18n`: PASS
- `vercel:preflight`: PASS, 805 plików
- parser TS/TSX: PASS, 810 plików, 0 błędów składni
- ESLint zmienionych plików: PASS
- pełny `tsc --noEmit`: przekroczył limit procesu bez diagnostyki
- pełny `next build`: nieoznaczony jako PASS; nieponawiany z powodu wcześniejszych resetów pamięci sandboxa
