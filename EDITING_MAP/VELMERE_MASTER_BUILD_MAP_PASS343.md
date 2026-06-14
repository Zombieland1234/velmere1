# VELMÈRE MASTER BUILD MAP — PASS343

## Brutalny stan projektu
Projekt wizualnie ma potencjał, ale publicznie nadal traktuję go jako ok. 12% pełnego produktu. Kod ma dużo proof-of-concept, guardów i statycznych kontraktów. Produkcyjna wartość będzie rosnąć dopiero, gdy live adaptery, search i PDF przestaną wyglądać jak mock.

## Co PASS343 naprawia
1. Orbit drawer: usunięty manualny wheel hijack; panel wraca do natywnego scrolla.
2. Orbit drawer: podniesiony z-index, native momentum, touch-action pan-y, contain layout paint.
3. Orbit drawer: ukryte poprzedni/następny kafelek oraz ciężkie operator-only kolejki w publicznym drawerze.
4. Shield Map search: dropdown nie jest już portaled do body; jest inline pod inputem, więc nie skacze przy scrollu.
5. Lens PDF: dodana animacja tworzenia PDF z obracającym się V przed pokazaniem A4.
6. Lens PDF endpoint: page 2 nie dubluje rhythm cards i nie wciska dwóch boxów obok siebie na dole.
7. Search API: CoinGecko lane już istnieje i ma dawać logo + market rows dla większej liczby tokenów, a nie tylko lokalny seed.
8. Real Markets: dodany osobny top terminal real markets first: FX, stocki, ETF, real estate, commodities. Crypto jest niżej jako referencja Shield.
9. Real Markets: instrumenty mają logo/glyph obok symbolu i next adapter step.
10. Security: zostaje kierunek controlled responsible disclosure / challenge, bez zdradzania operatorowych szczegółów.

## Obszary A-M — progres roboczy
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Public storefront / lookbook | P1 | 20% | Kolekcje dalej łatwo cofają się do listy produktów zamiast runway/lookbook. |
| B | Token modal chart UX | P0 | 34% | Brakuje prawdziwego provider flow i finalnej logiki świec/24h. |
| C | Orbit 360 AI Brain | P0 | 27% | Scroll/drawer i unikalne opisy kafelków nadal wymagają kilku passów. |
| D | Lens / Browser search | P0 | 30% | Search nadal zależy od local seed + CoinGecko fallback, bez durable cache. |
| E | Lens PDF / A4 | P0 | 18% | Manualny PDF generator jest kruchy; trzeba przejść na layout engine albo bardzo prosty szablon. |
| F | Real Markets terminal | P0 | 16% | Provider keys, live FX/stocks/commodities i timestampy nie są podpięte. |
| G | Exchange Health | P0 | 19% | Binance/MEXC/Coinbase/Kraken są kontraktami adapterów, nie pełnym live health. |
| H | FTX historical regression | P1 | 14% | Brak prawdziwej, cytowanej bazy zdarzeń i normalizacji patternów. |
| I | AI Human Copy Engine | P0 | 26% | Nadal za dużo powtarzalnych zdań i operatorowego języka. |
| J | Security posture | P0 | 24% | Trzeba wdrożyć real headers, CSP, rate limits, audit storage, bug bounty scope. |
| K | Wallet/VLM access | P1 | 18% | Nadal boundary copy i UI, bez pełnej produkcyjnej logiki entitlement. |
| L | Performance / lag audit | P0 | 22% | Search overlay, Orbit canvas, heavy panels i PDFs wymagają profiler pass. |
| M | Legal/compliance/customer safety | P0 | 28% | Copy jest lepsze, ale legal pages i EU/Germany consumer flow muszą być pełne. |

## Lista blockerów P0
1. node_modules/type definitions brakują w paczce eksportowej.
2. Next/React/next-intl/lucide/tailwind/zustand typy nie przechodzą lokalnego typechecku.
3. Search CoinGecko nie ma cache + rate-limit + stale state UI.
4. Shield Map dropdown wcześniej skakał przy scrollu; PASS343 przenosi go inline, trzeba sprawdzić w przeglądarce.
5. Orbit drawer scroll wymaga realnego testu touchpad/mouse wheel po patchu.
6. PDF dalej wymaga wizualnego render-testu; PASS343 naprawia overlap logiczny, ale nie jest to finalny design.
7. Real Markets nie ma jeszcze real providerów dla FX/stocks/commodities.
8. Logo/glyphy dla stock/FX są placeholderami, poza crypto CoinGecko.
9. Exchange Health score nie może być mylony z risk score — UI musi stale pokazywać `stability higher = better`.
10. Security challenge nie może ruszyć publicznie bez scope, safe harbor, mailbox, triage SLA i test environment.

## Następne passy
PASS344: pełny live search hardening — CoinGecko cache, logo map, multi-result query, empty/fallback state.
PASS345: PDF renderer rewrite — proste 3-4 strony bez overlapu, większy premium layout, render test.
PASS346: Orbit drawer v3 — krótkie unikalne opisy, accordion sections, scroll body, no internal spam.
PASS347: Real Markets provider contracts — FX/stocks/commodities config + provider boundary UI.
PASS348: Security challenge page — safe harbor draft, scope table, out-of-scope list, reward placeholder.
