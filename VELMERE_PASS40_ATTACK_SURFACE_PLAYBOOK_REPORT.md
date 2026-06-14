# Velmère Shield — Pass 40

## Attack Surface Playbook + Pro Chart Upgrade

Pass 40 rozwija Shielda w kierunku realnego testera ryzyka, nie tylko radaru. System dostał warstwę, która nie pyta tylko „jaki jest score?”, ale też „który scenariusz nadużycia byłby najłatwiejszy do ukrycia w aktualnych danych?”.

## Dodane

### 1. Attack Surface Agent

Nowy moduł:

- `lib/market-integrity/attack-playbook.ts`

Analizuje sześć wektorów:

- velocity abuse,
- exit liquidity,
- spoofing / depth,
- holder cluster,
- contract control,
- data blindspot.

Każdy wektor zwraca:

- score 0–100,
- severity,
- confidence,
- evidence signal ids,
- metric hints,
- defense readiness score.

### 2. Nowy endpoint API

Dodany endpoint:

- `/api/market-integrity/playbook?query=BTC`
- `/api/market-integrity/playbook?query=SOL`
- `/api/market-integrity/playbook?query=OM`

Endpoint zwraca JSON typu `velmere-shield-attack-surface-playbook`.

### 3. Evidence Report v2

Endpoint raportu:

- `/api/market-integrity/report?query=...`

został rozszerzony o `attackSurface`, więc raport śledczy ma teraz investigation plan + playbook ryzyka.

### 4. Token modal UI

W karcie tokena dodano panel:

- Attack surface review,
- top 3 najważniejsze wektory ryzyka,
- evidence labels,
- defense readiness,
- link do Playbook JSON.

### 5. Chart upgrade

Wykres świecowy dostał kolejne elementy terminalowe:

- VWAP line,
- session high / low lines,
- range change,
- volume average line,
- dodatkowe dane w pasku OHLC.

To dalej nie jest pełny TradingView, ale wygląda i działa bardziej jak terminal giełdowy.

### 6. About / Shield page

Strona „Czym jest Shield” dostała nowy build meter:

- MVP interfejsu,
- silnik ryzyka,
- produkcja/SOC.

To pomaga uczciwie pokazać, co już działa, a co jeszcze jest R&D.

## Sprawdzone

- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅

## Uczciwy stan projektu po Pass 40

- Frontend / premium UI: około 72–78%
- Silnik ryzyka / agenci: około 62–68%
- Persistent ledger + cron: około 55–62%, zależnie od tego czy Supabase jest już podpięty
- Produkcyjny SOC / alerting / user accounts / e2e: około 35–40%
- Poziom Chainalysis/Palantir: jeszcze daleko, ale kierunek architektury jest poprawny
