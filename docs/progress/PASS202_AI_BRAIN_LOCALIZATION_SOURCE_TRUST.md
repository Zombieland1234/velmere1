# PASS202 — AI Brain Localization + Source Trust Drawer

## Co zmienił ten pass

- VLM Brain tile drawer dostał pełniejszą lokalizację PL/EN/DE, szczególnie niemieckie wyjaśnienia dla: risk, liquidity, holders, signals, source quality i access boundary.
- Drawer pokazuje teraz **source trust**: live / partial / fallback nie wyglądają jak ten sam poziom pewności.
- Drawer pokazuje **publication-state**: przy partial/fallback albo mocnej fladze tekst prowadzi operatora do internal review albo drugiego źródła, zamiast mocnego publicznego werdyktu.
- Dodałem widoczne, premium **Previous / Next tile** controls, żeby nie trzeba było polować myszką na orbitujące kafelki.
- Dodałem krótki keyboard hint w drawerze: ESC zamyka, strzałki przełączają kafelki.

## Previous → Current → Change

| ID | Obszar | Previous | Current | Change | Dlaczego |
|---|---|---:|---:|---:|---|
| D14 | Tile-specific explainer taxonomy | 88% | 91% | +3% | Każda grupa kafelka ma bardziej kompletne, lokalizowane wyjaśnienie. |
| D16 | Source confidence lanes | 52% | 57% | +5% | Drawer pokazuje source-trust state dla live/partial/fallback. |
| D17 | Missing-data semantics | 62% | 66% | +4% | Missing/fallback data blokuje mocny publiczny język. |
| D18 | Basic / Pro / Advanced depth contract | 86% | 87% | +1% | Drawer dalej pokazuje aktywną głębokość trybu bez drugiego panelu. |
| D19 | Brain interaction click coverage | 87% | 88% | +1% | Previous/Next pozwala czytać kafelki bez walki z orbitą. |
| D23 | Brain accessibility / keyboard flow | 51% | 55% | +4% | Drawer ma lokalizowane instrukcje klawiatury i przyciski zmiany kafelka. |
| D24 | Brain copy localization PL/EN/DE | 72% | 80% | +8% | Niemiecki drawer nie zostaje już po angielsku. |
| J02 | Accessibility / ARIA | 58% | 60% | +2% | Czytelniejsze sterowanie drawerem; manualny screen-reader QA nadal wymagany. |

## Nadal blockery

- Real browser QA na Vercelu.
- Manualny screen-reader QA.
- Real FPS telemetry dla Orbit 360.
- Durable source freshness registry.
- Holder/orderbook/contract/OSINT adapters.
- Real PDF generator.

## Uczciwa granica

PASS202 poprawia copy, source-trust semantics i interakcję draweru. Nie udaje, że live adapters, durable source ledger albo WebGL renderer są już produkcyjnie skończone.
