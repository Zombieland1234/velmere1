# Velmère PASS793–802 UX Sweep

Data: 2026-06-10

## Zakres

Blok 10 passów zamknął pierwszy etap po audycie screenów użytkownika: header, język, wallet/connect, Square post modal, Browser/Lens i pierwszą poprawkę tabeli Shield.

## PASS table

| PASS | Status | Zmiana |
|---|---|---|
| PASS793 | Done | Runtime overlay audit po screenach: wskazano Header/Wallet/Square/Lens/Shield jako pierwsze krytyczne powierzchnie. |
| PASS794 | Done | Header connect przeniesiony z małego dropdownu na czytelny DrawerRoot z własnym scroll regionem. |
| PASS795 | Done | Wallet “inne portfele” przeniesiony na nested ModalRoot, usunięto nagłówek “więcej portfeli”, dodano czytelniejsze ikony/fallbacki Coinbase/Rabby/Trust. |
| PASS796 | Done | Square post detail przebudowany na jeden stabilny ModalRoot bez dodatkowego BodyPortal. |
| PASS797 | Done | Square modal dostał logiczny układ: post/article po lewej, comments aside po prawej, własne scroll regiony. |
| PASS798 | Done | Browser/Lens odzyskał profesjonalny visual stage i journey zamiast ukrytej animacji. |
| PASS799 | Done | Browser search: usunięto publiczne chipsy/filtry pod inputem i poprawiono rounded focus shell. |
| PASS800 | Done | PDF forge dostał minimalne doświadczenie generowania 3.6–4.2 s zależnie od poziomu. |
| PASS801 | Done | Browser zachowuje jeden wynik, jeden PDF i handoff do Shield/Orbit bez ściany filtrów. |
| PASS802 | Done | Shield tabela dostała prawą kolumnę mini wykresu oraz verifier tri-state sortu. |

## Zmienione pliki

- `components/Navbar.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`
- `scripts/verify-pass793-802-ux-sweep.mjs`
- `scripts/verify-pass792-overlay-audit.mjs`
- `scripts/verify-pass790-hotfix-build-overlays.mjs`

## Testy wykonane

- `node scripts/verify-pass793-802-ux-sweep.mjs` — PASS 13/13
- `node scripts/verify-pass792-overlay-audit.mjs` — PASS 17/17
- `node scripts/verify-pass790-hotfix-build-overlays.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS PL/EN/DE
- Prettier parse/write na zmienionych TSX — PASS

## Niepotwierdzone w tym środowisku

- pełny `npm ci` na Node 24.16/npm 11.16;
- pełny `next build`;
- Playwright w prawdziwej przeglądarce;
- live Gemini/Vercel smoke test.

## Aktualna ocena po PASS802

| Obszar | Procent |
|---|---:|
| Cała platforma kodowo | 92% |
| Cała platforma produktowo/UX | 81% |
| Header / language / connect / wallet | 86% |
| Square | 79% |
| Browser / Lens | 74% |
| Shield | 86% |
| VLM Brain kodowo | 96% |
| Produkcyjna gotowość potwierdzona | 86% |

## Co dalej — PASS803–812

Następny blok powinien wejść głębiej w:

1. Shield top cleanup — zostawić search + Browser + Orbit/Shield Map + Real Markets.
2. Shield table density — bez scrolla poziomego, pełna szerokość i lepsze proporcje kolumn.
3. Shield modal full cleanup — tylko wykres + Basic/Pro/Advanced.
4. Real Markets modal 1:1 ze Shield.
5. Real Markets Basic/Pro/Advanced nie może renderować się pod popupem.
6. Shield Map IA redesign: źródła → fakty → sygnały → konflikty → wynik → następne kontrole.

