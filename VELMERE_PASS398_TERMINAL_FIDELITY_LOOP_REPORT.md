# Velmère PASS398 — Terminal Fidelity Loop

## Cel
Naprawić główny kierunek produktu bez dokładania publicznego chaosu: Real Markets / Real Stocks ma działać jak Shield, Browser PDF ma używać tego samego resolved payload dla preview/download, a search ma być domykany przez jeden runtime close loop.

## Zmiany wdrożone
- Dodano `lib/market-integrity/pass398-terminal-fidelity-loop.ts`.
- Real Markets dostał nowy provider-ready universe: payments, fintech, cybersecurity, software, travel platforms, EU luxury/industrial, FX, commodities i US real estate ETF.
- Real Markets modal dostał nowy widoczny PASS398 terminal brain: VLM coin, blue neural shell, 52 node'y, timeline i output 10 / 14 / 20 pól.
- Browser/Lens PDF dostał marker exact-payload parity dla PASS398.
- PDF route dostał nową stronę PASS398 TERMINAL FIDELITY LOOP, używającą tego samego report object co preview.
- Shield / Shield Map / Browser / Real Markets dostały markery `pass398TerminalFidelityContract`, żeby dalej spinać search-close/runtime-lock.
- Stare widoczne warstwy brain w Real Markets są ukrywane CSS-em; publicznie ma zostać jeden mocny terminal/brain, nie pass-history dump.

## Ważne ograniczenie
Nie oznaczam `npm run typecheck` jako zielonego, bo paczka eksportowa nie zawiera `node_modules`, więc TypeScript zgłasza brak typów/paczek Next, React, Node, wagmi, stripe, zustand, tailwind itd. PASS398 przeszedł parser sweep po plikach TS/TSX i Vercel preflight.

## Walidacja
- `npm run verify:pass398-terminal-fidelity-loop` ✅
- `npm run verify:pass397-unified-search-pdf-brain` ✅
- `npm run verify:pass396-terminal-parity-brain` ✅
- `npm run verify:pass395-search-orbit-neural-brain` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅
- `npm run typecheck` ❌ expected in this ZIP export because `node_modules` is missing

## Delta
| ID | Obszar | Zmiana |
|---|---:|---|
| RM-Chart-Parity | Real Markets jak Shield | + provider-ready rows, visual patches, pseudo-price lanes, modal/brain parity |
| PDF-Parity | Browser preview/download | + PASS398 exact payload page + markers |
| Search Runtime | Browser/Shield/Real Markets | + shared close-loop markers |
| Orbit Brain | 3D/Orbit neural feel | + 52-node VLM neural collector and 10/14/20 field output |
| Security/Research | Public copy | + safe prime/RNG/security boundary copy without exploit details |
