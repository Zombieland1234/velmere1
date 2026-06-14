# VELMÈRE MASTER BUILD MAP — PASS344

## Brutalny stan po PASS344
Publiczny prototyp nadal traktować jako ok. 13% finalnego produktu. PASS344 naprawia realne blokery z UI, ale live adaptery, pełne provider data, security storage i finalny PDF renderer dalej są P0.

## Co PASS344 naprawia
1. Orbit drawer: natywny scroll + right-edge panel + brak sticky headera podczas przewijania.
2. Orbit drawer: ukryty pasek poprzedni/następny, który wyskakiwał u góry i przeszkadzał w czytaniu.
3. Token modal: publiczny digest po action buttons + 4 chips, bez operator wall po spodzie.
4. Lens / VLM Browser: dropdown podpowiedzi ma wyższy z-index i nie chowa się pod clean-mode card.
5. Lens search: dodany BAT / Basic Attention Token do local suggestions i local search contract.
6. PDF forge: minimalna animacja tworzenia 5.2s przed pokazaniem A4.
7. PDF route: 4 strony, legal/source ledger przeniesiony na osobną stronę, mniej ryzyka uciętego footera.
8. Real Markets: clean terminal zamiast ściany danych; ukryte duplicate/debug tables w publicznym widoku.
9. PASS344 guard: nowy verify script pilnuje powyższych napraw.

## A-M progres po PASS344
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Core runtime / build | P0 | 36% | Brak node_modules/typecheck w paczce eksportowej. |
| B | Brand/luxury public UI | P1 | 23% | Nadal za dużo technicznego copy w kilku publicznych miejscach. |
| C | VLM Shield token surface | P0 | 31% | Search/cache/logos/live data nie są jeszcze pełne. |
| D | VLM AI Brain / Orbit 360 | P0 | 30% | Scroll naprawiony CSS/markup, ale potrzebny browser QA i unikalne tile copy. |
| E | Velmère Lens / Browser / PDF | P0 | 24% | PDF ma 4 strony, ale renderer nadal manualny i wymaga finalnego engine/test render. |
| F | Security / privacy / challenge | P0 | 25% | Brak pełnego CSP, storage, triage scope i production safe-harbor. |
| G | Commerce / shop / products | P1 | 20% | Lookbook i product truth wymagają kolejnych passów. |
| H | Lookbook / collection | P1 | 24% | Trzeba dopilnować, żeby nie wracał product text wall. |
| I | Real Markets / Cross-Asset | P0 | 20% | Clean UI jest, ale provider data dla FX/stocks/commodities nadal niepodpięte. |
| J | Interaction / scroll / performance | P0 | 27% | Scroll/dropdown naprawione statycznie; potrzebny browser profiler + device QA. |
| K | AI bot / copy engine | P0 | 28% | Copy nadal powtarzalne; potrzebny per-asset generator i fixtures. |
| L | Legal / compliance | P0 | 30% | Granice są, ale legal pages i final review nadal brak. |
| M | Evidence / reports / storage | P0 | 18% | Brak durable source ledger i snapshot storage. |

## Blockery aktywne — jawne
1. P0: Full typecheck nadal blokuje brak `node_modules` w paczce.
2. P0: Orbit drawer wymaga realnego browser QA po PASS344: mouse wheel, touchpad, mobile.
3. P0: Shield/Lens search wymaga cache TTL i virtualization.
4. P0: CoinGecko lane nie ma jeszcze durable cache, stale state i rate-limit UI.
5. P0: Real Markets nie ma providerów FX/stocks/ETF/commodities/real estate.
6. P0: Real logos dla stocków/FX/commodities nadal wymagają deterministic map/provider.
7. P0: PDF renderer nadal manualny; trzeba przejść na prosty layout engine albo HTML-to-PDF render test.
8. P0: Security page/challenge potrzebuje safe harbor, scope, out-of-scope, mailbox i SLA.
9. P0: Public UI nadal ma miejsca z operatorowym językiem i pass telemetry.
10. P0: AI Brain tile copy musi być unikalne per risk lane, nie generyczne.
11. P1: Stablecoin reserve/peg bridge nadal brak.
12. P1: Contract scanner per chain nadal brak.
13. P1: Holder/unlock/orderbook second source nadal brak.
14. P1: SEC filing parser i EU equity provider nadal brak.
15. P1: ECB/FRED/FHFA calendars nadal brak.

## Następny build order
PASS345: Search hardening + CoinGecko cache TTL + large token index + stale/fallback UI + BAT/B-starting query QA.
PASS346: Orbit unique tile copy + drawer accordion + keyboard/ESC/focus QA.
PASS347: PDF renderer v5 with visual template + render verification.
PASS348: Real Markets provider contract route + symbol map for FX/stocks/ETF/commodities.
PASS349: Security safe-harbor/challenge public page + CSP/rate-limit readiness panel.
